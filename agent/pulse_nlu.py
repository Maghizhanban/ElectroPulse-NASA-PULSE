#!/usr/bin/env python3
"""
pulse_nlu.py
Language layer for P.U.L.S.E.: understanding (intent + entities), local knowledge retrieval, and
persona voice. No clinical content lives here.

Why this replaces the old keyword chain: the old code did `'hi' in query`, which matches "thigh",
"this" and "nothing", and `'spe' in query`, which matches "special". Everything here uses word
boundaries, corrects near-miss spellings / speech-recognition slips, and keeps dialogue state so
"why?" and "is it getting worse?" resolve against the previous turn.
"""

import difflib
import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

# --------------------------------------------------------------------------- vocabulary
METRIC_PATTERNS: List[Tuple[str, str]] = [
    ("hrv", r"\b(hrv|heart rate variability|variability)\b"),
    ("hr", r"\b(heart ?rate|pulse rate|bpm|resting heart|my pulse|beats per minute|tachycardia|bradycardia)\b"),
    ("spo2", r"\b(spo2|sp o2|oxygen sat\w*|blood oxygen|o2 sat\w*|oxygen level|oxygen|saturation)\b"),
    ("skin_temp", r"\b(temperature|temp|fever|feverish|body temp\w*)\b"),
    ("bp_sys", r"\b(blood pressure|bp|systolic|diastolic)\b"),
    ("cabin_co2", r"\b(co2|co 2|carbon dioxide|cabin air|air quality|hypercapnia|scrubber|cdra)\b"),
    ("radiation_usv", r"\b(radiation|rad level|dose rate|dose|sieverts?|msv|usv|solar (flare|storm|particle|event)"
                      r"|flare|gcr|cosmic rays?|proton storm|spe)\b"),
    ("onsd", r"\b(onsd|optic nerve( sheath)?( diameter)?|sheath diameter|optic sheath|sans|intracranial pressure|icp"
             r"|cephalad|eyesight)\b"),
    ("fatigue", r"\b(fatigue|tired|tiredness|sleepy|sleepiness|drows\w*|exhaust\w*|alertness|vigilance|sleep|"
                r"cognitive|perclos|blinking)\b"),
    ("strain", r"\b(stress|stressed|anxiety|anxious|mood|mental|emotion\w*|nervous|calm)\b"),
]

BODY_WORDS = {
    "thumb", "thumbs", "finger", "fingers", "hand", "hands", "wrist", "forearm", "elbow", "arm", "arms",
    "shoulder", "shoulders", "bicep", "biceps", "tricep", "triceps", "chest", "rib", "ribs", "back", "spine",
    "neck", "head", "face", "jaw", "ear", "ears", "eye", "eyes", "brain", "throat", "heart", "lung", "lungs",
    "stomach", "belly", "tummy", "abs", "abdomen", "abdominal", "liver", "kidney", "kidneys", "spleen", "bladder",
    "hip", "buttock", "thigh", "knee", "knees", "calf", "ankle", "foot", "feet", "toe", "toes", "heel", "leg",
    "legs", "skin", "bone", "bones", "muscle", "muscles", "pelvis", "pelvic", "groin", "gut", "flank", "lumbar",
    "thoracic", "cervical", "cranial", "ocular", "optic", "cardiac", "pulmonary", "hepatic", "renal", "gastric",
    "rectus", "core", "cramp", "cramps"
}
_BODY_CANON = {
    "thumbs": "thumb", "fingers": "finger", "hands": "hand", "arms": "arm", "shoulders": "shoulder",
    "biceps": "bicep", "triceps": "tricep", "ribs": "rib", "ears": "ear", "eyes": "eye",
    "lungs": "lung", "tummy": "belly", "kidneys": "kidney", "knees": "knee", "feet": "foot",
    "toes": "toe", "legs": "leg", "bones": "bone", "muscles": "muscle",
    "abdominal": "rectus abdominis", "abdomen": "rectus abdominis", "abs": "rectus abdominis",
    "rectus": "rectus abdominis", "gut": "stomach", "pelvic": "pelvis", "lumbar": "spine",
    "cervical": "neck", "thoracic": "chest", "ocular": "eye", "optic": "eye", "cardiac": "heart",
    "pulmonary": "lung", "hepatic": "liver", "renal": "kidney", "gastric": "stomach",
    "cramp": "rectus abdominis", "cramps": "rectus abdominis"
}

REGIONS = {
    "head": {"head", "brain", "eye", "ear", "face", "jaw", "cranial", "ocular", "optic"},
    "chest": {"chest", "heart", "lung", "rib", "throat", "thoracic", "cardiac", "pulmonary"},
    "abdomen": {"stomach", "belly", "abs", "abdomen", "abdominal", "rectus abdominis", "liver", "kidney", "spleen", "bladder", "gut", "flank", "pelvis", "pelvic", "hepatic", "renal", "gastric"},
    "spine": {"back", "spine", "neck", "lumbar", "cervical"},
    "limb": {"hand", "finger", "thumb", "wrist", "forearm", "elbow", "arm", "shoulder", "bicep", "tricep", "hip",
             "thigh", "knee", "calf", "ankle", "foot", "toe", "heel", "leg", "buttock", "skin", "bone", "muscle"},
}

# symptom phrases that imply an organ even when no body part is named
SYMPTOM_ORGANS: List[Tuple[str, str, str]] = [
    (r"\b(abdominal cramps?|cramps? in (the |her |his )?abdomen|stomach cramps?|core cramps?|severe cramps?)\b", "rectus abdominis", "abdominal cramps"),
    (r"\b(headache\w*|migraine)\b", "brain", "headache"),
    (r"\b(dizz\w*|light ?headed|vertigo)\b", "brain", "dizziness"),
    (r"\b(short(ness)? of breath|can'?t breathe|breathless|hard to breathe|difficulty breathing)\b", "lung", "breathing"),
    (r"\bchest (pain|tight\w*|pressure)\b", "heart", "chest pain"),
    (r"\b(nause\w*|vomit\w*|throwing up)\b", "stomach", "nausea"),
    (r"\b(blurr?y|blurred|double vision|can'?t see|seeing (spots|flashes|stars)|flashes of light|"
     r"vision (is |has )?(bad|blurry|worse|changed|loss|problems?|going))\b", "eye", "visual change"),
]

SYMPTOM_RE = re.compile(
    r"\b(hurt\w*|pain\w*|ache|aches|aching|sore\w*|sprain\w*|strain\w*|swollen|swelling|numb\w*|tingl\w*|"
    r"bleed\w*|cramp\w*|injur\w*|broke\w*|fractur\w*|cut|burn\w*|stiff\w*|throb\w*|bruis\w*|weak\w*|pulled|"
    r"tweaked|twisted|struck|impact|jammed|pinched)\b")
SCAN_RE = re.compile(r"\b(scan|show|locate|find|where( is| are)?|look at|zoom|focus|highlight|display|pull up|"
                     r"examine|inspect|check)\b")

SEVERITY_WORDS = [
    (r"\b(excruciating|agoniz\w*|unbearable|worst)\b", 9), (r"\b(severe|terrible|awful|intense)\b", 8),
    (r"\b(bad|strong|sharp|serious)\b", 7), (r"\b(moderate|medium|noticeable)\b", 5),
    (r"\b(mild|slight|minor|little|small|faint)\b", 3),
]

SCENARIO_WORDS = [
    (r"\b(sans|fluid shift|optic|intracranial|cephalad)\b", "SANS_FLUID_SHIFT"),
    (r"\b(solar|flare|radiation|storm|spe|particle)\b", "SOLAR_PARTICLE_EVENT"),
    (r"\b(co2|hypercapnia|scrubber|carbon dioxide|cabin air)\b", "CABIN_HYPERCAPNIA"),
    (r"\b(fatigue|exhaust\w*|sleep|tired|drows\w*)\b", "COGNITIVE_EXHAUSTION"),
]

FUZZY_VOCAB = sorted({
    "radiation", "temperature", "pressure", "oxygen", "saturation", "fatigue", "exhausted", "shoulder", "stomach",
    "abdomen", "forearm", "carbon", "dioxide", "variability", "intracranial", "protocol", "countermeasure",
    "recommend", "simulate", "scenario", "consensus", "trending", "worse", "better", "status", "report",
    "swelling", "numbness", "headache", "vision", "breathing", "dizzy", "nausea", "elbow", "ankle", "thumb",
    "finger", "knee", "spine", "chest", "heart", "brain", "muscle", "sleepy", "stress", "anxiety", "deploy",
    "execute", "confirm", "cancel", "swarm", "crew", "optic", "sheath", "hypercapnia", "flare", "storm",
})

_COMMON = {"should", "about", "there", "their", "these", "those", "would", "could", "where", "which", "while",
           "other", "after", "before", "being", "think", "going", "right", "still", "every", "pulse", "check",
           "start", "state", "stage", "water", "first", "again", "doing", "might", "never", "since", "under"}

_WAKE = re.compile(r"^(?:hey |ok |okay |yo )?(?:jarvis|tars|friday|pulse|computer)\b[\s,:.!-]*", re.I)


# --------------------------------------------------------------------------- parse result
@dataclass
class Parsed:
    raw: str
    text: str
    intent: str = "unknown"
    metric: Optional[str] = None
    metrics: List[str] = field(default_factory=list)
    body: Optional[str] = None            # canonical body-part word
    side: Optional[str] = None            # left / right
    region: Optional[str] = None
    organ_override: Optional[str] = None  # organ implied by a symptom phrase
    severity: Optional[float] = None
    symptom_words: List[str] = field(default_factory=list)
    flag_hits: List[str] = field(default_factory=list)
    yes_no: Optional[str] = None
    scenario: Optional[str] = None
    crew_id: Optional[str] = None
    persona_hint: Optional[str] = None
    corrected: bool = False
    confidence: float = 0.0
    used_context: bool = False

    def organ_query(self) -> Optional[str]:
        base = self.organ_override or self.body
        if not base:
            return None
        return f"{self.side + ' ' if self.side else ''}{base}"


def normalize_text(raw: str) -> str:
    t = (raw or "").lower().strip().replace("’", "'")
    t = re.sub(r"\bp\.?\s?u\.?\s?l\.?\s?s\.?\s?e\.?(?=[\s,:.!?]|$)", "pulse", t)
    t = re.sub(r"[^a-z0-9/'.\s%+-]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def fuzzy_fix(text: str) -> Tuple[str, bool]:
    out, changed = [], False
    for tok in text.split():
        core = tok.strip(".,!?")
        if len(core) >= 5 and core not in FUZZY_VOCAB and core not in _COMMON and core.isalpha():
            m = difflib.get_close_matches(core, FUZZY_VOCAB, n=1, cutoff=0.88)
            m = [w for w in m if not (w.startswith(core) or core.startswith(w)) and w[0] == core[0]]
            if m:
                out.append(m[0])
                changed = True
                continue
        out.append(tok)
    return " ".join(out), changed


def _find_severity(text: str) -> Optional[float]:
    m = re.search(r"\b(\d{1,2})\s*(?:/|out of)\s*10\b", text) or \
        re.search(r"\b(?:pain|hurts?|severity|level|rate (?:it|that))\s*(?:level |of |is |at |a |an )*(\d{1,2})\b", text)
    if m:
        v = float(m.group(1))
        if 0 <= v <= 10:
            return v
    for pat, val in SEVERITY_WORDS:
        if re.search(pat, text):
            return float(val)
    return None


def parse(raw: str, session: Any = None) -> Parsed:
    text0 = normalize_text(raw)
    stripped = _WAKE.sub("", text0).strip()
    text, corrected = fuzzy_fix(stripped)
    p = Parsed(raw=raw, text=text, corrected=corrected)
    if re.search(r"\btars\b", raw, re.I):
        p.persona_hint = "tars"
    elif re.search(r"\bfriday\b", raw, re.I):
        p.persona_hint = "friday"
    elif re.search(r"\bjarvis\b", raw, re.I):
        p.persona_hint = "jarvis"
    pending = getattr(session, "pending", None)

    # ---- entities -------------------------------------------------------------------
    work = text
    for metric, pat in METRIC_PATTERNS:
        m = re.search(pat, work)
        if m:
            p.metrics.append(metric)
            work = work[:m.start()] + " " + work[m.end():]      # consume so "heart rate" isn't a body part
    p.metric = p.metrics[0] if p.metrics else None
    p.severity = _find_severity(text)
    p.symptom_words = [m.group(0) for m in SYMPTOM_RE.finditer(text)]
    if p.severity is None and p.symptom_words:
        m = re.search(r"\b(?:about|around|maybe|roughly|like|it'?s|its|is|at|a)\s+(?:a |an )?(\d{1,2})\b"
                      r"(?!\s*(?:mm|ms|bpm|%|days?|hours?|mins?|minutes?|weeks?))", text)
        if m and 0 <= int(m.group(1)) <= 10:
            p.severity = float(m.group(1))
    sm = re.search(r"\b(left|right)\b", text)
    p.side = sm.group(1) if sm else None
    crew_matches = [
        (r"\b(sarah|vance)\b", "sarah"),
        (r"\b(marcus|chen)\b", "marcus"),
        (r"\b(elena|rostova)\b", "elena"),
        (r"\b(david|thorne)\b", "david"),
    ]
    for pat, cid in crew_matches:
        if re.search(pat, text):
            p.crew_id = cid
            break

    for tok in re.findall(r"[a-z]+", work):
        if tok in BODY_WORDS:
            p.body = _BODY_CANON.get(tok, tok)
            break
    for pat, organ, flag in SYMPTOM_ORGANS:
        if re.search(pat, text):
            p.organ_override = p.organ_override or organ
            p.flag_hits.append(flag)
            p.symptom_words.append(flag)
    if p.body or p.organ_override:
        key = p.organ_override or p.body
        p.region = next((r for r, members in REGIONS.items() if key in members), "other")
        if p.organ_override and not p.body:
            p.region = {"brain": "head", "eye": "head", "lung": "chest", "heart": "chest",
                        "stomach": "abdomen"}.get(p.organ_override, "other")
    for kw in ("numb", "tingl", "swell", "swollen", "can't move", "cant move", "weak", "rigid", "bleed",
               "pressure", "radiat", "short of breath", "blurr", "flash"):
        if kw in text:
            p.flag_hits.append(kw)

    # ---- intent ---------------------------------------------------------------------
    def done(intent: str, conf: float = 0.85, ctx: bool = False) -> Parsed:
        p.intent, p.confidence, p.used_context = intent, conf, ctx
        return p

    if not text:
        return done("greeting", 0.7)

    if text.startswith("/"):
        cmd = text.split()[0]
        return done({"/swarm": "swarm", "/intervene": "deploy"}.get(cmd, "legacy"), 1.0)

    yes = re.match(r"^(yes|yeah|yep|yup|affirmative|correct|i do|there is|there are|it is|definitely|sure|ok yes)\b", text)
    no = re.match(r"^(no|nope|nah|negative|not really|none|i don'?t|there isn'?t|it isn'?t|nothing)\b", text)
    p.yes_no = "yes" if yes else "no" if no else None

    deploy_re = (r"\b(deploy|execute|initiate|activate|engage|authorize|approve|apply|start|begin|run)\b.{0,25}"
                 r"\b(protocol|countermeasure|treatment|procedure|session|plan|recommendation|it|that|lbnp|shelter)\b")
    if re.search(deploy_re, text) and not re.search(r"\b(simulat\w*|scenario|drill)\b", text):
        return done("deploy", 0.95)
    if pending and pending.get("type") == "protocol":
        if re.search(r"\b(go ahead|do it|proceed|make it so|confirmed?|authorized|approved|yes please)\b", text) or yes:
            return done("deploy", 0.9, True)
        if re.search(r"\b(cancel|abort|negative|never ?mind|stand down|don'?t|do not|hold off)\b", text) or no:
            return done("cancel", 0.9, True)
    if re.search(r"\b(cancel|abort|never ?mind|stand down|disregard|hold off)\b", text) and \
            not re.search(r"\b(simulat\w*|scenario|drill)\b", text):
        return done("cancel", 0.8)

    if re.search(r"\b(clear|end|stop|reset|cancel|normalize|back to normal)\b.{0,20}\b(simulation|scenario|drill|sim)\b", text) \
            or re.search(r"\breset (the )?simulation\b", text):
        p.scenario = "NOMINAL"
        return done("scenario", 0.95)
    if re.search(r"\b(simulate|simulation|inject|trigger|stage|induce|cause|run|start)\b", text) and \
            re.search(r"\b(scenario|drill|simulat\w*|inject|trigger|stage|induce)\b", text):
        for pat, name in SCENARIO_WORDS:
            if re.search(pat, text):
                p.scenario = name
                return done("scenario", 0.9)

    if re.search(r"\b(swarm|second opinion|all (the )?agents|agent consensus|consensus|six agents|cross.?check|"
                 r"have the agents|everyone vote)\b", text):
        return done("swarm", 0.95)

    # follow-up answers to a pending clinical question
    if pending and pending.get("type") == "question" and (p.yes_no or p.flag_hits or p.symptom_words):
        if not (p.body and not p.yes_no):   # a new body part means a new complaint, not an answer
            return done("answer_question", 0.9, True)

    if re.search(r"\b(what can you (do|help)|what do you do|capabilities|commands|how do i use|what are you able)\b", text) \
            or text in ("help", "help me"):
        return done("capabilities", 0.9)
    if re.search(r"\b(who are you|what are you|your name|are you (an? )?(ai|real|human|robot))\b", text):
        return done("identity", 0.9)
    if re.search(r"\b(thanks|thank you|appreciate|good job|well done|nice work|cheers)\b", text):
        return done("thanks", 0.9)
    if re.search(r"\b(goodbye|bye|that'?s all|signing off|dismissed|stand down)\b", text):
        return done("bye", 0.8)

    if re.search(r"\b(humor|honesty|sarcasm|parameter|settings?)\b", text) or \
       re.search(r"\b(what is your|what'?s your)\b.{0,25}\b(humor|honesty|setting|parameter)\b", text):
        return done("persona_query", 0.95)

    if re.search(r"\b(how is|how'?s|check on|status on|what about|update on|vitals (for|of)|inspect)\b.{0,25}\b(sarah|marcus|elena|david|vance|chen|rostova|thorne|crew|everyone)\b", text):
        return done("status", 0.95)

    know_frame = re.search(r"\b(what (is|are|does|causes)|explain|tell me about|define|how does|how do|why do(es)?|"
                           r"what happens)\b", text)
    personal = re.search(r"\b(my|our|current\w*|right now|now|today|cabin|reading|level|levels|rate|status)\b", text)
    if know_frame and not personal and not p.symptom_words and not SCAN_RE.search(text):
        return done("knowledge", 0.75)

    # symptom / scan beats metric when a body part (or symptom phrase) is present
    has_site = bool(p.body or p.organ_override)
    if has_site and (p.symptom_words or p.severity is not None) and not re.search(r"^(what|how|is|are)\b.*\brate\b", text):
        return done("symptom", 0.9)
    if has_site and (SCAN_RE.search(text) or len(text.split()) <= 4) and not p.metric:
        return done("scan", 0.8)
    if has_site and not p.metric:
        return done("scan", 0.6)

    trend_re = (r"\b(getting|trending|going|gotten) (worse|better|up|down|higher|lower)|\btrend\w*|over time|"
                r"\brising|\bfalling|\bimprov\w+|\bworsen\w*|since (earlier|yesterday|this morning|last)|"
                r"(last|past) (hour|minute|day|few)|is it (stable|steady|changing|holding)|\bstable\b|\bcompared to\b")
    if re.search(trend_re, text):
        return done("trend", 0.85, bool(session and getattr(session, "last_finding", None) and not p.metric))

    if re.search(r"\b(why|how come|what makes you say|based on what|how sure|how confident|confidence|"
                 r"explain (that|your|why)|what'?s (the )?(reason|evidence|basis)|how do you know)\b", text):
        return done("explain", 0.85, bool(session and getattr(session, "last_finding", None) and not p.metric))

    if re.search(r"\b(what (should|can|do|shall) (i|we) do|what do you (recommend|suggest|advise)|"
                 r"what('?s| is) the (next step|plan|treatment|countermeasure|protocol|fix)|"
                 r"how (do|can|should) (i|we) (fix|treat|handle|reduce|lower|bring|deal)|any (recommendations|"
                 r"suggestions|options)|recommend\w*|advice|treat\w*|countermeasure|next step)\b", text):
        return done("advice", 0.85, bool(session and getattr(session, "last_finding", None) and not p.metric))

    if p.metric:
        return done("metric", 0.85)

    if re.search(r"\bstatus( report)?\b|\bhow (am i|are we|is everything|are things|am i doing)\b|"
                 r"\b(sit(uation)? ?rep(ort)?|overview|summary|check ?up|health check|diagnostic)\b|"
                 r"\banything (wrong|unusual|abnormal|concerning|i should know)\b|"
                 r"\b(am i|are we) (ok|okay|fine|healthy|good|alright)\b|\bhow'?s my health\b|"
                 r"\bwhat'?s (going on|happening|up)\b|\ball (systems )?(nominal|green|clear)\b|\bany alerts?\b", text):
        return done("status", 0.9)

    if re.search(r"\b(hello|hi|hey|good (morning|evening|afternoon)|are you (there|online|awake)|you there|"
                 r"wake up|anyone there|online)\b", text):
        return done("greeting", 0.85)

    if re.search(r"^/?(learn|boost|teamwork|goal|plugin)$|\brecalibrate (the )?model\b|\blearn priors\b|\boverdrive\b|"
                 r"\bboost telemetry\b|\bsync crew\b|\bcrew roster\b|\bcrew (status|vitals|stress)\b|"
                 r"\bhow is the crew\b|\bmigrate workflows?\b|\bcpg migration\b|\bhealth goals\b|\bhrp targets\b|"
                 r"\bmission goals\b|\bplugin status\b|\bmedical plugin\b|\bdevice plugin\b|\bwhich (devices|instruments)\b", text):
        return done("legacy", 0.8)

    return done("unknown", 0.0)


# --------------------------------------------------------------------------- knowledge (BM25)
_STOP = set("the a an of to in and or is are was were be been for on with as by at from that this it its into than "
            "then so such not can could may might will would should do does did has have had which who whom what "
            "when where how why about over under between during tell me explain define".split())


def _tok(s: str) -> List[str]:
    return [w for w in re.findall(r"[a-z0-9]+", s.lower()) if w not in _STOP and len(w) > 1]


class Knowledge:
    """Local BM25 search over the ingested NASA HRP / CSA chunks. Video auto-caption chunks are excluded
    by default: they are noisy speech-recognition text, not citable evidence."""

    def __init__(self, chunks: List[Dict[str, Any]], include_video: bool = False):
        self.chunks = [c for c in chunks if include_video or not str(c.get("file", "")).startswith("NASA-Video")]
        self.docs = [_tok(f"{c.get('page', '')} {c.get('content', '')}") for c in self.chunks]
        n = max(1, len(self.docs))
        self.avg = sum(len(d) for d in self.docs) / n
        self.df: Dict[str, int] = {}
        for d in self.docs:
            for w in set(d):
                self.df[w] = self.df.get(w, 0) + 1
        self.n = n

    def search(self, query: str, min_terms: int = 2, min_score: float = 3.0) -> Optional[Dict[str, Any]]:
        q = list(dict.fromkeys(_tok(query)))
        if not q or not self.chunks:
            return None
        best, best_s, best_hits = None, 0.0, 0
        for c, d in zip(self.chunks, self.docs):
            if not d:
                continue
            tf: Dict[str, int] = {}
            for w in d:
                tf[w] = tf.get(w, 0) + 1
            s, hits = 0.0, 0
            for w in q:
                if w in tf:
                    hits += 1
                    idf = math.log(1 + (self.n - self.df[w] + 0.5) / (self.df[w] + 0.5))
                    s += idf * tf[w] * 2.5 / (tf[w] + 1.5 * (0.25 + 0.75 * len(d) / self.avg))
            if s > best_s:
                best, best_s, best_hits = c, s, hits
        need = 1 if len(q) == 1 else min_terms
        if best is None or best_hits < need or best_s < min_score:
            return None
        text = " ".join(str(best.get("content", "")).split())
        snippet = text[:300]
        cut = max(snippet.rfind(". "), snippet.rfind("; "))
        if cut > 120:
            snippet = snippet[:cut + 1]
        return {"snippet": snippet, "source": best.get("file"), "page": best.get("page"), "score": round(best_s, 2)}


# --------------------------------------------------------------------------- persona voice
SPOKEN = [
    (r"(\d)\s*µSv/h", r"\1 microsieverts per hour"), (r"(\d)\s*mSv", r"\1 millisieverts"),
    (r"(\d)\s*mmHg", r"\1 millimeters of mercury"), (r"(\d)\s*mm\b", r"\1 millimeters"),
    (r"(\d)\s*bpm", r"\1 beats per minute"), (r"(\d)\s*°C", r"\1 degrees Celsius"),
    (r"(\d)\s*ms\b", r"\1 milliseconds"), (r"(\d)\s*%", r"\1 percent"), (r"(\d)/100\b", r"\1 out of 100"),
    (r"\bSpO2\b", "blood oxygen"), (r"\bCO2\b", "C O 2"), (r"\bSANS\b", "S A N S"), (r"\bLBNP\b", "L B N P"),
]


def speechify(text: str) -> str:
    for pat, rep in SPOKEN:
        text = re.sub(pat, rep, text)
    return text


class Voice:
    """Persona is delivery, not content: the same findings are reported, framed differently.
    Honesty < 50 may soften WATCH-level wording and drop caveats, but never hides a caution/critical fact."""

    QUIPS = {
        "tars": ["I would describe your vitals as boringly healthy.", "Humor setting acknowledged. Your numbers are not funny.",
                 "Nothing is on fire. I checked."],
        "jarvis": ["Nothing demands your attention, sir. A rare luxury.", "All quiet, as far as the instruments can tell."],
        "friday": ["Quiet on all fronts.", "Nothing to flag, you're good."],
    }

    def __init__(self, persona: str = "jarvis", honesty: int = 90, humor: int = 30, turn: int = 0):
        self.persona = persona if persona in ("jarvis", "tars", "friday") else "jarvis"
        self.honesty = max(0, min(100, int(honesty)))
        self.humor = max(0, min(100, int(humor)))
        self.turn = turn

    @property
    def addr(self) -> str:
        return "Boss" if self.persona == "friday" else "Commander"

    def greet(self) -> str:
        return {"jarvis": f"Online and standing by, {self.addr}.",
                "friday": f"FRIDAY here, {self.addr}. Telemetry is live.",
                "tars": f"TARS online, {self.addr}. Honesty {self.honesty} percent, humor {self.humor} percent."}[self.persona]

    def lead(self, text: str, sev: int) -> str:
        if sev >= 3:
            return {"jarvis": f"{self.addr}, this is urgent. {text}", "friday": f"{self.addr}, urgent. {text}",
                    "tars": f"{self.addr}. This is serious. {text}"}[self.persona]
        if sev == 2:
            return {"jarvis": f"{self.addr}, I need your attention. {text}", "friday": f"Heads up, {self.addr}. {text}",
                    "tars": f"{self.addr}. {text}"}[self.persona]
        return {"jarvis": f"{self.addr}, {text[0].lower() + text[1:]}" if text else text,
                "friday": text, "tars": text}[self.persona]

    def ack(self) -> str:
        return {"jarvis": "Understood", "friday": "On it", "tars": "Acknowledged"}[self.persona]

    def soften(self, sev: int) -> bool:
        return sev <= 1 and self.honesty < 50

    def candor(self, sev: int) -> bool:
        return self.honesty >= 50 or sev >= 2

    def quip(self, sev: int) -> str:
        if sev == 0 and self.humor >= (40 if self.persona == "tars" else 60):
            pool = self.QUIPS[self.persona]
            return pool[self.turn % len(pool)]
        return ""
