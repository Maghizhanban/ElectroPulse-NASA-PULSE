#!/usr/bin/env python3
"""
pulse_dialogue.py
PulseBrain: the conversational reasoning core of P.U.L.S.E.

Every sentence the crew hears is composed from structured findings (numbers, thresholds, trend,
engine inputs) or from an explicit statement of what is NOT known. Nothing is defaulted: with no
reading, the answer is "I have no reading". Interventions are proposed, then executed only after
the crew confirms, and execution is logged to the SQLite crew record.

Prototype disclaimer: thresholds are model parameters, not validated clinical limits, and no
hardware actuator is connected in this build.
"""

import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from pulse_assess import (Assessment, Assessor, Finding, METRIC_INFO, PROTOCOLS, SEV_NAMES, swarm_vote)
from pulse_feed import SCENARIOS, TelemetryFeed
from pulse_llm import LLMBridge
from pulse_nlu import Knowledge, Parsed, Voice, parse, speechify

NORMAL_RANGE = {
    "hr": "50 to 100 bpm at rest", "spo2": "95% or higher", "bp_sys": "95 to 140 mmHg", "onsd": "under 5.0 mm",
    "cabin_co2": "under 3.2 mmHg", "radiation_usv": "under 35 µSv/h", "skin_temp": "35 to 37.6 °C",
    "fatigue": "under 40%", "strain": "under 50 out of 100", "hrv": "your personal baseline",
}
METRIC_FINDING = {"hr": "hr", "onsd": "sans", "radiation_usv": "radiation", "cabin_co2": "co2", "spo2": "spo2",
                  "bp_sys": "bp", "skin_temp": "temp", "fatigue": "fatigue", "strain": "strain", "hrv": "strain",
                  "cumulative_msv": "dose_budget"}
SENSOR_FOR = {"hr": "the bio-harness", "hrv": "the bio-harness", "spo2": "the bio-harness",
              "skin_temp": "the bio-harness", "bp_sys": "a blood pressure reading", "onsd": "a POCUS optic nerve scan",
              "cabin_co2": "the ECLSS atmosphere monitor", "radiation_usv": "the dosimeter",
              "cumulative_msv": "the dosimeter", "fatigue": "typing or camera vigilance data",
              "strain": "heart rate and variability from the bio-harness"}
REGION_METRICS = {"head": ["onsd", "hr", "bp_sys"], "chest": ["hr", "spo2", "hrv", "bp_sys"],
                  "abdomen": ["hr", "bp_sys"], "spine": [], "limb": [], "other": ["hr"]}
RED_FLAG_Q = {
    "head": "Any change in vision, a headache that is worse lying flat, or confusion?",
    "chest": "Any crushing pressure, shortness of breath, or pain spreading to the arm or jaw?",
    "abdomen": "Is the abdomen rigid or swollen, or was there an impact or hardware strike?",
    "spine": "Any numbness, tingling or weakness in the arms or legs, or a recent impact?",
    "limb": "Any numbness, loss of grip or movement, visible swelling or deformity?",
    "other": "Did it start suddenly, and is it getting worse?",
}
URGENT_STEPS = {
    "head": "Stop work, keep your head raised and avoid exertion.",
    "chest": "Stop all exertion, stay seated and keep checking your breathing.",
    "abdomen": "Stop work, stay still, and hold off on food and drink.",
    "spine": "Do not move or load the area; keep your back or neck in a neutral position.",
    "limb": "Immobilize it and avoid using it.",
    "other": "Stop the activity and keep still.",
}
ROUTINE_STEPS = {
    "head": "Rest, hydrate, and tell me if vision or the headache changes.",
    "chest": "Rest and let me keep watching heart rate and blood oxygen.",
    "abdomen": "Rest, go easy on food, and watch for rigidity or a rising heart rate.",
    "spine": "Avoid loaded movement and rest in a neutral posture.",
    "limb": "Rest and support it, cool it for the first day, and keep checking movement and sensation.",
    "other": "Rest it and tell me if it gets worse.",
}
SOURCES = {"NASA-HRP-RISK-PORTFOLIO": "NASA HRP risk portfolio", "NASA-HRP-ONGOING-RESEARCH": "NASA HRP ongoing research",
           "CSA-CANS-RADIATION-2026": "CSA radiation research", "CSA-WHY-DO-WE-CONDUCT-SCIENCE-2026": "CSA science brief"}

LEGACY_TOOLS = [
    (r"^/?learn\b|\brecalibrate (the )?model\b|\blearn priors\b", "tool_learn", "openjarvis_online_learning", "brain"),
    (r"^/?boost\b|\boverdrive\b|\bboost telemetry\b", "tool_boost", "edge_performance_boost", "heart"),
    (r"^/?teamwork\b|\bsync crew\b|\bcrew roster\b|\bcrew (status|vitals|stress)\b|\bhow is the crew\b",
     "tool_teamwork", "multi_crew_synchronizer", "heart"),
    (r"^/?migrate|\bmigrate workflows?\b|\bcpg migration\b", "tool_migrate_workflows", "clinical_workflow_migrator", "lumbar"),
    (r"^/?goal\b|\bhealth goals\b|\bhrp targets\b|\bmission goals\b", "tool_goal", "mission_health_goal_tracker", "soleus"),
    (r"^/?plugin\b|\bplugin status\b|\bmedical plugin\b|\bdevice plugin\b|\bwhich (devices|instruments)\b",
     "tool_plugin", "medical_device_plugin_manager", "heart"),
]


@dataclass
class Session:
    crew_id: str
    persona: str = "jarvis"
    honesty: int = 90
    humor: int = 30
    turns: int = 0
    last_intent: Optional[str] = None
    last_metric: Optional[str] = None
    last_finding: Optional[str] = None
    last_organ: Optional[Dict[str, Any]] = None
    pending: Optional[Dict[str, Any]] = None
    symptom: Optional[Dict[str, Any]] = None
    monitor: Optional[Dict[str, Any]] = None
    alert_state: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    alerts: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class Reply:
    text: str
    intent: str
    tools: List[str] = field(default_factory=list)
    organ: Optional[str] = None
    finding: Optional[Finding] = None
    symptom: Optional[Dict[str, Any]] = None
    follow: List[str] = field(default_factory=list)
    extra: Dict[str, Any] = field(default_factory=dict)
    llm: bool = False
    sev: int = 0


def _fmt(metric: str, value: float) -> str:
    name, unit, _spoken, dec = METRIC_INFO.get(metric, (metric, "", "", 1))
    return f"{value:.{dec}f}{(' ' + unit) if unit else ''}"


def _dur(seconds: float) -> str:
    return f"{int(round(seconds))} seconds" if seconds < 90 else f"{seconds / 60:.0f} minutes"


def _trend_phrase(t: Optional[Dict[str, Any]], metric: str) -> str:
    if not t or t["direction"] == "steady":
        return ""
    name, unit, _s, dec = METRIC_INFO.get(t.get("metric", metric), (metric, "", "", 1))
    return (f"{name.capitalize()} has been {t['direction']}, from {t['first']:.{dec}f} to {t['last']:.{dec}f}"
            f"{(' ' + unit) if unit else ''} over the last {_dur(t['span_s'])}.")


class PulseBrain:
    def __init__(self, agent, clock=time.time, llm: Optional[LLMBridge] = None, simulate: bool = True):
        self.agent = agent
        self.clock = clock
        self.llm = llm or LLMBridge()
        self.simulate = simulate
        self.feeds: Dict[str, TelemetryFeed] = {}
        self.assessors: Dict[str, Assessor] = {}
        self.sessions: Dict[str, Session] = {}
        self.lock = threading.RLock()
        self.kb = Knowledge((getattr(agent, "pdf_knowledge", None) or {}).get("knowledgeChunks", []))

    # ------------------------------------------------------------------ plumbing
    def cid(self, crew_id: Optional[str]) -> str:
        return self.agent.memory._canonicalize_crew_id(crew_id or "elena")

    def feed(self, c: str) -> TelemetryFeed:
        if c not in self.feeds:
            self.feeds[c] = TelemetryFeed(crew_id=c, simulate=self.simulate, clock=self.clock)
        return self.feeds[c]

    def assessor(self, c: str) -> Assessor:
        if c not in self.assessors:
            prof = self.agent.memory.get_crew_profile(c) or {}
            base = prof.get("baseline_vitals") or {}
            self.assessors[c] = Assessor(c, {k: base[k] for k in ("hr", "hrv") if k in base})
        return self.assessors[c]

    def session(self, c: str) -> Session:
        if c not in self.sessions:
            self.sessions[c] = Session(crew_id=c)
        return self.sessions[c]

    def refresh(self, c: str) -> TelemetryFeed:
        f = self.feed(c)
        last = f._last_tick
        if f.simulate and (last is None or self.clock() - last >= 0.9):
            f.tick()
        return f

    def assess(self, c: str) -> Assessment:
        return self.assessor(c).run(self.refresh(c))

    @staticmethod
    def legacy_telemetry(values: Dict[str, float]) -> Dict[str, Any]:
        t: Dict[str, Any] = {}
        for src, dst in (("hr", "hr"), ("onsd", "onsd"), ("radiation_usv", "radiation_usv"),
                         ("cabin_co2", "cabin_co2"), ("entropy", "entropy")):
            if src in values:
                t[dst] = values[src]
        if "bp_sys" in values and "bp_dia" in values:
            t["bp"] = f"{values['bp_sys']:.0f}/{values['bp_dia']:.0f}"
        return t

    def persist(self, c: str) -> None:
        vals = self.feed(c).values()
        if vals:
            self.agent.memory.log_telemetry_snapshot(c, self.legacy_telemetry(vals), self.clock())

    def snapshot(self, c: str) -> Dict[str, Any]:
        f = self.refresh(c)
        a = self.assessor(c).run(f)
        return {"crew_id": c, "t": self.clock(), "source": a.source, "scenario": f.scenario_state(),
                "values": f.current(), "assessment": a.to_dict()}

    # ------------------------------------------------------------------ main entry
    def respond(self, query: str, crew_id: str = "elena", persona: Optional[str] = None,
                honesty: Optional[int] = None, humor: Optional[int] = None,
                telemetry: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        with self.lock:
            c = self.cid(crew_id)
            sess = self.session(c)
            if persona:
                sess.persona = persona
            if honesty is not None:
                sess.honesty = int(honesty)
            if humor is not None:
                sess.humor = int(humor)
            if telemetry:
                self.feed(c).ingest(telemetry, source="client")
            if sess.pending and self.clock() - sess.pending.get("t", 0) > 300:
                sess.pending = None
            a = self.assess(c)
            p = parse(query, sess)
            voice = Voice(sess.persona, sess.honesty, sess.humor, sess.turns)
            reply = self._dispatch(c, p, a, sess, voice)
            sess.turns += 1
            sess.last_intent = p.intent
            thought = (f"intent={p.intent}({p.confidence:.2f}) metric={p.metric} organ={p.organ_query()} "
                       f"ctx={p.used_context} findings={[f.id + ':' + f.severity_name for f in a.active(1)]} "
                       f"missing={a.missing} source={a.source}")
            self.agent.memory.log_interaction(c, query, thought, reply.tools or [p.intent], reply.text,
                                              self.legacy_telemetry(a.values))
            return self._package(c, query, p, a, sess, reply)

    # ------------------------------------------------------------------ routing
    def _dispatch(self, c: str, p: Parsed, a: Assessment, sess: Session, v: Voice) -> Reply:
        h = {
            "greeting": self.h_greeting, "status": self.h_status, "metric": self.h_metric, "trend": self.h_trend,
            "explain": self.h_explain, "advice": self.h_advice, "symptom": self.h_symptom, "scan": self.h_scan,
            "answer_question": self.h_answer, "deploy": self.h_deploy, "cancel": self.h_cancel,
            "swarm": self.h_swarm, "knowledge": self.h_knowledge, "scenario": self.h_scenario,
            "capabilities": self.h_capabilities, "identity": self.h_identity, "thanks": self.h_thanks,
            "bye": self.h_bye, "legacy": self.h_legacy,
        }.get(p.intent, self.h_unknown)
        return h(c, p, a, sess, v)

    # ------------------------------------------------------------------ helpers
    def _note(self, a: Assessment) -> str:
        return {"simulated": " (simulated telemetry)", "mixed": " (mixed sources)"}.get(a.source, "")

    def _resolve_finding(self, p: Parsed, a: Assessment, sess: Session) -> Optional[Finding]:
        if p.metric and METRIC_FINDING.get(p.metric):
            return a.get(METRIC_FINDING[p.metric])
        if sess.last_finding and a.get(sess.last_finding):
            return a.get(sess.last_finding)
        act = a.active(1)
        return act[0] if act else None

    def _derived(self, metric: str, a: Assessment) -> Optional[float]:
        if metric == "fatigue":
            f = a.get("fatigue")
            if f:
                return f.value
            if "neurotype" in a.engines:
                return float(a.engines["neurotype"]["cognitive_fatigue_pct"])
            if "vigilance" in a.engines:
                return float(a.engines["vigilance"]["drowsiness_index"])
            return None
        if metric == "strain":
            return a.engines.get("strain_index")
        return a.values.get(metric)

    def _offer(self, f: Finding, sess: Session) -> str:
        if not f.protocol_id or f.severity < 2:
            return ""
        pr = PROTOCOLS[f.protocol_id]
        sess.pending = {"type": "protocol", "finding": f.id, "protocol": f.protocol_id, "label": pr["label"],
                        "action": pr["intervene_action"], "monitor": pr["monitor"], "organ": f.organ_query,
                        "t": self.clock()}
        return f"Say 'deploy protocol' and I'll log the {pr['label']} and track it."

    def _monitor_clause(self, sess: Session, a: Assessment) -> str:
        m = sess.monitor
        if not m:
            return ""
        now = self._derived(m["metric"], a)
        if now is None:
            return ""
        return (f"Since the {m['label']} was ordered {_dur(self.clock() - m['t0'])} ago, "
                f"{METRIC_INFO[m['metric']][0]} moved from {_fmt(m['metric'], m['start'])} to {_fmt(m['metric'], now)}.")

    # ------------------------------------------------------------------ handlers
    def h_greeting(self, c, p, a, sess, v) -> Reply:
        txt = v.greet()
        act = a.active(1)
        if act:
            txt += f" Note: {act[0].title.lower()} is active. Say status for details."
            sess.last_finding = act[0].id
        else:
            q = v.quip(0)
            txt += f" {q}" if q else ""
        return Reply(txt, "greeting", sev=a.overall, follow=["Status report", "What can you do?"])

    def h_status(self, c, p, a, sess, v) -> Reply:
        act = a.active(1)
        note = self._note(a)
        if not act:
            bits = [f"{METRIC_INFO[m][0]} {_fmt(m, a.values[m])}" for m in ("hr", "spo2", "onsd", "radiation_usv", "cabin_co2")
                    if m in a.values][:4]
            txt = f"All monitored parameters are inside model limits{note}."
            if bits:
                txt += " " + ", ".join(bits).capitalize() + "."
            if a.missing:
                txt += f" I have no current reading for {', '.join(METRIC_INFO[m][0] for m in a.missing[:3])}."
            mon = self._monitor_clause(sess, a)
            if mon:
                txt += " " + mon
            q = v.quip(0)
            if q:
                txt += " " + q
            return Reply(v.lead(txt, 0) if v.persona == "jarvis" else txt, "status", tools=["assessor"], sev=0,
                         follow=["How's my heart rate?", "Get a second opinion"])
        top = act[0]
        sess.last_finding = top.id
        if v.soften(top.severity):
            body = f"There is a minor variance in {METRIC_INFO.get(top.metric, (top.metric,))[0]}; nothing to act on yet."
        else:
            body = f"{top.title}. {top.evidence}"
        parts = [body, _trend_phrase(top.trend, top.metric)]
        if top.action and top.severity >= 2:
            parts.append(top.action)
        offer = self._offer(top, sess)
        parts.append(offer)
        rest = act[1:]
        if rest:
            parts.append(f"Also flagged: {', '.join(f.title.lower() for f in rest[:3])}.")
        mon = self._monitor_clause(sess, a)
        parts.append(mon)
        txt = " ".join(x for x in parts if x) + note
        fol = ["Why?", "What should I do?"] + (["Deploy protocol"] if sess.pending else [])
        return Reply(v.lead(txt, top.severity), "status", tools=["assessor"] + top.engine.split(" + "),
                     organ=top.organ_query, finding=top, follow=fol, sev=top.severity)

    def h_metric(self, c, p, a, sess, v) -> Reply:
        m = p.metric
        name = METRIC_INFO[m][0]
        sess.last_metric = m
        val = self._derived(m, a)
        if val is None:
            stale = self.feed(c).series(m, 3600.0)
            why = (f"The last one was {_dur(self.clock() - stale[-1][0])} ago, which is too old to trust."
                   if stale else f"Nothing is arriving from {SENSOR_FOR.get(m, 'a sensor')}.")
            return Reply(f"I have no current {name} reading. {why}", "metric", sev=0,
                         follow=["Status report", "What can you do?"])
        f = a.get(METRIC_FINDING.get(m, ""))
        sess.last_finding = f.id if f else sess.last_finding
        txt = f"{name.capitalize()} is {_fmt(m, val)}"
        if f and f.severity >= 1:
            txt += f", which is flagged as {f.severity_name}: {f.title.lower()}."
        else:
            txt += f", inside the model's range of {NORMAL_RANGE.get(m, 'normal')}." if m in NORMAL_RANGE else "."
        tr = self.feed(c).trend("hrv" if m == "strain" else m)
        if tr:
            tr["metric"] = "hrv" if m == "strain" else m
        tp = _trend_phrase(tr, m)
        r = self.feed(c).get(m)
        if r and r["age_s"] > 15:
            txt += f" Last reading was {_dur(r['age_s'])} ago."
        txt += " " + tp if tp else ""
        mon = self._monitor_clause(sess, a)
        txt += " " + mon if mon else ""
        txt += self._note(a)
        offer = self._offer(f, sess) if f else ""
        txt += " " + offer if offer else ""
        return Reply(v.lead(txt, f.severity if f else 0) if f and f.severity >= 2 else txt, "metric", tools=["assessor"],
                     organ=f.organ_query if f else None, finding=f, sev=f.severity if f else 0,
                     follow=(["Why?", "What should I do?"] if f else ["Status report"]))

    def h_trend(self, c, p, a, sess, v) -> Reply:
        m = p.metric
        if not m and sess.last_finding and a.get(sess.last_finding):
            m = a.get(sess.last_finding).metric
        if not m and sess.last_metric:
            m = sess.last_metric
        feed = self.feed(c)
        if m:
            key = "hrv" if m == "strain" else "perclos" if m == "fatigue" else m
            t = feed.trend(key)
            if not t:
                n = len(feed.series(key, 300.0))
                return Reply(f"I don't have enough {METRIC_INFO[m][0]} history to call a trend yet: {n} samples so far.",
                             "trend", follow=["Status report"])
            t["metric"] = key
            if t["direction"] == "steady":
                txt = (f"{METRIC_INFO[key][0].capitalize()} is steady over the last {_dur(t['span_s'])}, "
                       f"within about {t['last']:.{METRIC_INFO[key][3]}f}{(' ' + METRIC_INFO[key][1]) if METRIC_INFO[key][1] else ''}.")
            else:
                txt = _trend_phrase(t, key)
            mon = self._monitor_clause(sess, a)
            return Reply((txt + " " + mon).strip(), "trend", tools=["trend_regression"], follow=["Why?", "Status report"])
        moving = []
        for k in ("hr", "hrv", "spo2", "onsd", "cabin_co2", "radiation_usv", "bp_sys"):
            t = feed.trend(k)
            if t and t["direction"] != "steady":
                t["metric"] = k
                moving.append(_trend_phrase(t, k))
        txt = " ".join(moving[:3]) if moving else "Nothing is moving beyond sensor noise over the last five minutes."
        return Reply(txt, "trend", tools=["trend_regression"], follow=["Status report"])

    def h_explain(self, c, p, a, sess, v) -> Reply:
        f = self._resolve_finding(p, a, sess)
        if not f:
            if sess.symptom:
                s = sess.symptom
                return Reply(f"I localized {s['organName']} from what you told me ({', '.join(s['words']) or 'your description'}). "
                             f"No sensor covers it, so there is no measurement behind this beyond your report.", "explain")
            if p.metric and self._derived(p.metric, a) is not None:
                m = p.metric
                return Reply(f"Nothing is flagged: {METRIC_INFO[m][0]} is {_fmt(m, self._derived(m, a))}, inside "
                             f"{NORMAL_RANGE.get(m, 'its range')}.", "explain")
            return Reply("Nothing is flagged right now, so there is nothing to explain. Ask about a specific reading.",
                         "explain", follow=["Status report"])
        parts = [f"{f.title}. {f.evidence}", f.mechanism]
        if f.confidence is not None and v.candor(f.severity):
            parts.append(f"The differential model puts this at {f.confidence:.0f} percent among the six conditions it tracks. "
                         f"That is a ranking from prototype parameters, not a diagnosis.")
        parts.append(f.would_change_if)
        sess.last_finding = f.id
        return Reply(" ".join(x for x in parts if x), "explain", tools=["explain"], organ=f.organ_query, finding=f,
                     sev=f.severity, follow=["What should I do?", "Is it getting worse?"])

    def h_advice(self, c, p, a, sess, v) -> Reply:
        f = self._resolve_finding(p, a, sess)
        if f and f.severity >= 1:
            sess.last_finding = f.id
            parts = [f.action or "No specific action is attached to this finding; keep monitoring.", self._offer(f, sess)]
            if v.candor(f.severity):
                parts.append("These are prototype guidance steps; confirm against your flight surgeon protocol.")
            return Reply(" ".join(x for x in parts if x), "advice", organ=f.organ_query, finding=f, sev=f.severity,
                         follow=["Deploy protocol", "Why?"] if sess.pending else ["Why?"])
        if sess.symptom and sess.symptom.get("region"):
            r = sess.symptom["region"]
            return Reply(f"{ROUTINE_STEPS.get(r, ROUTINE_STEPS['other'])} I'll flag it if your readings change.", "advice")
        return Reply("Nothing in the data calls for action right now. I'll tell you the moment that changes.", "advice",
                     follow=["Status report"])

    def _correlate(self, region: str, a: Assessment) -> str:
        ms = REGION_METRICS.get(region, [])
        ids = {"head": {"sans", "bp", "fatigue"}, "chest": {"hr", "spo2", "bp", "strain", "co2"}, "abdomen": {"hr", "bp"}}.get(region, set())
        flagged = [f for f in a.active(1) if f.id in ids]
        if flagged:
            return f"Related reading: {flagged[0].evidence}"
        vals = [f"{METRIC_INFO[m][0]} {_fmt(m, a.values[m])}" for m in ms if m in a.values][:3]
        if vals:
            return (f"Your {', '.join(vals)} are inside model limits, though vitals alone can't rule out a local injury.")
        return "No sensor covers this region, so I'm going on what you tell me."

    def h_scan(self, c, p, a, sess, v) -> Reply:
        q = p.organ_query()
        focus = self.agent.tool_somatoscan_focus(q)
        sess.last_organ = focus
        txt = (f"Locked on {focus['organName']} ({focus['latinName']}), {focus['system']} system. "
               f"{self._correlate(p.region or 'other', a)} Tell me if something hurts and I'll assess it.")
        return Reply(txt, "scan", tools=["somatoscan"], organ=q, follow=["It hurts", "Show something else"],
                     extra={"_focus": focus})

    def h_symptom(self, c, p, a, sess, v) -> Reply:
        q = p.organ_query()
        if not q:
            return Reply("Which part of your body is it? Point me at it, like your left knee or your lower back.",
                         "symptom", follow=["My head", "My chest", "My lower back"])
        focus = self.agent.tool_somatoscan_focus(q)
        region = p.region or "other"
        sess.last_organ = focus
        sess.symptom = {"organ": focus["targetFocus"], "organName": focus["organName"], "region": region,
                        "severity": p.severity, "words": [w for w in p.symptom_words if w], "flags": [],
                        "denied": False, "focus": focus}
        parts = [f"Locked on {focus['organName']} ({focus['latinName']})."]
        if p.severity is not None:
            parts.append(f"You rate it {p.severity:.0f} out of 10." + (" At that level, treat it as urgent." if p.severity >= 8 else ""))
        parts.append(self._correlate(region, a))
        parts.append(RED_FLAG_Q.get(region, RED_FLAG_Q["other"]))
        sess.pending = {"type": "question", "region": region, "t": self.clock()}
        fol = ["No, none of that", "Yes"] + ([] if p.severity is not None else ["About a 3", "About a 7"])
        return Reply(" ".join(parts), "symptom", tools=["somatoscan", "triage"], organ=q, symptom=sess.symptom,
                     follow=fol, sev=2 if (p.severity or 0) >= 8 else 1, extra={"_focus": focus})

    def h_answer(self, c, p, a, sess, v) -> Reply:
        sym = sess.symptom
        if not sym:
            sess.pending = None
            return self.h_unknown(c, p, a, sess, v)
        negation = re.search(r"\b(no|not|none|without|nothing|never)\b|n't", p.text)
        confirmed = p.yes_no == "yes" or (p.yes_no is None and p.flag_hits and not negation)
        region, name = sym["region"], sym["organName"]
        sess.pending = None
        if confirmed:
            flags = [f for f in p.flag_hits if f] or ["an unspecified warning sign"]
            sym["flags"] = flags
            sess.pending = {"type": "protocol", "finding": "symptom", "protocol": "SYMPTOM_URGENT",
                            "label": f"urgent assessment log for {name}", "action": f"Urgent {name} assessment and monitoring",
                            "monitor": "hr", "organ": sym["organ"], "t": self.clock()}
            txt = (f"That raises my concern about {name}. {URGENT_STEPS.get(region, URGENT_STEPS['other'])} "
                   f"I can't rule out something serious from here, so treat it as urgent and bring in the flight surgeon role now. "
                   f"Say 'deploy protocol' and I'll log it and keep watching your vitals.")
            return Reply(v.lead(txt, 2), "answer_question", tools=["triage"], organ=sym["organ"], symptom=sym, sev=3,
                         follow=["Deploy protocol", "What else should I check?"], extra={"_focus": sym["focus"]})
        sym["denied"] = True
        measure = sym["focus"].get("concise_countermeasure", "conservative care")
        sess.pending = {"type": "protocol", "finding": "symptom", "protocol": "SYMPTOM_ROUTINE", "label": measure,
                        "action": f"{measure} for {name}", "monitor": "hr", "organ": sym["organ"], "t": self.clock()}
        txt = (f"Good, no red flags. {ROUTINE_STEPS.get(region, ROUTINE_STEPS['other'])} "
               f"Candidate measure for flight surgeon sign-off: {measure}. Say 'deploy protocol' to log it, "
               f"and tell me at once if anything changes.")
        return Reply(txt, "answer_question", tools=["triage"], organ=sym["organ"], symptom=sym, sev=1,
                     follow=["Deploy protocol", "It's getting worse"], extra={"_focus": sym["focus"]})

    def h_deploy(self, c, p, a, sess, v) -> Reply:
        pend = sess.pending if sess.pending and sess.pending.get("type") == "protocol" else None
        explicit = None
        if p.raw.strip().lower().startswith("/intervene"):
            explicit = p.raw.strip()[len("/intervene"):].strip() or None
        if not pend and explicit:
            pend = {"finding": "manual", "protocol": "MANUAL", "label": explicit, "action": explicit, "monitor": "hr"}
        if not pend:
            cand = next((f for f in a.active(2) if f.protocol_id), None)
            if cand:
                pr = PROTOCOLS[cand.protocol_id]
                pend = {"finding": cand.id, "protocol": cand.protocol_id, "label": pr["label"],
                        "action": pr["intervene_action"], "monitor": pr["monitor"], "organ": cand.organ_query}
        if not pend:
            return Reply("There is no protocol queued and no finding at caution level or above that has one attached, "
                         "so I won't deploy anything. Ask for status, or describe what hurts.", "deploy", follow=["Status report"])
        res = self.agent.execute_intervention(c, pend["action"], "NASA-HRP-2026-AUTONOMOUS", self.legacy_telemetry(a.values))
        mon_metric = pend.get("monitor") or "hr"
        start = self._derived(mon_metric, a)
        sess.monitor = ({"finding": pend["finding"], "metric": mon_metric, "start": start, "label": pend["label"],
                         "t0": self.clock()} if start is not None else None)
        sess.pending = None
        sim = self.feed(c).respond_to_countermeasure() if pend["finding"] not in ("symptom", "manual") else False
        name = (self.agent.memory.get_crew_profile(c) or {}).get("name", c)
        txt = (f"{v.ack()}. Logged {res['intervention_id']}: {pend['label']}, protocol {res['protocol']}, on {name}'s record. "
               f"No actuator is connected in this build, so start it by hand.")
        if sess.monitor:
            txt += f" I'll track {METRIC_INFO[mon_metric][0]} from {_fmt(mon_metric, start)}."
        if sim:
            txt += " The simulated feed will show a response over the next minute."
        # Prefer the organ already localized by the finding/symptom over execute_intervention's own
        # generic keyword-derived targetFocus, which doesn't know the specific body part involved.
        organ = pend.get("organ") or res.get("targetFocus")
        return Reply(txt, "deploy", tools=["intervention_log"], organ=organ, sev=0,
                     follow=["How's it going?", "Status report"], extra={"intervention": res})

    def h_cancel(self, c, p, a, sess, v) -> Reply:
        had = bool(sess.pending)
        sess.pending = None
        return Reply("Standing down. Nothing was deployed." if had else "Nothing is queued, so there is nothing to cancel.",
                     "cancel", follow=["Status report"])

    def h_swarm(self, c, p, a, sess, v) -> Reply:
        sv = swarm_vote(a)
        n, k = sv["voters"], sv["nominalVotes"]
        verdict = sv["consensusVerdict"]
        if verdict == "NOMINAL_MAINTENANCE_CONFIRMED":
            txt = f"{n} of {n} agents agree: all nominal, keep up routine maintenance."
        elif verdict.startswith("INSUFFICIENT"):
            txt = f"Only {n} agents had data to vote, which is too few for a consensus. Escalate to the flight surgeon role."
        else:
            top = a.active(1)[0] if a.active(1) else None
            txt = f"{n - k} of {n} agents recommend intervention"
            txt += f", led by {top.title.lower()}." if top else "."
            if sv["dissent"]:
                txt += f" {', '.join(d.replace('-Agent', '') for d in sv['dissent'])} voted nominal because their own inputs are normal."
            if verdict.startswith("SPLIT"):
                txt += " The group is split, so I'd escalate this to the flight surgeon role."
        if sv["abstained"]:
            txt += f" {', '.join(x.replace('-Agent', '') for x in sv['abstained'])} abstained: no data."
        if v.candor(a.overall) and sv["aggregateConfidencePct"] is not None:
            txt += f" Mean decision margin is {sv['aggregateConfidencePct']:.0f} percent; that is distance from each agent's threshold, not a probability."
        txt += self._note(a)
        top = a.active(1)[0] if a.active(1) else None
        if top:
            sess.last_finding = top.id
            self._offer(top, sess)
        extra = {"status": "SWARM_CONSENSUS_REACHED", "command": "/swarm", "swarmSize": 6, **sv}
        return Reply(txt, "swarm", tools=["autonomous_medical_swarm"], organ=top.organ_query if top else "brain",
                     finding=top, sev=a.overall, extra=extra,
                     follow=["Why?", "Deploy protocol"] if sess.pending else ["Status report"])

    def h_knowledge(self, c, p, a, sess, v) -> Reply:
        r = self.kb.search(p.text)
        if not r:
            return Reply("I don't have a source on that in my local library. I'd rather say so than guess.", "knowledge",
                         follow=["Status report", "What can you do?"])
        src = SOURCES.get(r["source"], r["source"])
        txt = f"{r['snippet']} Source: {src}, {r['page']}."
        if v.candor(0):
            txt += " That is a reference excerpt from the local library, not a clinical recommendation."
        return Reply(txt, "knowledge", tools=["knowledge_retrieval"], extra={"source": r})

    def h_scenario(self, c, p, a, sess, v) -> Reply:
        f = self.feed(c)
        if not f.simulate or f.device_active():
            return Reply("I'm reading live device data, so I won't inject a simulation.", "scenario")
        st = f.set_scenario(p.scenario or "NOMINAL")
        if (p.scenario or "NOMINAL") == "NOMINAL":
            txt = "Simulation cleared. The simulated physiology is recovering toward baseline."
        else:
            txt = (f"Simulation started: {p.scenario.replace('_', ' ').lower()}, developing over about {f._ramp:.0f} seconds. "
                   f"I'll speak up when it crosses a limit.")
        return Reply(txt, "scenario", tools=["scenario_control"], extra={"scenario": st},
                     follow=["Status report", "Reset simulation"])

    def h_capabilities(self, c, p, a, sess, v) -> Reply:
        llm = "on" if self.llm.available() else "off"
        txt = ("I read live telemetry and run five engines on it. Ask for status, any single reading and its trend, "
               "why I flagged something, or what to do about it. Tell me what hurts and I'll locate it, ask the right "
               "red-flag question and propose a measure for your confirmation. I can run a six-agent second opinion, "
               f"answer from the local NASA library, and log a protocol once you confirm. Telemetry source: {a.source}. "
               f"Local language model: {llm}.")
        return Reply(txt, "capabilities", follow=["Status report", "Get a second opinion", "Simulate a solar flare"])

    def h_identity(self, c, p, a, sess, v) -> Reply:
        return Reply("I'm P.U.L.S.E., an on-board medical decision-support assistant that runs entirely on this vehicle. "
                     "I'm a prototype: I'm not a certified medical device, and I support the crew's judgment rather than replace it.",
                     "identity")

    def h_thanks(self, c, p, a, sess, v) -> Reply:
        return Reply({"jarvis": f"Any time, {v.addr}.", "friday": "Anytime, Boss.", "tars": "You're welcome. I'll keep watching."}[v.persona],
                     "thanks")

    def h_bye(self, c, p, a, sess, v) -> Reply:
        act = a.active(2)
        extra = f" Note that {act[0].title.lower()} is still active." if act else ""
        return Reply(f"Standing by. I'll keep monitoring and speak up if anything changes.{extra}", "bye")

    def h_legacy(self, c, p, a, sess, v) -> Reply:
        t = self.legacy_telemetry(a.values)
        for pat, fn, tool, organ in LEGACY_TOOLS:
            if re.search(pat, p.text):
                res = getattr(self.agent, fn)(p.raw, t, crew_id=c) if fn != "tool_plugin" else self.agent.tool_plugin(p.raw, t, crew_id=c)
                return Reply(res.get("speechText", "Done."), "legacy", tools=[tool], organ=res.get("targetFocus", organ),
                             extra={k: val for k, val in res.items() if k not in ("speechText",)})
        return self.h_unknown(c, p, a, sess, v)

    def h_unknown(self, c, p, a, sess, v) -> Reply:
        if self.llm.enabled:
            facts = {"source": a.source, "values": {k: round(x, 2) for k, x in a.values.items()},
                     "flagged": [f.evidence for f in a.active(1)]}
            ans = self.llm.answer(p.raw, facts, v.persona)
            if ans:
                return Reply(ans, "unknown", tools=["local_llm"], llm=True)
        act = a.active(1)
        hint = (f"Ask me about the {act[0].title.lower()}, or say status." if act else
                "Try: status, 'what's my heart rate', 'my right thumb hurts', 'second opinion', or 'simulate a solar flare'.")
        return Reply(f"I didn't catch a request I can act on. {hint}", "unknown", follow=["Status report", "What can you do?"])

    # ------------------------------------------------------------------ proactive alerts
    def check_alerts(self, c: str) -> List[Dict[str, Any]]:
        """Edge-triggered: alert on first CAUTION+ (confirmed over 2 ticks) or on escalation; announce recovery."""
        with self.lock:
            sess = self.session(c)
            a = self.assess(c)
            v = Voice(sess.persona, sess.honesty, sess.humor, sess.turns)
            out: List[Dict[str, Any]] = []
            sev_now = {f.id: f for f in a.findings}
            for fid in set(sev_now) | set(sess.alert_state):
                f = sev_now.get(fid)
                sev = f.severity if f else 0
                st = sess.alert_state.setdefault(fid, {"sev": 0, "streak": 0, "alerted": 0, "low": 0})
                st["streak"] = st["streak"] + 1 if sev == st["sev"] else 1
                st["sev"] = sev
                st["low"] = 0 if sev >= 2 else st["low"] + 1
                if f and sev >= 2 and st["streak"] >= 2 and sev > st["alerted"]:
                    st["alerted"] = sev
                    offer = self._offer(f, sess)
                    parts = [f"{f.title}. {f.evidence}", _trend_phrase(f.trend, f.metric), f.action if sev >= 3 else "", offer]
                    sess.last_finding = f.id
                    text = v.lead(" ".join(x for x in parts if x) + self._note(a), sev)
                    out.append(self._alert(c, "alert", f, sev, text, a))
                elif st["alerted"] >= 2 and st["low"] >= 5:
                    st["alerted"] = 0
                    title = f.title if f else fid
                    text = f"{v.addr}, the {title.lower()} has cleared. I'll keep monitoring."
                    out.append(self._alert(c, "resolved", f, 0, text, a))
            sess.alerts = (sess.alerts + out)[-20:]
            return out

    def _alert(self, c, kind, f: Optional[Finding], sev, text, a) -> Dict[str, Any]:
        return {"type": kind, "crew_id": c, "t": self.clock(), "finding": f.id if f else None, "severity": sev,
                "severityName": SEV_NAMES[sev], "speechText": text, "spokenText": speechify(text),
                "targetFocus": f.organ_query if f else None, "source": a.source,
                "followUps": ["Why?", "Deploy protocol"] if kind == "alert" and f and f.protocol_id else ["Status report"]}

    # ------------------------------------------------------------------ response packaging
    def _focus(self, reply: Reply) -> Optional[Dict[str, Any]]:
        if reply.extra.get("_focus"):
            return reply.extra["_focus"]
        if reply.organ:
            return self.agent.tool_somatoscan_focus(reply.organ)
        return None

    def _package(self, c, query, p: Parsed, a: Assessment, sess: Session, reply: Reply) -> Dict[str, Any]:
        focus = self._focus(reply)
        profile = self.agent.memory.get_crew_profile(c) or {}
        vals = a.values
        diag = None
        if focus and (reply.finding or reply.symptom or p.intent in ("scan", "deploy", "swarm", "legacy")):
            f, s = reply.finding, reply.symptom
            diag = {
                "crewId": c, "crewName": profile.get("name", "Astronaut"), "callsign": profile.get("callsign", "Ares-Lead"),
                "role": profile.get("role", "Mission Specialist"),
                "condition": f.title if f else (f"Reported {', '.join(s['words'])} (unconfirmed)" if s else "Region of interest"),
                "targetStructure": focus["targetFocus"], "isolatedOrgans": [focus["targetFocus"]],
                "latinName": focus["latinName"], "system": focus["system"],
                "painLocus": f"Region of interest: {focus['organName']}",
                "painSeverity": s["severity"] if s else None, "strainPercentage": None,
                "vitals": {"hr": round(vals["hr"]) if "hr" in vals else None,
                           "bp": f"{vals['bp_sys']:.0f}/{vals['bp_dia']:.0f}" if "bp_sys" in vals and "bp_dia" in vals else None,
                           "onsd": round(vals["onsd"], 2) if "onsd" in vals else None, "icp": None,
                           "radiation": round(vals["radiation_usv"], 1) if "radiation_usv" in vals else None},
                "etiology": f.mechanism if f and f.mechanism else focus["etiology"],
                "countermeasure": (f.action if f and f.action else focus["countermeasure"]),
                "hudTargetCoords": {"x": 50, "y": 48},
            }
        post = a.engines.get("astrocausal")
        causal = ({"topCondition": post["primary_diagnosis"], "topProbability": post["confidence_pct"],
                   "posteriors": {r["condition"]: r["probability_pct"] for r in post["differential_rankings"]}}
                  if post else None)
        extra = {k: val for k, val in reply.extra.items() if not k.startswith("_")}
        out = {
            "status": extra.pop("status", "RESPONSE_READY"),
            "query": query, "intent": p.intent, "intentConfidence": round(p.confidence, 2),
            "usedContext": p.used_context, "persona": sess.persona,
            "speechText": reply.text, "spokenText": speechify(reply.text),
            "targetFocus": focus["targetFocus"] if focus else None,
            "somatoScan": focus, "diagnosticIssue": diag, "causal": causal,
            "findings": [f.to_dict() for f in a.findings],
            "assessment": {"overall": a.overall, "overallName": SEV_NAMES[a.overall], "missing": a.missing},
            "telemetry": {"source": a.source, "scenario": self.feed(c).scenario_state(), "values": vals},
            "followUps": reply.follow,
            "pending": ({k: val for k, val in sess.pending.items() if k != "t"} if sess.pending else None),
            "toolsUsed": reply.tools or [p.intent], "llmUsed": reply.llm,
        }
        out.update(extra)
        return out
