import React from 'react';
import './ActivityFeed.css';

const DEFAULT_SOL_SERIES = [
  { day: 'Sol 136', pvt: 92, ared: 85, hr: 68 },
  { day: 'Sol 137', pvt: 88, ared: 90, hr: 71 },
  { day: 'Sol 138', pvt: 95, ared: 70, hr: 69 },
  { day: 'Sol 139', pvt: 82, ared: 88, hr: 74 },
  { day: 'Sol 140', pvt: 90, ared: 92, hr: 70 },
  { day: 'Sol 141', pvt: 94, ared: 65, hr: 67 },
  { day: 'Sol 142', pvt: 91, ared: 80, hr: 70 },
];

const ActivityFeed = ({ telemetryHistory, seriesData }) => {
  const weekData = seriesData || (telemetryHistory && telemetryHistory.length >= 7
    ? telemetryHistory.slice(-7).map((t, idx) => ({
        day: `Sol ${t.mission_day || (136 + idx)}`,
        pvt: Math.round(Math.min(100, Math.max(0, (t.entropy || 0.8) * 115))),
        ared: Math.round(Math.min(100, Math.max(0, (t.hr ? (100 - (t.hr - 60) * 1.2) : 80)))),
        hr: Math.round(t.hr || 70)
      }))
    : DEFAULT_SOL_SERIES);

  return (
    <div className="activity-feed-card">
      <div className="activity-header">
        <div>
          <h4>Crew Physical &amp; Cognitive Workload</h4>
          <span className="activity-sub">AstroSkin 7-Day Physiological Trends (Sol 136 - 142)</span>
        </div>
        <div className="legend-pills">
          <span className="legend-item"><span className="dot blue"></span> ARED Resistance</span>
          <span className="legend-item"><span className="dot green"></span> PVT Cognition</span>
        </div>
      </div>

      <div className="chart-wrapper">
        {weekData.map((d) => (
          <div key={d.day} className="chart-col">
            <div className="bar-pair">
              <div 
                className="activity-bar ared" 
                style={{ height: `${(d.ared / 100) * 110}px` }}
                title={`ARED Load: ${d.ared}%`}
              ></div>
              <div 
                className="activity-bar pvt" 
                style={{ height: `${(d.pvt / 100) * 110}px` }}
                title={`PVT Cognition: ${d.pvt}%`}
              ></div>
            </div>
            <span className="day-label">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;