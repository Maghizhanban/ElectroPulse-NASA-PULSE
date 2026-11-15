import React, { useState, useEffect, useRef } from 'react';
import { 
  simulatePharmacokinetics, 
  SPACEFLIGHT_DRUG_CATALOGUE 
} from '../../engines/PharmacoSimEngine';
import { FiActivity, FiX, FiPlay, FiSliders, FiCheckCircle } from 'react-icons/fi';
import './PharmacoSimDrawer.css';

export default function PharmacoSimDrawer({ 
  initialDrug = 'acetazolamide', 
  onClose, 
  onFocusOrgan 
}) {
  const [selectedDrug, setSelectedDrug] = useState(initialDrug);
  const [doseMg, setDoseMg] = useState(SPACEFLIGHT_DRUG_CATALOGUE[initialDrug]?.defaultDoseMg || 250);
  const [simData, setSimData] = useState(null);
  const canvasRef = useRef(null);

  // Re-run pure RK4 ODE solver whenever drug or dose changes
  useEffect(() => {
    const results = simulatePharmacokinetics(selectedDrug, doseMg, 72, 0.25);
    setSimData(results);
    if (onFocusOrgan && results.targetConceptQuery) {
      onFocusOrgan(results.targetConceptQuery);
    }
  }, [selectedDrug, doseMg]);

  // Animate dynamic 2-compartment pharmacokinetic curve on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simData) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth;
    const height = canvas.height = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 30, bottom: 30, left: 45 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const maxConc = Math.max(0.1, ...simData.plasmaConcentrations) * 1.15;
    const totalHours = 72;

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let h = 0; h <= totalHours; h += 12) {
      const x = padding.left + (h / totalHours) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(`${h}h`, x - 8, height - padding.bottom + 16);
    }

    // Shaded Therapeutic Window Band
    const therapeuticTopY = padding.top + (1 - (simData.cMax * 0.8) / maxConc) * plotH;
    const therapeuticBottomY = padding.top + (1 - (simData.cMax * 0.3) / maxConc) * plotH;
    ctx.fillStyle = 'rgba(0, 242, 254, 0.06)';
    ctx.fillRect(padding.left, therapeuticTopY, plotW, therapeuticBottomY - therapeuticTopY);

    // Plot Plasma Concentration Curve C1(t)
    ctx.beginPath();
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;

    simData.timePoints.forEach((t, i) => {
      const x = padding.left + (t / totalHours) * plotW;
      const c = simData.plasmaConcentrations[i];
      const y = padding.top + (1 - c / maxConc) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Plot Tissue Concentration Curve C2(t) (Secondary Compartment)
    ctx.beginPath();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 4]);

    simData.timePoints.forEach((t, i) => {
      const x = padding.left + (t / totalHours) * plotW;
      const c = simData.tissueConcentrations[i];
      const y = padding.top + (1 - c / maxConc) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw CMax Peak Marker
    const peakX = padding.left + (simData.tMaxHours / totalHours) * plotW;
    const peakY = padding.top + (1 - simData.cMax / maxConc) * plotH;
    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Cmax: ${simData.cMax} mg/L (Tmax: ${simData.tMaxHours}h)`, peakX + 8, peakY - 6);

  }, [simData]);

  if (!simData) return null;

  return (
    <div className="pharmacosim-drawer-overlay">
      <div className="pharmacosim-drawer-card">
        {/* Header */}
        <div className="drawer-header-row">
          <div className="drawer-title-group">
            <span className="sim-badge">RUNGE-KUTTA 4TH ORDER PK/PD SOLVER</span>
            <h3>Spaceflight Drug Remedy Simulation</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose}><FiX /></button>
        </div>

        {/* Compound Selector Tabs */}
        <div className="drug-tabs-row">
          {Object.entries(SPACEFLIGHT_DRUG_CATALOGUE).map(([key, d]) => (
            <button
              key={key}
              className={`drug-tab-btn ${selectedDrug === key ? 'active' : ''}`}
              onClick={() => {
                setSelectedDrug(key);
                setDoseMg(d.defaultDoseMg);
              }}
            >
              {d.name}
            </button>
          ))}
        </div>

        {/* Real-time Dose Adjustment Slider */}
        <div className="dose-control-card">
          <div className="dose-label-group">
            <span>Administered Dose: <strong>{doseMg} {simData.unit}</strong></span>
            <small>Oral Administration • Bioavailability: 90%</small>
          </div>
          <input
            type="range"
            min={simData.unit === 'mg' && doseMg < 1 ? 0.05 : 25}
            max={simData.unit === 'mg' && doseMg < 1 ? 0.3 : 500}
            step={simData.unit === 'mg' && doseMg < 1 ? 0.02 : 25}
            value={doseMg}
            onChange={(e) => setDoseMg(parseFloat(e.target.value))}
            className="dose-slider"
          />
        </div>

        {/* Dynamic Canvas Pharmacokinetic Curve */}
        <div className="canvas-wrapper-box">
          <div className="canvas-legend">
            <span><span className="dot cyan"></span> Central Plasma Concentration (C1)</span>
            <span><span className="dot amber"></span> Tissue Distribution (C2)</span>
            <span><span className="band"></span> Therapeutic Range</span>
          </div>
          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Live Mathematical Outcome & Organ Recovery Projection */}
        <div className="recovery-metrics-grid">
          <div className="metric-box">
            <span className="m-label">Peak Concentration (Cmax)</span>
            <span className="m-val">{simData.cMax} <small>mg/L</small></span>
          </div>
          <div className="metric-box">
            <span className="m-label">Time to Peak (Tmax)</span>
            <span className="m-val">{simData.tMaxHours} <small>hours</small></span>
          </div>
          <div className="metric-box highlight">
            <span className="m-label">Projected {simData.targetParam}</span>
            <span className="m-val">
              {simData.baselineValue} &rarr; <strong>{simData.projectedFinalValue}</strong>
            </span>
          </div>
          <div className="metric-box">
            <span className="m-label">Max Therapeutic Effect</span>
            <span className="m-val">{simData.maxEffectPct}% <small>Relief</small></span>
          </div>
        </div>

        {/* Action Button */}
        <div className="drawer-footer-actions">
          <button 
            className="confirm-prescription-btn"
            onClick={() => {
              if (onClose) onClose();
            }}
          >
            <FiCheckCircle />
            <span>Confirm &amp; Log NASA CPG Countermeasure Prescription</span>
          </button>
        </div>
      </div>
    </div>
  );
}
