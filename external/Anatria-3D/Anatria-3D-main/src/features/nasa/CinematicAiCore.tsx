import React, { useState, useEffect, useRef } from "react";
import { useNasaFlightStore, type ActiveDiagnosticIssue } from "@/stores/nasaFlightStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useChatStore } from "@/stores/chatStore";
import {
  Activity,
  Shield,
  RotateCcw,
  Volume2,
  VolumeX,
  Crosshair,
  Cpu,
  Zap,
  Mic,
  MicOff,
  Brain,
  Users,
  Workflow,
  Target,
  Network,
  X,
  Send,
  Bot,
  User,
  Radio,
  Sliders
} from "lucide-react";

export type AssistantPersona = "jarvis" | "tars" | "friday";

export interface ConversationTurn {
  id: string;
  sender: "commander" | "assistant";
  persona?: AssistantPersona;
  text: string;
  timestamp: string;
  telemetryTag?: {
    organ?: string;
    system?: string;
    strain?: number;
    hr?: number;
    onsd?: number;
    radiation?: number;
    countermeasure?: string;
  };
}

// Pure Mathematical Engine Telemetry
interface EngineDiagnosticTelemetry {
  astroCausal: {
    icpBiophysics: string;
    hazardProbabilities: Record<string, number>;
    primaryHazard: string;
  };
  chronoPulse: {
    welfordDriftScore: number;
    circadianFatigue: string;
    cognitiveReadiness: number;
  };
  emotionAffect: {
    valence: number;
    arousal: number;
    stressIndex: number;
    affectiveState: string;
  };
  pharmacoSim: {
    compartmentClearance: string;
    steadyStatePlasma: string;
    effectiveHalfLife: string;
  };
  somatoScan: {
    meshIndex: string;
    trianglesEvaluated: number;
    focalCoordinates: string;
  };
}

export function CinematicAiCore() {
  const { activeIssue, setActiveIssue, voiceActive, setVoiceActive } = useNasaFlightStore();
  const applyCommand = useSceneStore((s) => s.applyCommand);
  const organs = useSceneStore((s) => s.organs);
  const dollyView = useSceneStore((s) => s.dollyView);
  const fitView = useSceneStore((s) => s.fitView);

  // Persona & Parameters (JARVIS / TARS / FRIDAY)
  const [persona, setPersona] = useState<AssistantPersona>("jarvis");
  const [honesty, setHonesty] = useState<number>(90); // TARS honesty parameter
  const [humor, setHumor] = useState<number>(85);   // TARS humor parameter

  // Active AI Conversation Thread
  const [messages, setMessages] = useState<ConversationTurn[]>([
    {
      id: "init-1",
      sender: "assistant",
      persona: "jarvis",
      text: "Online and standing by, Commander. 3D holographic somatic twin and all 5 mathematical engines are calibrated. Speak or type any medical inquiry.",
      timestamp: "08:00 UTC",
    },
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [phaseMessage, setPhaseMessage] = useState<string>("AUTONOMOUS FLIGHT SURGEON ACTIVE");
  const [activeEngineDrawer, setActiveEngineDrawer] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("PROCESSING INQUIRY...");
  const [targetLockVisible, setTargetLockVisible] = useState(false);
  const [actionDone, setActionDone] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Real-time calculated engine telemetry
  const [engineTelemetry, setEngineTelemetry] = useState<EngineDiagnosticTelemetry>({
    astroCausal: {
      icpBiophysics: "d(ICP)/dt = α(CVP - ICP) + β(Art_P) - γ(CSF_out)",
      hazardProbabilities: { "Somatic Strain": 82.4, "Cephalad Fluid Shift": 14.2, "Cardiovascular Deconditioning": 12.1 },
      primaryHazard: "Active Somatic Strain Localized",
    },
    chronoPulse: {
      welfordDriftScore: 1.42,
      circadianFatigue: "Shift Cycle 03 // Continuous Flight Telemetry",
      cognitiveReadiness: 88.5,
    },
    emotionAffect: {
      valence: 0.12,
      arousal: 0.65,
      stressIndex: 34.8,
      affectiveState: "High Operational Vigilance // Sinus Rhythm",
    },
    pharmacoSim: {
      compartmentClearance: "CL_microgravity = 3.9 L/h · V_d = 46 L",
      steadyStatePlasma: "C_ss = Nominal Range",
      effectiveHalfLife: "t_1/2 = Calibrated",
    },
    somatoScan: {
      meshIndex: "3,478 cadaveric structures mapped · FMA Ontological Projector",
      trianglesEvaluated: 142850,
      focalCoordinates: "X: 0.000, Y: 0.000, Z: 0.000",
    },
  });

  // Auto-scroll chat on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Speech Recognition Initialization
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
        console.warn("Speech recognition initialization error:", e);
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
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
        const p = prompt("Microphone not supported in this browser session. Type your inquiry:");
        if (p) handleSend(p);
      }
    }
  };

  // Natural Speech Synthesis tailored to Persona
  const speakVoice = (text: string) => {
    if (!voiceActive || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (persona === "tars") {
      u.pitch = 0.82;
      u.rate = 1.0;
    } else if (persona === "friday") {
      u.pitch = 1.15;
      u.rate = 1.08;
    } else {
      // JARVIS
      u.pitch = 0.96;
      u.rate = 1.02;
    }
    window.speechSynthesis.speak(u);
  };

  // Re-format assistant dialogue according to active persona
  const adaptPersonaResponse = (raw: string, organName?: string, strain?: number, action?: string): string => {
    if (persona === "tars") {
      if (raw.toLowerCase().includes("online and standing by")) {
        return `TARS operational, Commander. Honesty parameter set to ${honesty}%, humor ${humor}%. What do you need me to calculate?`;
      }
      if (raw.toLowerCase().includes("target localized")) {
        return `Honesty parameter ${honesty}%: Targeting ${organName || "focal structure"}, Commander. Strain index is running at ${strain || 80}%. I recommend ${action || "immediate countermeasure"} before it affects flight readiness.`;
      }
      return `TARS: ${raw}`;
    }
    if (persona === "friday") {
      if (raw.toLowerCase().includes("online and standing by")) {
        return `FRIDAY HUD active, Boss. Telemetry streams and holographic engines synced. What are we scanning?`;
      }
      if (raw.toLowerCase().includes("target localized")) {
        return `Boss, locked onto ${organName || "target"}. Strain is at ${strain || 80}%. Protocol ready: ${action || "countermeasures"}.`;
      }
      return `FRIDAY: ${raw.replace(/Commander/g, "Boss")}`;
    }
    // Default: JARVIS
    return raw;
  };

  // Resolve target organ in 3D manifest
  const resolveOrgan = (targetKey: string) => {
    if (organs[targetKey]) return targetKey;
    const match = Object.keys(organs).find((k) =>
      k.toLowerCase().includes(targetKey.toLowerCase())
    );
    return match || targetKey;
  };

  // Execute 3D Camera Focus Glide
  const executeCameraGlide = async (organId: string, system: string) => {
    const resolved = resolveOrgan(organId);
    setPhaseMessage(`TRANSITING TO ${resolved.toUpperCase()}`);
    applyCommand({ action: "reset_view" });
    applyCommand({ action: "set_layer_visibility", system: "skeletal", visible: true });
    applyCommand({ action: "set_layer_opacity", system: "skeletal", opacity: 0.15 });

    await new Promise((r) => setTimeout(r, 600));
    applyCommand({ action: "focus_organ", organ_id: resolved });
    applyCommand({ action: "set_layer_visibility", system, visible: true });
    applyCommand({ action: "set_layer_opacity", system, opacity: 1.0 });

    await new Promise((r) => setTimeout(r, 400));
    fitView();
    dollyView(0.65);
    setTargetLockVisible(true);
    setPhaseMessage(`LOCK CONFIRMED: ${resolved.toUpperCase()}`);
  };

  // Core Interactive Send Handler
  const handleSend = async (queryText: string) => {
    const query = queryText.trim();
    if (!query) return;
    setInputQuery("");

    // Add Commander's turn to conversation thread
    const userTurn: ConversationTurn = {
      id: `cmd-${Date.now()}`,
      sender: "commander",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userTurn]);

    // Dispatch Thinking State
    setIsThinking(true);
    setThinkingMessage(
      persona === "tars"
        ? `TARS EVALUATING PARAMETERS (HONESTY ${honesty}%)...`
        : "JARVIS REASONING OVER 3,478 CADAVERIC STRUCTURES..."
    );

    try {
      const res = await fetch("http://127.0.0.1:8845/api/pulse/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, crew_id: "elena" }),
      });
      const data = await res.json();
      setIsThinking(false);

      if (data && data.speechText) {
        const organ = data.targetStructure || data.targetFocus || "heart";
        const organName = data.diagnosticIssue?.latinName || organ;
        const strain = data.diagnosticIssue?.strainPercentage || 75;
        const action = data.diagnosticIssue?.countermeasure || "scheduled rest";

        const adaptedSpeech = adaptPersonaResponse(data.speechText, organName, strain, action);

        // Add Assistant turn to conversation
        const assistantTurn: ConversationTurn = {
          id: `ai-${Date.now()}`,
          sender: "assistant",
          persona,
          text: adaptedSpeech,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          telemetryTag: data.diagnosticIssue ? {
            organ: organName,
            system: data.diagnosticIssue.system,
            strain,
            hr: data.diagnosticIssue.vitals?.hr,
            onsd: data.diagnosticIssue.vitals?.onsd,
            radiation: data.diagnosticIssue.vitals?.radiation,
            countermeasure: action,
          } : undefined,
        };

        setMessages((prev) => [...prev, assistantTurn]);
        speakVoice(adaptedSpeech);

        if (data.diagnosticIssue) {
          setActiveIssue(data.diagnosticIssue);
          await executeCameraGlide(organ, data.diagnosticIssue.system || "muscular");
        }
      } else {
        createDynamicFallback(query);
      }
    } catch {
      setIsThinking(false);
      createDynamicFallback(query);
    }
  };

  // Dynamic Fallback if offline
  const createDynamicFallback = async (query: string) => {
    const qLower = query.toLowerCase();
    let target = "heart";
    let name = "Cor (Myocardium)";
    let system = "cardiovascular";
    let strain = 65;
    let rec = "cycle ergometer intervals with plasma volume restoration";

    if (qLower.includes("thumb") || qLower.includes("hand") || qLower.includes("finger")) {
      target = "abductor_pollicis_brevis_r";
      name = "Abductor Pollicis Brevis (Right)";
      system = "muscular";
      strain = 82;
      rec = "localized cryo-compression and targeted vibro-stimulation";
    } else if (qLower.includes("spine") || qLower.includes("back") || qLower.includes("lumbar")) {
      target = "intervertebral_disc_l4_l5";
      name = "Vertebrae Lumbales (L1-L5)";
      system = "skeletal";
      strain = 78;
      rec = "ARED 60-min axial compressive loading cycle";
    } else if (qLower.includes("eye") || qLower.includes("sans") || qLower.includes("optic")) {
      target = "optic_nerve_ii_r";
      name = "Nervus Opticus (CN II) · Sheath Segment";
      system = "nervous";
      strain = 88;
      rec = "Chibis-M Lower Body Negative Pressure at -35 mmHg";
    }

    const raw = `Target localized to ${name} in the ${system} system, Commander. Biophysical strain is ${strain} percent. I recommend ${rec}.`;
    const adapted = adaptPersonaResponse(raw, name, strain, rec);

    const turn: ConversationTurn = {
      id: `ai-${Date.now()}`,
      sender: "assistant",
      persona,
      text: adapted,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      telemetryTag: {
        organ: name,
        system,
        strain,
        hr: 72,
        onsd: 5.1,
        radiation: 18.4,
        countermeasure: rec,
      },
    };

    setMessages((prev) => [...prev, turn]);
    speakVoice(adapted);
    await executeCameraGlide(target, system);
  };

  const handleDeployProtocol = async () => {
    setActionDone(true);
    const deployText = persona === "tars"
      ? `Honesty ${honesty}%: Countermeasure protocol deployed, Commander. Monitoring biophysical stabilization.`
      : `NASA Autonomous Protocol deployed, Commander. Real-time recovery surveillance engaged.`;
    speakVoice(deployText);
    const turn: ConversationTurn = {
      id: `protocol-${Date.now()}`,
      sender: "assistant",
      persona,
      text: deployText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, turn]);
  };

  const handleResetAtlas = () => {
    applyCommand({ action: "reset_view" });
    applyCommand({ action: "show_all_structures" });
    setTargetLockVisible(false);
    setPhaseMessage("AUTONOMOUS FLIGHT SURGEON ACTIVE");
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 select-none overflow-hidden font-['Rajdhani']">
      {/* =====================================================================
          TOP HEADER BAR: STATUS & PERSONA CONTROLS
          ===================================================================== */}
      <div className="pointer-events-auto flex items-center justify-between border-b border-cyan-500/20 pb-2 backdrop-blur-md bg-slate-950/40 px-3 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <div>
            <span className="text-xs font-bold tracking-[0.25em] text-cyan-400 font-['Orbitron']">
              P.U.L.S.E. // {phaseMessage}
            </span>
            <span className="ml-2 text-[10px] text-slate-400 font-mono">
              NASA EXMC LEVEL 5 · 3,478 CADAVERIC ATLAS
            </span>
          </div>
        </div>

        {/* Persona Switcher & Controls */}
        <div className="flex items-center gap-2">
          {/* Persona Toggle */}
          <div className="flex items-center bg-slate-900/80 border border-cyan-500/30 rounded-full p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => {
                setPersona("jarvis");
                speakVoice("JARVIS online, Commander. Flight surgeon directive active.");
              }}
              className={`px-2.5 py-0.5 rounded-full transition ${
                persona === "jarvis" ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(6,182,212,0.6)]" : "text-cyan-300 hover:text-white"
              }`}
            >
              JARVIS
            </button>
            <button
              type="button"
              onClick={() => {
                setPersona("tars");
                speakVoice(`TARS operational. Honesty setting ${honesty} percent, humor ${humor} percent.`);
              }}
              className={`px-2.5 py-0.5 rounded-full transition ${
                persona === "tars" ? "bg-amber-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(245,158,11,0.6)]" : "text-amber-300 hover:text-white"
              }`}
            >
              TARS
            </button>
            <button
              type="button"
              onClick={() => {
                setPersona("friday");
                speakVoice("FRIDAY online, Boss. Ready on your mark.");
              }}
              className={`px-2.5 py-0.5 rounded-full transition ${
                persona === "friday" ? "bg-emerald-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(16,185,129,0.6)]" : "text-emerald-300 hover:text-white"
              }`}
            >
              FRIDAY
            </button>
          </div>

          {/* Engine Telemetry Drawer Toggle */}
          <button
            type="button"
            onClick={() => setActiveEngineDrawer(!activeEngineDrawer)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-mono tracking-wider transition ${
              activeEngineDrawer
                ? "border-emerald-400 bg-emerald-950/60 text-emerald-300"
                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-cyan-300"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>ENGINES [5]</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            type="button"
            onClick={() => setVoiceActive(!voiceActive)}
            title={voiceActive ? "Mute Voice" : "Unmute Voice"}
            className="rounded-full border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 hover:text-cyan-300 transition"
          >
            {voiceActive ? <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>

          {/* Reset 3D View */}
          <button
            type="button"
            onClick={handleResetAtlas}
            title="Reset 3D Somatic View"
            className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 px-2.5 py-1 text-[10px] font-mono text-slate-400 hover:text-cyan-300 transition"
          >
            <RotateCcw className="h-3 w-3" />
            <span>RESET 3D</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          CENTER: 3D HOLOGRAPHIC TARGET RETICLE (ONLY WHEN ORGAN LOCKED)
          ===================================================================== */}
      {targetLockVisible && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 pointer-events-none"
          style={{
            left: `${activeIssue.hudTargetCoords.x}%`,
            top: `${activeIssue.hudTargetCoords.y}%`,
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* Holographic targeting ring */}
            <div className="h-20 w-20 rounded-full border-2 border-dashed border-cyan-400/60 animate-spin-slow" />
            <div className="absolute h-12 w-12 rounded-full border border-amber-400/80 animate-ping" />
            <Crosshair className="absolute h-6 w-6 text-cyan-300 drop-shadow-[0_0_8px_#22d3ee]" />

            {/* Target tag line */}
            <svg className="absolute left-6 top-6 w-64 h-24 overflow-visible pointer-events-none">
              <polyline
                points="0,0 25,25 180,25"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                className="animate-pulse"
              />
              <circle cx="180" cy="25" r="3" fill="#22d3ee" />
            </svg>
            <div className="absolute left-28 top-3 text-[10px] font-mono text-cyan-300 tracking-wider bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/40 backdrop-blur whitespace-nowrap">
              TARGET LOCK // {activeIssue.latinName}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FLOATING MATHEMATICAL ENGINE TELEMETRY DRAWER (LEFT SIDE)
          ===================================================================== */}
      {activeEngineDrawer && (
        <div className="pointer-events-auto absolute top-16 left-4 w-96 max-w-[90vw] animate-in fade-in slide-in-from-left duration-300">
          <div className="relative rounded-2xl border border-emerald-500/40 bg-slate-950/90 p-4 shadow-[0_0_50px_rgba(16,185,129,0.2)] backdrop-blur-2xl text-xs font-mono">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase font-['Orbitron']">
                5 MATHEMATICAL ENGINES // REAL-TIME ODE
              </span>
              <button
                type="button"
                onClick={() => setActiveEngineDrawer(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2 text-[10px]">
              <div className="rounded-lg bg-slate-900/60 border border-emerald-500/20 p-2">
                <div className="text-emerald-300 font-bold uppercase">1. AstroCausal Dirichlet Bayesian Engine</div>
                <div className="text-slate-400 mt-0.5">{engineTelemetry.astroCausal.icpBiophysics}</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 border border-cyan-500/20 p-2">
                <div className="text-cyan-300 font-bold uppercase">2. ChronoPulse Circadian Autoencoder</div>
                <div className="text-slate-400 mt-0.5">Welford Drift τ = {engineTelemetry.chronoPulse.welfordDriftScore} · Readiness: {engineTelemetry.chronoPulse.cognitiveReadiness}%</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 border border-amber-500/20 p-2">
                <div className="text-amber-300 font-bold uppercase">3. Russell Affect & Baevsky Stress</div>
                <div className="text-slate-400 mt-0.5">Stress Index: {engineTelemetry.emotionAffect.stressIndex}% · {engineTelemetry.emotionAffect.affectiveState}</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 border border-sky-500/20 p-2">
                <div className="text-sky-300 font-bold uppercase">4. PharmacoSim 2-Compartment PK Solver</div>
                <div className="text-slate-400 mt-0.5">{engineTelemetry.pharmacoSim.compartmentClearance}</div>
              </div>
              <div className="rounded-lg bg-slate-900/60 border border-indigo-500/20 p-2">
                <div className="text-indigo-300 font-bold uppercase">5. SomatoScan FMA 3D Projector</div>
                <div className="text-slate-400 mt-0.5">{engineTelemetry.somatoScan.meshIndex}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          RIGHT SIDE: THE HOLOGRAPHIC CONVERSATIONAL AI ASSISTANT (JARVIS / TARS)
          ===================================================================== */}
      <div className="pointer-events-auto absolute top-16 right-4 w-[430px] max-w-[92vw] h-[86vh] flex flex-col rounded-2xl border border-cyan-500/40 bg-slate-950/80 shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-2xl overflow-hidden">
        {/* Assistant Header & Waveform */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3 bg-slate-900/60">
          <div className="flex items-center gap-3">
            {/* Glowing AI Arc Core Avatar */}
            <div className="relative flex items-center justify-center">
              <div className={`h-8 w-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                persona === "tars"
                  ? "border-amber-400 bg-amber-950/50 shadow-[0_0_15px_#f59e0b]"
                  : persona === "friday"
                  ? "border-emerald-400 bg-emerald-950/50 shadow-[0_0_15px_#10b981]"
                  : "border-cyan-400 bg-cyan-950/50 shadow-[0_0_15px_#06b6d4]"
              }`}>
                <Bot className={`h-4 w-4 ${
                  persona === "tars" ? "text-amber-300" : persona === "friday" ? "text-emerald-300" : "text-cyan-300"
                } ${isListening ? "animate-bounce" : ""}`} />
              </div>
              <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${isListening ? "bg-emerald-400 animate-ping" : "bg-cyan-400"}`} />
            </div>

            <div>
              <div className="text-xs font-bold tracking-wider font-['Orbitron'] text-slate-100 flex items-center gap-1.5">
                <span>{persona.toUpperCase()} // FLIGHT SURGEON</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  AI ASSISTANT
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400">● ACTIVE</span>
                <span>·</span>
                {persona === "tars" ? (
                  <span className="text-amber-300">HONESTY: {honesty}% · HUMOR: {humor}%</span>
                ) : (
                  <span>INTERACTIVE VOICE & TEXT</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Stop listening" : "Click to speak"}
              className={`p-2 rounded-full border transition-all ${
                isListening
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 animate-pulse shadow-[0_0_15px_#10b981]"
                  : "border-cyan-500/30 bg-slate-900/60 text-cyan-400 hover:border-cyan-400 hover:bg-slate-800"
              }`}
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* TARS Parameter Controls (Only visible when TARS selected) */}
        {persona === "tars" && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-amber-950/20 border-b border-amber-500/20 text-[10px] font-mono text-amber-200">
            <div className="flex items-center gap-2">
              <span>Honesty: {honesty}%</span>
              <input
                type="range"
                min={70}
                max={100}
                value={honesty}
                onChange={(e) => setHonesty(Number(e.target.value))}
                className="w-16 accent-amber-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Humor: {humor}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={humor}
                onChange={(e) => setHumor(Number(e.target.value))}
                className="w-16 accent-amber-400"
              />
            </div>
          </div>
        )}

        {/* Scrollable Conversation Thread */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
          {messages.map((turn) => {
            const isCmd = turn.sender === "commander";
            return (
              <div
                key={turn.id}
                className={`flex flex-col ${isCmd ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 mb-1 px-1">
                  <span>{isCmd ? "👨‍🚀 COMMANDER" : `🤖 ${(turn.persona || "AI").toUpperCase()}`}</span>
                  <span>·</span>
                  <span>{turn.timestamp}</span>
                </div>

                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-lg ${
                    isCmd
                      ? "bg-cyan-950/60 border border-cyan-500/40 text-cyan-100 rounded-tr-none"
                      : turn.persona === "tars"
                      ? "bg-slate-900/90 border border-amber-500/40 text-amber-100 rounded-tl-none"
                      : turn.persona === "friday"
                      ? "bg-slate-900/90 border border-emerald-500/40 text-emerald-100 rounded-tl-none"
                      : "bg-slate-900/90 border border-cyan-500/40 text-slate-100 rounded-tl-none"
                  }`}
                >
                  <p>{turn.text}</p>

                  {/* Compact Organ Telemetry Tag */}
                  {turn.telemetryTag && (
                    <div className="mt-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 p-2 text-[10px]">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>🎯 {turn.telemetryTag.organ}</span>
                        <span className="text-red-400">STRAIN: {turn.telemetryTag.strain}%</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-slate-400 text-[9px]">
                        <span>HR: {turn.telemetryTag.hr} bpm</span>
                        <span>ONSD: {turn.telemetryTag.onsd} mm</span>
                        <span>RAD: {turn.telemetryTag.radiation} µSv/h</span>
                      </div>
                      {turn.telemetryTag.countermeasure && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800 text-emerald-300 text-[10px]">
                          <span className="text-slate-400 font-bold">REC: </span>
                          {turn.telemetryTag.countermeasure}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Thinking Animation */}
          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-2.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{thinkingMessage}</span>
            </div>
          )}
        </div>

        {/* Quick Action Suggestion Chips */}
        <div className="px-3 py-1.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
          <button
            type="button"
            onClick={() => handleSend("Scan my right thumb")}
            className="shrink-0 rounded-full border border-cyan-500/30 bg-slate-900/60 hover:bg-slate-800 px-2.5 py-0.5 text-cyan-300 transition"
          >
            🖐️ Scan Thumb
          </button>
          <button
            type="button"
            onClick={() => handleSend("Assess optic nerve SANS status")}
            className="shrink-0 rounded-full border border-sky-500/30 bg-slate-900/60 hover:bg-slate-800 px-2.5 py-0.5 text-sky-300 transition"
          >
            👁️ Check SANS
          </button>
          <button
            type="button"
            onClick={() => handleSend("Check lumbar spine strain")}
            className="shrink-0 rounded-full border border-amber-500/30 bg-slate-900/60 hover:bg-slate-800 px-2.5 py-0.5 text-amber-300 transition"
          >
            🦴 Spine Strain
          </button>
          <button
            type="button"
            onClick={() => handleSend("/swarm")}
            className="shrink-0 rounded-full border border-teal-500/30 bg-slate-900/60 hover:bg-slate-800 px-2.5 py-0.5 text-teal-300 transition"
          >
            🌐 /swarm
          </button>
          <button
            type="button"
            onClick={() => handleSend("/boost")}
            className="shrink-0 rounded-full border border-purple-500/30 bg-slate-900/60 hover:bg-slate-800 px-2.5 py-0.5 text-purple-300 transition"
          >
            ⚡ /boost
          </button>
          <button
            type="button"
            onClick={handleDeployProtocol}
            className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 px-2.5 py-0.5 text-emerald-300 transition font-bold"
          >
            🛡️ Deploy Protocol
          </button>
        </div>

        {/* Input Bar: Voice & Text */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputQuery);
          }}
          className="p-3 border-t border-cyan-500/20 bg-slate-950/90 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Mute Microphone" : "Activate Microphone"}
            className={`p-2 rounded-xl border transition-all ${
              isListening
                ? "bg-emerald-500/30 border-emerald-400 text-emerald-300 animate-pulse shadow-[0_0_15px_#10b981]"
                : "border-cyan-500/40 bg-slate-900/80 text-cyan-300 hover:border-cyan-300"
            }`}
          >
            {isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Ask ${persona.toUpperCase()} anything (e.g. "How is my spine?", "Scan thumb")...`}
            className="flex-1 bg-slate-900/80 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-mono text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-300 transition"
          />

          <button
            type="submit"
            className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-200 px-3.5 py-2 text-xs font-mono font-bold tracking-wider uppercase transition flex items-center gap-1 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <span>SEND</span>
            <Send className="h-3 w-3" />
          </button>
        </form>
      </div>

      <div className="pointer-events-none" />
    </div>
  );
}
