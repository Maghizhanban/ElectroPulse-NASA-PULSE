import React, { useState } from 'react';
import SomaticAtlasWorkstation from '../../Atlas3D/SomaticAtlasWorkstation';
import HealthStatusCards from '../HealthStatusCards/HealthStatusCards';
import JarvisGuardian, { CREW_MEMBERS } from '../../JarvisGuardian/JarvisGuardian';
import './DashboardOverview.css';

const DashboardOverview = () => {
  const [selectedCrew, setSelectedCrew] = useState(CREW_MEMBERS[0]);
  const [atlasFocusTarget, setAtlasFocusTarget] = useState(null);

  const handleOrganFocus = (target) => {
    setAtlasFocusTarget(target);
  };

  return (
    <div className="overview-container">
      {/* P.U.L.S.E. Proactive Autonomous Medical Guardian */}
      <JarvisGuardian 
        currentCrew={selectedCrew}
        onSelectCrew={setSelectedCrew}
        onTriggerOrganFocus={handleOrganFocus}
      />

      {/* Main 3D Human Body Digital Twin - NASA Flight-Grade SomatoScan Workstation */}
      <div className="dashboard-atlas-main-wrapper">
        <SomaticAtlasWorkstation 
          externalFocusTarget={atlasFocusTarget} 
        />
      </div>

      {/* Sensor HUD & Telemetry Cards */}
      <div className="dashboard-secondary-grid">
        <HealthStatusCards currentCrew={selectedCrew} />
      </div>
    </div>
  );
};

export default DashboardOverview;