import React from 'react';
import { FiActivity } from 'react-icons/fi';
import lungsIcon from '../../../assets/lungs.png';
import boneIcon from '../../../assets/bone.png';
import './HealthStatusCards.css';

const HealthStatusCards = ({ currentCrew }) => {
  const crew = currentCrew || {
    name: 'CDR Elena Rostova',
    vitals: { hr: 71, bp: '120/80', onsd: 5.82, boneLoss: -1.1 }
  };

  return (
    <div className="health-cards-container">
      {/* Mini Vitals Stat Cards */}
      <div className="vitals-row">
        <div className="vital-mini-card">
          <div className="vital-top">
            <span className="vital-badge green">Nominal</span>
            <span className="vital-title">Blood Pressure • {crew.name.split(' ')[1]}</span>
          </div>
          <div className="vital-main">
            <span className="vital-number">{crew.vitals.bp}</span>
            <span className="vital-unit">mmHg</span>
          </div>
          {/* SVG ECG pulse waveform */}
          <svg className="mini-waveform" viewBox="0 0 100 24">
            <path d="M0,12 L20,12 L25,3 L30,21 L35,12 L50,12 L55,7 L60,17 L65,12 L100,12" fill="none" stroke="#00f2fe" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="vital-mini-card">
          <div className="vital-top">
            <span className="vital-badge blue">HRP Telemetry</span>
            <span className="vital-title">Optic Caliper / Resorption</span>
          </div>
          <div className="vital-main">
            <span className="vital-number">{crew.vitals.onsd ? `${crew.vitals.onsd} mm` : `${crew.vitals.boneLoss}%`}</span>
            <span className="vital-unit">{crew.vitals.onsd ? 'ONSD' : 'BMD / mo'}</span>
          </div>
          {/* Smooth spline curve */}
          <svg className="mini-waveform" viewBox="0 0 100 24">
            <path d="M0,16 Q25,6 50,14 T100,8" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="50" cy="14" r="3" fill="#f59e0b"/>
          </svg>
        </div>
      </div>

      {/* Heartrate Activity Card with 3D Organ Accent */}
      <div className="heartrate-card">
        <div className="heartrate-text">
          <span className="card-sub">Microgravity Hemodynamics</span>
          <h4>Resting Heart Rate • {crew.name.split(' ')[1]}</h4>
          <div className="hr-number">
            <strong>{crew.vitals.hr}</strong> <span>bpm</span>
          </div>
          <p className="hr-desc">ChronoPulse baseline: -4 bpm nocturnal drift (expected in 0-G).</p>
        </div>
        <div className="heartrate-icon-wrapper">
          <img src={lungsIcon} alt="Pulmonary & Cardiac" className="heartrate-organ-img" />
        </div>
      </div>

      {/* Organ Systems Status Bars */}
      <div className="organ-status-section">
        <div className="organ-card">
          <div className="organ-card-left">
            <img src={lungsIcon} alt="Lungs" className="organ-mini-icon" />
            <div>
              <span className="organ-name">Pulmonary Gas Diffusion</span>
              <small className="organ-sub">V/Q Ratio: 1.02 • PCO2 2.1 mmHg</small>
            </div>
          </div>
          <div className="organ-progress">
            <div className="progress-bar">
              <div className="progress-fill green" style={{ width: '96%' }}></div>
            </div>
            <span className="progress-val">96%</span>
          </div>
        </div>

        <div className="organ-card">
          <div className="organ-card-left">
            <div className="organ-mini-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 242, 254, 0.1)', borderRadius: '8px', color: '#00f2fe' }}>
              <FiActivity size={18} />
            </div>
            <div>
              <span className="organ-name">Cranial &amp; ICP Stability</span>
              <small className="organ-sub">Optic Sheath: {crew.vitals.onsd || 5.1}mm • ICP {crew.vitals.icp || 14} mmHg</small>
            </div>
          </div>
          <div className="organ-progress">
            <div className="progress-bar">
              <div className="progress-fill yellow" style={{ width: crew.vitals.onsd > 5.5 ? '68%' : '88%' }}></div>
            </div>
            <span className="progress-val">{crew.vitals.onsd > 5.5 ? '68%' : '88%'}</span>
          </div>
        </div>

        <div className="organ-card">
          <div className="organ-card-left">
            <img src={boneIcon} alt="Bone" className="organ-mini-icon" />
            <div>
              <span className="organ-name">Bone Mineral Density</span>
              <small className="organ-sub">Lumbar: {crew.vitals.boneLoss || -1.1}%/mo • ARED Prescribed</small>
            </div>
          </div>
          <div className="organ-progress">
            <div className="progress-bar">
              <div className="progress-fill orange" style={{ width: '84%' }}></div>
            </div>
            <span className="progress-val">84%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthStatusCards;