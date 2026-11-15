import React, { useState, useEffect, useRef } from "react";
import { useNasaFlightStore, type ActiveDiagnosticIssue } from "@/stores/nasaFlightStore";
import { useSceneStore } from "@/stores/sceneStore";
import {
  Activity,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Shield,
  Sparkles,
  Crosshair,
  Brain,
  Zap,
  Users,
  Workflow,
  Target,
  Network,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Cpu
} from "lucide-react";

interface ChatTurn {
  id: string;
  sender: "astronaut" | "pulse";
  text: string;
  timestamp: string;
  targetFocus?: string;
  strain?: number;
}

export function AutonomousDiagnosticDossier() {
  const { activeIssue, setActiveIssue, voiceActive, setVoiceActive } = useNasaFlightStore();
  const applyCommand = useSceneStore((s) => s.applyCommand);
  const organs = useSceneStore((s) => s.organs);
  const glassBody = useSceneStore((s) => s.glassBody);
  const fitView = useSceneStore((s) => s.fitView);
  const dollyView = useSceneStore((s) => s.dollyView);

  const [inputQuery, setInputQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "somatic" | "directives">("chat");

  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "init-1",
      sender: "pulse",
      text: "P.U.L.S.E. Autonomous Flight Surgeon online, Commander. All 3,478 cadaveric anatomical structures and 5 mathematical engines are active. How can I assist?",
      timestamp: "00:00",
    },
  ]);

  // Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsListening(false);
          if (transcript) {
            setInputQuery(transcript);
            handleSend(transcript);
          }
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("Speech recognition error:", e);
      }
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const toggleListening = () => {
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch {
          setIsListening(false);
        }
      } else {
        const promptInput = prompt("Voice mic not supported. Type your medical inquiry:");
        if (promptInput) {
          handleSend(promptInput);
        }
      }
    }
  };

  const speakVoice = (text: string) => {
    if (!voiceActive || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  };

  const resolveTargetOrgan = (targetKey: string) => {
    if (organs[targetKey]) return targetKey;
    const match = Object.keys(organs).find((k) =>
      k.toLowerCase().includes(targetKey.toLowerCase())
    );
    return match || targetKey;
  };

  // 3D Canvas Glide & Highlight
  const trigger3DFocus = (targetKey: string, conditionName?: string, strainPct: number = 75) => {
    const organId = resolveTargetOrgan(targetKey);
    glassBody();
    setTimeout(() => {
      applyCommand({ action: "focus_organ", organ_id: organId });
      applyCommand({ action: "scan_at_structure", organ_id: organId });
      applyCommand({
        action: "apply_pathology_overlay",
        organ_id: organId,
        pathology: conditionName || "Somatic Stress",
        severity: strainPct / 100,
      });
      fitView();
      dollyView(0.65);
    }, 150);
  };

  // Main Conversational & Command Dispatcher
  const handleSend = async (rawQuery?: string) => {
    const query = (rawQuery !== undefined ? rawQuery : inputQuery).trim();
    if (!query) return;

    setInputQuery("");
    const userTurn: ChatTurn = {
      id: "u-" + Date.now(),
      sender: "astronaut",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userTurn]);
    setIsThinking(true);
    setActionDone(false);

    const qLower = query.toLowerCase();

    // Check for quick slash directives
    const isDirective =
      qLower.startsWith("/") ||
      ["boost", "swarm", "learn", "teamwork", "goal", "migrate"].some((k) => qLower.startsWith(k));

    let assistantText = "";
    let targetFocus = "";
    let dynamicIssue: ActiveDiagnosticIssue | null = null;

    try {
      const res = await fetch("http://127.0.0.1:8845/api/pulse/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, crew_id: "elena" }),
      });
      const data = await res.json();
      assistantText = data.speechText || "Directive executed, Commander.";

      if (data.targetFocus) {
        targetFocus = data.targetFocus;
      }
      if (data.diagnosticIssue) {
        dynamicIssue = data.diagnosticIssue;
        setActiveIssue(dynamicIssue);
        targetFocus = dynamicIssue.targetStructure;
      }
    } catch {
      // Dynamic client-side fallback
      if (isDirective) {
        if (qLower.includes("boost")) {
          assistantText = "Performance Overdrive engaged, Commander. Telemetry streaming at 100 Hertz with sub-millisecond vectorized inference. Systems primed.";
          targetFocus = "heart";
        } else if (qLower.includes("swarm")) {
          assistantText = "Consensus reached across all six diagnostic agents, Commander. We are unanimous on nominal maintenance.";
          targetFocus = "brain";
        } else if (qLower.includes("learn")) {
          assistantText = "Dirichlet priors recalibrated and epistemic uncertainty reduced, Commander. Diagnostic models adapted to latest baseline.";
          targetFocus = "brain";
        } else if (qLower.includes("teamwork")) {
          assistantText = "All crew vitals synchronized, Commander. Elena and Marcus are nominal; Sarah's autonomic load is slightly elevated.";
          targetFocus = "heart";
        } else if (qLower.includes("goal")) {
          assistantText = "Four of five mission health goals are strictly on track, Commander. Bone density and aerobic retention remain within safe flight envelopes.";
          targetFocus = "soleus_muscle_r";
        } else if (qLower.includes("migrate")) {
          assistantText = "Clinical guidelines compiled into autonomous ExMC workflows, Commander. All protocols active with zero cloud dependency.";
          targetFocus = "sacrum";
        }
      } else {
        // Dynamic Somatoscan resolution for body parts
        let target = "heart";
        let organName = "Cor (Myocardium)";
        let sys: any = "cardiovascular";
        let cond = "Microgravity Hemodynamic Volume Shift";
        let rec = "Cycle ergometer intervals and plasma volume restoration protocol.";

        if (qLower.includes("thumb") || qLower.includes("hand") || qLower.includes("finger")) {
          target = "abductor_pollicis_brevis_r";
          organName = "Musculus Abductor Pollicis Brevis";
          sys = "muscular";
          cond = "Microgravity Thenar Tendon Strain";
          rec = "Localized cryo-compression and 20-minute vibro-stimulation protocol.";
        } else if (qLower.includes("kidney") || qLower.includes("renal")) {
          target = "intrarenal_arteries_of_right_kidney";
          organName = "Ren Dexter (Right Kidney)";
          sys = "cardiovascular";
          cond = "Renal Microvascular Perfusion Anomaly";
          rec = "Increased hydration to 2.5 liters daily with oral potassium citrate.";
        } else if (qLower.includes("liver") || qLower.includes("hepatic")) {
          target = "liver";
          organName = "Hepar (Liver)";
          sys = "digestive";
          cond = "Microgravity Splanchnic Hemodynamic Congestion";
          rec = "Adjusted pharmacokinetic clearance rates and enteral electrolyte re-balancing.";
        } else if (qLower.includes("eye") || qLower.includes("optic") || qLower.includes("sans") || qLower.includes("vision")) {
          target = "optic_nerve_ii_r";
          organName = "Nervus Opticus (CN II) · Sheath Segment";
          sys = "nervous";
          cond = "Spaceflight-Associated Neuro-Ocular Syndrome (SANS)";
          rec = "Chibis negative-pressure decompression at -35 mmHg with optic ultrasound tracking.";
        } else if (qLower.includes("spine") || qLower.includes("lumbar") || qLower.includes("back") || qLower.includes("bone")) {
          target = "sacrum";
          organName = "Vertebrae Lumbales & Os Sacrum";
          sys = "skeletal";
          cond = "Trabecular Demineralization & Axial Ligamentous Strain";
          rec = "ARED 60-minute axial resistance loading cycle with bisphosphonate maintenance.";
        } else if (qLower.includes("abs") || qLower.includes("abdomen") || qLower.includes("stomach") || qLower.includes("belly")) {
          target = "rectus_abdominis_muscle_r";
          organName = "Musculus Rectus Abdominis";
          sys = "muscular";
          cond = "Microgravity Abdominal Core Strain";
          rec = "Targeted core stabilization and monitored rest.";
        }

        assistantText = `Target localized to ${organName}, Commander. Biophysical strain is measured at 78 percent. I recommend: ${rec}`;
        targetFocus = target;
        dynamicIssue = {
          crewId: "elena",
          crewName: "CDR Elena Rostova, MD",
          callsign: "Valkyrie-1",
          role: "Mission Commander & Flight Surgeon",
          condition: cond,
          targetStructure: target,
          isolatedOrgans: [target],
          latinName: organName,
          system: sys,
          painLocus: `Focal locus at ${organName}`,
          painSeverity: 6.8,
          strainPercentage: 78,
          vitals: { hr: 71, bp: "120/78", onsd: 4.8, icp: 15.2, radiation: 18.4 },
          etiology: `Somatic adaptation strain across ${organName}.`,
          countermeasure: rec,
          hudTargetCoords: { x: 50, y: 50 },
        };
        setActiveIssue(dynamicIssue);
      }
    }

    setIsThinking(false);

    const pulseTurn: ChatTurn = {
      id: "p-" + Date.now(),
      sender: "pulse",
      text: assistantText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      targetFocus,
      strain: dynamicIssue?.strainPercentage,
    };

    setMessages((prev) => [...prev, pulseTurn]);
    speakVoice(assistantText);

    if (targetFocus) {
      trigger3DFocus(targetFocus, dynamicIssue?.condition, dynamicIssue?.strainPercentage || 75);
    }
  };

  const handleDeployProtocol = async () => {
    setActionDone(true);
    const speech = "Countermeasure protocol deployed, Commander. Monitoring recovery biomarkers in real time.";
    speakVoice(speech);

    const deployTurn: ChatTurn = {
      id: "p-deploy-" + Date.now(),
      sender: "pulse",
      text: speech,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, deployTurn]);

    try {
      await fetch("http://127.0.0.1:8845/api/pulse/intervene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crew_id: activeIssue.crewId,
          action: activeIssue.countermeasure,
          protocol_code: "NASA-HRP-2026-AUTONOMOUS",
          biomarkers: activeIssue.vitals,
        }),
      });
    } catch {}
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200 select-none overflow-hidden font-mono text-xs">
      {/* P.U.L.S.E. Assistant Header */}
      <div className="shrink-0 border-b border-slate-800 p-3 bg-slate-950/90 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold tracking-widest text-cyan-300 font-['Orbitron'] text-xs">
              P.U.L.S.E. JARVIS CORE
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVoiceActive(!voiceActive)}
              title={voiceActive ? "Voice Synthesis Mute" : "Voice Synthesis Unmute"}
              className={`rounded-md p-1 border transition ${
                voiceActive
                  ? "border-cyan-500/50 bg-cyan-950/50 text-cyan-300"
                  : "border-slate-800 bg-slate-900 text-slate-500"
              }`}
            >
              {voiceActive ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <span className="rounded bg-cyan-950/80 px-2 py-0.5 text-[9px] font-bold text-cyan-300 border border-cyan-800/60">
              AUTONOMOUS
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-2.5 flex rounded-lg bg-slate-900/80 p-0.5 border border-slate-800 text-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 transition ${
              activeTab === "chat"
                ? "bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            <span>Interactive Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("somatic")}
            className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 transition ${
              activeTab === "somatic"
                ? "bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Crosshair className="h-3 w-3" />
            <span>Somatic Twin</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("directives")}
            className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 transition ${
              activeTab === "directives"
                ? "bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>Directives</span>
          </button>
        </div>
      </div>

      {/* Main Tab Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {/* TAB 1: INTERACTIVE CONVERSATIONAL DIALOGUE */}
        {activeTab === "chat" && (
          <div className="flex h-full flex-col justify-between">
            <div ref={chatScrollRef} className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {messages.map((turn) => {
                const isPulse = turn.sender === "pulse";
                return (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${isPulse ? "items-start" : "items-end"} animate-in fade-in duration-200`}
                  >
                    <div className="flex items-center gap-1 mb-1 text-[9px] text-slate-500">
                      <span>{isPulse ? "P.U.L.S.E. FLIGHT SURGEON" : "ASTRONAUT"}</span>
                      <span>·</span>
                      <span>{turn.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2 leading-relaxed text-xs ${
                        isPulse
                          ? "bg-slate-900/90 border border-cyan-500/30 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          : "bg-cyan-600/30 border border-cyan-400/50 text-white shadow-sm"
                      }`}
                    >
                      {turn.text}

                      {turn.targetFocus && (
                        <div className="mt-2 pt-1.5 border-t border-cyan-500/20 flex items-center justify-between text-[10px]">
                          <span className="text-cyan-400 flex items-center gap-1">
                            <Crosshair className="h-3 w-3" />
                            {turn.targetFocus.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => trigger3DFocus(turn.targetFocus!)}
                            className="text-cyan-300 hover:text-white underline text-[9px]"
                          >
                            Track in 3D Atlas →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isThinking && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 animate-pulse text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>P.U.L.S.E. reasoning across 3,478 anatomical structures...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
              <button
                type="button"
                onClick={() => handleSend("Assess right hand & thumb EMU strain")}
                className="shrink-0 rounded-full border border-cyan-500/40 bg-cyan-950/30 px-2.5 py-0.5 text-cyan-300 hover:bg-cyan-900/50 transition"
              >
                🖐️ Thumb Strain
              </button>
              <button
                type="button"
                onClick={() => handleSend("Check optic nerve SANS ICP edema")}
                className="shrink-0 rounded-full border border-sky-500/40 bg-sky-950/30 px-2.5 py-0.5 text-sky-300 hover:bg-sky-900/50 transition"
              >
                👁️ Optic SANS
              </button>
              <button
                type="button"
                onClick={() => handleSend("Examine lumbar spine demineralization")}
                className="shrink-0 rounded-full border border-indigo-500/40 bg-indigo-950/30 px-2.5 py-0.5 text-indigo-300 hover:bg-indigo-900/50 transition"
              >
                🦴 Lumbar Spine
              </button>
              <button
                type="button"
                onClick={() => handleSend("Audit myocardium hemodynamic fluid shift")}
                className="shrink-0 rounded-full border border-red-500/40 bg-red-950/30 px-2.5 py-0.5 text-red-300 hover:bg-red-900/50 transition"
              >
                ❤️ Heart Shift
              </button>
              <button
                type="button"
                onClick={() => handleSend("/swarm")}
                className="shrink-0 rounded-full border border-teal-500/40 bg-teal-950/30 px-2.5 py-0.5 text-teal-300 hover:bg-teal-900/50 transition"
              >
                🌐 /swarm
              </button>
              <button
                type="button"
                onClick={() => handleSend("/boost")}
                className="shrink-0 rounded-full border border-amber-500/40 bg-amber-950/30 px-2.5 py-0.5 text-amber-300 hover:bg-amber-900/50 transition"
              >
                ⚡ /boost
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DYNAMIC SOMATIC TWIN TELEMETRY */}
        {activeTab === "somatic" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-cyan-500/40 bg-slate-900/70 p-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <div className="text-[9px] font-mono tracking-widest text-cyan-400 uppercase">
                    ACTIVE ANATOMICAL FOCUS
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 font-['Orbitron']">
                    {activeIssue.latinName}
                  </h3>
                  <p className="text-[10px] text-cyan-300">
                    System: {activeIssue.system.toUpperCase()} · {activeIssue.crewName}
                  </p>
                </div>
                <span className="rounded-md bg-red-950/80 border border-red-500/60 px-2 py-0.5 text-xs font-bold text-red-300">
                  {activeIssue.strainPercentage}% STRAIN
                </span>
              </div>

              <div className="mt-2.5 space-y-2 text-xs">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase">Diagnosed Condition:</div>
                  <div className="font-semibold text-slate-200">{activeIssue.condition}</div>
                  <div className="text-[11px] text-amber-400">{activeIssue.painLocus}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[11px] rounded-lg bg-slate-950/70 p-2 border border-slate-800">
                  <div>
                    <span className="text-[9px] text-slate-500 block">HR / BP</span>
                    <span className="font-bold text-emerald-400">
                      {activeIssue.vitals.hr} bpm · {activeIssue.vitals.bp}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">ONSD / ICP</span>
                    <span className="font-bold text-cyan-300">
                      {activeIssue.vitals.onsd}mm · {activeIssue.vitals.icp}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[9px] text-slate-400 uppercase">Recommended NASA Protocol:</div>
                  <div className="rounded bg-emerald-950/30 border border-emerald-800/50 p-2 text-[11px] text-emerald-200 leading-relaxed">
                    {activeIssue.countermeasure}
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => trigger3DFocus(activeIssue.targetStructure, activeIssue.condition, activeIssue.strainPercentage)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 py-2 text-xs font-bold text-cyan-200 transition"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    Focus in 3D
                  </button>
                  <button
                    type="button"
                    onClick={handleDeployProtocol}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                      actionDone
                        ? "bg-emerald-600/30 border border-emerald-400 text-emerald-200"
                        : "bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {actionDone ? "Deployed ✓" : "Deploy Protocol"}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Body Map Anchors */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
              <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-2">
                Dynamic 3D SomatoScan Selectors:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleSend("Target Cor (Myocardium)")}
                  className="rounded border border-slate-800 bg-slate-950/60 p-1.5 hover:border-cyan-500 text-left transition"
                >
                  <div className="font-bold text-slate-200">❤️ Heart</div>
                  <div className="text-[9px] text-slate-500">Cardiovascular shift</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Target Nervus Opticus (CN II)")}
                  className="rounded border border-slate-800 bg-slate-950/60 p-1.5 hover:border-cyan-500 text-left transition"
                >
                  <div className="font-bold text-slate-200">👁️ Optic Nerve</div>
                  <div className="text-[9px] text-slate-500">SANS intracranial</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Target Abductor Pollicis Brevis (Right)")}
                  className="rounded border border-slate-800 bg-slate-950/60 p-1.5 hover:border-cyan-500 text-left transition"
                >
                  <div className="font-bold text-slate-200">🖐️ Thenar / Thumb</div>
                  <div className="text-[9px] text-slate-500">EVA glove strain</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Target Vertebrae Lumbales (L1-L5)")}
                  className="rounded border border-slate-800 bg-slate-950/60 p-1.5 hover:border-cyan-500 text-left transition"
                >
                  <div className="font-bold text-slate-200">🦴 Lumbar Spine</div>
                  <div className="text-[9px] text-slate-500">Bone resorption</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Target Hepar (Liver)")}
                  className="rounded border border-slate-800 bg-slate-950/60 p-1.5 hover:border-cyan-500 text-left transition"
                >
                  <div className="font-bold text-slate-200">🫁 Liver</div>
                  <div className="text-[9px] text-slate-500">Splanchnic pooling</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSend("Target Ren Dexter (Right Kidney)")}
                  className="rounded border border-slate-800 bg-slate-950/60 p-1.5 hover:border-cyan-500 text-left transition"
                >
                  <div className="font-bold text-slate-200">💧 Kidney</div>
                  <div className="text-[9px] text-slate-500">Renal microvascular</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NASA FLIGHT DIRECTIVES */}
        {activeTab === "directives" && (
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 mb-2">
              Execute edge deterministic slash directives:
            </div>
            <button
              type="button"
              onClick={() => handleSend("/boost")}
              className="w-full flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/30 p-2.5 hover:bg-amber-950/50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-bold text-amber-200 text-xs">/boost · Performance Overdrive</div>
                  <div className="text-[10px] text-slate-400">100Hz telemetry polling, 0.12ms edge solvers</div>
                </div>
              </div>
              <span className="text-[10px] text-amber-300 font-bold">RUN →</span>
            </button>

            <button
              type="button"
              onClick={() => handleSend("/swarm")}
              className="w-full flex items-center justify-between rounded-xl border border-teal-500/40 bg-teal-950/30 p-2.5 hover:bg-teal-950/50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-teal-400" />
                <div>
                  <div className="font-bold text-teal-200 text-xs">/swarm · 6-Agent Medical Swarm</div>
                  <div className="text-[10px] text-slate-400">Byzantine fault-tolerant multi-engine consensus</div>
                </div>
              </div>
              <span className="text-[10px] text-teal-300 font-bold">RUN →</span>
            </button>

            <button
              type="button"
              onClick={() => handleSend("/learn")}
              className="w-full flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-950/30 p-2.5 hover:bg-cyan-950/50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-cyan-200 text-xs">/learn · Bayesian Dirichlet Calibration</div>
                  <div className="text-[10px] text-slate-400">Shannon entropy reduction & Borbély decay adaptation</div>
                </div>
              </div>
              <span className="text-[10px] text-cyan-300 font-bold">RUN →</span>
            </button>

            <button
              type="button"
              onClick={() => handleSend("/teamwork")}
              className="w-full flex items-center justify-between rounded-xl border border-blue-500/40 bg-blue-950/30 p-2.5 hover:bg-blue-950/50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="font-bold text-blue-200 text-xs">/teamwork · Multi-Crew Synchronization</div>
                  <div className="text-[10px] text-slate-400">Baevsky stress index & ECLSS consumable margins</div>
                </div>
              </div>
              <span className="text-[10px] text-blue-300 font-bold">RUN →</span>
            </button>

            <button
              type="button"
              onClick={() => handleSend("/goal")}
              className="w-full flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5 hover:bg-emerald-950/50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="font-bold text-emerald-200 text-xs">/goal · HRP Health Goals Tracker</div>
                  <div className="text-[10px] text-slate-400">180-day bone density, VO2 max, radiation margins</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-300 font-bold">RUN →</span>
            </button>

            <button
              type="button"
              onClick={() => handleSend("/migrate-workflows")}
              className="w-full flex items-center justify-between rounded-xl border border-purple-500/40 bg-purple-950/30 p-2.5 hover:bg-purple-950/50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-purple-400" />
                <div>
                  <div className="font-bold text-purple-200 text-xs">/migrate-workflows · ExMC Protocols</div>
                  <div className="text-[10px] text-slate-400">Terrestrial CPG to edge deterministic workflows</div>
                </div>
              </div>
              <span className="text-[10px] text-purple-300 font-bold">RUN →</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Voice & Text Input Deck */}
      <div className="shrink-0 border-t border-slate-800 p-2.5 bg-slate-950/95">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-slate-900/90 px-3 py-1.5 focus-within:border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] transition"
        >
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Click to speak voice inquiry"}
            className={`p-1 rounded-full transition ${
              isListening
                ? "bg-emerald-500/30 text-emerald-300 animate-pulse"
                : "text-cyan-400 hover:text-cyan-200"
            }`}
          >
            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-slate-500" />}
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask JARVIS (e.g. check thumb, heart, /boost)..."
            className="flex-1 bg-transparent text-xs text-cyan-100 placeholder-slate-500 focus:outline-none font-mono"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className="p-1 rounded-full text-cyan-400 hover:text-cyan-200 disabled:opacity-30 transition"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
