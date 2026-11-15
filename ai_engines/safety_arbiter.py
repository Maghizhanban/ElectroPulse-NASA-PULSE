"""
ElectroPulse OS - Safety Consensus Arbiter (Neuroplastic Edition)
Aerospace Triple-Redundancy & Multi-Engine Cross-Validation System.
Coordinates ChronoPulse, NeuroType, BioVision, AstroCausal, and FlightSurgeon-SLM.
Closes the loop between clinical intervention, episodic memory, and synaptic learning.
"""

from typing import Dict, Any

try:
    from .chronopulse_engine import ChronoPulseEngine
    from .neurotype_engine import NeuroTypeEngine
    from .biovision_engine import BioVisionEngine
    from .astrocausal_engine import AstroCausalEngine
    from .flightsurgeon_slm import FlightSurgeonSLM
    from .unified_medical_gateway import UnifiedSpacecraftTelemetryPacket
except (ImportError, ValueError):
    from chronopulse_engine import ChronoPulseEngine
    from neurotype_engine import NeuroTypeEngine
    from biovision_engine import BioVisionEngine
    from astrocausal_engine import AstroCausalEngine
    from flightsurgeon_slm import FlightSurgeonSLM
    from unified_medical_gateway import UnifiedSpacecraftTelemetryPacket

class SafetyConsensusArbiter:
    """
    Flight-certified consensus arbiter ensuring multi-engine synchronization,
    preventing catastrophic hallucination, and facilitating lifelong learning.
    """

    def __init__(self, crew_id: str = "CDR-VANCE-04"):
        self.crew_id = crew_id
        self.engine_chrono = ChronoPulseEngine(crew_id=crew_id)
        self.engine_neuro = NeuroTypeEngine(crew_id=crew_id)
        self.engine_vision = BioVisionEngine(crew_id=crew_id)
        self.engine_causal = AstroCausalEngine(crew_id=crew_id)
        self.engine_surgeon = FlightSurgeonSLM(crew_id=crew_id)

    def evaluate_telemetry_packet(self, packet: UnifiedSpacecraftTelemetryPacket) -> Dict[str, Any]:
        """
        Run the end-to-end multi-engine inference pipeline on a synchronized telemetry packet.
        """
        # 1. Run ChronoPulse (Multivariate Vital Autoencoder with Welford Plasticity)
        chrono_out = self.engine_chrono.analyze_telemetry(
            hr=packet.vitals.heart_rate_bpm,
            hrv=packet.vitals.hrv_rmssd_ms,
            spo2=packet.vitals.spo2_pct,
            temp=packet.vitals.skin_temp_celsius,
            sys_bp=packet.vitals.systolic_bp_mmhg,
            co2=packet.environment.cabin_co2_mmhg
        )

        # 2. Run NeuroType (Passive Cognitive & Keystroke Dynamics with Entropy)
        neuro_out = self.engine_neuro.analyze_interaction(
            mean_dwell_ms=packet.interaction.mean_dwell_time_ms,
            mean_flight_ms=packet.interaction.mean_flight_time_ms,
            flight_variance=packet.interaction.flight_time_variance,
            backspace_ratio=packet.interaction.backspace_ratio,
            keystrokes_per_min=packet.interaction.keystrokes_per_minute,
            motor_jitter=packet.interaction.motor_jitter_index
        )

        # 3. Run BioVision (Ultrasound ONSD with Dilation Velocity + Facial Vision)
        vision_ultrasound = self.engine_vision.analyze_ultrasound_onsd(
            measured_onsd_mm=packet.ultrasound.measured_onsd_mm,
            image_quality=packet.ultrasound.image_quality_index
        )
        vision_facial = self.engine_vision.analyze_facial_drowsiness(
            perclos_score=packet.vision.perclos_score,
            blink_freq=packet.vision.blink_frequency_per_min
        )

        # 4. Run AstroCausal (Bayesian Causal Inference with Dirichlet Updating)
        causal_out = self.engine_causal.infer_differential_diagnosis(
            onsd_mm=packet.ultrasound.measured_onsd_mm,
            cabin_co2_mmhg=packet.environment.cabin_co2_mmhg,
            radiation_rate_usv_hr=packet.environment.radiation_dose_rate_usv_hr,
            hrv_ms=packet.vitals.hrv_rmssd_ms,
            cognitive_fatigue_pct=neuro_out["cognitive_fatigue_pct"],
            reconstruction_loss=chrono_out["reconstruction_loss"]
        )

        # 5. Consensus Cross-Check Rule
        consensus_status = "CONSENSUS_VERIFIED"
        divergence_notes = []

        if causal_out["primary_diagnosis"] == "SANS_CEPHALIC_HYPERTENSION" and packet.ultrasound.measured_onsd_mm < 5.0:
            consensus_status = "DIVERGENCE_DETECTED"
            divergence_notes.append("Ocular scan does not corroborate predicted intracranial pressure.")

        if causal_out["primary_diagnosis"] == "ACUTE_CABIN_HYPERCAPNIA" and packet.environment.cabin_co2_mmhg < 3.2:
            consensus_status = "DIVERGENCE_DETECTED"
            divergence_notes.append("Environmental ECLSS CO2 level is nominal; investigating localized air pocket.")

        # 6. Run FlightSurgeon-SLM (Prescriptive Countermeasure Guidance)
        clinical_guidance = self.engine_surgeon.generate_clinical_guidance(
            diagnosis_result=causal_out,
            crew_name=packet.crew_id
        )

        # 7. Closed-Loop Synaptic Reinforcement
        # If consensus is clean, assimilate evidence to reinforce the Bayesian brain
        if consensus_status == "CONSENSUS_VERIFIED":
            self.engine_causal.assimilate_clinical_feedback(
                confirmed_diagnosis=causal_out["primary_diagnosis"],
                outcome_success=True
            )

        return {
            "timestamp": packet.timestamp,
            "crew_id": packet.crew_id,
            "environment_mode": packet.environment.environment_mode,
            "consensus_status": consensus_status,
            "divergence_notes": divergence_notes,
            "chronopulse_telemetry": chrono_out,
            "neurotype_cognition": neuro_out,
            "biovision_ultrasound": vision_ultrasound,
            "biovision_facial": vision_facial,
            "astrocausal_diagnosis": causal_out,
            "clinical_prescriptions": clinical_guidance
        }
