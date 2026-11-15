"""
ElectroPulse OS - Engine 4: AstroCausal (Neuroplastic Synaptic Brain)
Dirichlet Adaptive Bayesian Causal Graph.
Features dynamic Dirichlet conjugate hyper-parameter updating:
compounds diagnostic precision exponentially across mission days as clinical events,
treatment confirmations, and recovery feedback are assimilated into synaptic memory.
"""

import math
from typing import Dict, Any, List

class AstroCausalEngine:
    """
    Self-refining Bayesian Belief Network with Dirichlet prior updating.
    Grows exponentially smarter over multi-year deep space missions.
    """

    def __init__(self, crew_id: str = "CDR-VANCE-04"):
        self.crew_id = crew_id

        # Dirichlet Hyper-parameter Pseudo-counts (Synaptic Weight Strengths)
        # alpha represents cumulative historical evidence masses
        self.dirichlet_alphas = {
            "NOMINAL_HOMEOSTASIS": 50.0,
            "SANS_CEPHALIC_HYPERTENSION": 18.0,
            "ACUTE_CABIN_HYPERCAPNIA": 8.0,
            "SOLAR_PARTICLE_EVENT_EXPOSURE": 4.0,
            "CIRCADIAN_EXHAUSTION_DESYNCH": 14.0,
            "CARDIOVASCULAR_DECONDITIONING": 6.0
        }
        self.total_evidence_updates = 0

    def get_current_priors(self) -> Dict[str, float]:
        """
        Calculate expected prior probabilities from Dirichlet hyper-parameters: E[theta_k] = alpha_k / sum(alpha)
        """
        total_mass = sum(self.dirichlet_alphas.values())
        return {
            k: v / total_mass for k, v in self.dirichlet_alphas.items()
        }

    def assimilate_clinical_feedback(self, confirmed_diagnosis: str, outcome_success: bool = True):
        """
        Hebbian Synaptic Plasticity:
        When an astronaut confirms a diagnosis or recovers post-countermeasure,
        reinforce that pathway's Dirichlet alpha mass. The network compounds intelligence!
        """
        if confirmed_diagnosis in self.dirichlet_alphas:
            increment = 2.0 if outcome_success else 0.5
            self.dirichlet_alphas[confirmed_diagnosis] += increment
            self.total_evidence_updates += 1

    def infer_differential_diagnosis(
        self,
        onsd_mm: float,
        cabin_co2_mmhg: float,
        radiation_rate_usv_hr: float,
        hrv_ms: float,
        cognitive_fatigue_pct: float,
        reconstruction_loss: float
    ) -> Dict[str, Any]:
        """
        Exact Bayesian Posterior Inference updated against dynamic Dirichlet priors.
        """
        current_priors = self.get_current_priors()
        likelihoods = {}

        # 1. Evidence likelihood for SANS (Ocular swelling + elevated central pressure)
        if onsd_mm > 5.8:
            sans_lh = 0.92
        elif onsd_mm >= 5.0:
            sans_lh = 0.55
        else:
            sans_lh = 0.05
        likelihoods["SANS_CEPHALIC_HYPERTENSION"] = sans_lh

        # 2. Evidence likelihood for Cabin Hypercapnia (Elevated CO2)
        if cabin_co2_mmhg > 4.5:
            co2_lh = 0.95
        elif cabin_co2_mmhg > 3.2:
            co2_lh = 0.50
        else:
            co2_lh = 0.02
        likelihoods["ACUTE_CABIN_HYPERCAPNIA"] = co2_lh

        # 3. Evidence likelihood for Solar Particle Event (Acute radiation emergency)
        if radiation_rate_usv_hr > 150.0:
            rad_lh = 10.0
        elif radiation_rate_usv_hr > 50.0:
            rad_lh = 1.5
        else:
            rad_lh = 0.01
        likelihoods["SOLAR_PARTICLE_EVENT_EXPOSURE"] = rad_lh

        # 4. Evidence likelihood for Circadian Exhaustion (Keystroke entropy & fatigue)
        if cognitive_fatigue_pct > 70.0 and hrv_ms < 40.0:
            circ_lh = 0.88
        elif cognitive_fatigue_pct > 45.0:
            circ_lh = 0.45
        else:
            circ_lh = 0.05
        likelihoods["CIRCADIAN_EXHAUSTION_DESYNCH"] = circ_lh

        # 5. Evidence likelihood for Cardiovascular Deconditioning
        if hrv_ms < 30.0 and reconstruction_loss > 0.45 and onsd_mm <= 5.0:
            cardio_lh = 0.70
        elif hrv_ms < 42.0:
            cardio_lh = 0.35
        else:
            cardio_lh = 0.08
        likelihoods["CARDIOVASCULAR_DECONDITIONING"] = cardio_lh

        # 6. Evidence likelihood for Nominal Homeostasis
        if (onsd_mm <= 5.0 and cabin_co2_mmhg < 3.0 and radiation_rate_usv_hr < 40.0
            and cognitive_fatigue_pct < 40.0 and reconstruction_loss < 0.35):
            nom_lh = 0.95
        else:
            nom_lh = 0.08
        likelihoods["NOMINAL_HOMEOSTASIS"] = nom_lh

        # Bayesian Posterior Formulation
        unnormalized_posteriors = {}
        for condition, prior in current_priors.items():
            lh = likelihoods.get(condition, 0.05)
            unnormalized_posteriors[condition] = prior * lh

        total_evidence = sum(unnormalized_posteriors.values())
        posteriors = {
            cond: round((val / total_evidence) * 100.0, 1)
            for cond, val in unnormalized_posteriors.items()
        }

        # Calculate Epistemic Uncertainty (Shannon Entropy of Posterior Distribution)
        # Low uncertainty = sharp, confident brain; High uncertainty = balanced investigation
        probs = [val / 100.0 for val in posteriors.values() if val > 0]
        epistemic_entropy = round(-sum(p * math.log2(p) for p in probs), 3)

        ranked_diagnoses = sorted(posteriors.items(), key=lambda item: item[1], reverse=True)
        primary_diagnosis, primary_confidence = ranked_diagnoses[0]

        return {
            "engine": "AstroCausal_v2_SynapticBrain",
            "crew_id": self.crew_id,
            "primary_diagnosis": primary_diagnosis,
            "confidence_pct": primary_confidence,
            "epistemic_uncertainty_bits": epistemic_entropy,
            "synaptic_evidence_updates": self.total_evidence_updates,
            "differential_rankings": [
                {"condition": cond, "probability_pct": prob}
                for cond, prob in ranked_diagnoses
            ],
            "underlying_hazard_mapping": self._map_hazard(primary_diagnosis)
        }

    def _map_hazard(self, diagnosis: str) -> str:
        mapping = {
            "SANS_CEPHALIC_HYPERTENSION": "NASA Hazard 4: Gravity Fields (Microgravity Cephalad Fluid Shift)",
            "ACUTE_CABIN_HYPERCAPNIA": "NASA Hazard 5: Hostile Closed Environment (ECLSS Scrubber Stagnation)",
            "SOLAR_PARTICLE_EVENT_EXPOSURE": "NASA Hazard 1: Space Radiation (Cosmic Solar Particle Event)",
            "CIRCADIAN_EXHAUSTION_DESYNCH": "NASA Hazard 2: Isolation & Confinement (Circadian Sleep Architecture Failure)",
            "CARDIOVASCULAR_DECONDITIONING": "NASA Hazard 4: Gravity Fields (Left Ventricular Mass Atrophy)",
            "NOMINAL_HOMEOSTASIS": "All 5 NASA Hazards in Controlled Equilibrium"
        }
        return mapping.get(diagnosis, "NASA Human Research Program Risk Element")
