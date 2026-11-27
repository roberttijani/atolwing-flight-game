// Shadow-receiving high-DPI runways (WARA, WAKB), offshore STOL platform (WAPO), textured hangars, radar domes, PAPI, windsocks & rings.
import * as THREE from '../vendor/three.min.js';
import { RUNWAY_SPECS, sampleTerrainHeight } from './terrainWorld.js';

function createAsphaltGrainAndSkidTexture(isSteelDeck = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = isSteelDeck ? '#28323c' : '#242a30';
  ctx.fillRect(0, 0, 1024, 2048);

  if (isSteelDeck) {
    // Non-skid steel flight deck plates & yellow perimeter hazard stripes
    ctx.strokeStyle = 'rgba(15, 20, 26, 0.45)';
    ctx.lineWidth = 3;
    for (let y = 0; y < 2048; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#e5a928';
    ctx.fillRect(0, 0, 26, 2048);
    ctx.fillRect(998, 0, 26, 2048);
  } else {
    for (let seamX of [256, 512, 768]) {
      ctx.fillStyle = 'rgba(15, 18, 22, 0.45)';
      ctx.fillRect(seamX - 2, 0, 4, 2048);
    }
  }

  for (let i = 0; i < 2400; i += 1) {
    const gx = (Math.imul(i, 2654435761) >>> 22) & 1023;
    const gy = (Math.imul(i, 1597334677) >>> 21) & 2047;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.038)' : 'rgba(8, 10, 12, 0.065)';
    ctx.fillRect(gx, gy, 5, 8);
  }

  for (let s = 0; s < 95; s += 1) {
    const spread = ((Math.sin(s * 12.7) + Math.sin(s * 4.3)) * 0.5) * 230;
    const sx = 512 + spread;
    const len = 110 + (s % 7) * 34;
    const width = 4 + (s % 3) * 3;
    const alpha = 0.14 + (s % 5) * 0.045;
    ctx.fillStyle = `rgba(9, 11, 13, ${alpha.toFixed(3)})`;
    const y1 = 195 + (s % 11) * 24;
    const y2 = 1853 - (s % 11) * 24 - len;
    ctx.fillRect(sx, y1, width, len);
    ctx.fillRect(sx, y2, width, len);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createCorrugatedHangarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#cdd6de';
  ctx.fillRect(0, 0, 256, 128);
  for (let x = 0; x < 256; x += 6) {
    ctx.fillStyle = x % 12 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(30,42,54,0.18)';
    ctx.fillRect(x, 0, 3, 128);
  }
  // Open dark hangar bay portal & orange aviation stripe
  ctx.fillStyle = '#d95d24';
  ctx.fillRect(0, 12, 256, 10);
  ctx.fillStyle = '#18212b';
  ctx.fillRect(48, 38, 160, 90);
  ctx.strokeStyle = '#ffbf54';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 38, 160, 89);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
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

  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i += 1) {
    const x = 70 + i * 28;
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.06 + (i % 3) * 0.05).toFixed(2)})`;
    ctx.fillRect(x, 0, 6, 512);
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function addCrispRunwayMarkings(rwyGroup, spec) {
  const halfL = spec.length * 0.5;
  const halfW = spec.width * 0.5;
  const paintY = 0.032;

  const paintMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.65,
    metalness: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const addStrip = (lenX, widZ, posX, posZ, mat = paintMat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lenX, widZ), mat);
    m.rotation.x = -Math.PI * 0.5;
    m.position.set(posX, paintY, posZ);
    m.receiveShadow = true;
    rwyGroup.add(m);
  };

  addStrip(spec.length - 12, 0.85, 0, -halfW + 1.1);
  addStrip(spec.length - 12, 0.85, 0, halfW - 1.1);
  addStrip(1.8, spec.width - 2.2, -halfL + 7.5, 0);
  addStrip(1.8, spec.width - 2.2, halfL - 7.5, 0);

  const keyOffsets = [-13.2, -10.4, -7.6, -4.8, 4.8, 7.6, 10.4, 13.2].filter(
    (z) => Math.abs(z) < halfW - 2.4,
  );
  const keyLen = spec.offshore ? 16 : 28;
  for (let i = 0; i < keyOffsets.length; i += 1) {
    const kz = keyOffsets[i];
    addStrip(keyLen, 1.55, -halfL + (spec.offshore ? 18 : 26), kz);
    addStrip(keyLen, 1.55, halfL - (spec.offshore ? 18 : 26), kz);
  }

  if (!spec.offshore) {
    for (let side of [-1, 1]) {
      addStrip(46, 3.8, -halfL + 148, side * (halfW * 0.46));
      addStrip(46, 3.8, halfL - 148, side * (halfW * 0.46));
      addStrip(18, 1.4, -halfL + 98, side * (halfW * 0.44));
      addStrip(18, 1.4, -halfL + 206, side * (halfW * 0.44));
      addStrip(18, 1.4, halfL - 98, side * (halfW * 0.44));
      addStrip(18, 1.4, halfL - 206, side * (halfW * 0.44));
    }
  }

  const startDash = spec.offshore ? -halfL + 58 : -halfL + 96;
  const endDash = spec.offshore ? halfL - 58 : halfL - 96;
  for (let x = startDash; x <= endDash; x += 34) {
    addStrip(19, 0.95, x, 0);
  }

  const makeNumMesh = (label, posX, rotZ) => {
    const tex = createRunwayNumberDecalTexture(label);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.65,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const sz = spec.offshore ? 14 : 18;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.rotation.z = rotZ;
    mesh.position.set(posX, paintY + 0.008, 0);
    mesh.receiveShadow = true;
    rwyGroup.add(mesh);
  };

  const numOff = spec.offshore ? 39 : 60;
  makeNumMesh(spec.primaryLabel, -halfL + numOff, -Math.PI * 0.5);
  makeNumMesh(spec.secondaryLabel, halfL - numOff, Math.PI * 0.5);
}

function buildWindsockUnit() {
  const root = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd8dee4, roughness: 0.45 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.2, 8), poleMat);
  pole.position.y = 3.6;
  pole.castShadow = true;
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
    housing.castShadow = true;
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

function buildOffshorePlatformStructure(rwyGroup, spec) {
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3b4856, roughness: 0.48, metalness: 0.62 });
  const yellowSteelMat = new THREE.MeshStandardMaterial({ color: 0xe2a52d, roughness: 0.44, metalness: 0.44 });
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0xd8e2ec,
    emissive: 0x3a4856,
    emissiveIntensity: 0.65,
    roughness: 0.28,
    metalness: 0.85,
  });
  const foulPaintMat = new THREE.MeshBasicMaterial({ color: 0xffc845 });
  const trapZonePaintMat = new THREE.MeshBasicMaterial({ color: 0xffe4a1 });

  // Deep structural steel deck box slab underneath the runway top surface
  const deckSlab = new THREE.Mesh(new THREE.BoxGeometry(spec.length + 6, 4.4, spec.width + 6), steelMat);
  deckSlab.position.set(0, -2.3, 0);
  deckSlab.castShadow = true;
  deckSlab.receiveShadow = true;
  rwyGroup.add(deckSlab);

  // 6 massive caisson legs plunging down 38 m into ocean floor
  for (let lx of [-spec.length * 0.36, 0, spec.length * 0.36]) {
    for (let lz of [-spec.width * 0.36, spec.width * 0.36]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 42, 12), yellowSteelMat);
      leg.position.set(lx, -23, lz);
      rwyGroup.add(leg);
    }
  }

  // Angled carrier landing zone foul-lines & high-visibility Arrestor Zone deck brackets
  const angledGroup = new THREE.Group();
  angledGroup.rotation.y = 0.05;
  for (let zOff of [-spec.width * 0.34, spec.width * 0.34]) {
    const foulLine = new THREE.Mesh(new THREE.PlaneGeometry(spec.length * 0.80, 1.05), foulPaintMat);
    foulLine.rotation.x = -Math.PI * 0.5;
    foulLine.position.set(0, 0.035, zOff);
    angledGroup.add(foulLine);
  }
  rwyGroup.add(angledGroup);

  // 3 steel Arrestor Wires (-76, -52, -28 m) with gleaming cable sheen, painted trap markers & amber edge lamps
  const wireXs = [-76, -52, -28];
  const wireLampMat = new THREE.MeshBasicMaterial({ color: 0xffb338 });
  for (let w = 0; w < wireXs.length; w += 1) {
    const wx = wireXs[w];
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, spec.width - 6, 10), wireMat);
    cable.rotation.x = Math.PI * 0.5;
    cable.position.set(wx, 0.22, 0);
    rwyGroup.add(cable);

    // Subtle high-contrast deck shadow strip right underneath cable so steel wire pops cleanly from air
    const wireBack = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, spec.width - 10),
      new THREE.MeshBasicMaterial({ color: 0x0b0f14 }),
    );
    wireBack.rotation.x = -Math.PI * 0.5;
    wireBack.position.set(wx, 0.028, 0);
    rwyGroup.add(wireBack);

    for (let zEnd of [-spec.width * 0.44, spec.width * 0.44]) {
      const sheave = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.72, 2.4), yellowSteelMat);
      sheave.position.set(wx, 0.36, zEnd);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), wireLampMat);
      lamp.position.set(wx, 0.92, zEnd);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), trapZonePaintMat);
      stripe.rotation.x = -Math.PI * 0.5;
      stripe.position.set(wx, 0.04, zEnd * 0.80);
      rwyGroup.add(sheave, lamp, stripe);
    }
  }

  // Optical Landing System (OLS / Meatball) Fresnel Lens Box clearly elevated on port deck edge
  const olsGroup = new THREE.Group();
  olsGroup.position.set(-54, 4.4, -spec.width * 0.5 - 4.4);
  const olsHousing = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 6.2, 4.2),
    new THREE.MeshStandardMaterial({ color: 0x10171f, roughness: 0.72 }),
  );
  const datumMat = new THREE.MeshBasicMaterial({ color: 0x3cff88 });
  const leftDatum = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.78, 5.6), datumMat);
  leftDatum.position.set(-1.25, 0, -4.9);
  const rightDatum = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.78, 5.6), datumMat);
  rightDatum.position.set(-1.25, 0, 4.9);
  const meatballMat = new THREE.MeshBasicMaterial({ color: 0xffc238 });
  const meatball = new THREE.Mesh(new THREE.SphereGeometry(1.18, 12, 12), meatballMat);
  meatball.position.set(-1.38, 0, 0);
  olsGroup.add(olsHousing, leftDatum, rightDatum, meatball);
  rwyGroup.add(olsGroup);

  // Lit twilight deck centerline LEDs, green threshold bar & alternating amber/blue perimeter beacons
  const centerLedMat = new THREE.MeshBasicMaterial({ color: 0xffe6a3 });
  for (let x = -spec.length * 0.5 + 14; x <= spec.length * 0.5 - 14; x += 18) {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.38, 6, 6), centerLedMat);
    cl.position.set(x, 0.22, 0);
    rwyGroup.add(cl);
  }
  const greenBarMat = new THREE.MeshBasicMaterial({ color: 0x36f57f });
  for (let zBar = -spec.width * 0.42; zBar <= spec.width * 0.42; zBar += 4.2) {
    const g1 = new THREE.Mesh(new THREE.SphereGeometry(0.52, 8, 8), greenBarMat);
    g1.position.set(-spec.length * 0.5 + 2.5, 0.48, zBar);
    rwyGroup.add(g1);
  }
  const blueMat = new THREE.MeshBasicMaterial({ color: 0x45c8ff });
  const amberEdgeMat = new THREE.MeshBasicMaterial({ color: 0xffa638 });
  let edgeIdx = 0;
  for (let x = -spec.length * 0.5; x <= spec.length * 0.5 + 1; x += 18) {
    edgeIdx += 1;
    for (let zSide of [-spec.width * 0.5 - 1.2, spec.width * 0.5 + 1.2]) {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.52, 8, 8),
        edgeIdx % 2 === 0 ? blueMat : amberEdgeMat,
      );
      b.position.set(x, 0.52, zSide);
      rwyGroup.add(b);
    }
  }

  // Platform operations island, lit dusk control bridge, mast & warm deck floodlight over arrestor zone
  const opsCab = new THREE.Mesh(new THREE.BoxGeometry(28, 13, 15), steelMat);
  opsCab.position.set(22, 6.5, -spec.width * 0.5 - 8);
  opsCab.castShadow = true;
  const bridgeGlass = new THREE.Mesh(
    new THREE.BoxGeometry(22, 3.2, 15.6),
    new THREE.MeshBasicMaterial({ color: 0x7ef2d4 }),
  );
  bridgeGlass.position.set(22, 10.4, -spec.width * 0.5 - 8);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, 22, 8), yellowSteelMat);
  mast.position.set(28, 22, -spec.width * 0.5 - 8);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  beacon.position.set(28, 33.5, -spec.width * 0.5 - 8);
  const deckFlood = new THREE.PointLight(0xffc278, 5.5, 120, 1.3);
  deckFlood.position.set(-48, 16, -24);
  rwyGroup.add(opsCab, bridgeGlass, mast, beacon, deckFlood);

  return { meatball, meatballMat };
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
  const radarScanners = [];

  const landAsphaltTex = createAsphaltGrainAndSkidTexture(false);
  const steelDeckTex = createAsphaltGrainAndSkidTexture(true);
  const hangarTex = createCorrugatedHangarTexture();

  const apronMat = new THREE.MeshStandardMaterial({ color: 0x30373f, roughness: 0.84 });
  const taxiYellowMat = new THREE.MeshStandardMaterial({ color: 0xf2b830, roughness: 0.65 });
  const hangarMat = new THREE.MeshStandardMaterial({ map: hangarTex, roughness: 0.52, metalness: 0.36 });
  const hangarSideMat = new THREE.MeshStandardMaterial({ color: 0xcad3dc, roughness: 0.52, metalness: 0.34 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xc95227, roughness: 0.50 });
  const towerGlassMat = new THREE.MeshBasicMaterial({ color: 0x7ef2d4 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0xe6ebef, roughness: 0.42, metalness: 0.32 });

  for (let r = 0; r < RUNWAY_SPECS.length; r += 1) {
    const spec = RUNWAY_SPECS[r];
    const rwyGroup = new THREE.Group();
    rwyGroup.position.set(spec.centerX, spec.elevation + 0.08, spec.centerZ);

    const rotY = ((90 - spec.headingDeg) * Math.PI) / 180;
    rwyGroup.rotation.y = rotY;

    const baseGeo = new THREE.PlaneGeometry(spec.width, spec.length);
    baseGeo.rotateX(-Math.PI * 0.5);
    baseGeo.rotateY(-Math.PI * 0.5);
    const rwyMesh = new THREE.Mesh(
      baseGeo,
      new THREE.MeshStandardMaterial({
        map: spec.offshore ? steelDeckTex : landAsphaltTex,
        roughness: spec.offshore ? 0.68 : 0.80,
        metalness: spec.offshore ? 0.25 : 0.05,
      }),
    );
    rwyMesh.receiveShadow = true;
    rwyGroup.add(rwyMesh);

    addCrispRunwayMarkings(rwyGroup, spec);

    let olsRef = null;
    if (spec.offshore) {
      olsRef = buildOffshorePlatformStructure(rwyGroup, spec);
    } else {
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

      // Detailed Apron, Taxiway Connector with yellow centerline, Corrugated Hangar, Control Tower + Spinning Radar & Fuel Tanks
      const apron = new THREE.Mesh(new THREE.PlaneGeometry(165, 62), apronMat);
      apron.rotation.x = -Math.PI * 0.5;
      apron.position.set(-24, -0.01, -spec.width * 0.5 - 31);
      apron.receiveShadow = true;

      const taxiLine = new THREE.Mesh(new THREE.PlaneGeometry(155, 0.65), taxiYellowMat);
      taxiLine.rotation.x = -Math.PI * 0.5;
      taxiLine.position.set(-24, 0.02, -spec.width * 0.5 - 12);
      rwyGroup.add(apron, taxiLine);

      const hangarMats = [hangarSideMat, hangarSideMat, roofMat, hangarSideMat, hangarMat, hangarSideMat];
      const hangar = new THREE.Mesh(new THREE.BoxGeometry(40, 12, 28), hangarMats);
      hangar.position.set(-64, 6.0, -spec.width * 0.5 - 38);
      hangar.castShadow = true;
      hangar.receiveShadow = true;

      const hangarRoof = new THREE.Mesh(new THREE.BoxGeometry(42, 2.2, 30), roofMat);
      hangarRoof.position.set(-64, 12.8, -spec.width * 0.5 - 38);
      hangarRoof.castShadow = true;

      // Control Tower with rotating white radar dome scanner
      const towerShaft = new THREE.Mesh(new THREE.BoxGeometry(8.5, 20, 8.5), hangarSideMat);
      towerShaft.position.set(14, 10, -spec.width * 0.5 - 34);
      towerShaft.castShadow = true;
      towerShaft.receiveShadow = true;
      const towerCab = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 5.6, 5.2, 8), towerGlassMat);
      towerCab.position.set(14, 22.2, -spec.width * 0.5 - 34);
      const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(7.8, 2.8, 8), roofMat);
      towerRoof.position.set(14, 26.0, -spec.width * 0.5 - 34);

      const radarHub = new THREE.Group();
      radarHub.position.set(14, 28.4, -spec.width * 0.5 - 34);
      const radarBar = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.9, 0.7), tankMat);
      const radarDome = new THREE.Mesh(new THREE.SphereGeometry(1.8, 12, 10), tankMat);
      radarDome.position.y = -0.6;
      radarHub.add(radarBar, radarDome);
      radarScanners.push(radarHub);

      // Twin AVGAS / JET-A1 fuel storage tanks beside apron
      for (let t = 0; t < 2; t += 1) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 11.5, 14), tankMat);
        tank.rotation.z = Math.PI * 0.5;
        tank.position.set(-16 + t * 14, 3.8, -spec.width * 0.5 - 46);
        tank.castShadow = true;
        rwyGroup.add(tank);
      }
      rwyGroup.add(hangar, hangarRoof, towerShaft, towerCab, towerRoof, radarHub);
    }

    const papiOff = spec.offshore ? 44 : 128;
    const papiSide = spec.offshore ? spec.width * 0.5 - 4 : spec.width * 0.5 + 16;
    const papiPrimary = buildPapiBoxRow();
    papiPrimary.rowGroup.position.set(-spec.length * 0.5 + papiOff, 0, -papiSide);
    papiPrimary.rowGroup.rotation.y = Math.PI * 0.5;
    rwyGroup.add(papiPrimary.rowGroup);

    const papiSecondary = buildPapiBoxRow();
    papiSecondary.rowGroup.position.set(spec.length * 0.5 - papiOff, 0, papiSide);
    papiSecondary.rowGroup.rotation.y = -Math.PI * 0.5;
    rwyGroup.add(papiSecondary.rowGroup);

    const ws = buildWindsockUnit();
    ws.root.position.set(-spec.length * 0.5 + (spec.offshore ? 36 : 95), 0, spec.width * 0.5 + (spec.offshore ? -6 : 18));
    rwyGroup.add(ws.root);
    windsocks.push({ ...ws, rwyRotY: rotY });

    aerodromeGroup.add(rwyGroup);

    const hdgRad = (spec.headingDeg * Math.PI) / 180;
    const fwdX = Math.sin(hdgRad);
    const fwdZ = -Math.cos(hdgRad);
    runways.push({
      spec,
      rwyGroup,
      papiPrimary,
      papiSecondary,
      olsRef,
      primaryThresholdPos: new THREE.Vector3(
        spec.centerX - fwdX * (spec.length * 0.5 - papiOff),
        spec.elevation,
        spec.centerZ - fwdZ * (spec.length * 0.5 - papiOff),
      ),
      secondaryThresholdPos: new THREE.Vector3(
        spec.centerX + fwdX * (spec.length * 0.5 - papiOff),
        spec.elevation,
        spec.centerZ + fwdZ * (spec.length * 0.5 - papiOff),
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
    radarScanners,
    ringsGroup,
    ringInstances: [],
    dropZoneInstances: [],
  };
}

function createFlarePlumeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0.0, 'rgba(255, 195, 110, 0.82)');
  g.addColorStop(0.18, 'rgba(255, 118, 46, 0.52)');
  g.addColorStop(0.58, 'rgba(235, 92, 38, 0.18)');
  g.addColorStop(1.0, 'rgba(220, 70, 30, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);

  // Soft horizontal fade so pillar never has hard edges
  ctx.globalCompositeOperation = 'destination-in';
  const hg = ctx.createLinearGradient(0, 0, 64, 0);
  hg.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  hg.addColorStop(0.5, 'rgba(255,255,255,1.0)');
  hg.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, 64, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function rebuildMissionRings(aids, ringDefs = [], dropZoneDefs = []) {
  while (aids.ringsGroup.children.length > 0) {
    aids.ringsGroup.remove(aids.ringsGroup.children[0]);
  }
  aids.ringInstances = [];
  aids.dropZoneInstances = [];
  const flareTex = dropZoneDefs.length > 0 ? createFlarePlumeTexture() : null;

  for (let i = 0; i < ringDefs.length; i += 1) {
    const def = ringDefs[i];
    const radius = def.radius ?? 28;
    const holder = new THREE.Group();
    holder.position.set(def.x, def.y, def.z);
    const rotRad = ((def.headingDeg ?? 90) * Math.PI) / 180;
    holder.rotation.y = -rotRad;

    // Sleek luminous holographic aviation gate (no heavy cartoon black border!)
    const glowMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xffb347 : 0x52ebd8,
      transparent: true,
      opacity: i === 0 ? 0.90 : 0.65,
    });
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.82, 12, 48), glowMat);

    const outerWireMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xffe0a3 : 0x8ef7eb,
      transparent: true,
      opacity: i === 0 ? 0.55 : 0.30,
    });
    const outerWire = new THREE.Mesh(new THREE.TorusGeometry(radius + 2.0, 0.28, 8, 48), outerWireMat);

    const haloMat = new THREE.MeshBasicMaterial({
      color: i === 0 ? 0xffb347 : 0x45e6d6,
      transparent: true,
      opacity: i === 0 ? 0.16 : 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const haloRing = new THREE.Mesh(new THREE.RingGeometry(radius - 3.2, radius + 3.8, 48), haloMat);

    for (let f = 0; f < 4; f += 1) {
      const ang = (f * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4.2, 6), glowMat);
      fin.position.set(Math.cos(ang) * (radius - 2.3), Math.sin(ang) * (radius - 2.3), 0);
      fin.rotation.z = ang + Math.PI * 0.5;
      holder.add(fin);
    }

    holder.add(coreRing, outerWire, haloRing);
    aids.ringsGroup.add(holder);
    aids.ringInstances.push({
      def,
      radius,
      holder,
      glowMat,
      outerWireMat,
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
      color: 0xff9436,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    });
    const outerCircle = new THREE.Mesh(new THREE.RingGeometry(28, 33, 40), ringMat);
    outerCircle.rotation.x = -Math.PI * 0.5;
    const innerCrossA = new THREE.Mesh(new THREE.PlaneGeometry(24, 3.6), ringMat);
    innerCrossA.rotation.x = -Math.PI * 0.5;
    const innerCrossB = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 24), ringMat);
    innerCrossB.rotation.x = -Math.PI * 0.5;

    // Soft volumetric crossed gradient smoke-flare plume (no hard opaque pipe!)
    const flareMat = new THREE.MeshBasicMaterial({
      map: flareTex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flarePillar = new THREE.Group();
    const planeA = new THREE.Mesh(new THREE.PlaneGeometry(22, 76), flareMat);
    planeA.position.y = 38;
    const planeB = new THREE.Mesh(new THREE.PlaneGeometry(22, 76), flareMat);
    planeB.rotation.y = Math.PI * 0.5;
    planeB.position.y = 38;
    const emberCore = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    );
    emberCore.position.y = 1.6;
    flarePillar.add(planeA, planeB, emberCore);

    dzGroup.add(outerCircle, innerCrossA, innerCrossB, flarePillar);
    aids.ringsGroup.add(dzGroup);
    aids.dropZoneInstances.push({
      def: dz,
      position: new THREE.Vector3(dz.x, groundY, dz.z),
      dzGroup,
      ringMat,
      flareMat,
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
    ringInst.outerWireMat?.color.setHex(0x8ff7c0);
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
    if (rwy.olsRef) {
      const hDist = Math.max(
        18,
        Math.hypot(aircraftPos.x - rwy.primaryThresholdPos.x, aircraftPos.z - rwy.primaryThresholdPos.z),
      );
      const slopeDeg = (Math.atan2(aircraftPos.y - rwy.primaryThresholdPos.y, hDist) * 180) / Math.PI;
      const err = Math.max(-1.6, Math.min(1.6, (slopeDeg - 3.5) * 1.15));
      rwy.olsRef.meatball.position.y = err;
      rwy.olsRef.meatballMat.color.setHex(err < -0.95 ? 0xff3b30 : 0xffb338);
    }
  }

  for (let i = 0; i < aids.radarScanners.length; i += 1) {
    aids.radarScanners[i].rotation.y = elapsedSec * 1.45;
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
      ring.glowMat.color.setHex(0xffb347);
      ring.outerWireMat?.color.setHex(0xffe0a3);
      ring.haloMat.color.setHex(0xffb84d);
      ring.haloMat.opacity = 0.16 + Math.sin(elapsedSec * 4.0) * 0.05;
      const pulse = 1.0 + Math.sin(elapsedSec * 3.2) * 0.025;
      ring.holder.scale.setScalar(pulse);
    } else {
      ring.glowMat.color.setHex(0x4ae6d8);
      ring.outerWireMat?.color.setHex(0x8ff7ee);
      ring.haloMat.opacity = 0.06;
      ring.holder.scale.setScalar(1.0);
    }
  }
}
