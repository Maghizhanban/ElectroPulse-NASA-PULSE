"""
ElectroPulse OS - Engine 2: NeuroType (Neuroplastic Edition)
Personalized Keystroke Dynamics, Information Entropy & Neuromotor Rhythm Engine.
Learns individual typing biometric cadence, calculates flight entropy, and dynamically
distinguishes true cognitive fatigue from idiosyncratic personal typing speeds.
"""

import math
import numpy as np
from typing import Dict, Any, List

class NeuroTypeEngine:
    """
    Continually learning neuromotor & cognitive fatigue engine.
    Establishes individual baseline typing entropy and psychomotor response curves.
    """

    def __init__(self, crew_id: str = "CDR-VANCE-04"):
        self.crew_id = crew_id
        # Adaptive personal baseline calibration
        self.personal_dwell_baseline = 85.0
        self.personal_flight_baseline = 140.0
        self.personal_backspace_baseline = 0.04
        self.adaptation_count = 50

    def calculate_keystroke_entropy(self, flight_times: List[float]) -> float:
        """
        Compute Shannon Information Entropy over inter-key flight time distribution.
        Disorganized, fatigued cognitive states yield high erratic entropy.
        """
        if not flight_times or len(flight_times) < 5:
            return 1.85  # Nominal baseline entropy

        # Bin flight latencies into 5 discrete bins (50ms - 400ms+)
        bins = [0, 100, 150, 220, 320, 1000]
        counts, _ = np.histogram(flight_times, bins=bins)
        probs = counts / (np.sum(counts) + 1e-9)

        entropy = -sum(p * math.log2(p) for p in probs if p > 0)
        return round(float(entropy), 3)

    def analyze_interaction(
        self,
        mean_dwell_ms: float,
        mean_flight_ms: float,
        flight_variance: float,
        backspace_ratio: float,
        keystrokes_per_min: float,
        motor_jitter: float,
        recent_flight_stream: List[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluate interaction dynamics against personalized cognitive baseline.
        """
        # Calculate dynamic Shannon entropy
        entropy = self.calculate_keystroke_entropy(recent_flight_stream or [mean_flight_ms] * 10)

        # 1. Deviations relative to individual personal baseline (not population average)
        flight_delay_ratio = max(0.0, (mean_flight_ms - self.personal_flight_baseline) / self.personal_flight_baseline)
        dwell_delay_ratio = max(0.0, (mean_dwell_ms - self.personal_dwell_baseline) / self.personal_dwell_baseline)
        error_penalty = max(0.0, (backspace_ratio - self.personal_backspace_baseline) / 0.15)
        tremor_score = min(1.0, motor_jitter / 0.35)

        # 2. Weighted Non-linear Cognitive Degradation Formulation
        raw_fatigue_metric = (
            0.35 * flight_delay_ratio +
            0.20 * dwell_delay_ratio +
            0.20 * error_penalty +
            0.15 * tremor_score +
            0.10 * max(0.0, (entropy - 1.85) / 0.8)
        )

        cognitive_fatigue_pct = round(float(100.0 / (1.0 + math.exp(-2.8 * (raw_fatigue_metric - 0.7)))), 1)
        lapse_prob = round(float(1.0 / (1.0 + math.exp(-3.5 * (raw_fatigue_metric - 0.9)))), 3)

        # Online adaptation: if astronaut is alert, slowly adapt baseline to their natural cadence
        if cognitive_fatigue_pct < 25.0:
            self.adaptation_count += 1
            alpha = min(0.02, 1.0 / self.adaptation_count)
            self.personal_flight_baseline = (1.0 - alpha) * self.personal_flight_baseline + alpha * mean_flight_ms
            self.personal_dwell_baseline = (1.0 - alpha) * self.personal_dwell_baseline + alpha * mean_dwell_ms

        # Triage Category
        if cognitive_fatigue_pct < 35.0:
            cognitive_state = "ALERT_OPTIMAL"
            recommendation = "Cognitive workload within nominal parameters. Cleared for EVA / critical docking."
        elif cognitive_fatigue_pct < 70.0:
            cognitive_state = "MODERATE_FATIGUE"
            recommendation = "Elevated inter-key latency & entropy detected. Defer high-criticality maneuvers; schedule 20-min rest cycle."
        else:
            cognitive_state = "CRITICAL_EXHAUSTION"
            recommendation = "Severe cognitive deceleration & lapse risk. Restrict safety-critical tasks. Initiate circadian sleep hygiene protocol."

        return {
            "engine": "NeuroType_v2_Neuroplastic",
            "crew_id": self.crew_id,
            "cognitive_fatigue_pct": cognitive_fatigue_pct,
            "psychomotor_lapse_probability": lapse_prob,
            "shannon_entropy": entropy,
            "motor_ataxia_index": round(tremor_score * 100, 1),
            "cognitive_state": cognitive_state,
            "clinical_recommendation": recommendation,
            "personalized_baseline": {
                "calibrated_flight_ms": round(self.personal_flight_baseline, 1),
                "calibrated_dwell_ms": round(self.personal_dwell_baseline, 1),
                "samples_absorbed": self.adaptation_count
            }
        }
