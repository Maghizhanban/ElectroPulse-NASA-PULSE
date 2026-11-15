import React, { useState, useEffect, useMemo } from 'react';
import * as T from 'three';
import AnatomyScene from './AnatomyScene';
import { SYSTEMS, DEFAULT_VISIBLE, explanation } from './anatomy';
import { sceneBridge } from './sceneBridge';
import { 
  FiSearch, FiRotateCw, FiMaximize2, FiLayers, FiAlertTriangle, 
  FiEye, FiActivity, FiX, FiCheckCircle, FiShield, FiCrosshair 
} from 'react-icons/fi';
import './SomaticAtlasWorkstation.css';

const initialSceneState = {
  explode: 0,
  visible: DEFAULT_VISIBLE,
  selected: [],
  isolate: false,
  view: 'three-quarter',
  rotate: false,
  reset: 0
};

export default function SomaticAtlasWorkstation({ onSelectPart, externalFocusTarget }) {
  const [atlas, setAtlas] = useState(null);
  const [sceneState, setSceneState] = useState(initialSceneState);
  const [xrayActive, setXrayActive] = useState(true);
  const [ghostActive, setGhostActive] = useState(true); // SomatoScan signature tissue ghosting
  const [scannerSweep, setScannerSweep] = useState(true); // SomatoScan scanner plane sweep
  const [scannerHeight, setScannerHeight] = useState(1.25);
  const [crossing, setCrossing] = useState({
    level: 'Upper Thoracic (T1–T5) Cardio-Pulmonary',
    height: 1.25,
    organs: ['Heart', 'Ascending Aorta', 'Superior Vena Cava'],
    total: 24
  });
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [activePreset, setActivePreset] = useState('sans');
  const [targetFocus, setTargetFocus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [systemsOpen, setSystemsOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null);

  // Astronaut Emergency & Flight Clinical Scenarios
  const PRESETS = [
    {
      id: 'sans',
      name: '👁️ SANS Ocular Edema',
      system: 'sensory',
      query: 'optic nerve',
      title: 'Spaceflight-Associated Neuro-ocular Syndrome (SANS)',
      cpg: 'NASA-CPG-2024-SANS-03',
      vitals: 'ONSD: 5.82 mm • Frisén Grade 1 • ICP 19.4 mmHg',
      mechanism: 'Cephalad microgravity fluid redistribution causes retrobulbar subarachnoid hypertension, optic disc swelling, and globe flattening.',
      countermeasure: '45-minute Chibis-M LBNP session (-45 mmHg) + 10° head-up sleep tilt + daily Butterfly iQ+ POCUS tracking.'
    },
    {
      id: 'fluid',
      name: '🫀 Cephalad Venous Shift',
      system: 'cardiac',
      query: 'heart',
      title: 'Cephalad Thoracic Fluid Engorgement',
      cpg: 'NASA-CPG-2023-CARDIO-07',
      vitals: 'Thoracic Fluid: +1.8 L • CVP: 9.4 mmHg • HR: 71 bpm',
      mechanism: 'Loss of hydrostatic gravity gradient pushes ~1.8L of lower extremity venous volume into the thoracic cavity and cranial circulation.',
      countermeasure: 'Saline fluid replenishment protocol pre-EVA + continuous AstroSkin 100 Hz ECG/HRV autonomic monitoring.'
    },
    {
      id: 'spine',
      name: '🦴 Lumbar Bone Loss',
      system: 'skeletal',
      query: 'lumbar',
      title: 'Trabecular Microgravity Demineralization',
      cpg: 'NASA-HRP-BONE-2024',
      vitals: 'Lumbar T-Score: -0.4 • Resorption Rate: 1.4x • Spinal Growth: +4.2 cm',
      mechanism: 'Unweighting eliminates bone strain signals, accelerating osteoclast resorption and vertebral height elongation with EVA suit risks.',
      countermeasure: 'ARED 60min axial heavy resistance (squats & deadlifts at 85% 1RM) + weekly 70mg oral Bisphosphonate.'
    },
    {
      id: 'soleus',
      name: '🦿 Soleus Atrophy',
      system: 'muscular',
      query: 'soleus',
      title: 'Antigravity Postural Muscle Degradation',
      cpg: 'NASA-HRP-EXERCISE-02',
      vitals: 'Soleus Mass: -0.8%/wk • Motor Unit Discharge: -15%',
      mechanism: 'Calf muscle tone rapidly diminishes without 1-G ground reaction forces, risking post-landing orthostatic collapse.',
      countermeasure: 'T2 COLBERT high-cadence interval protocol + eccentric plantarflexion overload on ARED.'
    }
  ];

  // Fetch 3D Atlas Catalogue
  useEffect(() => {
    const abort = new AbortController();
    fetch('/models/atlas.json', { signal: abort.signal })
      .then(res => {
        if (!res.ok) throw new Error('Could not load BodyParts3D catalogue.');
        return res.json();
      })
      .then(data => {
        setAtlas(data);
        // Automatically trigger first preset (SANS)
        applyPreset(PRESETS[0], data);
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => abort.abort();
  }, []);

  // Listen to external focus triggers from JARVIS Guardian
  useEffect(() => {
    if (externalFocusTarget && atlas) {
      const match = PRESETS.find(p => p.id === externalFocusTarget);
      if (match) applyPreset(match, atlas);
    }
  }, [externalFocusTarget, atlas]);

  // Listen to P.U.L.S.E. AI Tutor Scene Commands (SomatoScan Bridge)
  useEffect(() => {
    const unsub = sceneBridge.subscribe(command => {
      if (!command) return;
      if (command.action === 'focus_organ') {
        const q = command.organ_id || command.query;
        if (q && atlas) {
          const match = PRESETS.find(p => p.id === q || p.query.toLowerCase() === q.toLowerCase());
          if (match) {
            applyPreset(match, atlas);
          } else {
            const matched = atlas.concepts.find(c => c.name.toLowerCase().includes(q.toLowerCase()))
              || atlas.parts.find(p => p.name.toLowerCase().includes(q.toLowerCase()));
            if (matched) {
              const elements = matched.elements || [matched.id];
              const box = new T.Box3();
              elements.forEach(id => {
                const p = atlas.parts.find(part => part.id === id);
                if (p) box.union(new T.Box3(new T.Vector3().fromArray(p.bounds[0]), new T.Vector3().fromArray(p.bounds[1])));
              });
              setTargetFocus(!box.isEmpty() ? { box } : null);
              if (!box.isEmpty()) {
                const center = box.getCenter(new T.Vector3());
                setScannerHeight(center.y);
                setScannerSweep(false);
              }
              setSceneState(s => ({ ...s, selected: elements, isolate: false }));
              setGhostActive(true);
            }
          }
        }
      } else if (command.action === 'scan_at_structure') {
        const q = command.organ_id;
        if (q && atlas) {
          const p = atlas.parts.find(part => part.id === q || part.name.toLowerCase().includes(q.toLowerCase()));
          if (p) {
            const box = new T.Box3(new T.Vector3().fromArray(p.bounds[0]), new T.Vector3().fromArray(p.bounds[1]));
            const center = box.getCenter(new T.Vector3());
            setScannerHeight(center.y);
            setScannerSweep(false);
          }
        }
      } else if (command.action === 'set_scanner_sweep') {
        setScannerSweep(!!command.active);
      } else if (command.action === 'set_scanner_height') {
        setScannerHeight(command.height);
        setScannerSweep(false);
      } else if (command.action === 'set_ghost_mode') {
        setGhostActive(!!command.enabled);
      } else if (command.action === 'reset_view') {
        setSceneState(initialSceneState);
        setTargetFocus(null);
        setScannerSweep(true);
        setGhostActive(true);
      }
    });

    return () => unsub();
  }, [atlas]);

  const partsMap = useMemo(() => new Map(atlas?.parts.map(p => [p.id, p])), [atlas]);

  const searchResults = useMemo(() => {
    if (!atlas || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return atlas.concepts
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [atlas, searchQuery]);

  // Apply Somatic Diagnostic Focus & Layer Reveal
  const applyPreset = (preset, currentAtlas = atlas) => {
    if (!currentAtlas) return;
    setActivePreset(preset.id);
    setSelectedConcept(preset);

    // Search matching concept elements in atlas
    const matched = currentAtlas.concepts.find(c => c.name.toLowerCase().includes(preset.query)) 
      || currentAtlas.parts.find(p => p.name.toLowerCase().includes(preset.query) && p.system === preset.system);

    const elements = matched ? (matched.elements || [matched.id]) : [];

    // Calculate 3D bounding box for cinematic camera glide
    const box = new T.Box3();
    elements.forEach(id => {
      const p = currentAtlas.parts.find(part => part.id === id);
      if (p) {
        box.union(new T.Box3(new T.Vector3().fromArray(p.bounds[0]), new T.Vector3().fromArray(p.bounds[1])));
      }
    });

    if (!box.isEmpty()) {
      setTargetFocus({ box });
      const center = box.getCenter(new T.Vector3());
      setScannerHeight(center.y);
      setScannerSweep(false); // Lock scanner gantry onto target organ
    } else {
      setTargetFocus(null);
    }

    setGhostActive(true); // Engage SomatoScan tissue ghosting
    setXrayActive(true); // Engage X-Ray layer reveal
    setSceneState(s => ({
      ...s,
      selected: elements,
      isolate: false,
      rotate: false
    }));
  };

  const handleSelectPart = (id) => {
    const part = partsMap.get(id);
    if (!part) return;
    setSelectedConcept({
      title: part.name,
      vitals: `System: ${part.system.toUpperCase()} • ID: ${part.id}`,
      cpg: 'NASA-STD-3001 ANATOMICAL TELEMETRY',
      mechanism: explanation(part.name, part.system),
      countermeasure: 'Continuous AstroSkin telemetry bus monitoring active.'
    });
    setSceneState(s => ({ ...s, selected: [id], rotate: false }));
    if (onSelectPart) onSelectPart(part);
  };

  const toggleSystem = (sysId) => {
    setSceneState(s => ({
      ...s,
      visible: s.visible.includes(sysId) ? s.visible.filter(x => x !== sysId) : [...s.visible, sysId]
    }));
  };

  return (
    <div className="somatic-atlas-container">
      {/* 3D Scene Background */}
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          state={sceneState}
          xray={xrayActive}
          ghost={ghostActive}
          scannerSweep={scannerSweep}
          scannerHeight={scannerHeight}
          targetFocus={targetFocus}
          onSelect={handleSelectPart}
          onProgress={setProgress}
          onError={setError}
          onCrossingUpdate={setCrossing}
        />
      )}

      {/* SpaceX Flight Deck Top HUD Bar */}
      <div className="atlas-hud-top">
        <div className="hud-left">
          <div className="flight-status-badge">
            <span className="live-orb"></span>
            <span>EXMC 3D HUMAN DIGITAL TWIN • 2,234 BODYPARTS3D MESHES</span>
          </div>
        </div>

        {/* Somatic Action Preset Buttons */}
        <div className="hud-presets">
          {PRESETS.map(p => (
            <button
              key={p.id}
              className={`preset-btn ${activePreset === p.id ? 'active' : ''}`}
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* SomatoScan Ghosting, Scanner, X-Ray & Search Controls */}
        <div className="hud-right">
          <button
            className={`hud-icon-btn ${ghostActive ? 'active-neon' : ''}`}
            onClick={() => setGhostActive(!ghostActive)}
            title="SomatoScan Signature Tissue Ghosting"
          >
            <FiEye />
            <span>GHOST {ghostActive ? 'ON' : 'OFF'}</span>
          </button>

          <button
            className={`hud-icon-btn ${scannerSweep ? 'active-neon' : ''}`}
            onClick={() => setScannerSweep(!scannerSweep)}
            title="Holographic Scanner Plane Sweep"
          >
            <FiActivity />
            <span>SCANNER {scannerSweep ? 'SWEEP' : 'LOCKED'}</span>
          </button>

          <button
            className={`hud-icon-btn ${xrayActive ? 'active-neon' : ''}`}
            onClick={() => setXrayActive(!xrayActive)}
            title="Multi-Layer X-Ray Transparency"
          >
            <FiLayers />
            <span>X-RAY</span>
          </button>

          <button
            className={`hud-icon-btn ${systemsOpen ? 'active-neon' : ''}`}
            onClick={() => setSystemsOpen(!systemsOpen)}
            title="Toggle 15 Anatomical Systems"
          >
            <span>SYSTEMS</span>
          </button>

          <button
            className="hud-icon-btn"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search 3,432 Concepts"
          >
            <FiSearch />
          </button>

          <button
            className={`hud-icon-btn ${sceneState.rotate ? 'active-neon' : ''}`}
            onClick={() => setSceneState(s => ({ ...s, rotate: !s.rotate }))}
            title="Cinematic 360° Orbit"
          >
            <FiRotateCw />
          </button>
        </div>
      </div>

      {/* SomatoScan Real-time Scanner Crossing HUD Readout */}
      <div className="somatoscan-readout">
        <div className="scan-readout-header">
          <div className="scan-radar-indicator">
            <span className="scan-radar-dot"></span>
            <span className="scan-title">SOMATOSCAN GANTRY</span>
          </div>
          <span className="scan-level-tag">{crossing.level}</span>
          <span className="scan-height-tag">{crossing.height.toFixed(2)}m</span>
        </div>
        <div className="scan-readout-body">
          <div className="scan-organs-list">
            {crossing.organs && crossing.organs.length > 0 ? (
              crossing.organs.map((org, i) => (
                <button 
                  key={i} 
                  className="scan-organ-chip" 
                  onClick={() => {
                    applyPreset({
                      id: org,
                      name: org,
                      query: org,
                      title: org,
                      cpg: 'NASA-STD-3001 ANATOMICAL INTERCEPT',
                      vitals: `Gantry slice height: ${crossing.height.toFixed(2)}m`,
                      mechanism: explanation(org, 'general'),
                      countermeasure: 'Real-time AstroSkin telemetry bus monitoring active.'
                    });
                  }}
                >
                  <FiCrosshair className="chip-crosshair" />
                  <span>{org}</span>
                </button>
              ))
            ) : (
              <span className="scan-empty">No macro-structures intersected</span>
            )}
            {crossing.total > crossing.organs.length && (
              <span className="scan-more-count">+{crossing.total - crossing.organs.length} more structures</span>
            )}
          </div>
        </div>
        <div className="scan-controls-mini">
          <span className="mini-label">GANTRY SLICE:</span>
          <input 
            type="range"
            min="0.10"
            max="1.75"
            step="0.01"
            value={scannerHeight}
            onChange={e => {
              const h = parseFloat(e.target.value);
              setScannerHeight(h);
              setScannerSweep(false);
            }}
            className="mini-scanner-slider"
          />
          <button 
            className={`mini-sweep-btn ${scannerSweep ? 'active' : ''}`}
            onClick={() => setScannerSweep(!scannerSweep)}
          >
            {scannerSweep ? 'PAUSE' : 'AUTO SWEEP'}
          </button>
        </div>
      </div>

      {/* Systems Drawer Overlay */}
      {systemsOpen && (
        <div className="systems-drawer-modal">
          <div className="drawer-header">
            <h4>Anatomical Systems Filter</h4>
            <button onClick={() => setSystemsOpen(false)}><FiX /></button>
          </div>
          <div className="systems-grid">
            {SYSTEMS.map(s => {
              const active = sceneState.visible.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`system-pill-toggle ${active ? 'active' : ''}`}
                  onClick={() => toggleSystem(s.id)}
                >
                  <span className="sys-indicator" style={{ background: s.color }}></span>
                  <span className="sys-title">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Concept Search Modal */}
      {searchOpen && (
        <div className="search-drawer-modal">
          <div className="drawer-header">
            <h4>Search 3,432 Anatomical Concepts</h4>
            <button onClick={() => setSearchOpen(false)}><FiX /></button>
          </div>
          <div className="search-input-wrapper">
            <FiSearch className="search-input-icon" />
            <input
              type="text"
              autoFocus
              placeholder="Search bone, muscle, artery, nerve, or organ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="search-results-list">
            {searchResults.map(c => (
              <div
                key={c.id}
                className="search-item"
                onClick={() => {
                  applyPreset({
                    id: c.id,
                    name: c.name,
                    query: c.name,
                    title: c.name,
                    cpg: 'NASA-STD-3001 EXPLORATION CONCEPT',
                    vitals: `${c.elements.length} modeled components`,
                    mechanism: explanation(c.name, 'general'),
                    countermeasure: 'Astronaut physical condition monitoring active.'
                  });
                  setSearchOpen(false);
                }}
              >
                <span className="item-name">{c.name}</span>
                <span className="item-badge">{c.elements.length} parts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Somatic Diagnostic Flyout Drawer */}
      {selectedConcept && (
        <div className="diagnostic-flyout-drawer">
          <div className="flyout-header">
            <div className="flyout-badge">
              <FiAlertTriangle className="alert-icon" />
              <span>{selectedConcept.cpg}</span>
            </div>
            <button className="close-btn" onClick={() => setSelectedConcept(null)}>
              <FiX />
            </button>
          </div>

          <h3 className="flyout-title">{selectedConcept.title}</h3>
          <div className="flyout-vitals">{selectedConcept.vitals}</div>

          <div className="flyout-section">
            <span className="section-label">Microgravity Physiological Mechanism:</span>
            <p className="section-text">{selectedConcept.mechanism}</p>
          </div>

          <div className="flyout-section">
            <span className="section-label">NASA HRP Prescribed Countermeasure:</span>
            <p className="section-text countermeasure-text">{selectedConcept.countermeasure}</p>
          </div>

          <div className="flyout-actions">
            <button
              className="action-btn-primary"
              onClick={() => {
                setSceneState(s => ({ ...s, isolate: !s.isolate }));
              }}
            >
              <FiMaximize2 />
              <span>{sceneState.isolate ? 'Show Surrounding Anatomy' : 'Isolate Structure in 3D'}</span>
            </button>
            <button
              className="action-btn-secondary"
              onClick={() => {
                setSceneState(initialSceneState);
                setTargetFocus(null);
              }}
            >
              Reset View
            </button>
          </div>
        </div>
      )}

      {/* Exploded Anatomy Bottom Slider */}
      <div className="atlas-bottom-controls">
        <div className="explode-box">
          <div className="explode-header">
            <span>3D EXPLODED ANATOMY</span>
            <strong>{Math.round(sceneState.explode * 100)}%</strong>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sceneState.explode * 100}
            onChange={e => {
              const val = parseFloat(e.target.value) / 100;
              setSceneState(s => ({ ...s, explode: val, rotate: false }));
            }}
            className="explode-range"
          />
        </div>
      </div>

      {/* Progress & Loading State */}
      {progress < 100 && !error && (
        <div className="atlas-loading-overlay">
          <div className="loading-card">
            <div className="spinner-ring"></div>
            <h4>Streaming 2,234 3D BodyParts3D Meshes...</h4>
            <div className="progress-bar-track">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span>{progress}% Loaded • NASA Flight Workstation Ready</span>
          </div>
        </div>
      )}

      {error && (
        <div className="atlas-error-overlay">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
