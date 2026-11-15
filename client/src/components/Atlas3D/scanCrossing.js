/**
 * Real-time Scanner Crossing & Vertebral Level Calculator
 * SomatoScan scanCrossing & vertebralLevel calculator
 * Computes anatomical structures and spinal levels intersected by the scanning plane.
 */

export function getVertebralLevel(y) {
  if (y >= 1.62) return 'Cranium & Ocular (SANS Focal Zone)';
  if (y >= 1.50) return 'Cervical Spine (C1–C7) Carotid Axis';
  if (y >= 1.30) return 'Upper Thoracic (T1–T5) Cardio-Pulmonary';
  if (y >= 1.10) return 'Mid Thoracic (T6–T9) Splanchnic Bed';
  if (y >= 0.95) return 'Lower Thoracic (T10–T12) Hepatorenal';
  if (y >= 0.82) return 'Lumbar Spine (L1–L5) Bone Density Node';
  if (y >= 0.70) return 'Pelvic Girdle & Femoral Head';
  if (y >= 0.40) return 'Femoral Diaphysis & Quadriceps';
  if (y >= 0.12) return 'Tibiofibular & Soleus Posture Complex';
  return 'Pedal & Plantar Distal Extremities';
}

/**
 * Computes which anatomical parts intersect height `y`
 * @param {Array} parts Atlas parts with bounds: [[minX, minY, minZ], [maxX, maxY, maxZ]]
 * @param {number} y Current scanner height in meters
 * @param {number} limit Maximum top organs to name
 * @returns {Object} Crossing info with organ names, total count, and level
 */
export function computeCrossing(parts, y, limit = 5) {
  if (!parts || !parts.length) {
    return { level: getVertebralLevel(y), organs: [], total: 0 };
  }

  const hits = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const b = p.bounds;
    if (!b || !b[0] || !b[1]) continue;

    const minY = b[0][1];
    const maxY = b[1][1];

    if (y >= minY && y <= maxY) {
      const dx = Math.abs(b[1][0] - b[0][0]);
      const dy = Math.abs(b[1][1] - b[0][1]);
      const dz = Math.abs(b[1][2] - b[0][2]);
      const volume = dx * dy * dz;

      hits.push({
        id: p.id,
        name: p.name,
        system: p.system,
        volume
      });
    }
  }

  // Sort descending by volume: biggest organs first
  hits.sort((a, b) => b.volume - a.volume);

  const topOrgans = hits.slice(0, limit).map(h => h.name);
  return {
    level: getVertebralLevel(y),
    height: y,
    organs: topOrgans,
    total: hits.length
  };
}
