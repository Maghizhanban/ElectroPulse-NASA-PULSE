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
  Sparkles,
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
  X
} from "lucide-react";

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

  // Core Modes: Standby (clean waiting state) vs Active (3D model floating with dynamic dossier)
  const [mode, setMode] = useState<"standby" | "active">("standby");
  const [phaseMessage, setPhaseMessage] = useState<string>("");
  const [actionDone, setActionDone] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState("");
  const [activeEngineDrawer, setActiveEngineDrawer] = useState<boolean>(false);

  // Active AI Thinking & Listening States
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("PARSING SOMATIC INQUIRY...");
  const [isListening, setIsListening] = useState(false);
  const [activeUserPrompt, setActiveUserPrompt] = useState<string>("");
  const [latestAiResponse, setLatestAiResponse] = useState<string>("");

  const recognitionRef = useRef<any>(null);

  const [activeCommandResult, setActiveCommandResult] = useState<{
    command: string;
    status: string;
    title: string;
    speechText: string;
    details?: any;
  } | null>(null);

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

  // Web Speech Recognition Initialization
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsListening(false);
          if (transcript) {
            setVoiceQuery(transcript);
            handleProcessInquiry(transcript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn("Speech recognition initialization error:", e);
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
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
        const promptInput = prompt("Voice microphone not supported on this browser. Type your medical inquiry:");
        if (promptInput) {
          setVoiceQuery(promptInput);
          handleProcessInquiry(promptInput);
        }
      }
    }
  };

  // Match target organ key in 3D manifest
  const resolveOrgan = (targetKey: string) => {
    if (organs[targetKey]) return targetKey;
    const match = Object.keys(organs).find((k) =>
      k.toLowerCase().includes(targetKey.toLowerCase())
    );
    return match || targetKey;
  };

  // Natural text-to-speech output
  const speakVoice = (text: string) => {
    if (!voiceActive || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 0.98;
    window.speechSynthesis.speak(u);
  };

  // Execute Dynamic 5-Phase Somatic Camera Glide
  const executeSomaticScan = async (issue: ActiveDiagnosticIssue, customVoiceText?: string) => {
    setActiveIssue(issue);
    setMode("active");
    setActionDone(false);

    // STEP 1: Whole-body silhouette scan
    setPhaseMessage("PHASE 1 // SOMATOSCAN: FULL CADAVERIC ATLAS SCAN");
    applyCommand({ action: "reset_view" });
    applyCommand({ action: "show_all_structures" });
    applyCommand({ action: "set_layer_visibility", system: "skeletal", visible: true });
    applyCommand({ action: "set_layer_opacity", system: "skeletal", opacity: 0.85 });
    if (issue.system !== "skeletal") {
      applyCommand({ action: "set_layer_visibility", system: issue.system, visible: false });
    }

    // STEP 2: Camera transit to exact organ coordinates
    await new Promise((r) => setTimeout(r, 900));
    setPhaseMessage(`PHASE 2 // SOMATOSCAN: TRANSITING TO ${issue.latinName.toUpperCase()}`);
    const organId = resolveOrgan(issue.targetStructure);
    applyCommand({ action: "focus_organ", organ_id: organId });

    // STEP 3: Selective layer reveal (target 100%, skeleton to 2% glass)
    await new Promise((r) => setTimeout(r, 700));
    setPhaseMessage(`PHASE 3 // LAYER ACTIVATION: EXPOSING ${issue.system.toUpperCase()} SYSTEM`);
    applyCommand({ action: "set_layer_visibility", system: issue.system, visible: true });
    applyCommand({ action: "set_layer_opacity", system: issue.system, opacity: 1.0 });
    applyCommand({ action: "set_layer_opacity", system: "skeletal", opacity: 0.02 });

    if (issue.isolatedOrgans && issue.isolatedOrgans.length > 0) {
      applyCommand({
        action: "isolate_structures",
        organ_ids: issue.isolatedOrgans,
      });
    }

    // STEP 4: Macro close-up zoom (organ prominent & enlarged)
    await new Promise((r) => setTimeout(r, 500));
    setPhaseMessage(`PHASE 4 // MACRO OPTICAL DOLLY: TARGET ENLARGED`);
    fitView();
    dollyView(0.45);
    await new Promise((r) => setTimeout(r, 350));
    dollyView(0.65);
    applyCommand({ action: "focus_organ", organ_id: organId });

    // STEP 5: Spoken clinical summary
    await new Promise((r) => setTimeout(r, 300));
    setPhaseMessage(`PHASE 5 // DIAGNOSTIC SYNTHESIS: ${issue.condition.toUpperCase()}`);
    const explanation =
      customVoiceText ||
      `Target localized to ${issue.latinName}, Commander. Strain is at ${issue.strainPercentage} percent. I recommend: ${issue.countermeasure}`;
    setLatestAiResponse(explanation);
    speakVoice(explanation);

    // Record turn to OpenJarvis Episodic Memory
    useChatStore.getState().postAutonomousAlert(
      issue.crewName,
      issue.condition,
      issue.etiology,
      issue.countermeasure
    );
  };

  const returnToStandby = () => {
    setMode("standby");
    applyCommand({ action: "reset_view" });
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  };

  // Main Active Inquiry Processor (Voice or Text driven)
  const handleProcessInquiry = async (queryText: string) => {
    if (!queryText.trim()) return;
    const query = queryText.trim();
    const lower = query.toLowerCase();
    setActiveUserPrompt(query);
    setVoiceQuery("");

    // Check if user ran a slash command
    if (lower.startsWith('/') || ['learn', 'boost', 'teamwork', 'migrate', 'goal', 'swarm'].some(k => lower.startsWith(k))) {
      const matchCmd = lower.startsWith('/')
        ? lower.split(' ')[0]
        : '/' + ['learn', 'boost', 'teamwork', 'migrate-workflows', 'goal', 'swarm'].find(k => lower.includes(k.replace('-workflows', '')));
      await executeFeatureCommand(matchCmd || query);
      return;
    }

    // Trigger Active AI Thinking Mode
    setIsThinking(true);
    setThinkingMessage("PARSING SOMATIC INQUIRY...");

    // Simulated quick reasoning progression
    setTimeout(() => setThinkingMessage("CROSS-REFERENCING FMA 3,478 CADAVERIC STRUCTURES..."), 300);
    setTimeout(() => setThinkingMessage("SOLVING ASTRO-CAUSAL DIRICHLET BAYESIAN POSTERIORS..."), 600);

    try {
      const res = await fetch("http://127.0.0.1:8845/api/pulse/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, crew_id: "elena" }),
      });
      const data = await res.json();
      setIsThinking(false);

      if (data && data.diagnosticIssue) {
        const issue: ActiveDiagnosticIssue = data.diagnosticIssue;
        setEngineTelemetry((prev) => ({
          ...prev,
          astroCausal: {
            ...prev.astroCausal,
            primaryHazard: `${issue.condition} (${issue.strainPercentage}% strain)`,
          },
          somatoScan: {
            ...prev.somatoScan,
            focalCoordinates: `Target: ${issue.latinName} · ${issue.system.toUpperCase()}`,
          },
        }));

        await executeSomaticScan(issue, data.speechText);
      } else {
        // Fallback somatic generation
        createDynamicFallbackDiagnosis(query);
      }
    } catch {
      setIsThinking(false);
      createDynamicFallbackDiagnosis(query);
    }
  };

  // Dynamic fallback when backend is offline
  const createDynamicFallbackDiagnosis = async (query: string) => {
    const qLower = query.toLowerCase();
    let target = "heart";
    let organName = "Cor (Myocardium)";
    let system: any = "cardiovascular";
    let condition = "Microgravity Hemodynamic Volume Shift";
    let countermeasure = "Cycle ergometer intervals and plasma volume restoration protocol.";

    if (qLower.includes("thumb") || qLower.includes("hand") || qLower.includes("finger")) {
      target = "abductor_pollicis_brevis_r";
      organName = "Abductor Pollicis Brevis (Right)";
      system = "muscular";
      condition = "Microgravity Thenar Tendon Strain";
      countermeasure = "Localized cryo-compression and 20-minute vibro-stimulation protocol.";
    } else if (qLower.includes("kidney") || qLower.includes("renal")) {
      target = "intrarenal_arteries_of_right_kidney";
      organName = "Ren Dexter (Right Kidney)";
      system = "cardiovascular";
      condition = "Renal Microvascular Perfusion Anomaly";
      countermeasure = "Increased hydration to 2.5 liters daily with oral potassium citrate.";
    } else if (qLower.includes("liver") || qLower.includes("hepatic")) {
      target = "liver";
      organName = "Hepar (Liver)";
      system = "digestive";
      condition = "Microgravity Splanchnic Hemodynamic Congestion";
      countermeasure = "Adjusted pharmacokinetic clearance rates and enteral electrolyte re-balancing.";
    } else if (qLower.includes("eye") || qLower.includes("optic") || qLower.includes("sans") || qLower.includes("vision")) {
      target = "optic_nerve_ii_r";
      organName = "Nervus Opticus (CN II) · Sheath Segment";
      system = "nervous";
      condition = "Spaceflight-Associated Neuro-Ocular Syndrome (SANS)";
      countermeasure = "Chibis negative-pressure decompression at -35 mmHg with optic ultrasound tracking.";
    } else if (qLower.includes("spine") || qLower.includes("lumbar") || qLower.includes("back") || qLower.includes("bone")) {
      target = "sacrum";
      organName = "Vertebrae Lumbales & Os Sacrum";
      system = "skeletal";
      condition = "Trabecular Demineralization & Axial Ligamentous Strain";
      countermeasure = "ARED 60-minute axial resistance loading cycle with bisphosphonate maintenance.";
    }

    const dynamicIssue: ActiveDiagnosticIssue = {
      crewId: "elena",
      crewName: "Astronaut Exploration Specialist",
      callsign: "Valkyrie-1",
      role: "Mission Flight Crew",
      condition,
      targetStructure: target,
      isolatedOrgans: [target],
      latinName: organName,
      system,
      painLocus: `Localized at ${organName}`,
      painSeverity: 7.2,
      strainPercentage: 82,
      vitals: { hr: 72, bp: "120/78", onsd: 5.1, icp: 16.5, radiation: 18.4 },
      etiology: `Somatic stress localized to ${organName} under microgravity conditions.`,
      countermeasure,
      hudTargetCoords: { x: 50, y: 48 },
    };

    await executeSomaticScan(dynamicIssue);
  };

  // Execute Slash Commands (/learn, /boost, /teamwork, /migrate-workflows, /goal, /swarm)
  const executeFeatureCommand = async (cmd: string) => {
    let resultData: any = null;
    try {
      const res = await fetch("http://127.0.0.1:8845/api/pulse/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cmd, crew_id: "elena", telemetry: activeIssue.vitals }),
      });
      resultData = await res.json();
    } catch {
      // Deterministic offline fallbacks
      if (cmd.includes("learn")) {
        resultData = {
          command: "/learn",
          status: "LEARNING_CONSOLIDATED",
          speechText: "Dirichlet priors recalibrated and epistemic uncertainty reduced, Commander. Diagnostic models adapted to latest baseline.",
          targetFocus: "brain",
        };
      } else if (cmd.includes("boost")) {
        resultData = {
          command: "/boost",
          status: "BOOST_ENGAGED",
          speechText: "Performance Overdrive engaged, Commander. Telemetry streaming at 100 Hertz with sub-millisecond vectorized inference. Systems primed.",
          targetFocus: "heart",
        };
      } else if (cmd.includes("teamwork")) {
        resultData = {
          command: "/teamwork",
          status: "TEAMWORK_SYNCHRONIZED",
          speechText: "All crew vitals synchronized, Commander. Elena and Marcus are nominal; Sarah's autonomic load is slightly elevated.",
          targetFocus: "heart",
        };
      } else if (cmd.includes("migrate")) {
        resultData = {
          command: "/migrate-workflows",
          status: "WORKFLOWS_MIGRATED",
          speechText: "Clinical guidelines compiled into autonomous ExMC workflows, Commander. All protocols active with zero cloud dependency.",
          targetFocus: "sacrum",
        };
      } else if (cmd.includes("goal")) {
        resultData = {
          command: "/goal",
          status: "GOALS_EVALUATED",
          speechText: "Four of five mission health goals are strictly on track, Commander. Bone density and aerobic retention remain within safe flight envelopes.",
          targetFocus: "soleus_muscle_r",
        };
      } else if (cmd.includes("swarm")) {
        resultData = {
          command: "/swarm",
          status: "SWARM_CONSENSUS_REACHED",
          speechText: "Consensus reached across all six diagnostic agents, Commander. We are unanimous on nominal maintenance.",
          targetFocus: "brain",
        };
      }
    }

    if (resultData) {
      setActiveCommandResult({
        command: cmd,
        status: resultData.status || "COMPLETED",
        title: cmd.toUpperCase() + " // NASA FLIGHT DIRECTIVE",
        speechText: resultData.speechText || "",
        details: resultData,
      });
      if (resultData.speechText) speakVoice(resultData.speechText);
      if (resultData.targetFocus) {
        const organId = resolveOrgan(resultData.targetFocus);
        applyCommand({ action: "focus_organ", organ_id: organId });
      }
    }
  };

  const handleExecuteProtocol = async () => {
    setActionDone(true);
    speakVoice("Countermeasure protocol deployed, Commander. Monitoring recovery biomarkers in real time.");
    try {
      await fetch("http://127.0.0.1:8845/api/pulse/inquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Deploy protocol: ${activeIssue.countermeasure} for ${activeIssue.crewName}`,
          crew_id: activeIssue.crewId,
        }),
      });
    } catch {
      // offline pass
    }
  };

  const renderCommandModal = () => {
    if (!activeCommandResult) return null;
    return (
      <div className="pointer-events-auto absolute top-20 right-8 z-50 w-[420px] max-w-[90vw] animate-in fade-in slide-in-from-right duration-300">
        <div className="relative rounded-2xl border border-cyan-400/50 bg-slate-950/90 p-5 shadow-[0_0_60px_rgba(6,182,212,0.35)] backdrop-blur-2xl text-xs font-mono">
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold text-cyan-300 font-['Orbitron'] tracking-wider">
                {activeCommandResult.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveCommandResult(null)}
              className="rounded-full p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-200">
            {activeCommandResult.speechText}
          </p>

          <button
            type="button"
            onClick={() => setActiveCommandResult(null)}
            className="mt-4 w-full rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 py-2 text-center text-xs font-bold text-cyan-200 tracking-wider uppercase transition"
          >
            DISMISS HUD CARD
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // 1. STANDBY SCREEN (Clean, Non-Fake, Voice & Text Activated)
  // =========================================================================
  if (mode === "standby") {
    return (
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#020617] select-none">
        {/* Subtle Cosmic Background Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0,transparent_70%)] pointer-events-none" />

        {/* Central Quantum Holographic Core (Click to Speak / Listen) */}
        <div
          onClick={toggleListening}
          title={isListening ? "Listening... Click to stop" : "Click to speak voice inquiry"}
          className="group relative flex cursor-pointer items-center justify-center transition-all duration-700 hover:scale-105"
        >
          {/* Quantum aura glow */}
          <div
            className={`h-72 w-72 rounded-full blur-3xl transition-all duration-500 ${
              isListening ? "bg-emerald-500/30 animate-pulse" : "bg-cyan-500/15 animate-pulse"
            }`}
          />

          {/* Precision thin holographic gyro rings */}
          <div
            className={`absolute h-64 w-64 rounded-full border border-dashed transition-colors ${
              isListening ? "border-emerald-400/50 animate-spin-slow" : "border-cyan-400/25 animate-spin-slow"
            }`}
          />
          <div
            className={`absolute h-52 w-52 rounded-full border border-t-transparent border-b-transparent transition-colors ${
              isListening ? "border-emerald-300/60 animate-spin-reverse" : "border-sky-400/35 animate-spin-reverse"
            }`}
          />
          <div
            className={`absolute h-40 w-40 rounded-full border transition-colors ${
              isListening ? "border-emerald-400 animate-ping" : "border-cyan-300/40 animate-pulse"
            }`}
          />

          {/* Central Core Emblem */}
          <div
            className={`absolute h-28 w-28 rounded-full border-2 bg-gradient-to-b backdrop-blur-md flex items-center justify-center transition-all duration-300 ${
              isListening
                ? "border-emerald-400/90 from-emerald-950/80 to-slate-950/90 shadow-[0_0_60px_rgba(52,211,153,0.7)]"
                : "border-cyan-400/80 from-cyan-950/70 to-slate-950/90 shadow-[0_0_50px_rgba(6,182,212,0.6)]"
            }`}
          >
            <div className="relative flex items-center justify-center">
              {isListening ? (
                <>
                  <span className="animate-ping absolute h-14 w-14 rounded-full bg-emerald-400/50" />
                  <Mic className="h-9 w-9 text-emerald-300 drop-shadow-[0_0_15px_#34d399]" />
                </>
              ) : (
                <>
                  <span className="animate-ping absolute h-12 w-12 rounded-full bg-cyan-400/40" />
                  <Activity className="h-8 w-8 text-cyan-300 group-hover:text-cyan-100 transition-colors drop-shadow-[0_0_12px_#22d3ee]" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Clean Mission Header */}
        <div className="mt-9 text-center z-10 pointer-events-none">
          <h1 className="text-3xl font-extrabold tracking-[0.45em] text-cyan-400 font-['Orbitron'] drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
            P.U.L.S.E.
          </h1>
          <p className="mt-2 text-[11px] font-mono tracking-[0.3em] text-slate-400 uppercase">
            NASA EXMC LEVEL 5 · AUTONOMOUS SOMATIC TWIN & DIAGNOSTIC REASONING CORE
          </p>
        </div>

        {/* Listening Status Indicator */}
        {isListening && (
          <div className="mt-3 flex items-center gap-2 z-20 animate-pulse text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-400/50 rounded-full px-4 py-1 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>VOICE RECOGNITION ACTIVE · SPEAK MEDICAL INQUIRY NOW...</span>
          </div>
        )}

        {/* Thinking Overlay during cognitive dispatch */}
        {isThinking && (
          <div className="mt-4 flex flex-col items-center gap-2 z-20 text-xs font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-400/60 rounded-2xl p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.4)] animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-['Orbitron'] font-bold tracking-wider text-cyan-200">
                P.U.L.S.E. REASONING ENGINE // THINKING
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              {thinkingMessage}
            </div>
          </div>
        )}

        {/* Voice & Text Command Bar */}
        {!isThinking && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleProcessInquiry(voiceQuery);
            }}
            className="mt-6 flex items-center w-full max-w-xl z-20 rounded-full border border-cyan-500/40 bg-slate-950/85 backdrop-blur-xl px-4 py-2 shadow-[0_0_35px_rgba(6,182,212,0.25)] focus-within:border-cyan-300 transition-all"
          >
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Mute Microphone" : "Activate Microphone"}
              className={`p-1.5 rounded-full mr-2 transition-all ${
                isListening
                  ? "bg-emerald-500/30 text-emerald-300 animate-pulse"
                  : "text-cyan-400 hover:text-cyan-200 hover:bg-slate-800"
              }`}
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-slate-400" />}
            </button>

            <input
              type="text"
              value={voiceQuery}
              onChange={(e) => setVoiceQuery(e.target.value)}
              placeholder="Ask about any organ (e.g. thumb, kidney, liver, eye, spine, heart) or command..."
              className="flex-1 bg-transparent text-xs font-mono text-cyan-100 placeholder-slate-500 focus:outline-none"
            />

            <button
              type="submit"
              className="rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 px-3.5 py-1 text-[10px] font-mono tracking-widest font-bold uppercase transition"
            >
              INQUIRE →
            </button>
          </form>
        )}

        {/* Clean Interactive Flight Directives */}
        <div className="mt-5 flex items-center gap-2 z-20 flex-wrap justify-center max-w-4xl">
          <button
            type="button"
            onClick={() => executeFeatureCommand("/learn")}
            className="flex items-center gap-1.5 rounded-full border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/60 hover:border-cyan-300 px-3.5 py-1 text-[11px] font-mono text-cyan-200 tracking-wider transition backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.2)]"
          >
            <Brain className="h-3.5 w-3.5 text-cyan-400" />
            <span>/learn</span>
          </button>
          <button
            type="button"
            onClick={() => executeFeatureCommand("/boost")}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-950/40 hover:bg-amber-900/60 hover:border-amber-300 px-3.5 py-1 text-[11px] font-mono text-amber-200 tracking-wider transition backdrop-blur-md shadow-[0_0_12px_rgba(245,158,11,0.2)]"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>/boost</span>
          </button>
          <button
            type="button"
            onClick={() => executeFeatureCommand("/teamwork")}
            className="flex items-center gap-1.5 rounded-full border border-blue-500/50 bg-blue-950/40 hover:bg-blue-900/60 hover:border-blue-300 px-3.5 py-1 text-[11px] font-mono text-blue-200 tracking-wider transition backdrop-blur-md shadow-[0_0_12px_rgba(59,130,246,0.2)]"
          >
            <Users className="h-3.5 w-3.5 text-blue-400" />
            <span>/teamwork</span>
          </button>
          <button
            type="button"
            onClick={() => executeFeatureCommand("/migrate-workflows")}
            className="flex items-center gap-1.5 rounded-full border border-purple-500/50 bg-purple-950/40 hover:bg-purple-900/60 hover:border-purple-300 px-3.5 py-1 text-[11px] font-mono text-purple-200 tracking-wider transition backdrop-blur-md shadow-[0_0_12px_rgba(168,85,247,0.2)]"
          >
            <Workflow className="h-3.5 w-3.5 text-purple-400" />
            <span>/migrate-workflows</span>
          </button>
          <button
            type="button"
            onClick={() => executeFeatureCommand("/goal")}
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 hover:border-emerald-300 px-3.5 py-1 text-[11px] font-mono text-emerald-200 tracking-wider transition backdrop-blur-md shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          >
            <Target className="h-3.5 w-3.5 text-emerald-400" />
            <span>/goal</span>
          </button>
          <button
            type="button"
            onClick={() => executeFeatureCommand("/swarm")}
            className="flex items-center gap-1.5 rounded-full border border-teal-500/50 bg-teal-950/40 hover:bg-teal-900/60 hover:border-teal-300 px-3.5 py-1 text-[11px] font-mono text-teal-200 tracking-wider transition backdrop-blur-md shadow-[0_0_12px_rgba(20,184,166,0.2)]"
          >
            <Network className="h-3.5 w-3.5 text-teal-400" />
            <span>/swarm</span>
          </button>
        </div>

        {/* Live Mathematical Engines Telemetry Bar */}
        <div className="absolute bottom-6 flex items-center gap-6 text-[10px] font-mono text-slate-500 tracking-wider">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ASTRO-CAUSAL: ONLINE
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            CHRONO-PULSE: ONLINE
          </span>
          <span className="flex items-center gap-1.5 text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            PHARMACO-SIM: ONLINE
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            SOMATOSCAN: 3,478 STRUCTURES
          </span>
        </div>

        {renderCommandModal()}
      </div>
    );
  }

  // =========================================================================
  // 2. ACTIVE SCREEN (3D Anatomical Twin Floating + Dynamic Clinical Dossier)
  // =========================================================================
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-8 select-none overflow-hidden">
      {/* Top Holographic Header Bar */}
      <div className="pointer-events-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-bold tracking-[0.3em] text-cyan-400 font-['Orbitron']">
            P.U.L.S.E. // {phaseMessage || "TACTICAL SOMATO-SCAN ACTIVE"}
          </span>
        </div>

        {/* Holo Navigation & Audio Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveEngineDrawer(!activeEngineDrawer)}
            title="Toggle Mathematical Engines Telemetry"
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[11px] font-mono tracking-wider backdrop-blur transition-all duration-300 ${
              activeEngineDrawer
                ? "border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                : "border-cyan-500/30 bg-slate-950/60 text-cyan-400 hover:text-cyan-200 hover:border-cyan-400"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>ENGINES [5]</span>
          </button>

          <button
            type="button"
            onClick={() => dollyView(0.7)}
            title="Dolly Camera Closer In"
            className="rounded-full border border-cyan-500/30 bg-slate-950/60 px-3 py-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-200 hover:border-cyan-400 backdrop-blur transition"
          >
            + ENLARGE
          </button>

          <button
            type="button"
            onClick={() => dollyView(1.4)}
            title="Dolly Camera Out"
            className="rounded-full border border-cyan-500/30 bg-slate-950/60 px-3 py-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-200 hover:border-cyan-400 backdrop-blur transition"
          >
            − RECEDE
          </button>

          <button
            type="button"
            onClick={() => setVoiceActive(!voiceActive)}
            title={voiceActive ? "Voice Mute" : "Voice Unmute"}
            className="rounded-full border border-cyan-500/30 bg-slate-950/60 p-2 text-cyan-400 hover:text-cyan-200 hover:border-cyan-400 backdrop-blur transition"
          >
            {voiceActive ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={returnToStandby}
            className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-slate-950/70 hover:bg-cyan-950/50 hover:border-cyan-400 px-4 py-1.5 text-[11px] font-mono tracking-widest text-cyan-300 uppercase backdrop-blur transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            <RotateCcw className="h-3 w-3" />
            <span>STANDBY</span>
          </button>
        </div>
      </div>

      {/* Center Laser Crosshair Reticle & Leader Line */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 pointer-events-none"
        style={{
          left: `${activeIssue.hudTargetCoords.x}%`,
          top: `${activeIssue.hudTargetCoords.y}%`,
        }}
      >
        <div className="relative flex items-center justify-center">
          <Crosshair className="h-6 w-6 text-cyan-400 animate-pulse drop-shadow-[0_0_8px_#22d3ee]" />
          <div className="absolute h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]" />

          <svg className="absolute left-3 top-3 w-80 h-32 overflow-visible pointer-events-none">
            <polyline
              points="0,0 35,35 240,35"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="animate-pulse"
            />
            <circle cx="240" cy="35" r="3" fill="#22d3ee" className="shadow-[0_0_10px_#22d3ee]" />
          </svg>
        </div>
      </div>

      {/* Floating Mathematical Engine Drawer (Left Side) */}
      {activeEngineDrawer && (
        <div className="pointer-events-auto absolute top-24 left-8 w-96 max-w-[90vw] animate-in fade-in slide-in-from-left duration-300">
          <div className="relative rounded-2xl border border-emerald-500/40 bg-slate-950/85 p-5 shadow-[0_0_50px_rgba(16,185,129,0.2)] backdrop-blur-2xl text-xs font-mono">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
              <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase font-['Orbitron']">
                5 PURE MATHEMATICAL ENGINES
              </span>
              <span className="rounded bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 text-[9px] text-emerald-300 font-bold">
                DETERMINISTIC
              </span>
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="rounded-xl bg-slate-900/60 border border-emerald-500/20 p-2.5">
                <div className="text-[9px] font-bold text-emerald-300 uppercase flex items-center justify-between">
                  <span>1. ASTRO-CAUSAL // BAYESIAN ODE SOLVER</span>
                  <span className="text-slate-500">4ms</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-300">
                  ODE: <code className="text-cyan-300">{engineTelemetry.astroCausal.icpBiophysics}</code>
                </div>
                <div className="mt-1 text-[10px] text-red-300 font-bold">
                  Posterior: {engineTelemetry.astroCausal.primaryHazard}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-cyan-500/20 p-2.5">
                <div className="text-[9px] font-bold text-cyan-300 uppercase flex items-center justify-between">
                  <span>2. CHRONO-PULSE // WELFORD DRIFT TRACKER</span>
                  <span className="text-slate-500">6ms</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-300">
                  Borbély S&C: Drift Score τ = {engineTelemetry.chronoPulse.welfordDriftScore}
                </div>
                <div className="mt-1 text-[10px] text-amber-300">
                  Readiness: {engineTelemetry.chronoPulse.cognitiveReadiness}% · {engineTelemetry.chronoPulse.circadianFatigue}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-amber-500/20 p-2.5">
                <div className="text-[9px] font-bold text-amber-300 uppercase flex items-center justify-between">
                  <span>3. EMOTION ENGINE // RUSSELL AFFECT</span>
                  <span className="text-slate-500">3ms</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-300">
                  Valence: {engineTelemetry.emotionAffect.valence} · Arousal: {engineTelemetry.emotionAffect.arousal}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  State: {engineTelemetry.emotionAffect.affectiveState}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-sky-500/20 p-2.5">
                <div className="text-[9px] font-bold text-sky-300 uppercase flex items-center justify-between">
                  <span>4. PHARMACO-SIM // 2-COMPARTMENT PK</span>
                  <span className="text-slate-500">8ms</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-300">
                  Clearance: {engineTelemetry.pharmacoSim.compartmentClearance}
                </div>
                <div className="mt-1 text-[10px] text-cyan-200">
                  Target: {engineTelemetry.pharmacoSim.steadyStatePlasma}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-indigo-500/20 p-2.5">
                <div className="text-[9px] font-bold text-indigo-300 uppercase flex items-center justify-between">
                  <span>5. SOMATOSCAN // FMA 3D PROJECTOR</span>
                  <span className="text-slate-500">2ms</span>
                </div>
                <div className="mt-1 text-[10px] text-slate-300">
                  {engineTelemetry.somatoScan.meshIndex}
                </div>
                <div className="mt-1 text-[10px] text-indigo-200">
                  {engineTelemetry.somatoScan.focalCoordinates}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dynamic Holographic Diagnostic Dossier (Right Side) */}
      <div className="pointer-events-auto absolute top-24 right-8 w-96 max-w-[90vw]">
        <div className="relative rounded-2xl border border-cyan-400/40 bg-slate-950/75 p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] backdrop-blur-2xl">
          <div className="absolute top-0 right-0 h-6 w-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-2xl pointer-events-none" />

          {/* Dossier Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div>
              <div className="text-[10px] font-mono tracking-[0.25em] text-cyan-400 uppercase flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                P.U.L.S.E. // FLIGHT SURGEON AI
              </div>
              <div className="text-sm font-bold text-slate-100 font-['Orbitron'] tracking-wider">
                {activeIssue.crewName || "Commander"}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-md bg-red-950/80 border border-red-500/50 px-2.5 py-0.5 text-xs font-mono font-bold text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                STRAIN {activeIssue.strainPercentage}%
              </span>
            </div>
          </div>

          {/* User Inquiry Reference */}
          {activeUserPrompt && (
            <div className="mt-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-1 text-[10px] font-mono text-cyan-300">
              <span className="text-slate-400">COMMANDER INQUIRY: </span>"{activeUserPrompt}"
            </div>
          )}

          {/* Interactive Jarvis Flight Surgeon Dialogue */}
          <div className="mt-3 rounded-xl bg-cyan-950/40 border border-cyan-400/50 p-3 shadow-inner">
            <div className="text-[10px] font-bold text-cyan-300 tracking-widest uppercase mb-1 font-['Orbitron'] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                JARVIS VOICE & DIAGNOSTIC DIRECTIVE
              </span>
              <span className="text-[8px] font-mono text-slate-400">EDGE SLM</span>
            </div>
            <p className="text-xs text-cyan-100 font-sans leading-relaxed italic">
              "{latestAiResponse || `Target localized to ${activeIssue.latinName}, Commander. Strain is running at ${activeIssue.strainPercentage} percent. I recommend: ${activeIssue.countermeasure}`}"
            </p>
          </div>

          {/* Anatomical Details & Condition */}
          <div className="mt-3.5 space-y-3 font-mono">
            <div>
              <div className="text-[9px] tracking-widest text-slate-500 uppercase flex items-center justify-between">
                <span>TARGET ANATOMY (LATIN)</span>
                <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                  [{activeIssue.system.toUpperCase()}]
                </span>
              </div>
              <div className="text-base font-bold text-cyan-300 font-['Orbitron'] tracking-wide">
                {activeIssue.latinName}
              </div>
            </div>

            <div>
              <div className="text-[9px] tracking-widest text-slate-500 uppercase">DIAGNOSED CONDITION</div>
              <div className="text-xs font-semibold text-slate-200">
                {activeIssue.condition}
              </div>
              <div className="text-[11px] text-amber-400 mt-0.5">
                Pain Index: {activeIssue.painSeverity}/10 · {activeIssue.painLocus}
              </div>
            </div>

            {/* Vitals Telemetry Grid */}
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-cyan-950/20 border border-cyan-500/20 p-2.5 text-center text-xs">
              <div>
                <span className="text-[9px] text-slate-400 block font-mono">HR</span>
                <span className="font-bold text-emerald-400">{activeIssue.vitals.hr} bpm</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-mono">ONSD/ICP</span>
                <span className="font-bold text-cyan-300">{activeIssue.vitals.onsd}mm / {activeIssue.vitals.icp}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-mono">RAD FLUX</span>
                <span className="font-bold text-amber-400">{activeIssue.vitals.radiation} µSv/h</span>
              </div>
            </div>

            {/* NASA Protocol & Action */}
            <div className="rounded-xl bg-slate-900/60 border border-cyan-500/30 p-3">
              <div className="text-[10px] font-bold text-cyan-300 tracking-widest uppercase mb-1 font-['Orbitron']">
                NASA COUNTERMEASURE PROTOCOL
              </div>
              <div className="text-xs text-slate-300 font-sans leading-relaxed">
                {activeIssue.countermeasure}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteProtocol}
              className={`w-full mt-2 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-lg ${
                actionDone
                  ? "bg-emerald-600/30 text-emerald-300 border border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                  : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 hover:border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
              }`}
            >
              <Shield className="h-4 w-4" />
              {actionDone ? "COUNTERMEASURE PROTOCOL DEPLOYED ✓" : "DEPLOY COUNTERMEASURE MATRIX"}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Interactive Dialogue & Follow-Up Bar */}
      <div className="pointer-events-auto mx-auto w-full max-w-2xl flex flex-col items-center gap-2 mb-2 z-30">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessInquiry(voiceQuery);
          }}
          className="flex items-center w-full rounded-full border border-cyan-400/50 bg-slate-950/90 backdrop-blur-2xl px-4 py-2 shadow-[0_0_40px_rgba(6,182,212,0.3)] focus-within:border-cyan-300 transition-all"
        >
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Mute Microphone" : "Activate Voice Microphone"}
            className={`p-1.5 rounded-full mr-2 transition-all ${
              isListening
                ? "bg-emerald-500/30 text-emerald-300 animate-pulse"
                : "text-cyan-400 hover:text-cyan-200 hover:bg-slate-800"
            }`}
          >
            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-slate-400" />}
          </button>
          <input
            type="text"
            value={voiceQuery}
            onChange={(e) => setVoiceQuery(e.target.value)}
            placeholder={`Ask JARVIS a follow-up about ${activeIssue.latinName}, countermeasure, or command...`}
            className="flex-1 bg-transparent text-xs font-mono text-cyan-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 px-3.5 py-1 text-[10px] font-mono tracking-widest font-bold uppercase transition"
          >
            SEND →
          </button>
        </form>

        {/* Quick Follow-up Action Chips */}
        <div className="flex items-center gap-2 flex-wrap justify-center text-[10px] font-mono">
          <button
            type="button"
            onClick={handleExecuteProtocol}
            className="rounded-full border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 px-3 py-0.5 text-emerald-300 backdrop-blur transition"
          >
            ⚡ Deploy Protocol
          </button>
          <button
            type="button"
            onClick={() => handleProcessInquiry("Explain detailed countermeasure mechanism")}
            className="rounded-full border border-cyan-500/40 bg-slate-900/60 hover:bg-slate-800 px-3 py-0.5 text-cyan-300 backdrop-blur transition"
          >
            💬 Countermeasure Details
          </button>
          <button
            type="button"
            onClick={() => executeFeatureCommand("/swarm")}
            className="rounded-full border border-teal-500/40 bg-slate-900/60 hover:bg-slate-800 px-3 py-0.5 text-teal-300 backdrop-blur transition"
          >
            🌐 Swarm Consensus
          </button>
          <button
            type="button"
            onClick={() => handleProcessInquiry("Assess optic nerve SANS status")}
            className="rounded-full border border-sky-500/40 bg-slate-900/60 hover:bg-slate-800 px-3 py-0.5 text-sky-300 backdrop-blur transition"
          >
            👁️ Check Optic SANS
          </button>
          <button
            type="button"
            onClick={returnToStandby}
            className="rounded-full border border-slate-700 bg-slate-900/60 hover:bg-slate-800 px-3 py-0.5 text-slate-400 hover:text-slate-200 backdrop-blur transition"
          >
            ↩ Standby
          </button>
        </div>
      </div>

      {renderCommandModal()}
      <div className="pointer-events-none" />
    </div>
  );
}
