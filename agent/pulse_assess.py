#!/usr/bin/env python3
"""
pulse_assess.py
Turns live telemetry into structured, evidence-backed findings using the repo's own engines
(AstroCausal, ChronoPulse, BioVision, NeuroType). Nothing here writes prose for the crew -
that is the dialogue layer's job. A Finding carries the numbers, thresholds, trend and the
reasoning inputs so every spoken statement can be traced back to data.

Thresholds are PROTOTYPE MODEL PARAMETERS, not validated clinical limits.
"""

import os
import sys
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

_base = os.path.abspath(os.path.dirname(__file__))
_engines = os.path.abspath(os.path.join(_base, "..", "ai_engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from astrocausal_engine import AstroCausalEngine  # noqa: E402
from chronopulse_engine import ChronoPulseEngine  # noqa: E402
from biovision_engine import BioVisionEngine  # noqa: E402
from neurotype_engine import NeuroTypeEngine  # noqa: E402
import numpy as np  # noqa: E402

SEV_NAMES = ["nominal", "watch", "caution", "critical"]

# metric -> (spoken name, short unit, spoken unit, decimals)
METRIC_INFO = {
    "hr": ("heart rate", "bpm", "beats per minute", 0),
    "hrv": ("heart rate variability", "ms", "milliseconds", 0),
    "spo2": ("blood oxygen", "%", "percent", 1),
    "skin_temp": ("skin temperature", "°C", "degrees Celsius", 1),
    "bp_sys": ("systolic blood pressure", "mmHg", "millimeters of mercury", 0),
    "bp_dia": ("diastolic blood pressure", "mmHg", "millimeters of mercury", 0),
    "cabin_co2": ("cabin CO2", "mmHg", "millimeters of mercury", 1),
    "radiation_usv": ("radiation dose rate", "µSv/h", "microsieverts per hour", 0),
    "cumulative_msv": ("cumulative mission dose", "mSv", "millisieverts", 1),
    "onsd": ("optic nerve sheath diameter", "mm", "millimeters", 2),
    "perclos": ("eyelid closure", "", "", 2),
    "fatigue": ("cognitive fatigue index", "%", "percent", 0),
    "strain": ("autonomic strain index", "", "out of 100", 0),
}

BUDGET_MSV = 250.0           # mission dose budget used by /goal in this prototype
CORE_METRICS = ["hr", "hrv", "spo2", "onsd", "cabin_co2", "radiation_usv"]
SPECIFICITY = ["sans", "radiation", "co2", "spo2", "bp", "temp", "hr", "fatigue",
               "strain", "baseline_drift", "dose_budget"]

PROTOCOLS = {
    "SANS_LBNP": {
        "label": "Chibis-M lower-body negative pressure session",
        "intervene_action": "Chibis LBNP SANS decompression",
        "monitor": "onsd",
    },
    "SPE_SHELTER": {
        "label": "storm-shelter ingress with dosimetry running",
        "intervene_action": "Radiation SPE storm shelter ingress",
        "monitor": "radiation_usv",
    },
    "CO2_CDRA": {
        "label": "CDRA scrubber cycle and cabin air check",
        "intervene_action": "ECLSS CDRA scrubber CO2 cycle",
        "monitor": "cabin_co2",
    },
    "REST_FREEZE": {
        "label": "rest period with safety-critical tasks deferred",
        "intervene_action": "Mandatory rest sleep fatigue flight ops freeze",
        "monitor": "fatigue",
    },
}


@dataclass
class Finding:
    id: str
    title: str
    severity: int
    metric: str
    value: Optional[float]
    unit: str
    evidence: str                      # one factual sentence with numbers and thresholds
    mechanism: str = ""
    action: Optional[str] = None
    protocol_id: Optional[str] = None
    organ_query: str = "heart"
    confidence: Optional[float] = None  # model posterior (%) when the differential could be computed
    would_change_if: str = ""
    trend: Optional[Dict[str, Any]] = None
    engine: str = ""

    @property
    def severity_name(self) -> str:
        return SEV_NAMES[self.severity]

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["severityName"] = self.severity_name
        return d


@dataclass
class Assessment:
    t: float
    findings: List[Finding]
    engines: Dict[str, Any]
    missing: List[str]
    values: Dict[str, float]
    source: str

    @property
    def overall(self) -> int:
        return max((f.severity for f in self.findings), default=0)

    def get(self, finding_id: str) -> Optional[Finding]:
        return next((f for f in self.findings if f.id == finding_id), None)

    def active(self, min_sev: int = 1) -> List[Finding]:
        return [f for f in self.findings if f.severity >= min_sev]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "t": self.t,
            "overall": self.overall,
            "overallName": SEV_NAMES[self.overall],
            "findings": [f.to_dict() for f in self.findings],
            "missing": self.missing,
            "source": self.source,
        }


def _up(value: float, bands) -> int:
    sev = 0
    for thr, s in bands:
        if value >= thr:
            sev = s
    return sev


def _down(value: float, bands) -> int:
    sev = 0
    for thr, s in bands:        # thresholds listed from mild to severe (descending)
        if value <= thr:
            sev = s
    return sev


def margin_conf(x: float, thr: float, scale: float) -> float:
    """Decision margin mapped to 50-99. Distance from the decision boundary, NOT a calibrated probability."""
    return round(50.0 + 49.0 * min(1.0, abs(x - thr) / max(scale, 1e-9)), 1)


class Assessor:
    def __init__(self, crew_id: str, baseline: Optional[Dict[str, Any]] = None):
        self.crew_id = crew_id
        self.baseline = baseline or {}
        self.astro = AstroCausalEngine(crew_id=crew_id)
        self.chrono = ChronoPulseEngine(crew_id=crew_id)
        self.bio = BioVisionEngine(crew_id=crew_id)
        self.neuro = NeuroTypeEngine(crew_id=crew_id)

    # ------------------------------------------------------------------ main entry
    def run(self, feed) -> Assessment:
        cur = feed.current()
        v = {m: r["value"] for m, r in cur.items()}
        eng: Dict[str, Any] = {}
        findings: List[Finding] = []

        # --- engine passes (each only when its full input set was actually measured)
        chrono = None
        if all(k in v for k in ("hr", "hrv", "spo2", "skin_temp", "bp_sys", "cabin_co2")):
            chrono = self.chrono.analyze_telemetry(v["hr"], v["hrv"], v["spo2"], v["skin_temp"],
                                                   v["bp_sys"], v["cabin_co2"])
            eng["chronopulse"] = chrono

        bio = self.bio.analyze_ultrasound_onsd(v["onsd"]) if "onsd" in v else None
        if bio:
            eng["biovision"] = bio

        neuro = None
        if all(k in v for k in ("dwell_ms", "flight_ms", "flight_var", "backspace_ratio", "kpm", "jitter")):
            neuro = self.neuro.analyze_interaction(v["dwell_ms"], v["flight_ms"], v["flight_var"],
                                                   v["backspace_ratio"], v["kpm"], v["jitter"])
            eng["neurotype"] = neuro
        vig = self.bio.analyze_facial_drowsiness(v["perclos"], v.get("blink_rate", 15.0)) if "perclos" in v else None
        if vig:
            eng["vigilance"] = vig

        fatigue_pct = None
        if neuro:
            fatigue_pct = float(neuro["cognitive_fatigue_pct"])
        elif vig:
            fatigue_pct = float(vig["drowsiness_index"])

        post = None
        need = ("onsd", "cabin_co2", "radiation_usv", "hrv")
        if all(k in v for k in need) and fatigue_pct is not None and chrono is not None:
            post = self.astro.infer_differential_diagnosis(
                v["onsd"], v["cabin_co2"], v["radiation_usv"], v["hrv"], fatigue_pct,
                chrono["reconstruction_loss"])
            eng["astrocausal"] = post
        post_map = {r["condition"]: r["probability_pct"] for r in post["differential_rankings"]} if post else {}

        def tr(metric, window=300.0):
            t = feed.trend(metric, window)
            if t:
                t["metric"] = metric
            return t

        # --- SANS
        if bio:
            lvl = {"NOMINAL": 0, "BORDERLINE_SANS": 2, "CONFIRMED_SANS_RISK": 3}[bio["sans_risk_level"]]
            t = tr("onsd")
            norm_thr = getattr(self.bio, "onsd_normal_threshold", 5.0)
            if lvl == 0 and t and t["direction"] == "rising" and v["onsd"] >= norm_thr - 0.35:
                lvl = 1
            if lvl:
                findings.append(Finding(
                    id="sans", title="Possible SANS / raised intracranial pressure", severity=lvl,
                    metric="onsd", value=v["onsd"], unit="mm",
                    evidence=(f"Optic nerve sheath diameter is {v['onsd']:.2f} mm against a {norm_thr:.1f} mm "
                              f"threshold; the model's pressure estimate is {bio['estimated_icp_level']}."),
                    mechanism=("Headward fluid shift in microgravity raises intracranial pressure and "
                               "distends the optic nerve sheath."),
                    action=bio["prescribed_ocular_action"], protocol_id="SANS_LBNP", organ_query="optic nerve",
                    confidence=post_map.get("SANS_CEPHALIC_HYPERTENSION"),
                    would_change_if=f"A repeat scan below {norm_thr:.1f} mm would downgrade this.",
                    trend=t, engine="BioVision + AstroCausal"))

        # --- radiation (rate)
        if "radiation_usv" in v:
            lvl = _up(v["radiation_usv"], [(35.0, 1), (50.0, 2), (150.0, 3)])
            if lvl:
                findings.append(Finding(
                    id="radiation", title="Elevated radiation dose rate", severity=lvl,
                    metric="radiation_usv", value=v["radiation_usv"], unit="µSv/h",
                    evidence=(f"Dose rate is {v['radiation_usv']:.0f} µSv/h; the model's watch, caution and "
                              f"critical limits are 35, 50 and 150 µSv/h."),
                    mechanism="A solar particle event raises the proton flux well above galactic background.",
                    action=("Move to the storm shelter or water-shielded area and keep dosimetry running."
                            if lvl >= 3 else
                            "Prepare for shelter ingress and watch the dose rate; confirm the space-weather outlook."),
                    protocol_id="SPE_SHELTER" if lvl >= 2 else None, organ_query="brain",
                    confidence=post_map.get("SOLAR_PARTICLE_EVENT_EXPOSURE"),
                    would_change_if="A sustained return below 35 µSv/h would clear this.",
                    trend=tr("radiation_usv"), engine="Dosimetry thresholds + AstroCausal"))

        # --- cumulative dose budget
        if "cumulative_msv" in v:
            frac = v["cumulative_msv"] / BUDGET_MSV
            lvl = 2 if frac >= 0.9 else 1 if frac >= 0.75 else 0
            if lvl:
                findings.append(Finding(
                    id="dose_budget", title="Mission dose budget running high", severity=lvl,
                    metric="cumulative_msv", value=v["cumulative_msv"], unit="mSv",
                    evidence=(f"Cumulative dose is {v['cumulative_msv']:.1f} mSv, {frac * 100:.0f}% of the "
                              f"{BUDGET_MSV:.0f} mSv mission budget used by this prototype."),
                    organ_query="brain", engine="Dose accounting"))

        # --- cabin CO2
        if "cabin_co2" in v:
            lvl = _up(v["cabin_co2"], [(3.2, 2), (4.5, 3)])
            if lvl:
                findings.append(Finding(
                    id="co2", title="Cabin CO2 elevated", severity=lvl,
                    metric="cabin_co2", value=v["cabin_co2"], unit="mmHg",
                    evidence=(f"Cabin CO2 is {v['cabin_co2']:.1f} mmHg; the model's caution and critical limits "
                              f"are 3.2 and 4.5 mmHg."),
                    mechanism="Scrubber degradation lets CO2 accumulate, causing headache, tachycardia and fatigue.",
                    action="Cycle the CDRA desiccant bed, check scrubber flow, and relocate the crew if it keeps rising.",
                    protocol_id="CO2_CDRA", organ_query="lung",
                    confidence=post_map.get("ACUTE_CABIN_HYPERCAPNIA"),
                    would_change_if="CO2 back under 3.2 mmHg for several minutes would clear this.",
                    trend=tr("cabin_co2"), engine="ECLSS thresholds + AstroCausal"))

        # --- SpO2
        if "spo2" in v:
            lvl = _down(v["spo2"], [(95.0, 1), (92.0, 2), (88.0, 3)])
            if lvl:
                findings.append(Finding(
                    id="spo2", title="Low blood oxygen reading", severity=lvl,
                    metric="spo2", value=v["spo2"], unit="%",
                    evidence=f"Blood oxygen saturation is {v['spo2']:.1f}%, below the 95% watch line.",
                    mechanism="Can be real hypoxemia, high cabin CO2, or a poorly seated sensor.",
                    action="Re-seat the sensor and take a second reading; if it holds, assess breathing and cabin air.",
                    organ_query="lung", would_change_if="A second reading at or above 95% would downgrade this.",
                    trend=tr("spo2"), engine="Pulse oximetry thresholds"))

        # --- blood pressure
        if "bp_sys" in v:
            hi = _up(v["bp_sys"], [(140.0, 1), (160.0, 2), (180.0, 3)])
            lo = _down(v["bp_sys"], [(95.0, 1), (90.0, 2), (80.0, 3)])
            lvl = max(hi, lo)
            if lvl:
                findings.append(Finding(
                    id="bp", title="Blood pressure out of range", severity=lvl,
                    metric="bp_sys", value=v["bp_sys"], unit="mmHg",
                    evidence=f"Systolic pressure is {v['bp_sys']:.0f} mmHg.",
                    action="Rest, recheck with a proper cuff placement in five minutes.",
                    organ_query="heart", would_change_if="A normal recheck would clear this.",
                    trend=tr("bp_sys"), engine="Vitals thresholds"))

        # --- temperature (skin)
        if "skin_temp" in v:
            hi = _up(v["skin_temp"], [(37.6, 1), (38.0, 2), (39.0, 3)])
            lo = _down(v["skin_temp"], [(35.0, 2)])
            lvl = max(hi, lo)
            if lvl:
                findings.append(Finding(
                    id="temp", title="Skin temperature out of range", severity=lvl,
                    metric="skin_temp", value=v["skin_temp"], unit="°C",
                    evidence=f"Skin temperature is {v['skin_temp']:.1f} °C; skin readings run below core temperature.",
                    action="Take a core temperature reading before acting on this.",
                    organ_query="skin", trend=tr("skin_temp"), engine="Vitals thresholds"))

        # --- heart rate
        if "hr" in v:
            hi = _up(v["hr"], [(100.0, 1), (115.0, 2), (130.0, 3)])
            lo = _down(v["hr"], [(50.0, 1), (40.0, 2)])
            lvl = max(hi, lo)
            if lvl:
                findings.append(Finding(
                    id="hr", title="Heart rate out of resting range", severity=lvl,
                    metric="hr", value=v["hr"], unit="bpm",
                    evidence=f"Heart rate is {v['hr']:.0f} bpm, assuming you are at rest.",
                    action="Rest and recheck in five minutes; exertion or stress explains most elevations.",
                    organ_query="heart", would_change_if="Exertion, or a normal rate after five minutes of rest, would clear this.",
                    trend=tr("hr"), engine="Vitals thresholds"))

        # --- fatigue (typing dynamics + eyelid closure)
        if fatigue_pct is not None:
            lvl_n = 0
            if neuro:
                lvl_n = {"ALERT_OPTIMAL": 0, "MODERATE_FATIGUE": 2, "CRITICAL_EXHAUSTION": 3}.get(neuro["cognitive_state"], 0)
            lvl_v = 0
            if vig:
                lvl_v = {"ALERT": 0, "DROWSY": 2, "MICRO_SLEEP_EPISODE": 3}.get(vig["vigilance_state"], 0)
            lvl = max(lvl_n, lvl_v)
            if lvl:
                parts = []
                if neuro:
                    parts.append(f"typing dynamics put fatigue at {neuro['cognitive_fatigue_pct']:.0f}%")
                if vig:
                    parts.append(f"eyelid closure is {v['perclos'] * 100:.0f}% ({vig['vigilance_state'].replace('_', ' ').lower()})")
                findings.append(Finding(
                    id="fatigue", title="Fatigue and reduced vigilance", severity=lvl,
                    metric="fatigue", value=fatigue_pct, unit="%",
                    evidence="; ".join(parts).capitalize() + ".",
                    mechanism="Sleep debt and circadian disruption slow reaction time and raise lapse risk.",
                    action=(neuro["clinical_recommendation"] if neuro else "Defer safety-critical tasks and schedule rest."),
                    protocol_id="REST_FREEZE", organ_query="brain",
                    confidence=post_map.get("CIRCADIAN_EXHAUSTION_DESYNCH"),
                    would_change_if="Restored typing rhythm and eyelid closure under 18% after rest would clear this.",
                    trend=tr("perclos"), engine="NeuroType + BioVision"))

        # --- autonomic strain proxy (NOT the Baevsky index: no RR histogram is available)
        if "hr" in v and "hrv" in v:
            base_hr = float(self.baseline.get("hr", 68.0))
            base_hrv = float(self.baseline.get("hrv", 55.0))
            strain = 0.6 * max(0.0, (base_hrv - v["hrv"]) / base_hrv * 140.0) \
                + 0.4 * max(0.0, (v["hr"] - base_hr) / base_hr * 250.0)
            strain = max(0.0, min(100.0, strain))
            eng["strain_index"] = round(strain, 1)
            lvl = min(2, _up(strain, [(50.0, 1), (70.0, 2)]))
            if lvl:
                findings.append(Finding(
                    id="strain", title="High autonomic strain", severity=lvl,
                    metric="strain", value=round(strain, 0), unit="/100",
                    evidence=(f"Heart rate {v['hr']:.0f} bpm and variability {v['hrv']:.0f} ms against your "
                              f"{base_hr:.0f} bpm and {base_hrv:.0f} ms baselines give a strain index of {strain:.0f}. "
                              f"This is a heart-rate and variability proxy, not a full Baevsky index."),
                    mechanism="Sympathetic activation raises heart rate and suppresses vagal variability.",
                    action="Slow breathing and a short break; recheck in a few minutes.",
                    organ_query="heart", would_change_if="Heart rate and variability returning toward baseline would clear this.",
                    trend=tr("hrv"), engine="HR/HRV proxy"))

        # --- multivariate drift from personal baseline
        if chrono and chrono["risk_level"] != "NOMINAL":
            lvl = 1 if chrono["risk_level"] == "CAUTION" else 2
            findings.append(Finding(
                id="baseline_drift", title="Deviation from your personal baseline", severity=lvl,
                metric="baseline_drift", value=chrono["reconstruction_loss"], unit="",
                evidence=(f"The multivariate model's reconstruction loss is {chrono['reconstruction_loss']:.2f}, "
                          f"driven mostly by {chrono['primary_strain_feature']}."),
                mechanism="Several vitals together sit outside what is normal for you, even if each looks mild.",
                organ_query="heart", engine="ChronoPulse"))

        findings.sort(key=lambda f: (-f.severity,
                                     SPECIFICITY.index(f.id) if f.id in SPECIFICITY else 99))
        missing = [m for m in CORE_METRICS if m not in v]
        return Assessment(t=feed.clock(), findings=findings, engines=eng, missing=missing,
                          values=v, source=feed.source_label())


# ---------------------------------------------------------------------- swarm
def swarm_vote(a: Assessment) -> Dict[str, Any]:
    """Six agents vote from their own engine's output. Missing inputs -> abstain, never a default."""
    v, eng = a.values, a.engines
    agents: List[Dict[str, Any]] = []

    def add(agent_id, specialty, diag, conf, vote, basis):
        agents.append({"agentId": agent_id, "specialty": specialty, "diagnosis": diag,
                       "confidencePct": conf, "vote": vote, "confidenceBasis": basis})

    def abstain(agent_id, specialty, why):
        add(agent_id, specialty, f"No data: {why}", None, "ABSTAIN_NO_DATA", "n/a")

    NOM = "APPROVE_NOMINAL_MAINTENANCE"
    sp = "Bayesian Dirichlet Biophysics"
    if "astrocausal" in eng:
        p = eng["astrocausal"]
        nominal = p["primary_diagnosis"] == "NOMINAL_HOMEOSTASIS"
        add("AstroCausal-Agent", sp, p["primary_diagnosis"].replace("_", " ").title(), p["confidence_pct"],
            NOM if nominal else f"INTERVENE_{p['primary_diagnosis']}", "model posterior")
    else:
        abstain("AstroCausal-Agent", sp, "needs ONSD, CO2, radiation, HRV, fatigue and baseline loss")

    sp = "Circadian Welford Drift Autoencoder"
    if "chronopulse" in eng:
        c = eng["chronopulse"]
        add("ChronoPulse-Agent", sp, f"{c['risk_level']} (reconstruction loss {c['reconstruction_loss']:.2f})",
            margin_conf(c["reconstruction_loss"], 0.35, 0.35),
            NOM if c["risk_level"] == "NOMINAL" else "ADAPT_BASELINE_CAUTION", "decision margin")
    else:
        abstain("ChronoPulse-Agent", sp, "needs HR, HRV, SpO2, temperature, BP and CO2")

    sp = "Autonomic Strain (HR/HRV proxy)"
    if "strain_index" in eng:
        s = eng["strain_index"]
        add("Emotion-Agent", sp, f"Strain index {s:.0f}/100", margin_conf(s, 50.0, 50.0),
            NOM if s < 50.0 else "COUNTERMEASURE_PSYCHOMOTOR_REST", "decision margin")
    else:
        abstain("Emotion-Agent", sp, "needs HR and HRV")

    sp = "POCUS Optic Nerve Sheath"
    if "biovision" in eng:
        b = eng["biovision"]
        add("BioVision-Agent", sp, f"Sheath {b['measured_onsd_mm']:.2f} mm ({b['sans_risk_level']})",
            margin_conf(b["measured_onsd_mm"], 5.0, 0.8),
            NOM if b["sans_risk_level"] == "NOMINAL" else "INITIATE_CHIBIS_LBNP_DECOMPRESSION", "decision margin")
    else:
        abstain("BioVision-Agent", sp, "no recent ONSD scan")

    sp = "Keystroke Dynamics & Vigilance"
    if "neurotype" in eng or "vigilance" in eng:
        fat = a.get("fatigue")
        pct = fat.value if fat else (eng["neurotype"]["cognitive_fatigue_pct"] if "neurotype" in eng
                                     else eng["vigilance"]["drowsiness_index"])
        add("NeuroType-Agent", sp, f"Fatigue index {pct:.0f}%", margin_conf(pct, 40.0, 30.0),
            NOM if (fat is None) else "CIRCADIAN_SLEEP_HYGIENE_ENFORCEMENT", "decision margin")
    else:
        abstain("NeuroType-Agent", sp, "no typing or eyelid data")

    sp = "Cabin Atmosphere & Dosimetry"
    if "cabin_co2" in v or "radiation_usv" in v:
        co2, rad = v.get("cabin_co2"), v.get("radiation_usv")
        if rad is not None and rad > 50.0:
            add("ECLSS-Agent", sp, f"Particle flux {rad:.0f} µSv/h", margin_conf(rad, 50.0, 100.0),
                "EVACUATE_TO_STORM_SHELTER", "decision margin")
        elif co2 is not None and co2 >= 3.2:
            add("ECLSS-Agent", sp, f"Cabin CO2 {co2:.1f} mmHg", margin_conf(co2, 3.2, 1.5),
                "CYCLE_CDRA_DESICCANT_BED", "decision margin")
        else:
            bits = []
            if co2 is not None:
                bits.append(f"CO2 {co2:.1f} mmHg")
            if rad is not None:
                bits.append(f"dose rate {rad:.0f} µSv/h")
            margins = []
            if co2 is not None:
                margins.append(margin_conf(co2, 3.2, 1.5))
            if rad is not None:
                margins.append(margin_conf(rad, 50.0, 100.0))
            m = min(margins)
            add("ECLSS-Agent", sp, ", ".join(bits) + " (nominal)", m, NOM, "decision margin")
    else:
        abstain("ECLSS-Agent", sp, "no CO2 or radiation data")

    voters = [x for x in agents if x["vote"] != "ABSTAIN_NO_DATA"]
    nominal = sum(1 for x in voters if x["vote"] == NOM)
    critical = any(f.severity >= 3 for f in a.findings)
    if len(voters) < 3:
        verdict = "INSUFFICIENT_DATA_ESCALATE_TO_FLIGHT_SURGEON"
    elif nominal == len(voters):
        verdict = "NOMINAL_MAINTENANCE_CONFIRMED"
    elif critical or nominal <= len(voters) / 3.0:
        verdict = "AUTONOMOUS_INTERVENTION_MANDATED"
    else:
        verdict = "SPLIT_CONSENSUS_ESCALATE_TO_FLIGHT_SURGEON"
    if verdict == "NOMINAL_MAINTENANCE_CONFIRMED":
        verdict_is_nominal = True
    elif verdict == "AUTONOMOUS_INTERVENTION_MANDATED":
        verdict_is_nominal = False
    else:
        verdict_is_nominal = nominal * 2 >= len(voters)
    dissent = [x["agentId"] for x in voters if (x["vote"] == NOM) != verdict_is_nominal]
    confs = [x["confidencePct"] for x in voters if x["confidencePct"] is not None]
    return {
        "agents": agents,
        "voters": len(voters),
        "abstained": [x["agentId"] for x in agents if x["vote"] == "ABSTAIN_NO_DATA"],
        "nominalVotes": nominal,
        "consensusVerdict": verdict,
        "dissent": dissent,
        "aggregateConfidencePct": round(sum(confs) / len(confs), 1) if confs else None,
        "confidenceBasis": "mean decision margin across voting agents (not a calibrated probability)",
    }
