import React, { useState } from 'react';
import './CalendarView.css';

const DEFAULT_FLIGHT_SCHEDULE = [
  { day: 'Sol 136', date: 136, times: ['08:00', '13:00'], task: 'ChronoPulse Baseline Sync', description: 'Multivariate physiological circadian drift recalibration' },
  { day: 'Sol 137', date: 137, times: ['09:00', '15:30'], task: 'POCUS Ultrasound SANS Caliper', description: 'Optic Nerve Sheath Diameter morphometry (NASA SANS Protocol)' },
  { day: 'Sol 138', date: 138, times: ['10:00', '16:00'], task: 'ARED 60min Heavy Resistance', description: 'High-load axial skeletal compression for bone mineral retention' },
  { day: 'Sol 139', date: 139, times: ['11:00'], task: 'Chibis LBNP Fluid Redistribution', description: '-45 mmHg Lower Body Negative Pressure cephalad fluid mitigation' },
  { day: 'Sol 140', date: 140, times: ['09:30', '14:00'], task: 'CSA CANS Dosimetry Sync', description: 'Active silicon secondary neutron spectrometry logging' },
  { day: 'Sol 141', date: 141, times: ['10:30'], task: 'NeuroType PVT Psychomotor Check', description: 'High-frequency psychomotor vigilance and fatigue assessment' },
  { day: 'Sol 142', date: 142, times: ['09:00', '17:00'], active: true, task: 'Flight Surgeon Multi-Agent Swarm', description: 'Triple-redundancy autonomous ExMC medical consensus audit' },
];

const CalendarView = ({ scheduleDays }) => {
  const days = scheduleDays || DEFAULT_FLIGHT_SCHEDULE;
  const [activeDay, setActiveDay] = useState(142);
  const activeItem = days.find(d => d.date === activeDay) || days[days.length - 1];

  return (
    <div className="calendar-view-card">
      <div className="calendar-card-header">
        <div>
          <h4>Mission Timeline • Sol 142</h4>
          <span className="cal-sub">Flight Medical Ops Schedule (UTC)</span>
        </div>
        <div className="calendar-pills">
          <span className="sol-badge">Mars Orbit 2026</span>
        </div>
      </div>

      <div className="calendar-week-strip">
        {days.map((item) => (
          <div 
            key={item.date} 
            className={`calendar-day-item ${activeDay === item.date ? 'active' : ''}`}
            onClick={() => setActiveDay(item.date)}
          >
            <span className="day-name">{item.day}</span>
            <span className="day-number">{item.date}</span>
            <div className="day-indicator-dot"></div>
          </div>
        ))}
      </div>

      <div className="active-session-banner">
        <div className="session-left">
          <span className="session-time">{activeItem.day} • {activeItem.times[0]} UTC</span>
          <h5>{activeItem.task}</h5>
          <p>{activeItem.description}</p>
        </div>
        <button className="telemetry-btn">Launch Stream</button>
      </div>
    </div>
  );
};

export default CalendarView;