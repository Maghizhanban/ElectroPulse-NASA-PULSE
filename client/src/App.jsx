import React, { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import StandbyEmblem from './components/StandbyEmblem/StandbyEmblem';
import MedicalFlightDeck from './components/DashboardMainContent/MedicalFlightDeck';
import BiometricsView from './components/Views/BiometricsView';
import CountermeasuresView from './components/Views/CountermeasuresView';
import UltrasoundView from './components/Views/UltrasoundView';
import FlightSurgeonView from './components/Views/FlightSurgeonView';
import './styles/App.css';

const App = () => {
  const [mode, setMode] = useState('STANDBY');
  const [initialQuery, setInitialQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleStandbySubmit = (query) => {
    if (query && query.trim()) {
      setInitialQuery(query.trim());
    }
    setMode('ACTIVE');
  };

  if (mode === 'STANDBY') {
    return <StandbyEmblem onEnterActive={handleStandbySubmit} />;
  }

  return (
    <div className="app-container">
      <Header 
        toggleSidebar={toggleSidebar} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onReturnStandby={() => setMode('STANDBY')}
      />
      <div className="layout-wrapper">
        <Sidebar 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        <main className="main-layout">
          <div className="hud-mode-bar">
            <button
              type="button"
              className="hud-standby-toggle-btn"
              onClick={() => setMode('STANDBY')}
              title="Return to Standby Mode"
            >
              ◀ STANDBY COCKPIT
            </button>
            {initialQuery && (
              <span className="hud-initial-query-pill">
                QUERY: <em>{initialQuery}</em>
              </span>
            )}
          </div>
          {activeTab === 'dashboard' && <MedicalFlightDeck setActiveTab={setActiveTab} initialQuery={initialQuery} />}
          {activeTab === 'biometrics' && <BiometricsView />}
          {activeTab === 'countermeasures' && <CountermeasuresView />}
          {activeTab === 'ultrasound' && <UltrasoundView />}
          {activeTab === 'surgeon' && <FlightSurgeonView />}
        </main>
      </div>
    </div>
  );
};

export default App;
