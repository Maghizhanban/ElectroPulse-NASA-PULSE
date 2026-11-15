/**
 * P.U.L.S.E. - SomatoScan 3D AI Scene Command Bridge
 * Connects the Universal Medical Brain, OpenJarvis agent, and Jarvis Guardian
 * directly to the 3D SomatoScan Atlas viewport.
 * 
 * Supports typed scene commands for SomatoScan:
 * - focus_organ: Cinematic glide and zoom to organ bounding box
 * - scan_at_structure: Moves holographic scanner ring to structure height
 * - set_scanner_sweep: Toggles automatic up/down body scanning
 * - set_scanner_height: Sets manual axial plane slice height
 * - set_ghost_mode: Ghosts surrounding non-target tissue (holographic cyan)
 * - apply_pathology_overlay: Activates localized pathology warning pulse
 * - reset_view: Re-centers full astronaut viewport
 */

class SceneBridge {
  constructor() {
    this.listeners = new Set();
    this.currentCrossing = {
      level: 'Thoracic (T4)',
      height: 1.25,
      organs: [],
      total: 0
    };
    this.ghostMode = true;
    this.scannerActive = true;
    this.scannerHeight = 1.25;
  }

  /**
   * Subscribe to scene commands from P.U.L.S.E. AI Tutor
   * @param {Function} callback 
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Dispatch a typed scene command to the 3D viewport
   * @param {Object} command 
   */
  dispatch(command) {
    if (command.action === 'set_ghost_mode') {
      this.ghostMode = !!command.enabled;
    }
    if (command.action === 'set_scanner_sweep') {
      this.scannerActive = !!command.active;
    }
    if (command.action === 'set_scanner_height') {
      this.scannerHeight = command.height;
    }

    this.listeners.forEach(fn => {
      try {
        fn(command);
      } catch (err) {
        console.error('[SceneBridge] Error executing scene command:', err);
      }
    });
  }

  /**
   * Update real-time crossing data from 3D scene to HUD
   */
  updateCrossing(crossing) {
    this.currentCrossing = crossing;
  }

  getCrossing() {
    return this.currentCrossing;
  }
}

export const sceneBridge = new SceneBridge();
