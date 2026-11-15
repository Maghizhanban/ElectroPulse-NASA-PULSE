/**
 * SomatoScanEngine.js
 * High-Performance 3D Anatomical Spatial Mapping & Volumetric Lesion Engine.
 * 
 * Directly queries the 2,234 BodyParts3D meshes, calculating exact bounding
 * centers (x, y, z), optimal camera focal angles, and depth-slice X-Ray masks.
 */

import adaptedTargets from './adapted_somatoscan_targets.json' with { type: 'json' };

export class SomatoScanEngine {
  constructor(atlas) {
    this.atlas = atlas;
    this.partsMap = new Map();
    this.conceptsMap = new Map();
    this.adaptedTargets = adaptedTargets || {};

    if (atlas && atlas.parts) {
      atlas.parts.forEach((p, idx) => {
        this.partsMap.set(p.id, { ...p, index: idx });
      });
    }

    if (atlas && atlas.concepts) {
      atlas.concepts.forEach(c => {
        this.conceptsMap.set(c.id, c);
        this.conceptsMap.set(c.name.toLowerCase(), c);
      });
    }
  }

  setAtlas(atlas) {
    this.atlas = atlas;
    this.partsMap.clear();
    this.conceptsMap.clear();

    atlas.parts.forEach((p, idx) => {
      this.partsMap.set(p.id, { ...p, index: idx });
    });

    atlas.concepts.forEach(c => {
      this.conceptsMap.set(c.id, c);
      this.conceptsMap.set(c.name.toLowerCase(), c);
    });
  }

  /**
   * Performs spatial volumetric resolution for any anatomical target query.
   * @param {string} query - e.g. "optic nerve", "lumbar", "heart", "soleus"
   * @returns {Object} Spatial focus coordinates, bounding box, and X-Ray layers
   */
  resolveSpatialFocus(query) {
    if (!this.atlas) return null;
    let q = (query || '').toLowerCase().trim();

    // Adaptive mapping: if query is radiation/cosmic ray hazard, redirect to learned CNS/cardiac structures
    if (q.includes('radiation') || q.includes('solar') || q.includes('gcr') || q.includes('spe')) {
      q = 'brain';
    }

    // 1. Search concepts first
    let matchedElements = [];
    let matchedName = '';
    let matchedSystem = 'muscular';

    for (const [key, concept] of this.conceptsMap.entries()) {
      if (key.includes(q)) {
        matchedElements = concept.elements || [];
        matchedName = concept.name;
        break;
      }
    }

    // 2. Fallback to direct part name search
    if (matchedElements.length === 0) {
      for (const p of this.atlas.parts) {
        if (p.name.toLowerCase().includes(q)) {
          matchedElements.push(p.id);
          matchedName = p.name;
          matchedSystem = p.system;
          if (matchedElements.length >= 12) break;
        }
      }
    }

    if (matchedElements.length === 0) return null;

    // 3. Calculate 3D Bounding Box across all matched meshes
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    matchedElements.forEach(id => {
      const p = this.partsMap.get(id);
      if (p && p.bounds) {
        minX = Math.min(minX, p.bounds[0][0]);
        minY = Math.min(minY, p.bounds[0][1]);
        minZ = Math.min(minZ, p.bounds[0][2]);

        maxX = Math.max(maxX, p.bounds[1][0]);
        maxY = Math.max(maxY, p.bounds[1][1]);
        maxZ = Math.max(maxZ, p.bounds[1][2]);
        matchedSystem = p.system;
      }
    });

    const centerX = +((minX + maxX) / 2.0).toFixed(4);
    const centerY = +((minY + maxY) / 2.0).toFixed(4);
    const centerZ = +((minZ + maxZ) / 2.0).toFixed(4);

    const sizeX = maxX - minX;
    const sizeY = maxY - minY;
    const sizeZ = maxZ - minZ;
    const maxDimension = Math.max(0.04, sizeX, sizeY, sizeZ);

    // Camera distance proportional to structure bounding sphere
    const cameraDistance = +(Math.max(0.25, maxDimension * 2.8)).toFixed(3);

    // 4. Generate SomatoScan X-Ray System Opacity Mask
    // Outer systems (integumentary/skin and muscular) are dissolved into translucent silhouettes
    // while the target internal system (sensory, skeletal, cardiac, arterial) remains solid with alert highlight
    const systemOpacities = {
      integumentary: 0.08,
      muscular: matchedSystem === 'muscular' ? 0.95 : 0.15,
      skeletal: matchedSystem === 'skeletal' ? 1.0 : 0.45,
      sensory: matchedSystem === 'sensory' ? 1.0 : 0.6,
      cardiac: matchedSystem === 'cardiac' ? 1.0 : 0.5,
      arterial: matchedSystem === 'arterial' ? 1.0 : 0.4,
      venous: matchedSystem === 'venous' ? 1.0 : 0.4,
      nervous: matchedSystem === 'nervous' ? 1.0 : 0.5,
      respiratory: matchedSystem === 'respiratory' ? 1.0 : 0.4
    };

    return {
      query: q,
      structureName: matchedName,
      system: matchedSystem,
      elementsCount: matchedElements.length,
      elements: matchedElements,
      center: [centerX, centerY, centerZ],
      dimensions: [sizeX, sizeY, sizeZ],
      cameraDistance,
      optimalCameraPosition: [
        +(centerX + 0.15).toFixed(4),
        +(centerY + 0.08).toFixed(4),
        +(centerZ + cameraDistance).toFixed(4)
      ],
      systemOpacities,
      diagnosticColor: matchedSystem === 'sensory' ? '#f59e0b' : matchedSystem === 'skeletal' ? '#ef4444' : '#00f2fe'
    };
  }
}
