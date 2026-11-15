import React, { useState } from 'react';
import './StandbyEmblem.css';
import { FiSearch, FiActivity, FiShield, FiCpu } from 'react-icons/fi';

const CREW_QUICK_SELECT = [
  { id: 'elena', name: 'Dr. Elena Rostova', role: 'Chief Medical Officer / EVA-1', avatar: '👩‍🚀', status: 'SANS Risk Alert' },
  { id: 'marcus', name: 'Dr. Marcus Chen', role: 'SCIENCE OFFICER', avatar: '👨‍🚀', status: 'Nominal' },
  { id: 'sarah', name: 'CDR Sarah Vance', role: 'FLIGHT ENGINEER', avatar: '👩‍🔬', status: 'Post-EVA Recovery' },
  { id: 'david', name: 'Dr. David Thorne', role: 'Payload Specialist', avatar: '👨‍🔬', status: 'Circadian Desync' },
];

const StandbyEmblem = ({ onEnterActive }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!query || query.trim().length === 0) {
      return; // Whitespace-only stays in Standby
    }
    if (onEnterActive) {
      onEnterActive(query.trim());
    }
  };

  const handleCrewSelect = (crew) => {
    if (onEnterActive) {
      onEnterActive(`Inspect biometric and somatic status for ${crew.name}`);
    }
  };

  const handleCoreClick = () => {
    if (onEnterActive) {
      onEnterActive();
    }
  };

  return (
    <div className="standby-viewport">
      <div className="standby-ambient-grid" />
      <div className="standby-stars" />

      {/* Top Telemetry Header */}
      <div className="standby-topbar">
        <div className="standby-brand">
          <span className="brand-dot" />
          <span className="brand-title">P.U.L.S.E.</span>
          <span className="brand-subtitle">EXMC STD-3001 STANDBY COCKPIT</span>
        </div>
        <div className="standby-telemetry">
          <span className="status-pill"><FiCpu className="icon-pulse" /> CORE AUTONOMOUS: ONLINE</span>
          <span className="status-pill"><FiShield /> LEVEL IV BIOMEDICAL SHIELD</span>
        </div>
      </div>

      {/* Central Quantum Arc Core */}
      <div className="standby-center">
        <div
          className="quantum-arc-core"
          onClick={handleCoreClick}
          role="button"
          tabIndex={0}
          title="Click to initialize Active Flight Deck"
        >
          {/* Ring 1 - Outer Photonic Calibration Ring */}
          <svg className="arc-ring ring-outer" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="185" className="ring-base" />
            <circle cx="200" cy="200" r="185" className="ring-ticks-outer" strokeDasharray="3, 14" />
            <circle cx="200" cy="200" r="175" className="ring-accent-outer" strokeDasharray="60 30 15 30 90 40" />
          </svg>

          {/* Ring 2 - Mid Telemetry Sector Ring */}
          <svg className="arc-ring ring-mid" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="140" className="ring-base-mid" />
            <circle cx="200" cy="200" r="140" className="ring-ticks-mid" strokeDasharray="4, 22" />
            <circle cx="200" cy="200" r="130" className="ring-accent-mid" strokeDasharray="40 25 80 15 110 30" />
          </svg>

          {/* Ring 3 - Inner Photonic Harmonic Ring */}
          <svg className="arc-ring ring-inner" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="95" className="ring-base-inner" />
            <circle cx="200" cy="200" r="95" className="ring-ticks-inner" strokeDasharray="2, 10" />
            <circle cx="200" cy="200" r="88" className="ring-accent-inner" strokeDasharray="20 40 70 20" />
          </svg>

          {/* Central Pulsating Plasma Core */}
          <div className="plasma-core">
            <div className="plasma-glow-outer" />
            <div className="plasma-glow-inner" />
            <div className="plasma-nucleus">
              <FiActivity className="plasma-symbol" />
            </div>
            <div className="plasma-flare" />
          </div>

          <div className="core-click-prompt">
            <span className="prompt-text">ENGAGE SYSTEM</span>
          </div>
        </div>

        {/* Natural Language Command Prompt */}
        <div className="standby-command-box">
          <form className="standby-input-wrapper" onSubmit={handleSubmit}>
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="standby-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask P.U.L.S.E. or select an astronaut to inspect somatic telemetry..."
            />
            <button
              type="submit"
              className="standby-submit-btn"
              disabled={!query || query.trim().length === 0}
            >
              INITIALIZE
            </button>
          </form>

          {/* Quick Select Astronaut Telemetry Chips */}
          <div className="standby-crew-chips">
            <span className="chips-label">ASTRONAUT TELEMETRY:</span>
            {CREW_QUICK_SELECT.map((crew) => (
              <button
                key={crew.id}
                type="button"
                className="crew-chip"
                onClick={() => handleCrewSelect(crew)}
              >
                <span className="crew-avatar">{crew.avatar}</span>
                <span className="crew-name">{crew.name}</span>
                <span className={`crew-status-dot ${crew.id === 'elena' ? 'alert' : 'nominal'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Standby Footer */}
      <div className="standby-footer">
        <span className="footer-left">DEEP SPACE HABITAT // EXMC LEVEL IV // STD-3001 REV C</span>
        <span className="footer-right">NASA SPACE APPS CHALLENGE // ELECTROPULSE OS</span>
      </div>
    </div>
  );
};

export default StandbyEmblem;
