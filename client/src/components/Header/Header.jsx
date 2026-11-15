import React from 'react';
import { FiRadio, FiZap } from 'react-icons/fi';
import avatar from '../../assets/avatar.png';
import './Header.css';

const Header = ({ activeTab, setActiveTab }) => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-section cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="logo-mark"><FiZap className="pulse-icon" /></div>
          <div className="logo-text">
            <span className="brand-name">Electro<strong>Pulse</strong></span>
            <span className="brand-sub">NASA ExMC Station</span>
          </div>
        </div>

        {/* Center Mission Navigation Bar */}
        <nav className="header-nav-pills">
          <button 
            className={`nav-pill-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Overview
          </button>
          <button 
            className={`nav-pill-btn ${activeTab === 'biometrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('biometrics')}
          >
            Biometrics
          </button>
          <button 
            className={`nav-pill-btn ${activeTab === 'countermeasures' ? 'active' : ''}`}
            onClick={() => setActiveTab('countermeasures')}
          >
            Countermeasures
          </button>
          <button 
            className={`nav-pill-btn ${activeTab === 'ultrasound' ? 'active' : ''}`}
            onClick={() => setActiveTab('ultrasound')}
          >
            Ultrasound / SANS
          </button>
          <button 
            className={`nav-pill-btn ${activeTab === 'surgeon' ? 'active' : ''}`}
            onClick={() => setActiveTab('surgeon')}
          >
            Flight Surgeon SLM
          </button>
        </nav>
      </div>

      <div className="header-right">
        <div className="mars-latency-badge">
          <FiRadio className="radio-icon" />
          <span>MARS LATENCY: <strong>21m 44s</strong> (Autonomous Mode)</span>
        </div>

        <div className="profile-badge">
          <img src={avatar} alt="CDR Elena Rostova" className="profile-avatar" />
          <div className="profile-details">
            <span className="profile-name">CDR Elena Rostova, MD</span>
            <small className="profile-role">Mission Commander • Sol 142</small>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;