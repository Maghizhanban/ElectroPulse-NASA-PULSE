import React, { useState, useEffect } from "react";
import { useNasaFlightStore } from "@/stores/nasaFlightStore";
import { useSceneStore } from "@/stores/sceneStore";
import { Activity, AlertTriangle, Eye, Shield, Zap, Crosshair } from "lucide-react";

function TypewriterText({ text, speed = 14 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayed}</span>;
}

export function CinematicHoloHud() {
  const { activeIssue, hudVisible, setHudVisible } = useNasaFlightStore();
  const applyCommand = useSceneStore((s) => s.applyCommand);
  const organs = useSceneStore((s) => s.organs);
  const glassBody = useSceneStore((s) => s.glassBody);

  const [heatMapPulsing, setHeatMapPulsing] = useState(true);
  const [protocolLogged, setProtocolLogged] = useState(false);

  if (!hudVisible) {
    return (
      <button
        type="button"
        onClick={() => setHudVisible(true)}
        className="absolute bottom-16 right-4 z-30 flex items-center gap-1.5 rounded-full border border-cyan-500/50 bg-slate-950/80 px-3 py-1 text-[11px] font-mono text-cyan-300 shadow-lg backdrop-blur hover:border-cyan-400"
      >
        <Crosshair className="h-3.5 w-3.5 animate-spin-slow text-cyan-400" />
        ENABLE CINEMATIC HUD
      </button>
    );
  }

  // Find organ structure matching target
  const resolveTargetOrgan = () => {
    let organId = activeIssue.targetStructure;
    if (organs[organId]) return organId;
    const match = Object.keys(organs).find((k) =>
      k.toLowerCase().includes(activeIssue.targetStructure.toLowerCase())
    );
    return match || organId;
  };

  const handleAutoIsolate = () => {
    const organId = resolveTargetOrgan();
    // Turn body to glass and focus structure
    glassBody();
    setTimeout(() => {
      applyCommand({
        action: "focus_organ",
        organ_id: organId,
      });
      applyCommand({
        action: "scan_at_structure",
        organ_id: organId,
      });
      applyCommand({
        action: "apply_pathology_overlay",
        organ_id: organId,
        pathology: activeIssue.condition,
        severity: activeIssue.strainPercentage / 100,
      });
    }, 150);
  };

  const handlePulseHeatmap = () => {
    setHeatMapPulsing(!heatMapPulsing);
    const organId = resolveTargetOrgan();
    applyCommand({
      action: "apply_pathology_overlay",
      organ_id: organId,
      pathology: "Microgravity Stress & Pain Locus",
      severity: 1.0,
    });
  };

  const handleExecuteProtocol = async () => {
    setProtocolLogged(true);
    try {
      await fetch("http://127.0.0.1:8845/api/pulse/intervene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astronaut_id: activeIssue.crewId,
          protocol_code: "NASA-HRP-2026-AUTONOMOUS",
          action: activeIssue.countermeasure,
          biomarkers: activeIssue.vitals,
        }),
      });
    } catch (e) {
      console.warn("Backend logging error", e);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
      {/* Reticle over anatomical target */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 pointer-events-auto"
        style={{
          left: `${activeIssue.hudTargetCoords.x}%`,
          top: `${activeIssue.hudTargetCoords.y}%`,
        }}
      >
        {/* Pulsing movie reticle */}
        <div className="relative flex items-center justify-center">
          {/* Outer dashed rotating ring */}
          <div className="h-28 w-28 rounded-full border-2 border-dashed border-cyan-400/50 animate-spin-slow"></div>

          {/* Inner pulsating warning ring */}
          <div
            className={`absolute h-20 w-20 rounded-full border ${
              activeIssue.strainPercentage > 80
                ? "border-red-500/80 bg-red-500/10 animate-ping"
                : "border-amber-500/80 bg-amber-500/10 animate-pulse"
            }`}
          ></div>

          {/* Central crosshair */}
          <div className="absolute h-4 w-4">
            <div className="absolute top-1/2 left-0 h-[1.5px] w-4 bg-cyan-400 -translate-y-1/2"></div>
            <div className="absolute left-1/2 top-0 w-[1.5px] h-4 bg-cyan-400 -translate-x-1/2"></div>
            <div className="absolute inset-1 rounded-full bg-cyan-300 animate-pulse"></div>
          </div>

          {/* Holographic pointer leader line to diagnostic HUD */}
          <svg className="absolute left-14 top-14 w-40 h-24 overflow-visible pointer-events-none">
            <polyline
              points="0,0 24,24 140,24"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              className="animate-pulse"
            />
            <circle cx="140" cy="24" r="3" fill="#22d3ee" />
          </svg>
        </div>
      </div>

      {/* Floating Holographic Diagnostic Dossier Overlay (Upper Right of Viewport) */}
      <div className="absolute top-12 right-4 w-84 max-w-[90vw] pointer-events-auto">
        <div className="rounded-xl border border-cyan-500/40 bg-slate-950/85 p-3.5 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                TARGET LOCK: {activeIssue.callsign}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHudVisible(false)}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-300"
              title="Minimize HUD"
            >
              [MINIMIZE]
            </button>
          </div>

          {/* Target Anatomy & Condition */}
          <div className="mt-2.5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-100">{activeIssue.latinName}</h3>
                <p className="text-[10px] font-mono text-cyan-300/80 uppercase">
                  {activeIssue.condition}
                </p>
              </div>
              <span className="rounded bg-red-950/80 border border-red-500/50 px-1.5 py-0.5 text-[9px] font-mono font-bold text-red-300 animate-pulse">
                STRAIN {activeIssue.strainPercentage}%
              </span>
            </div>

            {/* Pain / Strain Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>PAIN LOCUS: {activeIssue.painLocus}</span>
                <span className="text-red-400 font-bold">{activeIssue.painSeverity}/10</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
                  style={{ width: `${activeIssue.strainPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Microgravity Etiology */}
            <p className="mt-2 text-[10px] leading-relaxed text-slate-300 border-l-2 border-cyan-500/40 pl-2">
              <TypewriterText text={activeIssue.etiology} speed={12} />
            </p>

            {/* Live Telemetry Pill Strip */}
            <div className="mt-2.5 grid grid-cols-3 gap-1 text-center font-mono">
              <div className="rounded bg-slate-900/90 border border-slate-800 p-1">
                <div className="text-[8px] text-slate-400">HEART RATE</div>
                <div className="text-[10px] font-bold text-emerald-400">{activeIssue.vitals.hr} bpm</div>
              </div>
              <div className="rounded bg-slate-900/90 border border-slate-800 p-1">
                <div className="text-[8px] text-slate-400">ONSD / ICP</div>
                <div className="text-[10px] font-bold text-cyan-300">
                  {activeIssue.vitals.onsd}mm · {activeIssue.vitals.icp}
                </div>
              </div>
              <div className="rounded bg-slate-900/90 border border-slate-800 p-1">
                <div className="text-[8px] text-slate-400">RAD DOSE</div>
                <div className="text-[10px] font-bold text-amber-400">{activeIssue.vitals.radiation} µSv/h</div>
              </div>
            </div>

            {/* Movie-grade instant action buttons */}
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleAutoIsolate}
                className="flex items-center justify-center gap-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 py-1.5 text-[10px] font-semibold text-cyan-200 transition"
              >
                <Zap className="h-3 w-3 text-cyan-400" />
                Auto-Isolate Target
              </button>

              <button
                type="button"
                onClick={handlePulseHeatmap}
                className="flex items-center justify-center gap-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 py-1.5 text-[10px] font-semibold text-amber-200 transition"
              >
                <Activity className="h-3 w-3 text-amber-400" />
                Highlight Pain Locus
              </button>
            </div>

            <button
              type="button"
              onClick={handleExecuteProtocol}
              className={`mt-1.5 w-full flex items-center justify-center gap-1.5 rounded py-1.5 text-[10px] font-bold tracking-wider uppercase transition ${
                protocolLogged
                  ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/50"
                  : "bg-gradient-to-r from-red-600/30 to-amber-600/30 hover:from-red-600/40 hover:to-amber-600/40 text-slate-100 border border-red-500/50"
              }`}
            >
              <Shield className="h-3 w-3" />
              {protocolLogged ? "NASA Countermeasure Executed ✓" : "Execute Autonomous Protocol"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
