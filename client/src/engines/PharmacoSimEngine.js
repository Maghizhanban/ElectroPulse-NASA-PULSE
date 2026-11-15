/**
 * PharmacoSimEngine.js
 * High-Performance Runge-Kutta 4th Order (RK4) Two-Compartment
 * Pharmacokinetic / Pharmacodynamic (PK/PD) Numerical Solver.
 * 
 * Solves:
 *   dC1/dt = (Dose * ka / V1) - (k10 + k12)*C1 + k21*C2*(V2/V1)
 *   dC2/dt = k12*C1*(V1/V2) - k21*C2
 *   E(t)   = (Emax * C1(t)^gamma) / (EC50^gamma + C1(t)^gamma)
 */

export const SPACEFLIGHT_DRUG_CATALOGUE = {
  acetazolamide: {
    name: 'Acetazolamide',
    defaultDoseMg: 250,
    unit: 'mg',
    indication: 'SANS Optic Disc Edema / Retrobulbar ICP Reduction',
    targetOrgan: 'sensory',
    targetConceptQuery: 'optic nerve',
    // 2-Compartment PK parameters (Oral delivery)
    ka: 1.45,       // Absorption rate constant (1/h)
    k10: 0.175,     // Elimination rate constant (1/h) (half-life ~4h)
    k12: 0.22,      // Central to peripheral distribution (1/h)
    k21: 0.14,      // Peripheral to central redistribution (1/h)
    V1: 14.5,       // Central volume of distribution (L)
    V2: 28.0,       // Peripheral volume of distribution (L)
    // PD Hill equation parameters
    Emax: 38.5,     // Max % reduction in CSF / retrobulbar ICP
    EC50: 12.0,     // Plasma concentration for 50% effect (mg/L)
    gamma: 1.8,     // Hill coefficient
    bioavailability: 0.90,
    targetPhysiologicalParam: 'ONSD (mm)',
    baselineValue: 5.82,
    calcRecoveryValue: (baseline, effectPct) => {
      // Emax reduces retrobulbar sheath swelling from 5.82mm towards nominal 4.80mm
      const maxDelta = baseline - 4.80;
      return +(baseline - (maxDelta * (effectPct / 100))).toFixed(2);
    }
  },

  fludrocortisone: {
    name: 'Fludrocortisone',
    defaultDoseMg: 0.1,
    unit: 'mg',
    indication: 'Orthostatic Intolerance / Hypovolemia Fluid Expansion',
    targetOrgan: 'cardiac',
    targetConceptQuery: 'heart',
    ka: 2.1,
    k10: 0.28,
    k12: 0.35,
    k21: 0.20,
    V1: 42.0,
    V2: 65.0,
    Emax: 28.0,
    EC50: 0.0035,
    gamma: 1.4,
    bioavailability: 0.95,
    targetPhysiologicalParam: 'Plasma Volume (L)',
    baselineValue: 2.45,
    calcRecoveryValue: (baseline, effectPct) => {
      // Re-expands plasma volume from 2.45L back to nominal 3.10L
      return +(baseline + (0.65 * (effectPct / 100))).toFixed(2);
    }
  },

  promethazine: {
    name: 'Promethazine',
    defaultDoseMg: 25,
    unit: 'mg',
    indication: 'Space Motion Sickness (SAS) / Vestibular Dysadaptation',
    targetOrgan: 'nervous',
    targetConceptQuery: 'vestibular',
    ka: 1.8,
    k10: 0.058,    // Elimination half-life ~12h
    k12: 0.45,
    k21: 0.30,
    V1: 180.0,
    V2: 320.0,
    Emax: 85.0,     // % reduction in vestibular nausea & motion index
    EC50: 0.045,
    gamma: 2.1,
    bioavailability: 0.88,
    targetPhysiologicalParam: 'Otolith SAS Index',
    baselineValue: 7.8,
    calcRecoveryValue: (baseline, effectPct) => {
      return +(baseline * (1 - (effectPct / 100))).toFixed(1);
    }
  },

  alendronate: {
    name: 'Alendronate (Bisphosphonate)',
    defaultDoseMg: 70,
    unit: 'mg',
    indication: 'Trabecular Bone Demineralization / Osteoclast Suppression',
    targetOrgan: 'skeletal',
    targetConceptQuery: 'lumbar',
    ka: 0.85,
    k10: 0.015,     // Strong bone matrix binding, long terminal elimination
    k12: 0.65,
    k21: 0.008,
    V1: 28.0,
    V2: 240.0,
    Emax: 68.0,     // % reduction in bone resorption biomarkers (CTX/NTX)
    EC50: 0.85,
    gamma: 1.6,
    bioavailability: 0.65,
    targetPhysiologicalParam: 'Bone Resorption (x)',
    baselineValue: 1.4,
    calcRecoveryValue: (baseline, effectPct) => {
      return +(baseline - (0.4 * (effectPct / 100))).toFixed(2);
    }
  }
};

/**
 * Solves the ODE system using Classical 4th-Order Runge-Kutta (RK4).
 * @param {string} drugKey - Key from SPACEFLIGHT_DRUG_CATALOGUE
 * @param {number} doseMg - Administered dose in milligrams
 * @param {number} totalHours - Total simulation duration (e.g. 72 hours)
 * @param {number} stepSize - Step size h in hours (e.g. 0.25h)
 */
export function simulatePharmacokinetics(drugKey, doseMg, totalHours = 72, stepSize = 0.2) {
  const drug = SPACEFLIGHT_DRUG_CATALOGUE[drugKey] || SPACEFLIGHT_DRUG_CATALOGUE.acetazolamide;
  const dose = (doseMg !== undefined && doseMg > 0) ? doseMg : drug.defaultDoseMg;

  const { ka, k10, k12, k21, V1, V2, Emax, EC50, gamma, bioavailability } = drug;
  const F = bioavailability;
  const absorbedDose = dose * F;

  // Differential equations: y = [A_depot, C1, C2]
  // dy[0]/dt = -ka * A_depot
  // dy[1]/dt = (ka * A_depot / V1) - (k10 + k12)*C1 + k21*C2*(V2 / V1)
  // dy[2]/dt = k12*C1*(V1 / V2) - k21*C2
  const derivatives = (t, y) => {
    const A_depot = Math.max(0, y[0]);
    const C1 = Math.max(0, y[1]);
    const C2 = Math.max(0, y[2]);

    const dA = -ka * A_depot;
    const dC1 = (ka * A_depot / V1) - (k10 + k12) * C1 + k21 * C2 * (V2 / V1);
    const dC2 = k12 * C1 * (V1 / V2) - k21 * C2;

    return [dA, dC1, dC2];
  };

  const steps = Math.floor(totalHours / stepSize);
  const timePoints = [];
  const plasmaConcentrations = [];
  const tissueConcentrations = [];
  const therapeuticEffects = [];
  const organRecoverySeries = [];

  let y = [absorbedDose, 0.0, 0.0];
  let t = 0.0;
  let maxConc = 0.0;
  let tMax = 0.0;
  let maxEffect = 0.0;

  for (let i = 0; i <= steps; i++) {
    const C1 = Math.max(0, y[1]);
    const C2 = Math.max(0, y[2]);

    // Hill Pharmacodynamic Effect
    const cPow = Math.pow(C1, gamma);
    const ecPow = Math.pow(EC50, gamma);
    const effectPct = (cPow + ecPow > 0) ? (Emax * cPow) / (ecPow + cPow) : 0;
    const recoveryVal = drug.calcRecoveryValue(drug.baselineValue, effectPct);

    timePoints.push(+t.toFixed(1));
    plasmaConcentrations.push(+C1.toFixed(3));
    tissueConcentrations.push(+C2.toFixed(3));
    therapeuticEffects.push(+effectPct.toFixed(1));
    organRecoverySeries.push(recoveryVal);

    if (C1 > maxConc) {
      maxConc = C1;
      tMax = t;
    }
    if (effectPct > maxEffect) {
      maxEffect = effectPct;
    }

    // RK4 Step
    const h = stepSize;
    const k1 = derivatives(t, y);
    const y_k1 = y.map((val, idx) => val + 0.5 * h * k1[idx]);

    const k2 = derivatives(t + 0.5 * h, y_k1);
    const y_k2 = y.map((val, idx) => val + 0.5 * h * k2[idx]);

    const k3 = derivatives(t + 0.5 * h, y_k2);
    const y_k3 = y.map((val, idx) => val + h * k3[idx]);

    const k4 = derivatives(t + h, y_k3);

    y = y.map((val, idx) => val + (h / 6.0) * (k1[idx] + 2 * k2[idx] + 2 * k3[idx] + k4[idx]));
    t += h;
  }

  return {
    drug: drug.name,
    doseMg: dose,
    unit: drug.unit,
    indication: drug.indication,
    targetOrgan: drug.targetOrgan,
    targetConceptQuery: drug.targetConceptQuery,
    targetParam: drug.targetPhysiologicalParam,
    baselineValue: drug.baselineValue,
    cMax: +maxConc.toFixed(2),
    tMaxHours: +tMax.toFixed(1),
    maxEffectPct: +maxEffect.toFixed(1),
    projectedFinalValue: organRecoverySeries[organRecoverySeries.length - 1],
    timePoints,
    plasmaConcentrations,
    tissueConcentrations,
    therapeuticEffects,
    organRecoverySeries
  };
}
