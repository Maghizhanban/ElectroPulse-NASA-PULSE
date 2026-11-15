import React, { useState } from 'react';

const UltrasoundView = () => {
  const [caliperVal, setCaliperVal] = useState(4.62);
  const [saved, setSaved] = useState(false);

  const getSANSGrade = (val) => {
    if (val < 5.0) return { grade: 'GRADE 0 (NOMINAL)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icp: '11.2 mmHg (Normal)' };
    if (val <= 5.8) return { grade: 'GRADE 1 (BORDERLINE)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icp: '17.4 mmHg (Elevated)' };
    return { grade: 'GRADE 2 (SANS RISK DETECTED)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icp: '23.8 mmHg (Hypertension)' };
  };

  const status = getSANSGrade(caliperVal);

  return (
    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>Ocular Ultrasound &amp; SANS Surveillance</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Point-of-Care Ultrasound (POCUS) Butterfly iQ+ Optic Nerve Sheath Evaluation</p>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#00f2fe', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid rgba(0, 242, 254, 0.4)', padding: '6px 14px', borderRadius: '12px' }}>
          PROBE: BUTTERFLY iQ+ FLIGHT UNIT #02
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Ultrasound B-Mode Canvas Screen */}
        <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px' }}>
          <div style={{ width: '220px', height: '220px', borderRadius: '50%', border: '2px dashed rgba(0, 242, 254, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'radial-gradient(circle, #0f172a 0%, #050811 100%)' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)' }} />
            {/* Caliper Line */}
            <div style={{ position: 'absolute', width: '140px', height: '2px', background: '#00f2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 0 10px rgba(0, 242, 254, 0.9)' }}>
              <span style={{ width: '3px', height: '10px', background: '#fff' }} />
              <span style={{ fontSize: '10px', color: '#00f2fe', background: '#070a12', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontFamily: 'monospace', border: '1px solid rgba(0, 242, 254, 0.4)' }}>{caliperVal} mm</span>
              <span style={{ width: '3px', height: '10px', background: '#fff' }} />
            </div>
          </div>

          <div style={{ marginTop: '24px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>
            <span>DEPTH: 4.0 cm • GAIN: 48 dB</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#00f2fe', fontWeight: 700 }}>CALIPER:</span>
              <input 
                type="range" 
                min="4.0" 
                max="6.6" 
                step="0.05" 
                value={caliperVal} 
                onChange={(e) => setCaliperVal(parseFloat(e.target.value))} 
                style={{ width: '120px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* SANS Clinical Risk Card */}
        <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>NASA Clinical Practice Guideline Status</span>
            <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: '12px', background: status.bg, color: status.color, fontWeight: 800, fontSize: '14px', marginTop: '10px', border: `1px solid ${status.color}` }}>
              {status.grade}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>ONSD Measurement:</span>
                <strong style={{ fontSize: '13px', color: '#ffffff' }}>{caliperVal} mm</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Estimated ICP Correlation:</span>
                <strong style={{ fontSize: '13px', color: status.color }}>{status.icp}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Frisén Edema Grade:</span>
                <strong style={{ fontSize: '13px', color: '#ffffff' }}>{caliperVal > 5.8 ? 'Stage 2 (Halo)' : caliperVal > 5.0 ? 'Stage 1 (C-shape)' : 'Stage 0 (Clear)'}</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            {caliperVal > 5.8 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '12px', color: '#ef4444', fontSize: '12px', marginBottom: '14px', fontWeight: 600 }}>
                ⚠️ High risk of permanent optic disk edema. Initiating emergency 50 mmHg Chibis Lower Body Negative Pressure (LBNP) protocol.
              </div>
            )}
            <button 
              onClick={() => setSaved(true)} 
              style={{ width: '100%', background: saved ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)', color: saved ? '#10b981' : '#070a12', border: saved ? '1px solid #10b981' : 'none', padding: '12px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
            >
              {saved ? 'Scan Exported to Flight Record ✓' : 'Save Scan to Mission Health Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UltrasoundView;