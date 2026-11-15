/**
 * AstroCausalEngine.js
 * Dirichlet-Adaptive Bayesian Causal Inference Network.
 * 
 * Maps multi-sensor spacecraft evidence to differential diagnosis probabilities
 * across the 5 NASA Spaceflight Hazards:
 *   P(H_i | E) = P(H_i) * Prod P(E_j | H_i) / Sum_k [ P(H_k) * Prod P(E_j | H_k) ]
 */

import trainedAstrocausal from './trained_astrocausal.json' with { type: 'json' };

export const NASA_CONDITIONS = [
  'sans_fluid_shift',
  'cardiovascular_deconditioning',
  'cabin_hypercapnia',
  'acute_radiation_sickness',
  'psychomotor_fatigue'
];

export class AstroCausalEngine {
  constructor() {
    // Dynamic Dirichlet priors rewired from NASA research if available, else nominal setpoints
    if (trainedAstrocausal && trainedAstrocausal.dirichletPriors) {
      this.dirichletPriors = { ...trainedAstrocausal.dirichletPriors };
      this.likelihoodModifiers = trainedAstrocausal.likelihoodModifiers || {};
    } else {
      this.dirichletPriors = {
        sans_fluid_shift: 3.5,
        cardiovascular_deconditioning: 4.0,
        cabin_hypercapnia: 1.5,
        acute_radiation_sickness: 0.8,
        psychomotor_fatigue: 3.0
      };
      this.likelihoodModifiers = {};
    }
  }

  /**
   * Evaluates evidence vector and computes exact Bayesian posterior probabilities.
   * @param {Object} evidence - { onsd, heartRate, cabinCO2, radiationDoseRate, entropy }
   * @returns {Object} Normalized posterior probabilities for all 5 NASA conditions
   */
  evaluate(evidence) {
    const {
      onsd = 4.65,
      heartRate = 71,
      cabinCO2 = 2.1,
      radiationDoseRate = 18.0,
      entropy = 0.74
    } = evidence;

    // 1. Calculate base prior probabilities from Dirichlet distribution: E[theta_i] = alpha_i / sum(alpha)
    const sumAlpha = Object.values(this.dirichletPriors).reduce((acc, v) => acc + v, 0);
    const priors = {};
    for (const cond of NASA_CONDITIONS) {
      priors[cond] = this.dirichletPriors[cond] / sumAlpha;
    }

    // 2. Compute likelihoods P(E | H_i) using physiological likelihood functions
    const likelihoods = {};

    // SANS likelihood: strongly driven by ONSD > 5.0mm
    likelihoods.sans_fluid_shift = (onsd > 5.8) ? 8.5 : (onsd > 5.0) ? 3.5 : 0.2;

    // Cardiovascular deconditioning: accounts for heart rate baseline elevation + radiation endothelial factor
    const cvRadiationMod = this.likelihoodModifiers.cardiac_arrhythmia_radiation_factor || 1.0;
    likelihoods.cardiovascular_deconditioning = ((heartRate > 85) ? 4.2 : (heartRate < 60) ? 2.5 : 1.1) * (radiationDoseRate > 35 ? cvRadiationMod : 1.0);

    // Cabin hypercapnia likelihood: driven by ECLSS cabin CO2 > 2.5 mmHg
    likelihoods.cabin_hypercapnia = (cabinCO2 > 3.0) ? 9.5 : (cabinCO2 > 2.5) ? 4.0 : 0.05;

    // Acute radiation sickness: adapted threshold learned from NASA HZE heavy ion research
    const radThreshold = this.likelihoodModifiers.radiation_nausea_threshold_uSv || 50.0;
    likelihoods.acute_radiation_sickness = (radiationDoseRate > 150) ? 12.0 : (radiationDoseRate > radThreshold) ? 5.5 : 0.02;

    // Psychomotor vigilance collapse: sensitivity amplified by CNS particle track vulnerability
    const cnsMod = this.likelihoodModifiers.cns_entropy_vulnerability_factor || 1.0;
    likelihoods.psychomotor_fatigue = ((entropy < 0.55) ? 9.0 : (entropy < 0.65) ? 3.8 : 0.25) * (radiationDoseRate > 35 ? cnsMod : 1.0);

    // 3. Unnormalized joint probabilities: P(H_i, E) = P(H_i) * P(E | H_i)
    const unnormalized = {};
    let totalMass = 0.0;
    for (const cond of NASA_CONDITIONS) {
      const val = priors[cond] * likelihoods[cond];
      unnormalized[cond] = val;
      totalMass += val;
    }

    // 4. Normalized posteriors: P(H_i | E) = P(H_i, E) / totalMass
    const posteriors = {};
    let topCondition = NASA_CONDITIONS[0];
    let topProb = 0.0;

    for (const cond of NASA_CONDITIONS) {
      const prob = totalMass > 0 ? unnormalized[cond] / totalMass : priors[cond];
      const pct = +(prob * 100).toFixed(1);
      posteriors[cond] = pct;
      if (pct > topProb) {
        topProb = pct;
        topCondition = cond;
      }
    }

    return {
      topCondition,
      topProbability: topProb,
      posteriors,
      priors: Object.fromEntries(Object.entries(priors).map(([k, v]) => [k, +(v * 100).toFixed(1)]))
    };
  }
}
