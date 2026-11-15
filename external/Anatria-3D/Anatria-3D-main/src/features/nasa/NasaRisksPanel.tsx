import React from "react";
import { useSceneStore } from "@/stores/sceneStore";
import { useChatStore } from "@/stores/chatStore";

interface NasaRisk {
  id: string;
  name: string;
  category: "Neuro-Ocular" | "Cardiovascular" | "Musculoskeletal" | "Radiation" | "Neurovestibular";
  summary: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  targetOrgan: string;
  protocol: string;
  vitalsNote: string;
}

const NASA_RISKS: NasaRisk[] = [
  {
    id: "sans",
    name: "SANS (Optic Sheath Edema)",
    category: "Neuro-Ocular",
    summary: "Cephalad fluid redistribution causes venous stasis in optic nerve sheath, optic disc edema, and choroidal folds.",
    severity: "CRITICAL",
    targetOrgan: "optic_nerve",
    protocol: "LBNP suit at 25 mmHg for 2 hours daily + seated 15° sleep inclination.",
    vitalsNote: "ONSD: 5.92 mm (Threshold > 5.8 mm) · ICP: 18.4 mmHg",
  },
  {
    id: "fluid_shift",
    name: "Cephalad Cardiovascular Shift",
    category: "Cardiovascular",
    summary: "Loss of hydrostatic gradient moves ~2L of venous blood headward, inducing cardiac atrial distension and baroreceptor resetting.",
    severity: "HIGH",
    targetOrgan: "heart",
    protocol: "Fluid electrolyte restoration (saline capsules 1g/kg) + resistive cycle ergometry.",
    vitalsNote: "Central Venous Pressure: +4.2 mmHg transient · Cardiac Output: +18%",
  },
  {
    id: "osteopenia",
    name: "Trabecular Demineralization",
    category: "Musculoskeletal",
    summary: "Unloaded skeleton sheds 1.2% bone mineral density per month via osteoclast upregulation; elevates nephrolithiasis risk.",
    severity: "HIGH",
    targetOrgan: "vertebra_lumbar_1",
    protocol: "ARED heavy axial loading (600N squat/deadlift) + Bisphosphonate IV pulse.",
    vitalsNote: "Urinary Free Deoxypyridinoline: +48% · Calciuria: 340 mg/24h",
  },
  {
    id: "muscle_atrophy",
    name: "Soleus Postural Atrophy",
    category: "Musculoskeletal",
    summary: "Selective degradation of slow-twitch postural muscle fibers under microgravity unloading, risking EVA mobility loss.",
    severity: "MODERATE",
    targetOrgan: "soleus",
    protocol: "Eccentric calf loading on T2 treadmill + branched-chain amino acid infusion.",
    vitalsNote: "Soleus Cross-Sectional Area: -14.2% at Day 120",
  },
  {
    id: "radiation_spe",
    name: "Deep Space Ionizing Radiation",
    category: "Radiation",
    summary: "High-Z Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE) causing DNA double-strand breaks and oxidative stress.",
    severity: "CRITICAL",
    targetOrgan: "sternum",
    protocol: "Deploy storm shelter water-wall shielding + Amifostine radioprotectant.",
    vitalsNote: "Dose Rate: 1.48 mSv/day (Solar Minimum background: 0.8 mSv/day)",
  },
];

export function NasaRisksPanel() {
  const applyCommand = useSceneStore((s) => s.applyCommand);
  const organs = useSceneStore((s) => s.organs);

  const handleTargetInAtlas = (risk: NasaRisk) => {
    // 1. Un-ghost and isolate systems or focus organ
    try {
      applyCommand({ action: "reset_view" });
      setTimeout(() => {
        // Try focusing the organ or similar structure
        let organToFocus = risk.targetOrgan;
        if (!organs[organToFocus]) {
          const match = Object.keys(organs).find((k) => k.toLowerCase().includes(risk.targetOrgan.toLowerCase()));
          if (match) organToFocus = match;
        }

        applyCommand({
          action: "focus_organ",
          organ_id: organToFocus,
        });

        applyCommand({
          action: "apply_pathology_overlay",
          organ_id: organToFocus,
          pathology: risk.name,
          severity: risk.severity === "CRITICAL" ? 1.0 : 0.75,
        });

        applyCommand({
          action: "scan_at_structure",
          organ_id: organToFocus,
        });
      }, 100);
    } catch (e) {
      console.warn("Atlas target command error", e);
    }
  };

  const handleAskPulse = (risk: NasaRisk) => {
    // Find textarea and trigger prompt
    const prompt = `NASA Protocol Query: Analyze astronaut risk profile for ${risk.name}. Current telemetry: ${risk.vitalsNote}. Recommend clinical countermeasures according to NASA HRP guidelines.`;
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    if (textarea) {
      textarea.value = prompt;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      // Focus textarea
      textarea.focus();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 p-3 text-slate-200">
      <div className="mb-3 border-b border-slate-800 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase">
            NASA Human Research Program
          </span>
          <span className="rounded bg-sky-950/80 px-1.5 py-0.5 text-[9px] font-mono text-sky-300 border border-sky-800/60">
            HRP-DIR-2026
          </span>
        </div>
        <h2 className="mt-1 text-sm font-semibold text-slate-100">Deep Space Health Risks</h2>
        <p className="text-[11px] text-slate-400">
          Proactive telemetry surveillance for long-duration cislunar transit.
        </p>
      </div>

      <div className="space-y-3">
        {NASA_RISKS.map((risk) => {
          const isCritical = risk.severity === "CRITICAL";
          const isHigh = risk.severity === "HIGH";

          return (
            <div
              key={risk.id}
              className={`rounded-lg border p-2.5 transition ${
                isCritical
                  ? "border-red-900/60 bg-red-950/20 hover:border-red-700/80"
                  : isHigh
                  ? "border-amber-900/60 bg-amber-950/20 hover:border-amber-700/80"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {risk.category}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                    isCritical
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : isHigh
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  }`}
                >
                  {risk.severity}
                </span>
              </div>

              <h3 className="mt-1 text-xs font-semibold text-slate-100">{risk.name}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{risk.summary}</p>

              <div className="mt-2 rounded bg-slate-900/80 p-1.5 text-[10px] font-mono text-slate-400 border border-slate-800">
                <span className="text-cyan-400">TELEMETRY:</span> {risk.vitalsNote}
              </div>

              <div className="mt-1.5 rounded bg-slate-900/50 p-1.5 text-[10px] text-slate-400 border border-slate-800/60">
                <span className="text-amber-400 font-medium">COUNTERMEASURE:</span> {risk.protocol}
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTargetInAtlas(risk)}
                  className="flex-1 rounded bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/40 px-2 py-1 text-[10px] font-semibold text-sky-300 transition"
                >
                  ⊕ Target in 3D Atlas
                </button>
                <button
                  type="button"
                  onClick={() => handleAskPulse(risk)}
                  className="flex-1 rounded bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 px-2 py-1 text-[10px] font-semibold text-cyan-300 transition"
                >
                  Query OpenJarvis
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
