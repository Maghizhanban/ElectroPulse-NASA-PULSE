import React, { useEffect, useRef } from 'react';

const BiometricsView = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let x = 0;
    const points = [];
    const maxPoints = 400;

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.fillStyle = 'rgba(7, 10, 18, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const midY = canvas.height / 2;

      for (let i = 0; i < points.length; i++) {
        const px = (i / maxPoints) * canvas.width;
        const py = midY + points[i];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      const phase = (x % 45);
      let y = 0;
      if (phase === 10) y = -6;
      else if (phase === 18) y = 7;
      else if (phase === 20) y = -44;
      else if (phase === 22) y = 16;
      else if (phase === 30) y = -10;
      else y = (Math.random() - 0.5) * 2.5;

      points.push(y);
      if (points.length > maxPoints) points.shift();
      x++;

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>Hemodynamics &amp; Biometrics Suite</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>AstroSkin 100 Hz Continuous Wearable Sensor Bus • Edge ChronoPulse Loss</p>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '6px 14px', borderRadius: '12px' }}>
          ● CONTINUOUS TELEMETRY SYNCED
        </span>
      </div>

      {/* Main Realtime Waveform Display */}
      <div style={{ background: '#0b1120', borderRadius: '24px', padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#00f2fe', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Live Channel A</span>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: '2px 0 0 0' }}>Lead II Electrocardiogram (ECG)</h4>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>Sampling: <strong style={{ color: '#00f2fe' }}>100 Hz</strong></span>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>HR: <strong style={{ color: '#ffffff' }}>71 bpm</strong></span>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>PR Interval: <strong style={{ color: '#ffffff' }}>158 ms</strong></span>
          </div>
        </div>
        <div style={{ height: '220px', width: '100%', borderRadius: '16px', overflow: 'hidden', background: '#050811', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
      </div>

      {/* Secondary Sensor Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: '#0b1120', borderRadius: '20px', padding: '20px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Oxygen Saturation</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>98.4<small style={{ fontSize: '16px', color: '#00f2fe' }}>%</small></div>
          <small style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>SpO2 Alveolar Diffusion Nominal</small>
        </div>

        <div style={{ background: '#0b1120', borderRadius: '20px', padding: '20px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Continuous Blood Pressure</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>120<small style={{ fontSize: '16px', color: '#64748b' }}>/80</small></div>
          <small style={{ fontSize: '11px', color: '#00f2fe', fontWeight: 700 }}>MAP: 93.3 mmHg (Thoracic Shift +1.8L)</small>
        </div>

        <div style={{ background: '#0b1120', borderRadius: '20px', padding: '20px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Heart Rate Variability (HRV)</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', margin: '8px 0 4px 0' }}>64.2<small style={{ fontSize: '16px', color: '#94a3b8' }}> ms</small></div>
          <small style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>RMSSD Baroreflex Tone Moderate</small>
        </div>

        <div style={{ background: '#0b1120', borderRadius: '20px', padding: '20px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>ChronoPulse Latent Loss</span>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#00f2fe', margin: '8px 0 4px 0' }}>0.042</div>
          <small style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Autoencoder Threshold Stable (&lt;0.08)</small>
        </div>
      </div>
    </div>
  );
};

export default BiometricsView;