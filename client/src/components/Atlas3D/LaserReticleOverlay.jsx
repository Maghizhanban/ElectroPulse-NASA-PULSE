import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import './LaserReticleOverlay.css';

const LaserReticleOverlay = ({ targetFocus, camera, rendererDomElement, containerRef }) => {
  const [reticleState, setReticleState] = useState({
    x: 0,
    y: 0,
    visible: false,
    radius: 36,
  });
  const animFrameRef = useRef(null);

  useEffect(() => {
    const updateReticle = () => {
      if (!targetFocus) {
        setReticleState(prev => ({ ...prev, visible: false }));
        return;
      }

      // Determine viewport dimensions
      let width = window.innerWidth;
      let height = window.innerHeight;
      if (rendererDomElement) {
        width = rendererDomElement.clientWidth || width;
        height = rendererDomElement.clientHeight || height;
      } else if (containerRef && containerRef.current) {
        width = containerRef.current.clientWidth || width;
        height = containerRef.current.clientHeight || height;
      }

      // Extract 3D position from targetFocus (box center or center vector)
      let targetPos = new THREE.Vector3(0, 1.25, 0);
      let targetRadius = 36;
      if (targetFocus.box) {
        targetFocus.box.getCenter(targetPos);
        const size = targetFocus.box.getSize(new THREE.Vector3());
        targetRadius = Math.max(24, Math.min(80, size.length() * 150));
      } else if (targetFocus.center) {
        if (Array.isArray(targetFocus.center)) {
          targetPos.fromArray(targetFocus.center);
        } else if (targetFocus.center.isVector3) {
          targetPos.copy(targetFocus.center);
        }
      } else if (targetFocus.isVector3) {
        targetPos.copy(targetFocus);
      }

      // Project 3D coordinates to 2D screen coordinates via Three.js
      let cam = camera;
      if (!cam) {
        cam = new THREE.PerspectiveCamera(34, width / height, 0.005, 100);
        cam.position.set(0.6, 1.1, 3.4);
        cam.lookAt(0, 0.82, 0);
        cam.updateMatrixWorld();
        cam.updateProjectionMatrix();
      }

      const v = targetPos.clone();
      v.project(cam);

      // Backplane culling: check ndc.z < 1.0 (behind camera check)
      const ndcZ = v.z;
      const isVisible = ndcZ < 1.0 && v.x >= -1.5 && v.x <= 1.5 && v.y >= -1.5 && v.y <= 1.5;

      if (!isVisible) {
        setReticleState(prev => ({ ...prev, visible: false }));
        return;
      }

      // Screen space conversion
      const rawX = ((v.x + 1) / 2) * width;
      const rawY = ((-v.y + 1) / 2) * height;

      // Viewport boundary clamping math using Math.max and Math.min
      const padding = 28;
      const clampedX = Math.max(padding, Math.min(width - padding, rawX));
      const clampedY = Math.max(padding, Math.min(height - padding, rawY));

      setReticleState({
        x: clampedX,
        y: clampedY,
        visible: true,
        radius: targetRadius,
        targetName: targetFocus.title || targetFocus.name || 'ORGAN TARGET',
      });
    };

    // Update on animation frames and listen to camera projection changes
    const loop = () => {
      updateReticle();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    // Window resize event listener
    const handleResize = () => {
      updateReticle();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [targetFocus, camera, rendererDomElement, containerRef]);

  if (!reticleState.visible) {
    return null;
  }

  const { x, y, radius, targetName } = reticleState;
  const r = radius || 36;
  const bracketSize = 14;

  return (
    <div className="laser-reticle-overlay-container">
      <svg className="laser-reticle-svg" width="100%" height="100%">
        <defs>
          <radialGradient id="reticle-laser-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dynamic Glowing Laser Leader Line */}
        <line
          x1={x - 60}
          y1={y - 60}
          x2={x - r * 0.7}
          y2={y - r * 0.7}
          className="laser-leader-line"
        />

        {/* Targeting Reticle Center Circles with default circle radius via r= attribute */}
        <circle cx={x} cy={y} r={r} className="reticle-outer-ring" />
        <circle cx={x} cy={y} r={r * 0.35} className="reticle-inner-ring" />
        <circle cx={x} cy={y} r={3} className="reticle-crosshair-center" />

        {/* 4 Precision HUD Corner Brackets */}
        <path
          d={`M ${x - r - 6} ${y - r + bracketSize} L ${x - r - 6} ${y - r - 6} L ${x - r + bracketSize} ${y - r - 6}`}
          className="reticle-bracket"
        />
        <path
          d={`M ${x + r - bracketSize} ${y - r - 6} L ${x + r + 6} ${y - r - 6} L ${x + r + 6} ${y - r + bracketSize}`}
          className="reticle-bracket"
        />
        <path
          d={`M ${x - r - 6} ${y + r - bracketSize} L ${x - r - 6} ${y + r + 6} L ${x - r + bracketSize} ${y + r + 6}`}
          className="reticle-bracket"
        />
        <path
          d={`M ${x + r - bracketSize} ${y + r + 6} L ${x + r + 6} ${y + r + 6} L ${x + r + 6} ${y + r - bracketSize}`}
          className="reticle-bracket"
        />

        {/* Monospace HUD Telemetry Callout */}
        <text x={x + r + 14} y={y - 8} className="reticle-telemetry-title">
          {`[LOCK: ${targetName.toUpperCase()}]`}
        </text>
        <text x={x + r + 14} y={y + 10} className="reticle-telemetry-meta">
          3D RETICLE MACRO TRACKING // NOMINAL
        </text>
      </svg>
    </div>
  );
};

export default LaserReticleOverlay;
