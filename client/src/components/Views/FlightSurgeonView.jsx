import React, { useState } from 'react';

const FlightSurgeonView = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'surgeon',
      time: '08:14 UTC',
      text: 'Good morning Dr. Rostova. Flight Surgeon SLM active. All 5 telemetry streams (AstroSkin, Butterfly iQ+ POCUS, Cabin ECLSS, Radiation Dosimeter, NeuroType Dynamics) synchronized. 24h baseline drift is nominal (+0.3mm ONSD upper margin flagged for monitoring). How may I assist your medical operations today?'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const cannedResponses = {
    sans: {
      text: 'ONSD measurement is currently 5.82 mm with mild right Frisén Grade 1 disc edema. AstroCausal Engine indicates a 76.4% posterior probability of Spaceflight-Associated Neuro-ocular Syndrome driven by cephalad venous engorgement.\n\nRecommended Countermeasure:\n1. 50 mmHg Lower Body Negative Pressure (Chibis-M) for 45 minutes.\n2. Sleep in 10° head-up tilt configuration.\n3. Repeat Butterfly iQ+ optic nerve sheath ultrasound in 72 hours.'
    },
    orthostatic: {
      text: 'ChronoPulse autoencoder detects 18% baroreflex sensitivity attenuation and -1.2L estimated intravascular plasma deficit typical of Sol 142 microgravity.\n\nRecommended Countermeasure:\n1. Saline fluid loading protocol: 1.0 L water with 8g NaCl 2h prior to EVA egress.\n2. In-suit lower extremity compression gradient (30-40 mmHg).\n3. 30-minute ARED eccentric squat session at 85% 1RM.'
    },
    radiation: {
      text: 'Current cabin dose rate: 18.4 µSv/hr (Passive SPE background). Cumulative mission dose: 48.6 mSv (well within 600 mSv career limit for female astronauts aged 38).\n\nAction: No shelter ingress required. Continue continuous active silicon pixel detector telemetry.'
    },
    neuro: {
      text: 'NeuroType passive Shannon keystroke entropy score is 0.742 (Nominal range > 0.65). LRP latency variance shows zero acute vigilance degradation over the last 14 EVA maintenance cycles.\n\nRecommendation: Standard 8-hour sleep period approved. Melatonin 0.5mg PRN allowed.'
    }
  };

  const handleSend = (text) => {
    const query = text || inputVal;
    if (!query.trim()) return;

    const userMsg = {
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = '';
      const lower = query.toLowerCase();
      if (lower.startsWith('/learn') || lower === 'learn') {
        replyText = 'OpenJarvis Online Learning Engine consolidated: Epistemic uncertainty reduced by 14.8%. Dirichlet Bayesian priors recalibrated for astronaut. Active clinical knowledge graph: 24 nodes (NASA-EXMC-ONLINE-LEARNING).';
      } else if (lower.startsWith('/boost') || lower === 'boost') {
        replyText = 'Performance Overdrive engaged: Telemetry polling accelerated to 100 Hertz. Mathematical engines running sub-millisecond vectorized inference (0.68 ms latency). 12.4x computational throughput online (NASA-EDGE-ACCELERATION).';
      } else if (lower.startsWith('/teamwork') || lower === 'teamwork') {
        replyText = 'Multi-crew teamwork synchronization active across all 4 exploration astronauts. Collective autonomic stress index is 30.1%. ECLSS consumable reserves nominal at 420 days margin (NASA-CREW-COLLABORATION).';
      } else if (lower.startsWith('/migrate') || lower === 'migrate') {
        replyText = 'Clinical Workflow Migration Engine compiled 3 terrestrial protocols into ExMC Level 5 edge-deterministic workflows: SANS Decompression, SPE Radiation Storm Shelter, and Acute EVA Abdominal Wall Stabilization (NASA-STD-3001-EXMC-MIGRATION).';
      } else if (lower.startsWith('/goal') || lower === 'goal') {
        replyText = 'Mission Health Goals evaluation: 5 of 5 HRP long-duration flight objectives are ON TRACK. Bone density retention is 99.1%, VO2 Max is 88.4%, and radiation is well within safety thresholds at 18.4 mSv (NASA-HRP-GOAL-TRACKER).';
      } else if (lower.startsWith('/swarm') || lower === 'swarm') {
        replyText = 'Autonomous Medical Swarm consensus complete across 6 specialized edge agents: Consensus verdict reached with 96.3% aggregate confidence. All 5 NASA hazards in controlled equilibrium (NASA-SWARM-MULTI-AGENT-ARBITER).';
      } else if (lower.includes('sans') || lower.includes('eye') || lower.includes('optic') || lower.includes('vision')) {
        replyText = cannedResponses.sans.text;
      } else if (lower.includes('ortho') || lower.includes('fluid') || lower.includes('eva') || lower.includes('blood pressure')) {
        replyText = cannedResponses.orthostatic.text;
      } else if (lower.includes('rad') || lower.includes('solar') || lower.includes('dose') || lower.includes('gcr')) {
        replyText = cannedResponses.radiation.text;
      } else if (lower.includes('fatigue') || lower.includes('sleep') || lower.includes('neuro') || lower.includes('stress')) {
        replyText = cannedResponses.neuro.text;
      } else {
        replyText = `Clinical inquiry processed against NASA STD-3001 CPG database. Baseline vital telemetry confirms:\n- Heart Rate: 71 bpm (sinus rhythm)\n- BP: 120/80 mmHg\n- SpO2: 98.4%\n- ChronoPulse Latent Loss: 0.042 (stable)\n\nDifferential diagnosis confidence is optimal. Please specify if you wish to run dedicated SANS ultrasound, LBNP countermeasures, or psychomotor checks.`;
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'surgeon',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: replyText
        }
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>AI Flight Surgeon Operations</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>On-Device Clinical Practice Guidelines &amp; Autonomous Telemedicine SLM</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#00f2fe', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)', padding: '6px 14px', borderRadius: '12px' }}>
            NASA STD-3001 Verified
          </span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '6px 14px', borderRadius: '12px' }}>
            Local SLM Active (Zero Earth Latency)
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '20px' }}>
        {/* Chat / Reasoning Terminal */}
        <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', height: '620px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)', color: '#070a12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>
                Ω
              </div>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', margin: 0 }}>ElectroPulse Flight Surgeon SLM</h4>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Edge Neuro-Symbolic Model • NASA CPG Grounding</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '8px' }}>
              ● 24ms Local Response
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  background: m.sender === 'user' ? 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)' : '#0f172a',
                  color: m.sender === 'user' ? '#070a12' : '#f8fafc',
                  border: m.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '14px 18px',
                  borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  fontWeight: m.sender === 'user' ? 600 : 400
                }}
              >
                <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {m.sender === 'user' ? 'Astronaut Rostova' : 'NASA Flight Surgeon SLM'} • {m.time}
                </div>
                {m.text}
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: '#0f172a', color: '#94a3b8', padding: '10px 16px', borderRadius: '18px', fontSize: '12px', fontStyle: 'italic', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                Surgeon SLM querying NASA Evidence Books...
              </div>
            )}
          </div>


          {/* Quick Query Chips */}
          <div style={{ display: 'flex', gap: '8px', padding: '8px 0', overflowX: 'auto' }}>
            <button
              onClick={() => handleSend('Evaluate SANS optic disc elevation & visual acuity')}
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '6px 12px', fontSize: '11px', color: '#e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700 }}
            >
              👁️ SANS Protocol
            </button>
            <button
              onClick={() => handleSend('Orthostatic intolerance post-EVA recovery protocol')}
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '6px 12px', fontSize: '11px', color: '#e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700 }}
            >
              🩺 Orthostatic Protocol
            </button>
            <button
              onClick={() => handleSend('Analyze Space Radiation Dosimetry vs. GCR limit')}
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '6px 12px', fontSize: '11px', color: '#e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700 }}
            >
              ☢️ Radiation Dosimetry
            </button>
            <button
              onClick={() => handleSend('Evaluate psychomotor vigilance & cognitive fatigue')}
              style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '6px 12px', fontSize: '11px', color: '#e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700 }}
            >
              🧠 Cognitive Lapses
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: 'flex', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            <input
              type="text"
              placeholder="Ask Flight Surgeon about symptoms, countermeasure dosing, or CPG..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              style={{
                flex: 1,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '13px',
                outline: 'none',
                background: '#050811',
                color: '#ffffff'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)',
                color: '#070a12',
                border: 'none',
                borderRadius: '12px',
                padding: '0 20px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Send
            </button>
          </form>
        </div>

        {/* Right side: Clinical Decision Support & Differential Diagnosis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* CPG Card */}
          <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '14px' }}>NASA HRP Differential Diagnosis</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Spaceflight SANS Fluid Shift</span>
                  <span style={{ fontWeight: 800, color: '#f59e0b' }}>76.4% Prob</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: '76.4%', height: '100%', background: '#f59e0b', borderRadius: '10px', boxShadow: '0 0 8px #f59e0b' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Cardiovascular Deconditioning</span>
                  <span style={{ fontWeight: 800, color: '#00f2fe' }}>18.2% Prob</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: '18.2%', height: '100%', background: '#00f2fe', borderRadius: '10px', boxShadow: '0 0 8px #00f2fe' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Hypercapnia (CO2 &gt; 2.5 mmHg)</span>
                  <span style={{ fontWeight: 800, color: '#94a3b8' }}>3.8% Prob</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: '3.8%', height: '100%', background: '#94a3b8', borderRadius: '10px' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Acute Solar Particle Radiation</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>1.6% Prob</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: '1.6%', height: '100%', background: '#10b981', borderRadius: '10px' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Clinical Protocol */}
          <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>Clinical Practice Guidelines (CPGs)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#00f2fe' }}>NASA-STD-3001 Vol 1 §4.2.1</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                  Microgravity fluid cephalad redistribution monitoring; POCUS ONSD threshold limit: 5.80 mm.
                </div>
              </div>
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#00f2fe' }}>NASA-HRP-EXERCISE-2024</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                  Mandatory 2.5 hr/day prescription split: ARED resistance 60m + T2 cycle/ergometer 45m.
                </div>
              </div>
              <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#00f2fe' }}>ALARA Space Radiation Directive</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                  Career REID risk &lt; 3% at 95% CL. Dynamic water-wall crew quarters shielding active.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightSurgeonView;