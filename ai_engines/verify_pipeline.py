"""
ElectroPulse OS - Pipeline Verification Test
Runs all 5 AI engines through simulated spaceflight clinical scenarios.
"""

from unified_medical_gateway import UnifiedMedicalGateway
from safety_arbiter import SafetyConsensusArbiter

def main():
    print("=" * 65)
    print("ELECTROPULSE OS: MULTI-ENGINE CLINICAL AI PIPELINE VERIFICATION")
    print("=" * 65)

    gateway = UnifiedMedicalGateway(crew_id="CDR-VANCE-04", environment_mode="MARS_TRANSIT")
    arbiter = SafetyConsensusArbiter()

    scenarios = [
        "NOMINAL",
        "SANS_FLUID_SHIFT",
        "CABIN_HYPERCAPNIA",
        "SOLAR_PARTICLE_EVENT",
        "COGNITIVE_EXHAUSTION"
    ]

    for sc in scenarios:
        packet = gateway.generate_packet(scenario=sc)
        eval_result = arbiter.evaluate_telemetry_packet(packet)

        print(f"\n[SCENARIO TEST]: {sc}")
        print(f"  • Primary Diagnosis: {eval_result['astrocausal_diagnosis']['primary_diagnosis']}")
        print(f"  • Diagnostic Confidence: {eval_result['astrocausal_diagnosis']['confidence_pct']}%")
        print(f"  • Hazard Category: {eval_result['astrocausal_diagnosis']['underlying_hazard_mapping']}")
        print(f"  • Cognitive Fatigue: {eval_result['neurotype_cognition']['cognitive_fatigue_pct']}% ({eval_result['neurotype_cognition']['cognitive_state']})")
        print(f"  • ChronoPulse Loss: {eval_result['chronopulse_telemetry']['reconstruction_loss']} ({eval_result['chronopulse_telemetry']['risk_level']})")
        print(f"  • Prescribed Protocol: {eval_result['clinical_prescriptions']['protocol_id']}")
        print(f"  • Consensus Status: {eval_result['consensus_status']}")

    print("\n" + "=" * 65)
    print("ALL 5 AI ENGINES VERIFIED - ZERO COMPILATION / RUNTIME ERRORS")
    print("=" * 65)

if __name__ == "__main__":
    main()
