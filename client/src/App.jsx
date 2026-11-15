import React, { useState } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import MedicalFlightDeck from './components/DashboardMainContent/MedicalFlightDeck';
import BiometricsView from './components/Views/BiometricsView';
import CountermeasuresView from './components/Views/CountermeasuresView';
import UltrasoundView from './components/Views/UltrasoundView';
import FlightSurgeonView from './components/Views/FlightSurgeonView';
import './styles/App.css';

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="app-container">
      <Header toggleSidebar={toggleSidebar} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="layout-wrapper">
        <Sidebar 
          isOpen={sidebarOpen} 
          toggleSidebar={toggleSidebar} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
        <main className="main-layout">
          {activeTab === 'dashboard' && <MedicalFlightDeck setActiveTab={setActiveTab} />}
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
