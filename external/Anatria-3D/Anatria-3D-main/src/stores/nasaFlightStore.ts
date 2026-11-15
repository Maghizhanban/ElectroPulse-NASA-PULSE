import { create } from "zustand";

export interface ActiveDiagnosticIssue {
  crewId: string;
  crewName: string;
  callsign: string;
  role: string;
  condition: string;
  targetStructure: string;
  isolatedOrgans: string[];
  latinName: string;
  system: "nervous" | "skeletal" | "muscular" | "cardiovascular" | "endocrine";
  painLocus: string;
  painSeverity: number; // 0 - 10
  strainPercentage: number; // e.g. 85%
  vitals: {
    hr: number;
    bp: string;
    onsd: number;
    icp: number;
    radiation: number;
  };
  etiology: string;
  countermeasure: string;
  hudTargetCoords: { x: number; y: number }; // Percentage 0-100 on viewport
}

export const DIAGNOSTIC_PRESETS: Record<string, ActiveDiagnosticIssue> = {
  rostova: {
    crewId: "rostova",
    crewName: "CDR Elena Rostova, MD",
    callsign: "Valkyrie-1",
    role: "Mission Commander & Flight Surgeon",
    condition: "Spaceflight Neuro-Ocular Syndrome (SANS)",
    targetStructure: "optic_nerve_ii_r",
    isolatedOrgans: [
      "optic_nerve_ii_r",
      "optic_nerve_ii_l",
      "optic_chiasm_r",
      "optic_chiasm_l",
      "anterior_chamber_of_eyeball_r",
      "anterior_chamber_of_eyeball_l",
      "aqueduct_of_midbrain"
    ],
    latinName: "Nervus Opticus (CN II) · Sheath Segment",
    system: "nervous",
    painLocus: "Retro-orbital Ache & Blurry Central Vision",
    painSeverity: 8.2,
    strainPercentage: 88,
    vitals: { hr: 71, bp: "120/80", onsd: 5.82, icp: 19.4, radiation: 18.4 },
    etiology: "Cephalad fluid redistribution causes retrobulbar subarachnoid hypertension, expanding optic sheath diameter and flattening the posterior globe.",
    countermeasure: "Chibis-M Lower Body Negative Pressure (LBNP) at -45 mmHg (45 min) + 15° head-up sleep elevation.",
    hudTargetCoords: { x: 50, y: 48 },
  },
  chen: {
    crewId: "chen",
    crewName: "Dr. Marcus Chen, PhD",
    callsign: "Geo-Lead",
    role: "Science Officer & Geologist",
    condition: "Trabecular Osteopenia & Lumbar Strain",
    targetStructure: "intervertebral_disc_l4_l5",
    isolatedOrgans: [
      "intervertebral_disc_l1_l2",
      "intervertebral_disc_l2_l3",
      "intervertebral_disc_l3_l4",
      "intervertebral_disc_l4_l5"
    ],
    latinName: "Vertebrae Lumbales (L1-L5) & Annulus Fibrosus",
    system: "skeletal",
    painLocus: "Axial Lumbar Radiculopathy & Hypercalciuria",
    painSeverity: 7.4,
    strainPercentage: 76,
    vitals: { hr: 68, bp: "118/76", onsd: 4.88, icp: 12.1, radiation: 19.1 },
    etiology: "Unweighted microgravity halts piezoelectric osteoblast signaling, speeding bone resorption by 1.4x with +4.2cm spinal lengthening.",
    countermeasure: "ARED 60min axial heavy resistance cycle (600N squats) + weekly 70mg oral Bisphosphonate pulse.",
    hudTargetCoords: { x: 50, y: 50 },
  },
  connor: {
    crewId: "connor",
    crewName: "Lt. Sarah Connor, MSc",
    callsign: "Aero-2",
    role: "Flight Engineer & EVA Specialist",
    condition: "Postural Soleus Motor Degradation",
    targetStructure: "soleus_muscle_r",
    isolatedOrgans: [
      "soleus_muscle_r",
      "soleus_muscle_l",
      "soleus_muscle_or",
      "soleus_muscle_ol"
    ],
    latinName: "Musculus Soleus & Tendocalcaneus",
    system: "muscular",
    painLocus: "Lower Extremity Heaviness & Delayed Motor Reflex",
    painSeverity: 6.8,
    strainPercentage: 71,
    vitals: { hr: 78, bp: "126/84", onsd: 4.95, icp: 13.0, radiation: 22.5 },
    etiology: "Slow-twitch postural type I muscle fiber proteolysis due to 6.5h EVA exertion and lack of gravitational load.",
    countermeasure: "Eccentric calf loading on T2 treadmill + 0.5mg sublingual Melatonin for rapid slow-wave motor recovery.",
    hudTargetCoords: { x: 50, y: 50 },
  },
  hand_strain: {
    crewId: "connor",
    crewName: "Lt. Sarah Connor, MSc",
    callsign: "Aero-2",
    role: "EVA Specialist & Flight Engineer",
    condition: "Acute Hand Muscle Sprain (EVA Glove Trauma)",
    targetStructure: "abductor_pollicis_brevis_r",
    isolatedOrgans: [
      "abductor_pollicis_brevis_r",
      "abductor_pollicis_brevis_l",
      "abductor_digiti_minimi_of_hand_er",
      "abductor_digiti_minimi_of_hand_el"
    ],
    latinName: "Musculus Abductor Pollicis Brevis (Manus)",
    system: "muscular",
    painLocus: "Right Thenar Eminence Spasm & Grip Loss",
    painSeverity: 7.8,
    strainPercentage: 84,
    vitals: { hr: 79, bp: "128/82", onsd: 4.90, icp: 12.8, radiation: 21.4 },
    etiology: "Repetitive pressurized EMU space glove actuation during 6.5h spacewalk caused acute tenosynovitis and intrinsic thenar muscle sprain.",
    countermeasure: "Microgravity passive thumb extension splint + thermal glove compression and topical NSAID transdermal patch.",
    hudTargetCoords: { x: 50, y: 50 },
  },
  nominal_scan: {
    crewId: "commander",
    crewName: "Commander",
    callsign: "Valkyrie-1",
    role: "Mission Commander",
    condition: "Nominal Flight Telemetry Surveillance",
    targetStructure: "heart",
    isolatedOrgans: ["heart"],
    latinName: "Cor (Myocardium)",
    system: "cardiovascular",
    painLocus: "No Somatic Discomfort",
    painSeverity: 0,
    strainPercentage: 12,
    vitals: { hr: 68, bp: "118/76", onsd: 4.65, icp: 12.0, radiation: 18.2 },
    etiology: "All physiological systems operating within nominal baseline parameters.",
    countermeasure: "Maintain routine physical countermeasure protocol.",
    hudTargetCoords: { x: 50, y: 50 },
  },
  cardiac_shift: {
    crewId: "rostova",
    crewName: "CDR Elena Rostova, MD",
    callsign: "Valkyrie-1",
    role: "Mission Commander & Flight Surgeon",
    condition: "Cephalad Cardiovascular Remodeling",
    targetStructure: "heart",
    isolatedOrgans: [
      "heart",
      "right_atrium",
      "left_atrium",
      "right_ventricle",
      "left_ventricle"
    ],
    latinName: "Cor (Myocardium & Cavitates Cordis)",
    system: "cardiovascular",
    painLocus: "Thoracic Fullness & Jugular Venous Distension",
    painSeverity: 6.5,
    strainPercentage: 74,
    vitals: { hr: 64, bp: "135/88", onsd: 5.10, icp: 16.2, radiation: 18.0 },
    etiology: "Headward redistribution of 2 liters of intravascular volume induces acute right atrial stretch and atrial natriuretic peptide (ANP) release.",
    countermeasure: "Plasma volume restoration protocol (saline ingestion 1g/kg) + resistive cycle ergometer intervals.",
    hudTargetCoords: { x: 50, y: 50 },
  },
};

interface NasaFlightState {
  activeIssue: ActiveDiagnosticIssue;
  hudVisible: boolean;
  voiceActive: boolean;
  activeTab: "diagnosis" | "risks" | "engines" | "atlas";
  setActiveIssue: (issue: ActiveDiagnosticIssue) => void;
  setCrewById: (id: string) => void;
  setHudVisible: (visible: boolean) => void;
  setVoiceActive: (active: boolean) => void;
  setActiveTab: (tab: "diagnosis" | "risks" | "engines" | "atlas") => void;
}

export const useNasaFlightStore = create<NasaFlightState>((set) => ({
  activeIssue: DIAGNOSTIC_PRESETS.nominal_scan!,
  hudVisible: true,
  voiceActive: true,
  activeTab: "diagnosis",
  setActiveIssue: (issue) => set({ activeIssue: issue }),
  setCrewById: (id) => {
    const preset = DIAGNOSTIC_PRESETS[id] ?? DIAGNOSTIC_PRESETS.nominal_scan!;
    set({ activeIssue: preset });
  },
  setHudVisible: (visible) => set({ hudVisible: visible }),
  setVoiceActive: (active) => set({ voiceActive: active }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
