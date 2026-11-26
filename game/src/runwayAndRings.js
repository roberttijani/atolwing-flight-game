// Crisp geometric & high-DPI marked runways (RWY 09/27 & RWY 14/32), dynamic PAPI lights, windsocks, and 3D rings.
import * as THREE from '../vendor/three.min.js';
import { RUNWAY_SPECS, sampleTerrainHeight } from './terrainWorld.js';

function createAsphaltGrainAndSkidTexture() {
  // 1024 x 2048 high-res asphalt texture oriented along runway length (V = along length)
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#242a30';
  ctx.fillRect(0, 0, 1024, 2048);

  // Fine aggregate asphalt noise & longitudinal paving seams
  for (let seamX of [256, 512, 768]) {
    ctx.fillStyle = 'rgba(15, 18, 22, 0.45)';
    ctx.fillRect(seamX - 2, 0, 4, 2048);
  }
  for (let i = 0; i < 2400; i += 1) {
    const gx = (Math.imul(i, 2654435761) >>> 22) & 1023;
    const gy = (Math.imul(i, 1597334677) >>> 21) & 2047;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.035)' : 'rgba(8, 10, 12, 0.06)';
    ctx.fillRect(gx, gy, 5, 8);
  }

  // Realistic multi-pass dark rubber touchdown skid marks at both touchdown zones
  for (let s = 0; s < 95; s += 1) {
    const spread = ((Math.sin(s * 12.7) + Math.sin(s * 4.3)) * 0.5) * 230;
    const sx = 512 + spread;
    const len = 110 + (s % 7) * 34;
    const width = 4 + (s % 3) * 3;
    const alpha = 0.14 + (s % 5) * 0.045;
    ctx.fillStyle = `rgba(9, 11, 13, ${alpha.toFixed(3)})`;

    // Primary end touchdown zone (near V=0 -> bottom/top depending on UV; paint both ends!)
    const y1 = 195 + (s % 11) * 24;
    const y2 = 1853 - (s % 11) * 24 - len;
    ctx.fillRect(sx, y1, width, len);
    ctx.fillRect(sx, y2, width, len);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

function createRunwayNumberDecalTexture(labelText) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  ctx.fillStyle = '#f2f6fa';
  ctx.font = '900 300px Bahnschrift, "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, 256, 266);

  // Subtle rubber tire scuff streaks across the painted digits for authentic flown look
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i += 1) {
    const x = 70 + i * 28;
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.06 + (i % 3) * 0.05).toFixed(2)})`;
    ctx.fillRect(x, 0, 6, 512);
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

function addCrispRunwayMarkings(rwyGroup, spec) {
  const halfL = spec.length * 0.5;
  const halfW = spec.width * 0.5;
  const paintY = 0.032;

  const paintMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.62,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const addStrip = (lenX, widZ, posX, posZ) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lenX, widZ), paintMat);
    m.rotation.x = -Math.PI * 0.5;
    m.position.set(posX, paintY, posZ);
    rwyGroup.add(m);
  };

  // Continuous side edge stripes & end threshold bars
  addStrip(spec.length - 12, 0.85, 0, -halfW + 1.1);
  addStrip(spec.length - 12, 0.85, 0, halfW - 1.1);
  addStrip(1.8, spec.width - 2.2, -halfL + 7.5, 0);
  addStrip(1.8, spec.width - 2.2, halfL - 7.5, 0);

  // Crisp 3D geometric "piano-key" threshold stripes on both ends
  const keyOffsets = [-13.2, -10.4, -7.6, -4.8, 4.8, 7.6, 10.4, 13.2].filter(
    (z) => Math.abs(z) < halfW - 2.4,
  );
  for (let i = 0; i < keyOffsets.length; i += 1) {
    const kz = keyOffsets[i];
    addStrip(28, 1.55, -halfL + 26, kz);
    addStrip(28, 1.55, halfL - 26, kz);
  }

  // Touchdown zone blocks & bold aiming-point ("1000-ft") rectangles
  for (let side of [-1, 1]) {
    addStrip(46, 3.8, -halfL + 148, side * (halfW * 0.46));
    addStrip(46, 3.8, halfL - 148, side * (halfW * 0.46));
    addStrip(18, 1.4, -halfL + 98, side * (halfW * 0.44));
    addStrip(18, 1.4, -halfL + 206, side * (halfW * 0.44));
    addStrip(18, 1.4, halfL - 98, side * (halfW * 0.44));
    addStrip(18, 1.4, halfL - 206, side * (halfW * 0.44));
  }

  // Centerline dashes between the runway numbers
  for (let x = -halfL + 96; x <= halfL - 96; x += 38) {
    addStrip(21, 0.95, x, 0);
  }

  // High-DPI runway designation number decals ('09' at -X end facing +X, '27' at +X end facing -X)
  const makeNumMesh = (label, posX, rotZ) => {
    const tex = createRunwayNumberDecalTexture(label);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.rotation.z = rotZ;
    mesh.position.set(posX, paintY + 0.008, 0);
    rwyGroup.add(mesh);
  };

  makeNumMesh(spec.primaryLabel, -halfL + 60, -Math.PI * 0.5);
  makeNumMesh(spec.secondaryLabel, halfL - 60, Math.PI * 0.5);
}

function buildWindsockUnit() {
  const root = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd8dee4, roughness: 0.45 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.2, 8), poleMat);
  pole.position.y = 3.6;
  root.add(pole);

  const ringCircle = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 4.1, 20),
    new THREE.MeshBasicMaterial({ color: 0xf4f6f8, side: THREE.DoubleSide }),
  );
  ringCircle.rotation.x = -Math.PI * 0.5;
  ringCircle.position.y = 0.08;
  root.add(ringCircle);

  const vaneSwivel = new THREE.Group();
  vaneSwivel.position.y = 7.0;
  const sockPivot = new THREE.Group();
  vaneSwivel.add(sockPivot);

  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    emissive: 0x5c2000,
    roughness: 0.55,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.55 });

  for (let seg = 0; seg < 5; seg += 1) {
    const r0 = 0.52 - seg * 0.07;
    const r1 = 0.45 - seg * 0.07;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(r1, r0, 0.85, 10, 1, true),
      seg % 2 === 0 ? orangeMat : whiteMat,
    );
    cone.rotation.x = Math.PI * 0.5;
    cone.position.z = 0.45 + seg * 0.82;
    sockPivot.add(cone);
  }
  root.add(vaneSwivel);
  return { root, vaneSwivel, sockPivot };
}

function buildPapiBoxRow() {
  const rowGroup = new THREE.Group();
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x1c2229, roughness: 0.6 });
  const lamps = [];

  for (let i = 0; i < 4; i += 1) {
    const unit = new THREE.Group();
    unit.position.x = i * 3.4;

    const housing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 1.6), boxMat);
    housing.position.y = 0.65;
    unit.add(housing);

    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lampLens = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 10), lampMat);
    lampLens.position.set(0, 0.85, -0.85);
    unit.add(lampLens);

    lamps.push(lampMat);
    rowGroup.add(unit);
  }
  return { rowGroup, lamps };
}

export function computePapiSlopeLights(aircraftPos, thresholdWorldPos) {
  const horizDist = Math.hypot(
    aircraftPos.x - thresholdWorldPos.x,
    aircraftPos.z - thresholdWorldPos.z,
  );
  if (horizDist < 8) return 2;
  const relAlt = aircraftPos.y - thresholdWorldPos.y;
  const angleDeg = (Math.atan2(relAlt, horizDist) * 180) / Math.PI;

  if (angleDeg > 3.55) return 4;
  if (angleDeg > 3.18) return 3;
  if (angleDeg > 2.82) return 2;
  if (angleDeg > 2.45) return 1;
  return 0;
}

export function buildAerodromesAndRings(scene) {
  const aerodromeGroup = new THREE.Group();
  aerodromeGroup.name = 'Aerodromes';

  const runways = [];
  const windsocks = [];
  const approachStrobes = [];

  const sharedAsphaltTex = createAsphaltGrainAndSkidTexture();
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x2d333a, roughness: 0.85 });
  const hangarMat = new THREE.MeshStandardMaterial({ color: 0xdbe2e8, roughness: 0.55 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc95227, roughness: 0.5 });
  const towerGlassMat = new THREE.MeshBasicMaterial({ color: 0x7ef2d4 });

  for (let r = 0; r < RUNWAY_SPECS.length; r += 1) {
    const spec = RUNWAY_SPECS[r];
    const rwyGroup = new THREE.Group();
    rwyGroup.position.set(spec.centerX, spec.elevation + 0.08, spec.centerZ);

    const rotY = ((90 - spec.headingDeg) * Math.PI) / 180;
    rwyGroup.rotation.y = rotY;

    // Orient PlaneGeometry(width, length) then rotateZ(-90 deg) so high-res 2048 V axis maps along runway length
    const baseGeo = new THREE.PlaneGeometry(spec.width, spec.length);
    baseGeo.rotateX(-Math.PI * 0.5);
    baseGeo.rotateY(-Math.PI * 0.5);
    const rwyMesh = new THREE.Mesh(
      baseGeo,
      new THREE.MeshStandardMaterial({ map: sharedAsphaltTex, roughness: 0.80, metalness: 0.05 }),
    );
    rwyGroup.add(rwyMesh);

    addCrispRunwayMarkings(rwyGroup, spec);

    // Runway edge lights + green threshold bars
    const edgeLightMat = new THREE.MeshBasicMaterial({ color: 0xfff4d2 });
    const greenBarMat = new THREE.MeshBasicMaterial({ color: 0x36f57f });
    for (let x = -spec.length * 0.5; x <= spec.length * 0.5 + 1; x += 58) {
      for (let zSide of [-spec.width * 0.5 - 1.4, spec.width * 0.5 + 1.4]) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 6), edgeLightMat);
        bulb.position.set(x, 0.45, zSide);
        rwyGroup.add(bulb);
      }
    }
    for (let zBar = -spec.width * 0.42; zBar <= spec.width * 0.42; zBar += 4.2) {
      const g1 = new THREE.Mesh(new THREE.SphereGeometry(0.48, 6, 6), greenBarMat);
      g1.position.set(-spec.length * 0.5 + 3, 0.45, zBar);
      const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.48, 6, 6), greenBarMat);
      g2.position.set(spec.length * 0.5 - 3, 0.45, zBar);
      rwyGroup.add(g1, g2);
    }

    for (let s = 1; s <= 6; s += 1) {
      const strobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd27d }),
      );
      strobe.position.set(-spec.length * 0.5 - s * 68, 0.9, 0);
      rwyGroup.add(strobe);
      approachStrobes.push({ mesh: strobe, index: s });
    }

    const papiPrimary = buildPapiBoxRow();
    papiPrimary.rowGroup.position.set(-spec.length * 0.5 + 128, 0, -spec.width * 0.5 - 16);
    papiPrimary.rowGroup.rotation.y = Math.PI * 0.5;
    rwyGroup.add(papiPrimary.rowGroup);

    const papiSecondary = buildPapiBoxRow();
    papiSecondary.rowGroup.position.set(spec.length * 0.5 - 128, 0, spec.width * 0.5 + 16);
    papiSecondary.rowGroup.rotation.y = -Math.PI * 0.5;
    rwyGroup.add(papiSecondary.rowGroup);

    const ws = buildWindsockUnit();
    ws.root.position.set(-spec.length * 0.5 + 95, 0, spec.width * 0.5 + 18);
    rwyGroup.add(ws.root);
    windsocks.push({ ...ws, rwyRotY: rotY });

    const apron = new THREE.Mesh(new THREE.PlaneGeometry(130, 52), apronMat);
    apron.rotation.x = -Math.PI * 0.5;
    apron.position.set(-30, -0.02, -spec.width * 0.5 - 26);
    rwyGroup.add(apron);

    const hangar = new THREE.Mesh(new THREE.BoxGeometry(36, 11, 26), hangarMat);
    hangar.position.set(-56, 5.5, -spec.width * 0.5 - 32);
    const hangarRoof = new THREE.Mesh(new THREE.BoxGeometry(38, 2.2, 28), roofMat);
    hangarRoof.position.set(-56, 11.8, -spec.width * 0.5 - 32);

    const towerShaft = new THREE.Mesh(new THREE.BoxGeometry(8.5, 20, 8.5), hangarMat);
    towerShaft.position.set(12, 10, -spec.width * 0.5 - 30);
    const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 5.6, 5.2, 8), towerGlassMat);
    towerCab.position.set(12, 22.2, -spec.width * 0.5 - 30);
    const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(7.6, 2.8, 8), roofMat);
    towerRoof.position.set(12, 26.0, -spec.width * 0.5 - 30);
    rwyGroup.add(hangar, hangarRoof, towerShaft, towerCab, towerRoof);

    aerodromeGroup.add(rwyGroup);

    const hdgRad = (spec.headingDeg * Math.PI) / 180;
    const fwdX = Math.sin(hdgRad);
    const fwdZ = -Math.cos(hdgRad);
    runways.push({
      spec,
      rwyGroup,
      papiPrimary,
      papiSecondary,
      primaryThresholdPos: new THREE.Vector3(
        spec.centerX - fwdX * (spec.length * 0.5 - 128),
        spec.elevation,
        spec.centerZ - fwdZ * (spec.length * 0.5 - 128),
      ),
      secondaryThresholdPos: new THREE.Vector3(
        spec.centerX + fwdX * (spec.length * 0.5 - 128),
        spec.elevation,
        spec.centerZ + fwdZ * (spec.length * 0.5 - 128),
      ),
    });
  }

  scene.add(aerodromeGroup);

  const ringsGroup = new THREE.Group();
  ringsGroup.name = 'NavigationRings';
  scene.add(ringsGroup);

  return {
    aerodromeGroup,
    runways,
    windsocks,
    approachStrobes,
    ringsGroup,
    ringInstances: [],
    dropZoneInstances: [],
  };
}

export function rebuildMissionRings(aids, ringDefs = [], dropZoneDefs = []) {
  while (aids.ringsGroup.children.length > 0) {
    aids.ringsGroup.remove(aids.ringsGroup.children[0]);
  }
  aids.ringInstances = [];
  aids.dropZoneInstances = [];

  for (let i = 0; i < ringDefs.length; i += 1) {
    const def = ringDefs[i];
    const radius = def.radius ?? 28;
    const holder = new THREE.Group();
    holder.position.set(def.x, def.y, def.z);
    const rotRad = ((def.headingDeg ?? 90) * Math.PI) / 180;
    holder.rotation.y = -rotRad;

    const frameRing = new THREE.Mesh(
      new THREE.TorusGeometry(radius + 1.8, 1.05, 10, 36),
      new THREE.MeshStandardMaterial({ color: 0x162430, roughness: 0.4, metalness: 0.5 }),
    );
    const glowMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xff9f2e : 0x45e6d6,
    });
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 1.35, 12, 40), glowMat);

    const haloMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xffb347 : 0x45e6d6,
      transparent: true,
      opacity: i === 0 ? 0.22 : 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const haloRing = new THREE.Mesh(new THREE.RingGeometry(radius - 2.6, radius + 3.4, 36), haloMat);

    for (let f = 0; f < 4; f += 1) {
      const ang = (f * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(1.9, 5.2, 6), glowMat);
      fin.position.set(Math.cos(ang) * (radius - 2.5), Math.sin(ang) * (radius - 2.5), 0);
      fin.rotation.z = ang + Math.PI * 0.5;
      holder.add(fin);
    }

    holder.add(frameRing, coreRing, haloRing);
    aids.ringsGroup.add(holder);
    aids.ringInstances.push({
      def,
      radius,
      holder,
      glowMat,
      haloMat,
      captured: false,
    });
  }

  for (let d = 0; d < dropZoneDefs.length; d += 1) {
    const dz = dropZoneDefs[d];
    const groundY = Math.max(1.2, sampleTerrainHeight(dz.x, dz.z) + 0.35);
    const dzGroup = new THREE.Group();
    dzGroup.position.set(dz.x, groundY, dz.z);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff8c2b,
      side: THREE.DoubleSide,
    });
    const outerCircle = new THREE.Mesh(new THREE.RingGeometry(32, 38, 36), ringMat);
    outerCircle.rotation.x = -Math.PI * 0.5;
    const innerCrossA = new THREE.Mesh(new THREE.PlaneGeometry(28, 4.5), ringMat);
    innerCrossA.rotation.x = -Math.PI * 0.5;
    const innerCrossB = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 28), ringMat);
    innerCrossB.rotation.x = -Math.PI * 0.5;

    const flareMat = new THREE.MeshBasicMaterial({
      color: 0xff7029,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const flarePillar = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 1.4, 72, 12, 1, true), flareMat);
    flarePillar.position.y = 36;

    dzGroup.add(outerCircle, innerCrossA, innerCrossB, flarePillar);
    aids.ringsGroup.add(dzGroup);
    aids.dropZoneInstances.push({
      def: dz,
      position: new THREE.Vector3(dz.x, groundY, dz.z),
      dzGroup,
      ringMat,
      flarePillar,
      delivered: false,
    });
  }
}

export function checkRingCapture(ringInst, prevPos, curPos) {
  if (ringInst.captured) return false;
  const center = ringInst.holder.position;
  const distCur = curPos.distanceTo(center);
  const distPrev = prevPos.distanceTo(center);
  const hitRadius = ringInst.radius + 9.5;
  if (distCur <= hitRadius || (distPrev + distCur) * 0.5 <= hitRadius) {
    ringInst.captured = true;
    ringInst.glowMat.color.setHex(0x4bf598);
    ringInst.haloMat.color.setHex(0x4bf598);
    ringInst.haloMat.opacity = 0.08;
    return true;
  }
  return false;
}

export function updateRunwayAidsAndRings(aids, aircraftPos, activeRingIdx, weather, elapsedSec) {
  for (let i = 0; i < aids.runways.length; i += 1) {
    const rwy = aids.runways[i];
    const whiteCount1 = computePapiSlopeLights(aircraftPos, rwy.primaryThresholdPos);
    for (let l = 0; l < 4; l += 1) {
      rwy.papiPrimary.lamps[l].color.setHex(l < whiteCount1 ? 0xfff8eb : 0xff2b24);
    }
    const whiteCount2 = computePapiSlopeLights(aircraftPos, rwy.secondaryThresholdPos);
    for (let l = 0; l < 4; l += 1) {
      rwy.papiSecondary.lamps[l].color.setHex(l < whiteCount2 ? 0xfff8eb : 0xff2b24);
    }
  }

  const activePulse = Math.floor((elapsedSec * 7.5) % 8);
  for (let i = 0; i < aids.approachStrobes.length; i += 1) {
    const st = aids.approachStrobes[i];
    const bright = 6 - st.index === activePulse;
    st.mesh.scale.setScalar(bright ? 1.55 : 0.72);
  }

  const windBlowToRad = (((weather.currentWindFromDeg + 180) % 360) * Math.PI) / 180;
  const droop = Math.max(0.06, 0.62 - (weather.currentWindSpeedKts / 28) * 0.52);
  for (let i = 0; i < aids.windsocks.length; i += 1) {
    const ws = aids.windsocks[i];
    ws.vaneSwivel.rotation.y = -windBlowToRad - ws.rwyRotY + Math.sin(elapsedSec * 4.2 + i) * 0.06;
    ws.sockPivot.rotation.x = droop + Math.sin(elapsedSec * 6.5 + i) * 0.04;
  }

  for (let i = 0; i < aids.ringInstances.length; i += 1) {
    const ring = aids.ringInstances[i];
    if (ring.captured) {
      ring.holder.scale.setScalar(0.92);
      continue;
    }
    if (i === activeRingIdx) {
      ring.glowMat.color.setHex(0xff9f2e);
      ring.haloMat.color.setHex(0xffb84d);
      ring.haloMat.opacity = 0.24 + Math.sin(elapsedSec * 4.0) * 0.06;
      const pulse = 1.0 + Math.sin(elapsedSec * 3.2) * 0.025;
      ring.holder.scale.setScalar(pulse);
    } else {
      ring.glowMat.color.setHex(0x3ad9d9);
      ring.haloMat.opacity = 0.08;
      ring.holder.scale.setScalar(1.0);
    }
  }
}
