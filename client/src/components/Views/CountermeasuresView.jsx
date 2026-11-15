import React, { useState } from 'react';

const CountermeasuresView = () => {
  const [activeTab, setActiveTab] = useState('lbnp');
  const [activeSession, setActiveSession] = useState(false);

  return (
    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>Spaceflight Countermeasures Station</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Active Microgravity Mitigation: ARED Resistance, T2 Aerobic, &amp; Chibis-M LBNP Suit</p>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#00f2fe', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)', padding: '6px 14px', borderRadius: '12px' }}>
          PRESCRIPTION: 2.5 HR / SOL
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        {/* ARED Card */}
        <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '24px' }}>🏋️‍♂️</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '8px' }}>COMPLETED</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: '14px 0 6px 0' }}>ARED Heavy Resistance</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
              Primary countermeasure against lumbar bone mineral demineralization and soleus muscle atrophy.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Squats (85% 1RM):</span>
                <strong style={{ color: '#ffffff' }}>4 sets × 10 reps</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Deadlifts:</span>
                <strong style={{ color: '#ffffff' }}>3 sets × 8 reps</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Total Workload:</span>
                <strong style={{ color: '#00f2fe' }}>18,450 kg•m</strong>
              </div>
            </div>
          </div>
          <button style={{ marginTop: '20px', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
            Session Summary Logged
          </button>
        </div>

        {/* T2 Treadmill Card */}
        <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '24px' }}>🏃‍♀️</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#00f2fe', background: 'rgba(0, 242, 254, 0.2)', padding: '4px 8px', borderRadius: '8px' }}>NEXT: 14:00 UTC</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: '14px 0 6px 0' }}>T2 COLBERT Treadmill</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
              Bungee harness dynamic loading maintaining VO2 max and foot strike bone remodeling stimuli.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Harness Load:</span>
                <strong style={{ color: '#ffffff' }}>72% Body Mass</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Interval Split:</span>
                <strong style={{ color: '#ffffff' }}>4 × 4 min High VO2</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Vibration Isolation:</span>
                <strong style={{ color: '#10b981' }}>Nominal (VIS Active)</strong>
              </div>
            </div>
          </div>
          <button style={{ marginTop: '20px', background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)', color: '#070a12', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
            Queue Treadmill Telemetry
          </button>
        </div>

        {/* Chibis LBNP Card */}
        <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '24px' }}>🦿</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.2)', padding: '4px 8px', borderRadius: '8px' }}>PRESCRIPTION: SANS</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: '14px 0 6px 0' }}>Chibis-M LBNP Suit</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
              Pulls pooled cephalad fluids back to lower extremities to reduce retrobulbar ICP and optic disc edema.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Target Negative Pressure:</span>
                <strong style={{ color: '#f59e0b' }}>-35 to -50 mmHg</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Target Duration:</span>
                <strong style={{ color: '#ffffff' }}>45 minutes</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Fluid Shift Target:</span>
                <strong style={{ color: '#00f2fe' }}>-1.2 L Caudal</strong>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setActiveSession(!activeSession)}
            style={{ marginTop: '20px', background: activeSession ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: activeSession ? '#10b981' : '#070a12', border: activeSession ? '1px solid #10b981' : 'none', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
          >
            {activeSession ? 'LBNP Cycle Active (-35 mmHg) ✓' : 'Initiate 40m LBNP Protocol'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountermeasuresView;