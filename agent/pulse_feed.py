#!/usr/bin/env python3
"""
pulse_feed.py
Live telemetry feed for P.U.L.S.E.

Two sources share one interface:
  * SIMULATED  - wraps the repo's UnifiedMedicalGateway and ramps smoothly into/out of
                 scenarios (a SANS onset takes ~20 s to develop instead of jumping).
  * DEVICE     - real or client-supplied readings pushed through `ingest()`. While device data
                 is fresh the simulator pauses, so simulated numbers never mix with real ones.

Design rule: a metric that was never measured is *absent*, never defaulted. Every reader gets
(value, age_s, source) so callers can say "last reading 40 s ago" or "I have no reading".
"""

import math
import os
import sys
import threading
import time
from collections import deque
from typing import Any, Deque, Dict, List, Optional, Tuple

_base = os.path.abspath(os.path.dirname(__file__))
_engines = os.path.abspath(os.path.join(_base, "..", "ai_engines"))
if _engines not in sys.path:
    sys.path.insert(0, _engines)

from unified_medical_gateway import UnifiedMedicalGateway  # noqa: E402

SCENARIOS = [
    "NOMINAL",
    "SANS_FLUID_SHIFT",
    "CABIN_HYPERCAPNIA",
    "SOLAR_PARTICLE_EVENT",
    "COGNITIVE_EXHAUSTION",
]

METRICS = [
    "hr", "hrv", "spo2", "skin_temp", "bp_sys", "bp_dia",
    "cabin_co2", "cabin_pressure", "radiation_usv", "cumulative_msv",
    "onsd", "perclos", "blink_rate",
    "dwell_ms", "flight_ms", "flight_var", "backspace_ratio", "kpm", "jitter",
    "entropy",
]

_ALIASES = {
    "heart_rate": "hr", "heart_rate_bpm": "hr", "pulse": "hr",
    "hrv_rmssd_ms": "hrv", "rmssd": "hrv",
    "spo2_pct": "spo2",
    "temp": "skin_temp", "skin_temp_celsius": "skin_temp", "temperature": "skin_temp",
    "systolic_bp_mmhg": "bp_sys", "bp_systolic": "bp_sys", "systolic": "bp_sys",
    "diastolic_bp_mmhg": "bp_dia", "bp_diastolic": "bp_dia", "diastolic": "bp_dia",
    "co2": "cabin_co2", "cabin_co2_mmhg": "cabin_co2",
    "cabin_pressure_kpa": "cabin_pressure",
    "radiation": "radiation_usv", "radiation_dose_rate_usv_hr": "radiation_usv",
    "cumulative_mission_radiation_msv": "cumulative_msv",
    "measured_onsd_mm": "onsd",
    "perclos_score": "perclos", "blink_frequency_per_min": "blink_rate",
    "mean_dwell_time_ms": "dwell_ms", "mean_flight_time_ms": "flight_ms",
    "flight_time_variance": "flight_var", "keystrokes_per_minute": "kpm",
    "motor_jitter_index": "jitter",
}

# Smallest change that counts as a real trend rather than noise, per metric.
NOISE_FLOOR = {
    "hr": 5.0, "hrv": 6.0, "spo2": 1.0, "skin_temp": 0.25, "bp_sys": 6.0, "bp_dia": 5.0,
    "cabin_co2": 0.35, "radiation_usv": 12.0, "onsd": 0.15, "perclos": 0.06,
    "blink_rate": 3.0, "kpm": 25.0, "cumulative_msv": 0.0005,
}

# How old a reading may be before it is reported as stale rather than current (seconds).
MAX_AGE = {"onsd": 3600.0, "cumulative_msv": 600.0}
DEFAULT_MAX_AGE = 120.0


def normalize(raw: Optional[Dict[str, Any]]) -> Dict[str, float]:
    """Map legacy / device field names to canonical metric names. Non-numeric values are dropped."""
    out: Dict[str, float] = {}
    if not raw:
        return out
    flat = dict(raw)
    nested = flat.pop("vitals", None)
    if isinstance(nested, dict):
        for k, v in nested.items():
            flat.setdefault(k, v)
    for k, v in flat.items():
        if k in ("timestamp", "source", "crew_id"):
            continue
        if k == "bp" and isinstance(v, str) and "/" in v:
            try:
                s, d = v.split("/", 1)
                out["bp_sys"], out["bp_dia"] = float(s), float(d)
            except ValueError:
                pass
            continue
        key = _ALIASES.get(k, k)
        if key not in METRICS:
            continue
        try:
            f = float(v)
        except (TypeError, ValueError):
            continue
        if math.isfinite(f):
            out[key] = f
    return out


def _flatten(p) -> Dict[str, float]:
    v, e, i, u, c = p.vitals, p.environment, p.interaction, p.ultrasound, p.vision
    return {
        "hr": v.heart_rate_bpm, "hrv": v.hrv_rmssd_ms, "spo2": v.spo2_pct,
        "skin_temp": v.skin_temp_celsius, "bp_sys": v.systolic_bp_mmhg, "bp_dia": v.diastolic_bp_mmhg,
        "cabin_co2": e.cabin_co2_mmhg, "cabin_pressure": e.cabin_pressure_kpa,
        "radiation_usv": e.radiation_dose_rate_usv_hr,
        "onsd": u.measured_onsd_mm,
        "perclos": c.perclos_score, "blink_rate": c.blink_frequency_per_min,
        "dwell_ms": i.mean_dwell_time_ms, "flight_ms": i.mean_flight_time_ms,
        "flight_var": i.flight_time_variance, "backspace_ratio": i.backspace_ratio,
        "kpm": i.keystrokes_per_minute, "jitter": i.motor_jitter_index,
    }


class TelemetryFeed:
    def __init__(
        self,
        crew_id: str = "elena",
        simulate: bool = True,
        ramp_s: float = 20.0,
        clock=time.time,
        device_timeout_s: float = 15.0,
        time_scale: float = 1.0,
        start_cumulative_msv: float = 142.6,
        history_len: int = 3600,
    ):
        self.crew_id = crew_id
        self.simulate = simulate
        self.ramp_s = ramp_s
        self.clock = clock
        self.device_timeout_s = device_timeout_s
        self.time_scale = time_scale
        self._gw = UnifiedMedicalGateway(crew_id=crew_id)
        self._series: Dict[str, Deque[Tuple[float, float]]] = {}
        self._source: Dict[str, str] = {}
        self._history_len = history_len
        self._lock = threading.RLock()
        # scenario ramp state
        self.scenario = "NOMINAL"
        self._active = "NOMINAL"
        self._w0, self._tw, self._t0, self._ramp = 0.0, 0.0, clock(), ramp_s
        self._last_tick: Optional[float] = None
        self._last_device_t: Optional[float] = None
        self._cum = start_cumulative_msv
        self._tick_count = 0

    # ------------------------------------------------------------------ scenario control
    def set_scenario(self, name: str, ramp_s: Optional[float] = None) -> Dict[str, Any]:
        name = (name or "").upper()
        if name not in SCENARIOS:
            raise ValueError(f"Unknown scenario '{name}'. Choose from {SCENARIOS}.")
        with self._lock:
            now = self.clock()
            w = self._weight(now)
            if name == "NOMINAL":
                self._tw = 0.0
            else:
                self._active, self._tw = name, 1.0
            self._w0, self._t0 = w, now
            self._ramp = self.ramp_s if ramp_s is None else ramp_s
            self.scenario = name
            return self.scenario_state()

    def respond_to_countermeasure(self, ramp_s: float = 45.0) -> bool:
        """Simulation only: a deployed countermeasure lets the simulated physiology recover."""
        with self._lock:
            if not self.simulate or self.device_active():
                return False
            self.set_scenario("NOMINAL", ramp_s=ramp_s)
            return True

    def _weight(self, now: float) -> float:
        if self._ramp <= 0:
            return self._tw
        f = min(1.0, max(0.0, (now - self._t0) / self._ramp))
        return self._w0 + (self._tw - self._w0) * f

    def scenario_state(self) -> Dict[str, Any]:
        w = self._weight(self.clock())
        if self._tw == 0.0 and w < 0.02:
            phase, label = "nominal", "NOMINAL"
        elif self._tw == 1.0:
            phase, label = ("onset" if w < 0.98 else "established"), self._active
        else:
            phase, label = "recovering", self._active
        return {"scenario": label, "phase": phase, "weight": round(w, 3), "target": self.scenario}

    # ------------------------------------------------------------------ data in
    def device_active(self) -> bool:
        return (self._last_device_t is not None
                and self.clock() - self._last_device_t < self.device_timeout_s)

    def ingest(self, raw: Dict[str, Any], source: str = "device", t: Optional[float] = None) -> Dict[str, float]:
        vals = normalize(raw)
        if not vals:
            return {}
        with self._lock:
            ts = self.clock() if t is None else float(t)
            self._last_device_t = ts
            self._record(vals, ts, source)
        return vals

    def tick(self) -> Optional[Dict[str, float]]:
        """Advance the simulator one step (no-op while real device data is fresh)."""
        with self._lock:
            if not self.simulate or self.device_active():
                return None
            now = self.clock()
            dt = 0.0 if self._last_tick is None else max(0.0, now - self._last_tick)
            self._last_tick = now
            base = _flatten(self._gw.generate_packet("NOMINAL"))
            w = self._weight(now)
            if w > 1e-3 and self._active != "NOMINAL":
                tgt = _flatten(self._gw.generate_packet(self._active))
                vals = {k: base[k] + (tgt[k] - base[k]) * w for k in base}
            else:
                vals = base
            self._cum += vals["radiation_usv"] / 1000.0 / 3600.0 * dt * self.time_scale
            vals["cumulative_msv"] = self._cum
            vals = {k: round(v, 3) for k, v in vals.items()}
            self._tick_count += 1
            self._record(vals, now, "simulated")
            return vals

    def _record(self, vals: Dict[str, float], ts: float, source: str) -> None:
        for k, v in vals.items():
            dq = self._series.setdefault(k, deque(maxlen=self._history_len))
            dq.append((ts, v))
            self._source[k] = source

    # ------------------------------------------------------------------ data out
    def get(self, metric: str, max_age: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Latest reading of one metric, or None if never measured / too old."""
        with self._lock:
            dq = self._series.get(metric)
            if not dq:
                return None
            ts, v = dq[-1]
            age = self.clock() - ts
            limit = max_age if max_age is not None else MAX_AGE.get(metric, DEFAULT_MAX_AGE)
            if age > limit:
                return None
            return {"value": v, "age_s": round(age, 1), "source": self._source.get(metric, "unknown")}

    def current(self) -> Dict[str, Dict[str, Any]]:
        return {m: r for m in METRICS if (r := self.get(m)) is not None}

    def values(self) -> Dict[str, float]:
        return {m: r["value"] for m, r in self.current().items()}

    def source_label(self) -> str:
        srcs = {r["source"] for r in self.current().values()}
        if not srcs:
            return "none"
        return srcs.pop() if len(srcs) == 1 else "mixed"

    def series(self, metric: str, window_s: float = 300.0) -> List[Tuple[float, float]]:
        with self._lock:
            now = self.clock()
            return [(t, v) for t, v in self._series.get(metric, ()) if now - t <= window_s]

    def trend(self, metric: str, window_s: float = 300.0) -> Optional[Dict[str, Any]]:
        """Least-squares slope over the window, judged against a per-metric noise floor."""
        pts = self.series(metric, window_s)
        if len(pts) < 4 or pts[-1][0] - pts[0][0] < 5.0:
            return None
        n = len(pts)
        t0 = pts[0][0]
        xs = [t - t0 for t, _ in pts]
        ys = [v for _, v in pts]
        mx, my = sum(xs) / n, sum(ys) / n
        sxx = sum((x - mx) ** 2 for x in xs)
        if sxx == 0:
            return None
        slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx  # per second
        span = xs[-1]
        change = slope * span
        floor = NOISE_FLOOR.get(metric, 0.0)
        direction = "steady" if abs(change) < floor else ("rising" if change > 0 else "falling")
        return {
            "direction": direction,
            "change": round(change, 3),
            "per_min": round(slope * 60.0, 3),
            "span_s": round(span, 1),
            "n": n,
            "first": round(ys[0], 3),
            "last": round(ys[-1], 3),
        }
