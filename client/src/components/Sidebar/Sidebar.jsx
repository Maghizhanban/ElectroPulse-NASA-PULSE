import React from 'react';
import {
  FiGrid, FiActivity, FiZap, FiEye, FiMessageSquare,
  FiShield, FiSettings, FiX
} from 'react-icons/fi';
import './Sidebar.css';

const navItems = [
  {
    heading: 'Mission Medical',
    items: [
      { id: 'dashboard', icon: <FiGrid />, label: 'Dashboard' },
      { id: 'biometrics', icon: <FiActivity />, label: 'Biometrics' },
      { id: 'countermeasures', icon: <FiZap />, label: 'Countermeasures' },
      { id: 'ultrasound', icon: <FiEye />, label: 'Ultrasound / SANS' },
    ],
  },
  {
    heading: 'Autonomous AI',
    items: [
      { id: 'surgeon', icon: <FiMessageSquare />, label: 'AI Flight Surgeon' },
    ],
  },
  {
    heading: 'ECLSS & Hazards',
    items: [
      { id: 'dashboard', icon: <FiShield />, label: '5 NASA Hazards' },
    ],
  },
];

const Sidebar = ({ isOpen, toggleSidebar, activeTab, setActiveTab }) => {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <FiX className="close-icon" onClick={toggleSidebar} />
      </div>
      <nav className="nav-items">
        {navItems.map((navItem, navIndex) => (
          <div className="nav-items" key={navIndex}>
            <h4 className="nav-heading">{navItem.heading}</h4>
            {navItem.items.map((item, itemIndex) => (
              <div 
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`} 
                key={itemIndex}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isOpen) toggleSidebar();
                }}
                style={{
                  cursor: 'pointer',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '4px',
                  fontWeight: activeTab === item.id ? 700 : 500,
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="sidebar-icons">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
