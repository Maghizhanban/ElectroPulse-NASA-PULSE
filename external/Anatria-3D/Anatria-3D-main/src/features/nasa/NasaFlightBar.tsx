import React, { useState, useEffect } from "react";
import { useSceneStore } from "@/stores/sceneStore";
import { useNasaFlightStore } from "@/stores/nasaFlightStore";
import { useChatStore } from "@/stores/chatStore";
import { Activity, AlertTriangle, CheckCircle, Eye, Heart, Radio, Shield, User, Volume2, VolumeX, X } from "lucide-react";

export interface CrewMember {
  id: string;
  name: string;
  callsign: string;
  role: string;
  avatar: string;
  vitals: {
    hr: number;
    bp: string;
    onsd: number;
    icp: number;
    radiation: number;
    entropy: number;
  };
  alert: {
    type: "critical" | "warning";
    condition: string;
    organId: string;
    system: string;
    cpg: string;
    metrics: string;
    mechanism: string;
    countermeasure: string;
    speechText: string;
  };
}

export const NASA_CREW: CrewMember[] = [
  {
    id: "rostova",
    name: "CDR Elena Rostova, MD",
    callsign: "Valkyrie-1",
    role: "Mission Commander & Flight Surgeon",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
    vitals: { hr: 71, bp: "120/80", onsd: 5.82, icp: 19.4, radiation: 18.4, entropy: 0.74 },
    alert: {
      type: "critical",
      condition: "Spaceflight-Associated Neuro-ocular Syndrome (SANS)",
      organId: "optic_nerve_ii_r",
      system: "nervous",
      cpg: "NASA-CPG-2024-SANS-03",
      metrics: "ONSD 5.82 mm • ICP 19.4 mmHg • Frisén Grade 1",
      mechanism: "Microgravity cephalad fluid redistribution causes retrobulbar subarachnoid hypertension, expanding the optic sheath and flattening the posterior globe.",
      countermeasure: "Immediate 45-min Chibis-M Lower Body Negative Pressure (LBNP) cycle at -45 mmHg + 10° head-up sleep elevation.",
      speechText: "Commander Rostova, ChronoPulse background analysis has detected acute retrobulbar pressure accumulation. Your right optic sheath diameter has expanded to 5.82 millimeters, indicating Frisén Grade 1 edema. Engaging SomatoScan 3D focal scan."
    }
  },
  {
    id: "chen",
    name: "Dr. Marcus Chen, PhD",
    callsign: "Geo-Lead",
    role: "Science Officer & Geologist",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    vitals: { hr: 68, bp: "118/76", onsd: 4.88, icp: 12.1, radiation: 19.1, entropy: 0.81 },
    alert: {
      type: "warning",
      condition: "Trabecular Microgravity Demineralization",
      organId: "intervertebral_disc_of_l4_l5",
      system: "skeletal",
      cpg: "NASA-HRP-BONE-2024",
      metrics: "Lumbar T-Score: -0.4 • Resorption Rate: 1.4x • Spinal Growth: +4.2 cm",
      mechanism: "Unweighting eliminates bone strain piezoelectric remodeling, accelerating osteoclast resorption with lumbar spinal elongation and nephrolithiasis risk.",
      countermeasure: "ARED 60min axial heavy resistance (squats & deadlifts at 85% 1RM) + weekly 70mg oral Bisphosphonate.",
      speechText: "Dr. Chen, unweighted bone mineral resorption is exceeding monthly tolerance. Trabecular demineralization rate is running at negative 1.4x baseline. Aligning 3D lumbar scan."
    }
  },
  {
    id: "connor",
    name: "Lt. Sarah Connor, MSc",
    callsign: "Aero-2",
    role: "Flight Engineer & EVA Specialist",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80",
    vitals: { hr: 78, bp: "126/84", onsd: 4.95, icp: 13.0, radiation: 22.5, entropy: 0.54 },
    alert: {
      type: "critical",
      condition: "Postural Soleus Degradation & EVA Fatigue",
      organId: "soleus_muscle_r",
      system: "muscular",
      cpg: "NASA-HRP-EXERCISE-02",
      metrics: "Keystroke Entropy: 0.54 • Soleus Mass: -0.8%/wk • Reaction Delay: +24%",
      mechanism: "Prolonged 6.5h spacewalk physical exertion combined with circadian disruption causes selective prefrontal vigilance lapses and slow-twitch muscle motor fatigue.",
      countermeasure: "Mandatory 8-hour sleep period prescription with active 0.5mg sublingual Melatonin and suspension of high-risk docking tasks.",
      speechText: "Lieutenant Connor, attention required. Keystroke motor entropy has dropped below 0.55 following your spacewalk. Acute cognitive lapse and soleus motor fatigue detected."
    }
  }
];

export function NasaFlightBar() {
  const [activeCrew, setActiveCrew] = useState<CrewMember>(NASA_CREW[0]);
  const [proactiveAlert, setProactiveAlert] = useState<CrewMember["alert"] | null>(NASA_CREW[0].alert);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [countermeasureApplied, setCountermeasureApplied] = useState(false);

  const applyCommand = useSceneStore((s) => s.applyCommand);
  const glassBody = useSceneStore((s) => s.glassBody);

  // Focus target structure in 3D model with ghosting, camera glide & scanner
  const targetIn3D = (alert: CrewMember["alert"], crewName: string) => {
    // 1. Ghost surrounding tissues to glass
    glassBody();

    // 2. Cinematic camera glide to target organ
    setTimeout(() => {
      applyCommand({
        action: "focus_organ",
        organ_id: alert.organId,
      });

      // 3. Move scanner ring to target structure
      applyCommand({
        action: "scan_at_structure",
        organ_id: alert.organId,
      });

      // 4. Apply localized glowing pathology overlay
      applyCommand({
        action: "apply_pathology_overlay",
        organ_id: alert.organId,
        pathology: alert.condition,
        severity: 0.95,
      });
    }, 120);

    // 5. Post autonomous clinical interception turn to OpenJarvis chat in parallel!
    useChatStore.getState().postAutonomousAlert(
      crewName,
      alert.condition,
      alert.mechanism,
      alert.countermeasure
    );
  };

  // Trigger Proactive Interception Voice Synthesis
  const speakAlert = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Movie-style Autonomous Auto-Diagnosis on Initial Launch
  useEffect(() => {
    const timer = setTimeout(() => {
      targetIn3D(NASA_CREW[0].alert, NASA_CREW[0].name);
      speakAlert(NASA_CREW[0].alert.speechText);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectCrew = (member: CrewMember) => {
    setActiveCrew(member);
    setProactiveAlert(member.alert);
    setCountermeasureApplied(false);
    useNasaFlightStore.getState().setCrewById(member.id);
    targetIn3D(member.alert, member.name);
    speakAlert(member.alert.speechText);
  };

  const handleExecuteCountermeasure = async () => {
    setCountermeasureApplied(true);
    // Log intervention to OpenJarvis / P.U.L.S.E. persistent memory
    try {
      await fetch("http://127.0.0.1:8845/api/pulse/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Executed countermeasure for ${activeCrew.name}: ${activeCrew.alert.countermeasure}`,
          crew_id: activeCrew.id,
          telemetry: activeCrew.vitals
        })
      });
    } catch {
      // Fallback
    }
  };

  return (
    <>
      {/* Sleek NASA ExMC Flight Deck Telemetry Bar */}
      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-2 text-xs backdrop-blur-md">
        {/* NASA Mission Identifier */}
        <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
          </div>
          <span className="font-mono font-bold tracking-wider text-cyan-400">NASA ExMC</span>
          <span className="text-[10px] text-slate-500">AUTONOMOUS FLIGHT SURGEON</span>
        </div>

        {/* Crew Selector Pills */}
        <div className="flex items-center gap-1.5">
          {NASA_CREW.map((m) => {
            const active = activeCrew.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectCrew(m)}
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  active
                    ? "bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/50"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <img src={m.avatar} alt={m.name} className="h-4 w-4 rounded-full object-cover" />
                <span>{m.callsign}</span>
                {m.alert && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      m.alert.type === "critical" ? "bg-amber-400 animate-pulse" : "bg-sky-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Vitals Readout Strip */}
        <div className="flex flex-1 items-center justify-end gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1 text-slate-300">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            <span>{activeCrew.vitals.hr} bpm</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-[10px] text-slate-500">ONSD</span>
            <span className={activeCrew.vitals.onsd > 5.5 ? "text-amber-400 font-semibold" : "text-slate-300"}>
              {activeCrew.vitals.onsd} mm
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="text-[10px] text-slate-500">ICP</span>
            <span className={activeCrew.vitals.icp > 15 ? "text-amber-400 font-semibold" : "text-slate-300"}>
              {activeCrew.vitals.icp} mmHg
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Radio className="h-3.5 w-3.5 text-cyan-400" />
            <span>{activeCrew.vitals.radiation} µSv/h</span>
          </div>

          {/* Voice Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className="ml-2 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title={voiceEnabled ? "Mute Voice Synthesizer" : "Enable Voice Synthesizer"}
          >
            {voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Autonomous Proactive Interception Drawer / Banner */}
      {proactiveAlert && (
        <div className="relative border-b border-amber-500/20 bg-slate-900/95 px-4 py-2.5 backdrop-blur-md transition">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-500/10 p-1.5 text-amber-400 ring-1 ring-amber-500/30">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                    P.U.L.S.E. PROACTIVE INTERCEPTION
                  </span>
                  <span className="font-semibold text-slate-200 text-xs">{proactiveAlert.condition}</span>
                  <span className="font-mono text-[10px] text-slate-500">• {proactiveAlert.cpg}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">{proactiveAlert.mechanism}</p>
                <div className="flex items-center gap-2 pt-1 font-mono text-[10px]">
                  <span className="text-slate-500">PRESCRIPTION:</span>
                  <span className="text-cyan-300 font-medium">{proactiveAlert.countermeasure}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => targetIn3D(proactiveAlert)}
                className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-medium text-cyan-300 transition hover:bg-cyan-900/50 hover:text-white"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Target 3D Atlas</span>
              </button>

              <button
                onClick={handleExecuteCountermeasure}
                disabled={countermeasureApplied}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition ${
                  countermeasureApplied
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{countermeasureApplied ? "Prescription Active" : "Execute NASA Protocol"}</span>
              </button>

              <button
                onClick={() => setProactiveAlert(null)}
                className="rounded p-1 text-slate-500 hover:text-slate-300"
                title="Dismiss Alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
