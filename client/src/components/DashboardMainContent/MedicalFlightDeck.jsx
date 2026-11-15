import React from 'react';
import DashboardOverview from './DashboardOverview/DashboardOverview';
import CalendarView from './CalendarView/CalendarView';
import UpcomingSchedule from './UpcomingSchedule/UpcomingSchedule';
import ActivityFeed from './ActivityFeed/ActivityFeed';
import './MedicalFlightDeck.css';

const MedicalFlightDeck = () => {
  return (
    <div className="dashboard-main-content">
      <div className="dashboard-grid-layout">
        <div className="dashboard-left">
          <DashboardOverview />
          <ActivityFeed />
        </div>
        <div className="dashboard-right">
          <CalendarView />
          <UpcomingSchedule />
        </div>
      </div>
    </div>
  );
};

export default MedicalFlightDeck;