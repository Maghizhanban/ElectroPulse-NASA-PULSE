import React from 'react';
import { FiActivity, FiRotateCw, FiShield } from 'react-icons/fi';
import './UpcomingSchedule.css';

const DEFAULT_COUNTERMEASURES = [
  {
    id: 'ared',
    icon: <FiActivity size={18} color="#00f2fe" />,
    title: 'ARED Heavy Resistance',
    desc: 'Eccentric Squats & Deadlifts (85% 1RM)',
    duration: '45 min',
    status: 'Completed',
    statusType: 'done'
  },
  {
    id: 'cycle',
    icon: <FiRotateCw size={18} color="#00f2fe" />,
    title: 'T2 Cycle Ergometer',
    desc: 'Interval VO2 Max Aerobic Session',
    duration: '30 min',
    status: '14:00 UTC',
    statusType: 'active'
  },
  {
    id: 'lbnp',
    icon: <FiShield size={18} color="#00f2fe" />,
    title: 'Chibis-M LBNP Suit',
    desc: '-45 mmHg Lower Body Fluid Redistribution',
    duration: '45 min',
    status: '18:30 UTC',
    statusType: 'pending'
  }
];

const DEFAULT_MEDICATIONS = [
  {
    tag: 'Fluid Balance',
    drug: 'Fludrocortisone',
    dosage: '0.1 mg • Post-EVA',
    stock: '24 doses rem.'
  },
  {
    tag: 'Bone Density',
    drug: 'Bisphosphonate',
    dosage: '70 mg • Weekly',
    stock: '12 doses rem.'
  },
  {
    tag: 'Circadian',
    drug: 'Melatonin SLM',
    dosage: '0.5 mg • Pre-sleep',
    stock: '45 doses rem.'
  }
];

const UpcomingSchedule = ({ countermeasures, medications }) => {
  const activeCountermeasures = countermeasures || DEFAULT_COUNTERMEASURES;
  const activeMedications = medications || DEFAULT_MEDICATIONS;

  return (
    <div className="upcoming-schedule-wrapper">
      {/* Scheduled Countermeasure Regimens */}
      <div className="section-card">
        <div className="section-header">
          <div>
            <h4>Scheduled Countermeasures</h4>
            <span className="section-sub">NASA HRP 2.5h Daily Protocol</span>
          </div>
          <span className="time-badge">Sol 142</span>
        </div>

        <div className="workout-list">
          {activeCountermeasures.map(item => (
            <div key={item.id} className="workout-item">
              <div className={`workout-icon ${item.id}`}>
                {item.icon}
              </div>
              <div className="workout-info">
                <h5>{item.title}</h5>
                <p>{item.desc}</p>
              </div>
              <div className="workout-meta">
                <span className="workout-duration">{item.duration}</span>
                <span className={`workout-status ${item.statusType}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flight Medical Kit Supplies & Spaceflight Pharmacy */}
      <div className="section-card">
        <div className="section-header">
          <div>
            <h4>Spaceflight Pharmacy &amp; Countermeasures</h4>
            <span className="section-sub">Autonomous Medical Kit (ExMC Tier 4)</span>
          </div>
          <span className="time-badge">Inventory OK</span>
        </div>

        <div className="meds-grid">
          {activeMedications.map((med, idx) => (
            <div key={idx} className="med-box">
              <span className="med-tag">{med.tag}</span>
              <h6>{med.drug}</h6>
              <small>{med.dosage}</small>
              <div className="med-stock">{med.stock}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpcomingSchedule;