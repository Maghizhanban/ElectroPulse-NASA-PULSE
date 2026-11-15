import React, { useEffect, useRef } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createExplosionLayout } from './explosionLayout';
import { decodeModelResponse } from './modelDownload';
import { PointerTap } from './pointerTap';
import { SYSTEMS } from './anatomy';
import { computeCrossing } from './scanCrossing';

export default function AnatomyScene({
  atlas,
  state,
  xray = false,
  ghost = true,
  scannerSweep = true,
  scannerHeight = 1.25,
  targetFocus = null,
  onSelect,
  onProgress,
  onError,
  onCrossingUpdate
}) {
  const host = useRef(null);
  const latest = useRef({ state, xray, ghost, scannerSweep, scannerHeight, targetFocus, onCrossingUpdate });
  const select = useRef(onSelect);

  latest.current = { state, xray, ghost, scannerSweep, scannerHeight, targetFocus, onCrossingUpdate };
  select.current = onSelect;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let disposed = false;
    let frame = 0;
    let dirty = true;
    let ready = false;
    let lastView = '';
    let lastReset = -1;
    let lastIsolate = '';
    let layoutKey = '';
    let amount = 0;
    let lastState = null;
    const abort = new AbortController();

    let renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      onError('WebGL not supported or disabled in this browser.');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x070a12, 1); // Deep Space SpaceX Cockpit Obsidian
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, 1, 0.005, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0.6, 1.1, 3.4);
    controls.target.set(0, 0.82, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.085;
    controls.minDistance = 0.05;
    controls.maxDistance = 35;
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.addEventListener('change', () => { dirty = true; });

    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    room.dispose();
    pmrem.dispose();

    // SpaceX Deep Space Cockpit Lighting
    scene.add(new T.HemisphereLight(0x00f2fe, 0x05070f, 1.4));
    const key = new T.DirectionalLight(0xffffff, 2.8);
    key.position.set(-2.5, 4.2, 3.2);
    scene.add(key);
    const rimCyan = new T.DirectionalLight(0x00f2fe, 2.2);
    rimCyan.position.set(2.5, 2.0, -3.0);
    scene.add(rimCyan);
    const underGlow = new T.DirectionalLight(0x38bdf8, 1.2);
    underGlow.position.set(0, -3.0, 1.5);
    scene.add(underGlow);

    // Holographic Flight Deck Pedestal
    const ground = new T.Mesh(new T.CircleGeometry(15, 64), new T.MeshBasicMaterial({ color: 0x070c18, transparent: true, opacity: 0.8 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.019;
    scene.add(ground);

    const platform = new T.Mesh(
      new T.CylinderGeometry(0.68, 0.72, 0.025, 64),
      new T.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.3 })
    );
    platform.position.y = -0.016;
    scene.add(platform);

    const ring = new T.Mesh(
      new T.RingGeometry(0.64, 0.646, 96),
      new T.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.75, side: T.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    scene.add(ring);

    // SomatoScan Holographic Scanner Gantry Ring
    const scannerGroup = new T.Group();
    scannerGroup.position.y = 1.25;

    // 1. Outer Torus Ring Casing
    const gantryRing = new T.Mesh(
      new T.TorusGeometry(0.72, 0.012, 16, 64),
      new T.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 })
    );
    gantryRing.rotation.x = Math.PI / 2;
    scannerGroup.add(gantryRing);

    // 2. Inner Glowing Laser Band
    const laserRing = new T.Mesh(
      new T.TorusGeometry(0.70, 0.005, 16, 64),
      new T.MeshBasicMaterial({ color: 0x00f2fe, transparent: true, opacity: 0.95 })
    );
    laserRing.rotation.x = Math.PI / 2;
    scannerGroup.add(laserRing);

    // 3. Emitter blocks around the gantry
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const block = new T.Mesh(
        new T.BoxGeometry(0.024, 0.022, 0.05),
        new T.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.1 })
      );
      block.position.set(Math.cos(angle) * 0.71, 0, Math.sin(angle) * 0.71);
      block.rotation.y = -angle;
      scannerGroup.add(block);
    }

    // 4. Additive Reading Wash Plane across the anatomical slice
    const planeWash = new T.Mesh(
      new T.RingGeometry(0.04, 0.69, 64),
      new T.MeshBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.16,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    planeWash.rotation.x = -Math.PI / 2;
    scannerGroup.add(planeWash);

    scene.add(scannerGroup);

    const width = T.MathUtils.ceilPowerOfTwo(atlas.parts.length);
    const data = new Float32Array(width * 4);
    const partTexture = new T.DataTexture(data, width, 1, T.RGBAFormat, T.FloatType);
    partTexture.needsUpdate = true;

    const selectedData = new Uint8Array(width * 4);
    const selectionTexture = new T.DataTexture(selectedData, width, 1);
    selectionTexture.needsUpdate = true;

    const materials = [];
    const geometries = [];
    const pickers = [];
    const bounds = atlas.parts.map(p => new T.Box3(new T.Vector3().fromArray(p.bounds[0]), new T.Vector3().fromArray(p.bounds[1])));
    const centers = atlas.parts.map(p => new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(0.5));
    const offsets = [];

    let packingWidth = 1, packingHeight = 1;

    // Hover tooltip
    const hover = document.createElement('div');
    hover.className = 'part-hover-tooltip';
    hover.style.position = 'absolute';
    hover.style.pointerEvents = 'none';
    hover.style.background = 'rgba(11, 17, 32, 0.92)';
    hover.style.border = '1px solid #00f2fe';
    hover.style.color = '#ffffff';
    hover.style.padding = '4px 10px';
    hover.style.borderRadius = '8px';
    hover.style.fontSize = '11px';
    hover.style.fontWeight = '600';
    hover.style.backdropFilter = 'blur(6px)';
    hover.style.boxShadow = '0 0 12px rgba(0, 242, 254, 0.3)';
    hover.hidden = true;
    el.appendChild(hover);

    // Uniforms for Aerospace X-Ray, SomatoScan Ghosting & Scanner Sweep
    const customUniforms = {
      uTime: { value: 0 },
      uXray: { value: 0.0 },
      uScanY: { value: 1.25 },
      uScanActive: { value: 1.0 },
      uScanTint: { value: new T.Vector3(0.0, 0.95, 1.0) },
      uGhostAmount: { value: 0.0 }
    };

    const materialFor = (system) => {
      const isMuscularOrSkin = system === 'muscular' || system === 'integumentary';
      const sysColor = SYSTEMS.find(s => s.id === system)?.color || '#aebbb8';
      const m = new T.MeshStandardMaterial({
        color: sysColor,
        metalness: 0.15,
        roughness: 0.45,
        side: T.DoubleSide,
        transparent: true,
        opacity: system === 'integumentary' ? 0.15 : 1.0,
        depthWrite: system !== 'integumentary'
      });

      m.onBeforeCompile = (shader) => {
        shader.uniforms.partState = { value: partTexture };
        shader.uniforms.selectionState = { value: selectionTexture };
        shader.uniforms.stateWidth = { value: width };
        shader.uniforms.uTime = customUniforms.uTime;
        shader.uniforms.uXray = customUniforms.uXray;
        shader.uniforms.uScanY = customUniforms.uScanY;
        shader.uniforms.uScanActive = customUniforms.uScanActive;
        shader.uniforms.uScanTint = customUniforms.uScanTint;
        shader.uniforms.uGhostAmount = customUniforms.uGhostAmount;

        shader.vertexShader =
          'attribute float partIndex;\n' +
          'uniform sampler2D partState;\n' +
          'uniform sampler2D selectionState;\n' +
          'uniform float stateWidth;\n' +
          'varying float partVisible;\n' +
          'varying float partSelected;\n' +
          'varying vec3 vWorldPosition;\n' +
          shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n' +
          'vec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5);\n' +
          'vec4 state = texture2D(partState, stateUv);\n' +
          'transformed += state.xyz;\n' +
          'partVisible = state.w;\n' +
          'partSelected = texture2D(selectionState, stateUv).r;\n' +
          'vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\n'
        );

        shader.fragmentShader =
          'uniform float uTime;\n' +
          'uniform float uXray;\n' +
          'uniform float uScanY;\n' +
          'uniform float uScanActive;\n' +
          'uniform vec3 uScanTint;\n' +
          'uniform float uGhostAmount;\n' +
          'varying float partVisible;\n' +
          'varying float partSelected;\n' +
          'varying vec3 vWorldPosition;\n' +
          shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\n' +
          'if (partVisible < 0.5) discard;\n'
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n' +
          'if (partSelected > 0.5) {\n' +
          '  float pulse = 0.5 + 0.5 * sin(uTime * 6.0);\n' +
          '  diffuseColor.rgb = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.9, 0.15), pulse);\n' +
          '  diffuseColor.a = 1.0;\n' +
          '} else {\n' +
          '  if (uGhostAmount > 0.01) {\n' +
          '    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.22, 0.38), uGhostAmount * 0.88);\n' +
          '    diffuseColor.a = mix(diffuseColor.a, 0.14, uGhostAmount);\n' +
          '  } else if (uXray > 0.05 && isMuscularOrSkin) {\n' +
          '    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.28, 0.45), uXray * 0.85);\n' +
          '    diffuseColor.a = mix(diffuseColor.a, 0.18, uXray);\n' +
          '  }\n' +
          '}\n' +
          'if (uScanActive > 0.01) {\n' +
          '  float scanDist = abs(vWorldPosition.y - uScanY);\n' +
          '  float scanBeam = exp(-scanDist * scanDist * 420.0);\n' +
          '  float scanHalo = smoothstep(0.08, 0.0, scanDist) * 0.35;\n' +
          '  diffuseColor.rgb += uScanTint * ((scanBeam * 2.8 + scanHalo) * uScanActive);\n' +
          '}\n'
        );
      };

      materials.push(m);
      return m;
    };

    const mats = new Map(SYSTEMS.map(s => [s.id, materialFor(s.id)]));
    let loaded = 0;

    const loadChunk = async (ci) => {
      const chunk = atlas.chunks[ci];
      const compressed = !!chunk.gzip && typeof DecompressionStream !== 'undefined';
      const response = await fetch(compressed ? chunk.gzip : chunk.url, { signal: abort.signal });
      const buffer = await decodeModelResponse(response, chunk.bytes, compressed);
      if (disposed) return;

      const groups = new Map();
      atlas.parts.forEach((p, i) => {
        if (p.chunk !== ci) return;
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3));
        g.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true));
        g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
        g.boundingBox = bounds[i].clone();
        g.computeBoundingSphere();
        const pick = new T.Mesh(g);
        pick.matrixAutoUpdate = false;
        pickers[i] = pick;
        geometries.push(g);
        g.setAttribute('partIndex', new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i), 1));
        const list = groups.get(p.system) || [];
        list.push(g);
        groups.set(p.system, list);
      });

      groups.forEach((gs, system) => {
        const geometry = mergeGeometries(gs, false);
        if (!geometry) return;
        geometries.push(geometry);
        const mesh = new T.Mesh(geometry, mats.get(system));
        mesh.frustumCulled = false;
        scene.add(mesh);
      });

      loaded++;
      onProgress(Math.round((loaded / atlas.chunks.length) * 100));
      dirty = true;
    };

    (async () => {
      try {
        let cursor = 0;
        await Promise.all(
          Array.from({ length: 3 }, async () => {
            while (cursor < atlas.chunks.length) {
              const i = cursor++;
              await loadChunk(i);
            }
          })
        );
        if (!disposed) {
          ready = true;
          dirty = true;
        }
      } catch (e) {
        if (!disposed) onError(e instanceof Error ? e.message : 'Could not load 3D geometry.');
      }
    })();

    const fit = (view, extent = 0) => {
      const mobile = el.clientWidth < 768;
      const normalDist = mobile ? 4.2 : 3.6;
      const distance = T.MathUtils.lerp(normalDist, Math.max(0.2, packingHeight * 1.2), extent);
      const direction = view === 'front'
        ? new T.Vector3(0, 0.02, 1)
        : view === 'back'
          ? new T.Vector3(0, 0.02, -1)
          : view === 'side'
            ? new T.Vector3(1, 0.02, 0)
            : new T.Vector3(0.35, 0.06, 1).normalize();

      controls.target.set(0, 0.82, 0);
      camera.position.copy(controls.target).addScaledVector(direction, distance);
      controls.update();
      dirty = true;
    };

    const resize = () => {
      layoutKey = '';
      lastState = null;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
      fit(latest.current.state.view, amount);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const raycaster = new T.Raycaster();
    const pointer = new T.Vector2();
    const tap = new PointerTap();
    const worldBox = new T.Box3();
    const hitPoint = new T.Vector3();

    const down = (e) => {
      hover.hidden = true;
      tap.down(e.pointerId, e.clientX, e.clientY, 5);
    };

    const move = (e) => {
      tap.move(e.pointerId, e.clientX, e.clientY);
    };

    const up = (e) => {
      const validTap = tap.up(e.pointerId, e.clientX, e.clientY);
      if (!validTap || !ready) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);

      let nearest = Infinity;
      let found = -1;
      pickers.forEach((mesh, i) => {
        if (!mesh || data[i * 4 + 3] < 0.5) return;
        worldBox.copy(bounds[i]).translate(mesh.position);
        if (!raycaster.ray.intersectBox(worldBox, hitPoint)) return;
        const hits = raycaster.intersectObject(mesh, false);
        if (hits[0] && hits[0].distance < nearest) {
          nearest = hits[0].distance;
          found = i;
        }
      });

      if (found >= 0) {
        select.current(atlas.parts[found].id);
      }
    };

    renderer.domElement.addEventListener('pointerdown', down);
    renderer.domElement.addEventListener('pointermove', move);
    renderer.domElement.addEventListener('pointerup', up);

    const clock = new T.Clock();
    let crossingCounter = 0;

    const animate = () => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const current = latest.current;
      const s = current.state;

      customUniforms.uTime.value += dt;
      const targetXray = current.xray ? 1.0 : 0.0;
      customUniforms.uXray.value = T.MathUtils.damp(customUniforms.uXray.value, targetXray, 6, dt);

      // SomatoScan Tissue Ghosting
      const targetGhost = current.ghost ? 1.0 : 0.0;
      customUniforms.uGhostAmount.value = T.MathUtils.damp(customUniforms.uGhostAmount.value, targetGhost, 6, dt);

      // SomatoScan Holographic Scanner Sweep & Gantry Motion
      let scanY = 1.25;
      if (current.scannerSweep) {
        const sweepPeriod = 8.0;
        const phase = (customUniforms.uTime.value % sweepPeriod) / sweepPeriod;
        const norm = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
        scanY = T.MathUtils.lerp(0.15, 1.75, norm);
      } else if (typeof current.scannerHeight === 'number') {
        scanY = current.scannerHeight;
      }

      customUniforms.uScanY.value = scanY;
      scannerGroup.position.y = scanY;
      scannerGroup.rotation.y += dt * 0.35;
      dirty = true;

      crossingCounter++;
      if (crossingCounter % 10 === 0 && current.onCrossingUpdate) {
        const crossing = computeCrossing(atlas.parts, scanY, 5);
        current.onCrossingUpdate(crossing);
      }

      const changed = lastState?.visible !== s.visible || lastState?.selected !== s.selected || lastState?.isolate !== s.isolate;
      const moving = Math.abs(amount - s.explode) > 0.0001;

      if (moving) {
        amount = T.MathUtils.damp(amount, s.explode, 8, dt);
        dirty = true;
      }

      if (changed || moving || !lastState) {
        const visible = new Set(s.visible);
        const selection = new Set(s.selected);
        const visibleParts = atlas.parts.filter(p => s.isolate ? selection.has(p.id) : visible.has(p.system) || selection.has(p.id));
        const nextKey = visibleParts.map(p => p.id).join(',') + ':' + camera.aspect.toFixed(3);

        if (nextKey !== layoutKey) {
          const layout = createExplosionLayout(visibleParts, camera.aspect);
          packingWidth = layout.width;
          packingHeight = layout.height;
          atlas.parts.forEach((p, i) => {
            const cell = layout.cells.get(p.id);
            offsets[i] = cell ? new T.Vector3(cell.x, cell.y + 0.85, 0) : centers[i].clone();
          });
          layoutKey = nextKey;
        }

        atlas.parts.forEach((p, i) => {
          const c = centers[i];
          const dest = offsets[i];
          let dx = 0, dy = 0, dz = 0;
          if (amount <= 0.45) {
            const t = amount / 0.45;
            const group = SYSTEMS.findIndex(sys => sys.id === p.system);
            const angle = (group / SYSTEMS.length) * Math.PI * 2;
            dx = Math.sin(angle) * t * 0.48;
            dy = (c.y - 0.85) * t * 0.28;
            dz = Math.cos(angle) * t * 0.48;
          } else {
            const t = (amount - 0.45) / 0.55;
            dx = T.MathUtils.lerp(0, dest.x - c.x, t);
            dy = T.MathUtils.lerp(0, dest.y - c.y, t);
            dz = T.MathUtils.lerp(0, -c.z, t);
          }
          const selected = selection.has(p.id);
          data.set([dx, dy, dz, (s.isolate ? selected : visible.has(p.system) || selected) ? 1 : 0], i * 4);
          selectedData[i * 4] = selected ? 255 : 0;
          const mesh = pickers[i];
          if (mesh) {
            mesh.position.set(dx, dy, dz);
            mesh.updateMatrix();
            mesh.updateMatrixWorld(true);
          }
        });

        partTexture.needsUpdate = true;
        selectionTexture.needsUpdate = true;
        lastState = s;
        dirty = true;
      }

      if (s.view !== lastView || s.reset !== lastReset) {
        fit(s.view, amount);
        lastView = s.view;
        lastReset = s.reset;
      }

      // Aerospace SomatoScan Target Focus (Glide and Zoom to Organ)
      if (current.targetFocus && current.targetFocus.box) {
        const box = current.targetFocus.box;
        const targetCenter = box.getCenter(new T.Vector3());
        controls.target.lerp(targetCenter, 0.08);
        const desiredCam = targetCenter.clone().add(new T.Vector3(0.15, 0.05, 0.65));
        camera.position.lerp(desiredCam, 0.08);
        controls.update();
        dirty = true;
      }

      controls.autoRotate = s.rotate && !s.isolate && amount < 0.4;
      controls.autoRotateSpeed = 0.8;
      controls.update();
      if (controls.autoRotate) dirty = true;

      if (dirty) {
        renderer.render(scene, camera);
        dirty = false;
      }
    };

    animate();

    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scannerGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      env.dispose();
      partTexture.dispose();
      selectionTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [atlas]);

  return <div style={{ width: '100%', height: '100%', position: 'relative' }} ref={host} />;
}
