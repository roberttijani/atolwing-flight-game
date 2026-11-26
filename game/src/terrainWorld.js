// Deterministic volcanic archipelago world, runway grading, ocean waves, and coastal landmarks.
import * as THREE from '../vendor/three.min.js';

export const WORLD_SIZE = 9600;
export const SEA_LEVEL = 0.0;

export const RUNWAY_SPECS = [
  {
    id: 'WARA',
    name: 'Karang Jaya Atoll Strip',
    code: '09/27',
    primaryLabel: '09',
    secondaryLabel: '27',
    centerX: -1500,
    centerZ: 220,
    elevation: 18.0,
    headingDeg: 90,
    length: 920,
    width: 36,
  },
  {
    id: 'WAKB',
    name: 'Kaldera Timur Highland Outpost',
    code: '14/32',
    primaryLabel: '14',
    secondaryLabel: '32',
    centerX: 1420,
    centerZ: 320,
    elevation: 96.0,
    headingDeg: 140,
    length: 780,
    width: 32,
  },
];

const ISLAND_LOBES = [
  // Western Karang Jaya Atoll
  { x: -1520, z: 210, rx: 820, rz: 420, height: 34, power: 1.5 },
  { x: -1480, z: -380, rx: 680, rz: 460, height: 215, power: 1.9 },
  { x: -2050, z: -120, rx: 460, rz: 390, height: 128, power: 2.0 },
  { x: -960, z: -190, rx: 420, rz: 340, height: 95, power: 1.8 },
  // Central Selat Angin Gorge & Sea-Stacks
  { x: -135, z: -275, rx: 245, rz: 230, height: 248, power: 2.3 },
  { x: 235, z: 155, rx: 265, rz: 240, height: 272, power: 2.35 },
  { x: -520, z: 620, rx: 250, rz: 220, height: 74, power: 1.7 },
  { x: 460, z: -560, rx: 220, rz: 195, height: 185, power: 2.2 },
  // Eastern Kaldera Timur Volcanic Island
  { x: 1440, z: 310, rx: 690, rz: 580, height: 118, power: 1.45 },
  { x: 1920, z: -760, rx: 980, rz: 880, height: 465, power: 1.75, crater: 0.44 },
  { x: 2240, z: 180, rx: 580, rz: 520, height: 240, power: 1.9 },
  { x: 1080, z: -480, rx: 490, rz: 430, height: 175, power: 1.85 },
  // Southern Rescue Cove & Reef Chain
  { x: 240, z: 1360, rx: 560, rz: 380, height: 112, power: 1.75 },
  { x: -760, z: 1290, rx: 480, rz: 340, height: 86, power: 1.8 },
  { x: 1020, z: 1490, rx: 340, rz: 290, height: 68, power: 1.9 },
];

export const LIGHTHOUSE_POS = { x: -520, z: 620 };

function hash2D(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function valueNoise2D(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function ridgedFbm(x, z) {
  let sum = 0;
  let amp = 0.52;
  let freq = 0.0021;
  for (let i = 0; i < 4; i += 1) {
    const n = valueNoise2D(x * freq + i * 19.7, z * freq - i * 13.3);
    const ridge = 1.0 - Math.abs(n * 2.0 - 1.0);
    sum += ridge * ridge * amp;
    freq *= 2.12;
    amp *= 0.48;
  }
  return sum;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function projectOntoRunway(x, z, rwy) {
  const rad = (rwy.headingDeg * Math.PI) / 180;
  const fwdX = Math.sin(rad);
  const fwdZ = -Math.cos(rad);
  const rightX = Math.cos(rad);
  const rightZ = Math.sin(rad);
  const dx = x - rwy.centerX;
  const dz = z - rwy.centerZ;
  return {
    along: dx * fwdX + dz * fwdZ,
    cross: dx * rightX + dz * rightZ,
    fwdX,
    fwdZ,
    rightX,
    rightZ,
  };
}

export function findContainingRunway(x, z, marginAlong = 8, marginCross = 3) {
  for (let i = 0; i < RUNWAY_SPECS.length; i += 1) {
    const rwy = RUNWAY_SPECS[i];
    const proj = projectOntoRunway(x, z, rwy);
    if (
      Math.abs(proj.along) <= rwy.length * 0.5 + marginAlong &&
      Math.abs(proj.cross) <= rwy.width * 0.5 + marginCross
    ) {
      return { runway: rwy, along: proj.along, cross: proj.cross };
    }
  }
  return null;
}

export function sampleTerrainHeight(x, z) {
  let base = -16.0;
  const detail = ridgedFbm(x, z);

  for (let i = 0; i < ISLAND_LOBES.length; i += 1) {
    const lobe = ISLAND_LOBES[i];
    const nx = (x - lobe.x) / lobe.rx;
    const nz = (z - lobe.z) / lobe.rz;
    const d2 = nx * nx + nz * nz;
    if (d2 >= 1.35) continue;
    const d = Math.sqrt(d2);
    const falloff = Math.pow(Math.max(0, 1.0 - d / 1.15), lobe.power);
    let h = lobe.height * falloff * (0.64 + 0.58 * detail);

    if (lobe.crater && d < 0.48) {
      const craterDepth = smoothstep(0.48, 0.08, d) * lobe.height * lobe.crater;
      h -= craterDepth;
    }
    // Subtle coastal cliff stepping for stratified volcanic island silhouette
    if (h > 14 && h < 165) {
      h += Math.sin(h * 0.14) * 3.2;
    }
    if (h - 8.0 > base) {
      base = Math.max(base, h - 6.0);
    }
  }

  // Blend graded flat runway mesas and approach aprons cleanly into surrounding terrain
  for (let i = 0; i < RUNWAY_SPECS.length; i += 1) {
    const rwy = RUNWAY_SPECS[i];
    const proj = projectOntoRunway(x, z, rwy);
    const halfL = rwy.length * 0.5 + 54;
    const halfW = rwy.width * 0.5 + 34;
    const overL = Math.max(0, Math.abs(proj.along) - halfL);
    const overW = Math.max(0, Math.abs(proj.cross) - halfW);
    const padDist = Math.hypot(overL / 155, overW / 105);
    if (padDist < 1.0) {
      const flatten = 1.0 - smoothstep(0.0, 1.0, padDist);
      base = base * (1.0 - flatten) + rwy.elevation * flatten;
    }
  }

  return base;
}

export function classifySurfaceMaterial(x, z, height) {
  const onRunway = findContainingRunway(x, z, 6, 2);
  if (onRunway) return 'runway';
  if (height <= SEA_LEVEL + 0.15) return 'water';
  if (height < 5.5) return 'sand';
  if (height > 180) return 'volcanic_rock';
  return 'island_ground';
}

function computeTerrainColor(x, z, h, slope) {
  if (h < -2.5) return [0.06, 0.25, 0.34];
  if (h < 0.8) return [0.16, 0.58, 0.62]; // Turquoise reef shelf
  if (h < 5.2) return [0.78, 0.70, 0.52]; // Warm coral beach sand

  // Check runway shoulder gravel pad
  for (let i = 0; i < RUNWAY_SPECS.length; i += 1) {
    const rwy = RUNWAY_SPECS[i];
    const proj = projectOntoRunway(x, z, rwy);
    if (Math.abs(proj.along) < rwy.length * 0.5 + 38 && Math.abs(proj.cross) < rwy.width * 0.5 + 26) {
      return [0.34, 0.36, 0.33];
    }
  }

  if (slope > 0.56 || h > 255) {
    // Stratified dark volcanic basalt with warm iron-oxide highlights
    const band = 0.5 + 0.5 * Math.sin(h * 0.19 + x * 0.008);
    return [0.22 + band * 0.12, 0.19 + band * 0.08, 0.18 + band * 0.05];
  }
  if (h > 150) {
    // Sunlit highland caldera scrub & golden grass
    return [0.42, 0.47, 0.24];
  }
  // Lush emerald tropical rainforest canopy
  const canopyVar = valueNoise2D(x * 0.018, z * 0.018);
  return [0.15 + canopyVar * 0.11, 0.38 + canopyVar * 0.14, 0.17 + canopyVar * 0.06];
}

function createOceanWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#14495c';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i += 1) {
    const rx = (hash2D(i, 17) * 256) | 0;
    const ry = (hash2D(i, 53) * 256) | 0;
    const len = 10 + hash2D(i, 91) * 26;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(130, 228, 240, 0.14)' : 'rgba(255, 208, 138, 0.10)';
    ctx.fillRect(rx, ry, len, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(95, 95);
  return tex;
}

function buildLighthouseAndBoats(group) {
  const lhY = sampleTerrainHeight(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.z);
  const lhGroup = new THREE.Group();
  lhGroup.position.set(LIGHTHOUSE_POS.x, lhY - 0.5, LIGHTHOUSE_POS.z);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.55 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd94832, roughness: 0.5 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd275 });

  for (let band = 0; band < 4; band += 1) {
    const rBot = 4.6 - band * 0.55;
    const rTop = 4.05 - band * 0.55;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, 6.5, 12),
      band % 2 === 0 ? whiteMat : redMat,
    );
    seg.position.y = 3.25 + band * 6.5;
    lhGroup.add(seg);
  }

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 4.2, 12), beaconMat);
  lantern.position.y = 28.0;
  lhGroup.add(lantern);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.2, 12), redMat);
  roof.position.y = 31.5;
  lhGroup.add(roof);

  // Rotating lighthouse beam cone
  const beamGeo = new THREE.ConeGeometry(18, 120, 16, 1, true);
  beamGeo.translate(0, -60, 0);
  beamGeo.rotateX(Math.PI * 0.5);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffcf6e,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.y = 28.0;
  lhGroup.add(beamMesh);

  group.add(lhGroup);

  // Add coastal supply vessels in the Selat Angin channel for scale & visual depth
  const boatCoords = [
    { x: -1240, z: 540, hdg: 0.5 },
    { x: -340, z: 320, hdg: 1.9 },
    { x: 760, z: 640, hdg: -0.7 },
    { x: 180, z: 1020, hdg: 2.4 },
  ];
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x263847, roughness: 0.6 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xd96b38, roughness: 0.65 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xedeae2, roughness: 0.5 });

  for (let i = 0; i < boatCoords.length; i += 1) {
    const b = boatCoords[i];
    const ship = new THREE.Group();
    ship.position.set(b.x, 1.2, b.z);
    ship.rotation.y = b.hdg;

    const hull = new THREE.Mesh(new THREE.BoxGeometry(9, 3.6, 28), hullMat);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.2, 24), deckMat);
    deck.position.y = 2.1;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(6.4, 5.2, 7.0), cabinMat);
    bridge.position.set(0, 5.0, 5.0);
    ship.add(hull, deck, bridge);
    group.add(ship);
  }

  return { beamMesh };
}

function buildTropicalTreeInstances(group) {
  const positions = [];
  for (let i = 0; i < 1050; i += 1) {
    const x = (hash2D(i, 701) - 0.5) * 5600;
    const z = (hash2D(i, 919) - 0.5) * 4400;
    const h = sampleTerrainHeight(x, z);
    if (h < 7.5 || h > 142) continue;
    if (findContainingRunway(x, z, 74, 48)) continue;
    const hx = sampleTerrainHeight(x + 6, z) - h;
    const hz = sampleTerrainHeight(x, z + 6) - h;
    if (Math.hypot(hx, hz) / 6 > 0.45) continue;
    positions.push({ x, y: h, z, scale: 0.85 + hash2D(i, 313) * 0.72, tint: hash2D(i, 577) });
    if (positions.length >= 360) break;
  }

  if (positions.length === 0) return;

  const count = positions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.36, 0.62, 3.8, 7);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6e4b30,
    emissive: 0x24170c,
    emissiveIntensity: 0.35,
    roughness: 0.9,
  });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);

  const lowerCrownGeo = new THREE.ConeGeometry(4.3, 6.6, 9);
  const upperCrownGeo = new THREE.ConeGeometry(3.2, 5.8, 9);
  const foliageMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x1d3316,
    emissiveIntensity: 0.46,
  });
  const lowerCrowns = new THREE.InstancedMesh(lowerCrownGeo, foliageMat, count);
  const upperCrowns = new THREE.InstancedMesh(upperCrownGeo, foliageMat, count);

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i += 1) {
    const p = positions[i];
    const s = p.scale;

    dummy.position.set(p.x, p.y + 1.6 * s, p.z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, i * 0.93, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, p.y + 5.1 * s, p.z);
    dummy.scale.set(s * 1.04, s, s * 1.04);
    dummy.updateMatrix();
    lowerCrowns.setMatrixAt(i, dummy.matrix);

    dummy.position.set(p.x, p.y + 8.3 * s, p.z);
    dummy.scale.set(s * 0.88, s * 0.95, s * 0.88);
    dummy.rotation.set(0, i * 0.93 + 0.4, 0);
    dummy.updateMatrix();
    upperCrowns.setMatrixAt(i, dummy.matrix);

    // Warm sunlit olive-emerald variation (never flat black!)
    color.setRGB(
      0.26 + p.tint * 0.14,
      0.46 + p.tint * 0.14,
      0.20 + (1 - p.tint) * 0.08,
    );
    lowerCrowns.setColorAt(i, color);
    color.offsetHSL(0.01, 0.02, 0.05);
    upperCrowns.setColorAt(i, color);
  }

  trunks.instanceMatrix.needsUpdate = true;
  lowerCrowns.instanceMatrix.needsUpdate = true;
  upperCrowns.instanceMatrix.needsUpdate = true;
  if (lowerCrowns.instanceColor) lowerCrowns.instanceColor.needsUpdate = true;
  if (upperCrowns.instanceColor) upperCrowns.instanceColor.needsUpdate = true;

  group.add(trunks, lowerCrowns, upperCrowns);
}

export function buildArchipelagoWorld(scene) {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'ArchipelagoWorld';

  // Build layered volcanic terrain mesh (224 x 224 grid over 7200m core island zone)
  const terrainSpan = 7000;
  const segs = 220;
  const geo = new THREE.PlaneGeometry(terrainSpan, terrainSpan, segs, segs);
  geo.rotateX(-Math.PI * 0.5);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = sampleTerrainHeight(x, z);
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = Math.max(0, Math.min(1, normals.getY(i)));
    const slope = 1.0 - ny;
    const [r, g, b] = computeTerrainColor(x, z, y, slope);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.04,
    flatShading: true,
  });
  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  worldGroup.add(terrainMesh);

  // Sparkling golden-hour ocean plane
  const waterTex = createOceanWaterTexture();
  const oceanGeo = new THREE.PlaneGeometry(WORLD_SIZE * 1.8, WORLD_SIZE * 1.8, 72, 72);
  oceanGeo.rotateX(-Math.PI * 0.5);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x196b82,
    map: waterTex,
    roughness: 0.30,
    metalness: 0.16,
    emissive: 0x0d3647,
    emissiveIntensity: 0.42,
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.position.y = SEA_LEVEL;
  worldGroup.add(oceanMesh);

  // Shallow turquoise coastal surf halos around main islands
  const surfMat = new THREE.MeshBasicMaterial({
    color: 0x9ef3ee,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const reefCenters = [
    { x: -1520, z: 20, r: 920 },
    { x: 1580, z: -220, r: 1120 },
    { x: -135, z: -275, r: 245 },
    { x: 235, z: 155, r: 265 },
    { x: 240, z: 1360, r: 540 },
  ];
  const surfRings = [];
  for (let i = 0; i < reefCenters.length; i += 1) {
    const rc = reefCenters[i];
    const ring = new THREE.Mesh(new THREE.RingGeometry(rc.r * 0.72, rc.r * 0.96, 36), surfMat);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.set(rc.x, SEA_LEVEL + 0.28, rc.z);
    worldGroup.add(ring);
    surfRings.push(ring);
  }

  const landmarks = buildLighthouseAndBoats(worldGroup);
  buildTropicalTreeInstances(worldGroup);
  scene.add(worldGroup);

  return {
    worldGroup,
    terrainMesh,
    oceanMesh,
    waterTex,
    surfRings,
    lighthouseBeam: landmarks.beamMesh,
  };
}

export function updateOceanWaves(worldRefs, elapsedSec) {
  if (!worldRefs) return;
  worldRefs.waterTex.offset.x = (elapsedSec * 0.018) % 1;
  worldRefs.waterTex.offset.y = (elapsedSec * 0.012) % 1;
  if (worldRefs.lighthouseBeam) {
    worldRefs.lighthouseBeam.rotation.y = elapsedSec * 1.15;
  }
  for (let i = 0; i < worldRefs.surfRings.length; i += 1) {
    const s = 1.0 + Math.sin(elapsedSec * 1.4 + i) * 0.018;
    worldRefs.surfRings[i].scale.set(s, s, 1);
  }
}
