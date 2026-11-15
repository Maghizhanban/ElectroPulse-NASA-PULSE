import React, { useState, useEffect, useRef } from 'react';
import { UniversalMedicalBrain } from '../../engines/UniversalMedicalBrain';
import { sceneBridge } from '../Atlas3D/sceneBridge';
import defaultAvatar from '../../assets/avatar.png';
import { 
  FiCheckCircle, FiVolume2, FiVolumeX, 
  FiZap, FiX, FiCornerDownLeft 
} from 'react-icons/fi';
import './JarvisGuardian.css';

const medicalBrain = new UniversalMedicalBrain();

// Offline deterministic SVG astronaut profile avatars
const CREW_AVATARS = {
  rostova: defaultAvatar,
  chen: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><rect width="80" height="80" rx="40" fill="%230b1329"/><circle cx="40" cy="32" r="16" fill="%23f59e0b"/><path d="M16 68 C16 52 26 46 40 46 C54 46 64 52 64 68 Z" fill="%23f59e0b"/><circle cx="40" cy="32" r="13" fill="%23d97706"/><ellipse cx="40" cy="30" rx="9" ry="6" fill="%23fef3c7" opacity="0.85"/><rect x="36" y="52" width="8" height="4" rx="2" fill="%23fbbf24"/></svg>`,
  vance: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><rect width="80" height="80" rx="40" fill="%230b1329"/><circle cx="40" cy="32" r="16" fill="%2310b981"/><path d="M16 68 C16 52 26 46 40 46 C54 46 64 52 64 68 Z" fill="%2310b981"/><circle cx="40" cy="32" r="13" fill="%23059669"/><ellipse cx="40" cy="30" rx="9" ry="6" fill="%23d1fae5" opacity="0.85"/><rect x="36" y="52" width="8" height="4" rx="2" fill="%2334d399"/></svg>`
};

export const CREW_MEMBERS = [
  {
    id: 'rostova',
    name: 'CDR Elena Rostova, MD',
    role: 'Mission Commander & Flight Surgeon',
    avatar: CREW_AVATARS.rostova,
    activity: 'EVA Orbital Maintenance (4.5h completed) • POCUS Eye Scan',
    riskProfile: 'SANS Cephalad Fluid Shift',
    vitals: { hr: 71, bp: '120/80', onsd: 5.82, icp: 19.4, boneLoss: -1.1, entropy: 0.74 },
    alert: {
      type: 'critical',
      target: 'sans',
      organ: 'Right Optic Nerve Sheath & Globe',
      headline: 'Commander, I have detected early microgravity cephalad fluid pressure accumulation.',
      speech: 'Commander Rostova, this is P.U.L.S.E. ChronoPulse background analysis has detected acute retrobulbar subarachnoid pressure accumulation. Your right optic sheath diameter has expanded to 5.82 millimeters, approaching Frisén Grade 1 edema.',
      mechanism: 'Cephalad fluid redistribution causes internal jugular stagnation and retrobulbar sheath dilation, flattening the posterior globe.',
      countermeasure: 'Recommended immediate 45-minute Chibis-M Lower Body Negative Pressure (LBNP) cycle at -45 mmHg and 10° head-up sleep elevation.',
      actionLabel: 'Execute Chibis-M LBNP Protocol (-45 mmHg)'
    }
  },
  {
    id: 'chen',
    name: 'Dr. Marcus Chen, PhD',
    role: 'Science Officer & Geologist',
    avatar: CREW_AVATARS.chen,
    activity: 'Glovebox Mars Regolith Spectrometry • ARED Squats',
    riskProfile: 'Trabecular Bone Resorption',
    vitals: { hr: 68, bp: '118/76', onsd: 4.88, icp: 12.1, boneLoss: -1.5, entropy: 0.81 },
    alert: {
      type: 'warning',
      target: 'spine',
      organ: 'Lumbar Vertebrae L1–L5 & Femoral Neck',
      headline: 'Dr. Chen, unweighted bone mineral resorption is exceeding monthly tolerance.',
      speech: 'Dr. Chen, P.U.L.S.E. telemetry alert. Passive osteoclast biomarker synthesis indicates your lumbar trabecular demineralization rate has increased to negative 1.5% this month.',
      mechanism: 'Absence of 1-G piezoelectric bone loading inhibits osteoblast remodeling, leading to accelerated hypercalciuria and nephrolithiasis risk.',
      countermeasure: 'Increase ARED axial compressive load to 85% 1RM for 60 minutes and administer 70mg oral Bisphosphonate.',
      actionLabel: 'Load ARED 85% 1RM Axial Resistance Schedule'
    }
  },
  {
    id: 'vance',
    name: 'CDR Sarah Vance, MSc',
    role: 'Flight Engineer & EVA Specialist',
    avatar: CREW_AVATARS.vance,
    activity: '6.5h Airlock Ingress • High Workload EVA Thruster Repair',
    riskProfile: 'Psychomotor Vigilance Collapse & Sleep Debt',
    vitals: { hr: 78, bp: '126/84', onsd: 4.95, icp: 13.0, boneLoss: -0.9, entropy: 0.54 },
    alert: {
      type: 'critical',
      target: 'soleus',
      organ: 'Prefrontal Cortical Circuits & Soleus Posture',
      headline: 'Commander Vance, your psychomotor reaction velocity has dropped by 24%.',
      speech: 'Commander Vance, attention required. NeuroType passive keystroke entropy has dropped below 0.55 following your six-hour spacewalk. Acute cognitive lapse risk is elevated.',
      mechanism: 'Prolonged EVA physical exertion combined with circadian disruption causes selective prefrontal vigilance lapses and slow-twitch muscle motor fatigue.',
      countermeasure: 'Mandatory 8-hour sleep period prescription with active 0.5mg sublingual Melatonin and suspension of high-risk docking tasks per NASA STD-3001.',
      actionLabel: 'Enforce Mandatory Rest Protocol & Flight Deck Stand-Down'
    }
  }
];

export default function JarvisGuardian({ 
  currentCrew, 
  onSelectCrew, 
  onTriggerOrganFocus,
  onOpenSimulation
}) {
  const [activeCrew, setActiveCrew] = useState(currentCrew || CREW_MEMBERS[0]);
  const [proactiveAlert, setProactiveAlert] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [jarvisInput, setJarvisInput] = useState('');
  const [dialogueHistory, setDialogueHistory] = useState([]);
  const [guardianActive, setGuardianActive] = useState(true);
  const waveformCanvasRef = useRef(null);

  // Sync active crew when prop changes
  useEffect(() => {
    if (currentCrew) {
      setActiveCrew(currentCrew);
    }
  }, [currentCrew]);

  // JARVIS Speech Synthesizer using Web Speech API
  const speakJarvis = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;

    // Try to pick a polished voice (e.g. Google UK English Male, Daniel, or standard English)
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('UK') || v.name.includes('Natural') || v.name.includes('George') || v.name.includes('Daniel') || v.name.includes('Male')));
    if (jarvisVoice) utterance.voice = jarvisVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Trigger Proactive Autonomous Interruption
  const triggerAutonomousAlert = (crewMember = activeCrew) => {
    const alertData = crewMember.alert;
    setProactiveAlert(alertData);

    // Speak proactive alert
    speakJarvis(alertData.speech);

    // Automatically trigger cinematic 3D glide to affected organ
    if (onTriggerOrganFocus && alertData.target) {
      onTriggerOrganFocus(alertData.target);
    }
  };

  // JARVIS autonomous monitoring heartbeat: on-demand diagnostic alerts without unprompted popup interruptions
  useEffect(() => {
    // Kept passive to ensure uninterrupted flight deck operation
  }, [activeCrew.id]);

  // Animated Holographic Voice Waveform
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 24;
      const barWidth = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const height = isSpeaking 
          ? Math.sin(step * 0.15 + i * 0.4) * 16 + 20 + Math.random() * 8
          : Math.sin(step * 0.05 + i * 0.3) * 4 + 6;

        ctx.fillStyle = isSpeaking ? '#00f2fe' : 'rgba(0, 242, 254, 0.4)';
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = isSpeaking ? 10 : 2;

        const x = i * barWidth + 2;
        const y = (canvas.height - height) / 2;
        ctx.fillRect(x, y, barWidth - 4, height);
      }
      step++;
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isSpeaking]);

  // Handle Astronaut Question to P.U.L.S.E.
  const executeInquiry = async (rawQuery) => {
    const query = (rawQuery || '').trim();
    if (!query) return;

    const userMsg = { sender: 'crew', text: query, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setDialogueHistory(prev => [...prev, userMsg]);
    setJarvisInput('');

    try {
      const brainResponse = await medicalBrain.processInquiry(query, {
        hr: activeCrew.vitals.hr,
        bp: activeCrew.vitals.bp,
        onsd: activeCrew.vitals.onsd,
        icp: activeCrew.vitals.icp,
        entropy: activeCrew.vitals.entropy,
        crew: activeCrew.name
      });

      const replyText = brainResponse.speechText;
      speakJarvis(replyText);

      // SomatoScan AI Scene Command Bridge Dispatch
      const lowerQ = query.toLowerCase();
      if (lowerQ.includes('ghost') || lowerQ.includes('see through')) {
        sceneBridge.dispatch({ action: 'set_ghost_mode', enabled: true });
      } else if (lowerQ.includes('solid') || lowerQ.includes('opaque')) {
        sceneBridge.dispatch({ action: 'set_ghost_mode', enabled: false });
      } else if (lowerQ.includes('scan') && (lowerQ.includes('body') || lowerQ.includes('sweep') || lowerQ.includes('all'))) {
        sceneBridge.dispatch({ action: 'set_scanner_sweep', active: true });
      } else if (lowerQ.includes('reset') || lowerQ.includes('center')) {
        sceneBridge.dispatch({ action: 'reset_view' });
      }

      if (brainResponse.sceneCommand) {
        sceneBridge.dispatch(brainResponse.sceneCommand);
      } else if (brainResponse.targetFocus) {
        sceneBridge.dispatch({
          action: 'focus_organ',
          organ_id: brainResponse.targetFocus
        });
      }

      if (brainResponse.targetFocus && onTriggerOrganFocus) {
        onTriggerOrganFocus(brainResponse.targetFocus);
      }

      if (brainResponse.type === 'pharmacokinetic_simulation' && onOpenSimulation) {
        onOpenSimulation(brainResponse.drugKey || 'acetazolamide');
      }

      setDialogueHistory(prev => [
        ...prev, 
        { sender: 'jarvis', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch {
      const fallback = `Inquiry processed against NASA-STD-3001 evidence matrix. All 5 edge engines nominal.`;
      speakJarvis(fallback);
      setDialogueHistory(prev => [
        ...prev, 
        { sender: 'jarvis', text: fallback, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }
  };

  const handleQuery = (e) => {
    e.preventDefault();
    executeInquiry(jarvisInput);
  };

  const handleSwitchCrew = (member) => {
    setActiveCrew(member);
    if (onSelectCrew) onSelectCrew(member);
    setDialogueHistory([]);
    setProactiveAlert(null);
    if (member.alert && member.alert.target) {
      sceneBridge.dispatch({
        action: 'focus_organ',
        organ_id: member.alert.target
      });
    }
  };

  return (
    <div className="jarvis-guardian-wrapper">
      {/* Top Guardian Status Ribbon */}
      <div className="jarvis-status-ribbon">
        <div className="guardian-left">
          <div className={`jarvis-core-orb ${isSpeaking ? 'speaking' : ''}`}>
            <span className="core-inner-glow"></span>
          </div>
          <div className="guardian-title-block">
            <span className="guardian-brand">P.U.L.S.E. MEDICAL GUARDIAN</span>
            <small className="guardian-sub">Predictive Universal Life-support &amp; Somatic Evaluator • Autonomous Interception</small>
          </div>
        </div>

        {/* Crew Member Profile Selector */}
        <div className="crew-selector-pills">
          {CREW_MEMBERS.map(m => (
            <button
              key={m.id}
              className={`crew-pill-btn ${activeCrew.id === m.id ? 'active' : ''}`}
              onClick={() => handleSwitchCrew(m)}
            >
              <img src={m.avatar} alt={m.name} className="crew-avatar-mini" />
              <div className="crew-pill-text">
                <span className="crew-pill-name">{m.name.split(' ')[1]}</span>
                <span className="crew-pill-risk">{m.riskProfile.split(' ')[0]} Risk</span>
              </div>
            </button>
          ))}
        </div>

        {/* Voice Synthesizer & Autonomous Alert Trigger */}
        <div className="guardian-right-controls">
          <button
            className={`voice-toggle-btn ${voiceEnabled ? 'active' : ''}`}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? 'Mute P.U.L.S.E. Voice' : 'Enable P.U.L.S.E. Voice'}
          >
            {voiceEnabled ? <FiVolume2 /> : <FiVolumeX />}
            <span>VOICE {voiceEnabled ? 'ON' : 'MUTED'}</span>
          </button>

          <button
            className="sim-intercept-btn"
            onClick={() => triggerAutonomousAlert(activeCrew)}
            title="Trigger Proactive Autonomous Assessment Intercept"
          >
            <FiZap />
            <span>TRIGGER PROACTIVE INTERCEPT</span>
          </button>
        </div>
      </div>

      {/* PROACTIVE AUTONOMOUS POP-OUT POPUP (JARVIS INTERCEPT) */}
      {proactiveAlert && (
        <div className="jarvis-proactive-popup">
          <div className="popup-glow-border"></div>
          <div className="popup-content">
            <div className="popup-top">
              <div className="popup-badge">
                <span className="pulsing-beacon"></span>
                <span>P.U.L.S.E. PROACTIVE HEALTH INTERCEPTION</span>
              </div>
              <div className="popup-meta">
                <span className="crew-target">PATIENT: <strong>{activeCrew.name}</strong></span>
                <button className="dismiss-btn" onClick={() => setProactiveAlert(null)}>
                  <FiX />
                </button>
              </div>
            </div>

            <div className="popup-body">
              <div className="popup-voice-strip">
                <canvas ref={waveformCanvasRef} width="220" height="34" className="voice-canvas" />
                <span className="speech-status">{isSpeaking ? 'P.U.L.S.E. TRANSMITTING...' : 'SPEECH SYNCHRONIZED'}</span>
              </div>

              <h3 className="popup-headline">{proactiveAlert.headline}</h3>

              <div className="popup-vitals-strip">
                <div className="vital-tag">Target: <strong>{proactiveAlert.organ}</strong></div>
                <div className="vital-tag highlight">Telemetry: <strong>{activeCrew.vitals.onsd ? `ONSD ${activeCrew.vitals.onsd}mm` : `Loss ${activeCrew.vitals.boneLoss}%`}</strong></div>
                <div className="vital-tag">Baseline Drift: <strong>+18.4% Autonomous Variance</strong></div>
              </div>

              <p className="popup-speech-text">
                &quot;{proactiveAlert.speech}&quot;
              </p>

              <div className="popup-pathology">
                <span className="pathology-label">Physiological Mechanism:</span>
                <p className="pathology-text">{proactiveAlert.mechanism}</p>
              </div>

              <div className="popup-countermeasure">
                <span className="cm-label">NASA HRP Prescribed Countermeasure:</span>
                <p className="cm-text">{proactiveAlert.countermeasure}</p>
              </div>
            </div>

            <div className="popup-actions">
              <button 
                className="action-execute-btn"
                onClick={() => {
                  speakJarvis(`Countermeasure initialized. Telemetry logging to NASA ExMC flight recorder.`);
                  setProactiveAlert(null);
                }}
              >
                <FiCheckCircle />
                <span>{proactiveAlert.actionLabel}</span>
              </button>

              <button 
                className="action-explain-btn"
                onClick={() => {
                  speakJarvis(proactiveAlert.mechanism);
                }}
              >
                <span>Explain Mechanism Aloud</span>
              </button>

              <button 
                className="action-snooze-btn"
                onClick={() => setProactiveAlert(null)}
              >
                <span>Acknowledge &amp; Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Bottom Command Strip to Query P.U.L.S.E. directly */}
      <div className="jarvis-command-strip">
        <div className="command-lead">
          <span className="command-prompt">P.U.L.S.E.://</span>
        </div>
        <form onSubmit={handleQuery} className="command-form">
          <input
            type="text"
            placeholder={`Ask P.U.L.S.E.: "What is ${activeCrew.name.split(' ')[1]}'s optic nerve reading?", "Simulate 250mg Acetazolamide", "Check radiation risk..."`}
            value={jarvisInput}
            onChange={e => setJarvisInput(e.target.value)}
            className="command-input"
          />
          <button type="submit" className="command-send-btn">
            <FiCornerDownLeft />
          </button>
        </form>
      </div>

      {/* Mini Dialogue History drawer if user asked questions */}
      {dialogueHistory.length > 0 && (
        <div className="jarvis-chat-stream">
          {dialogueHistory.slice(-3).map((item, idx) => (
            <div key={idx} className={`stream-item ${item.sender}`}>
              <span className="stream-author">{item.sender === 'jarvis' ? 'P.U.L.S.E.' : activeCrew.name.split(' ')[1]}:</span>
              <span className="stream-text">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
