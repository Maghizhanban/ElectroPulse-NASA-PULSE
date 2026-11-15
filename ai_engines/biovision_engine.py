"""
ElectroPulse OS - Engine 3: BioVision (Neuroplastic Edition)
Point-of-Care Ultrasound (POCUS) Optical Morphometry & Temporal Expansion Engine.
Measures Optic Nerve Sheath Diameter (ONSD) and tracks temporal dilation velocity
d(ONSD)/dt to distinguish acute spaceflight intracranial hypertension from chronic baselines.
"""

import time
import math
from typing import Dict, Any, List

class BioVisionEngine:
    """
    Computer Vision & Ultrasound morphometry engine for SANS and facial vigilance.
    Tracks historical scans to compute temporal dilation trajectories.
    """

    def __init__(self, crew_id: str = "CDR-VANCE-04"):
        self.crew_id = crew_id
        self.onsd_normal_threshold = 5.0
        self.onsd_critical_threshold = 5.8
        
        # Scan history buffer: [(timestamp, onsd_mm)]
        self.scan_history: List[tuple] = [
            (time.time() - 86400 * 3, 4.55),
            (time.time() - 86400 * 1, 4.60)
        ]

    def analyze_ultrasound_onsd(self, measured_onsd_mm: float, image_quality: float = 0.94) -> Dict[str, Any]:
        """
        Evaluate optic nerve sheath measurement and compute temporal dilation velocity d(ONSD)/dt.
        """
        now = time.time()
        self.scan_history.append((now, measured_onsd_mm))
        if len(self.scan_history) > 20:
            self.scan_history.pop(0)

        # Compute Dilation Velocity (mm per 24 hours)
        dilation_velocity_mm_day = 0.0
        if len(self.scan_history) >= 2:
            t_prev, onsd_prev = self.scan_history[-2]
            dt_days = max(0.01, (now - t_prev) / 86400.0)
            dilation_velocity_mm_day = round((measured_onsd_mm - onsd_prev) / dt_days, 3)

        # NASA SANS Risk Classification with Temporal Trajectory
        if measured_onsd_mm < self.onsd_normal_threshold:
            sans_risk = "NOMINAL"
            icp_estimate = "10 - 14 mmHg (Normal)"
            countermeasure = "Maintain standard countermeasure schedule. Retest in 7 days."
        elif measured_onsd_mm <= self.onsd_critical_threshold:
            sans_risk = "BORDERLINE_SANS"
            icp_estimate = "15 - 20 mmHg (Mildly Elevated ICP)"
            countermeasure = "Initiate 30-min Lower Body Negative Pressure (LBNP) session at -25 mmHg. Retest in 24 hours."
        else:
            sans_risk = "CONFIRMED_SANS_RISK"
            icp_estimate = "> 22 mmHg (Severe Intracranial Hypertension)"
            countermeasure = "URGENT: Initiate 60-min Chibis LBNP protocol at -35 mmHg. Perform visual acuity refraction chart test."

        # Alert if rapid acute expansion detected (> 0.20 mm/day is acute cephalad engorgement)
        is_acute_trajectory = dilation_velocity_mm_day > 0.20

        return {
            "engine": "BioVision_v2_Neuroplastic",
            "crew_id": self.crew_id,
            "measured_onsd_mm": round(measured_onsd_mm, 2),
            "dilation_velocity_mm_per_day": dilation_velocity_mm_day,
            "is_acute_expansion_trajectory": is_acute_trajectory,
            "sans_risk_level": sans_risk,
            "estimated_icp_level": icp_estimate,
            "image_quality_confidence": round(image_quality * 100, 1),
            "prescribed_ocular_action": countermeasure,
            "total_historical_scans": len(self.scan_history)
        }

    def analyze_facial_drowsiness(self, perclos_score: float, blink_freq: float) -> Dict[str, Any]:
        """
        Evaluate facial vigilance and eyelid closure dynamics.
        """
        if perclos_score < 0.18:
            vigilance_state = "ALERT"
            drowsiness_index = int(perclos_score * 100)
        elif perclos_score < 0.35:
            vigilance_state = "DROWSY"
            drowsiness_index = int(perclos_score * 150)
        else:
            vigilance_state = "MICRO_SLEEP_EPISODE"
            drowsiness_index = 95

        return {
            "engine": "BioVision_FacialVigilance",
            "perclos_score": round(perclos_score, 3),
            "blink_frequency_per_min": blink_freq,
            "vigilance_state": vigilance_state,
            "drowsiness_index": min(100, drowsiness_index)
        }
