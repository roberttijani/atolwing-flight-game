// Procedural PBR riveted aircraft fleet (ATW-28 Islander, VX-9 Peregrine, PL-40 Mariner) and brushed-metal 3D cockpit with moving-map MFD.
import * as THREE from '../vendor/three.min.js';
import { getAircraftSpec } from './aircraftCatalog.js';
import { RUNWAY_SPECS, TERRAIN_SPAN } from './terrainWorld.js';

function createPropBlurTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const cx = 128;
  const cy = 128;

  const baseGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
  baseGrad.addColorStop(0.0, 'rgba(225, 234, 242, 0.34)');
  baseGrad.addColorStop(0.62, 'rgba(182, 198, 212, 0.16)');
  baseGrad.addColorStop(0.86, 'rgba(255, 184, 58, 0.44)');
  baseGrad.addColorStop(0.95, 'rgba(50, 58, 66, 0.12)');
  baseGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 122, 0, Math.PI * 2);
  ctx.fill();

  for (let b = 0; b < 4; b += 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((b * Math.PI) / 2 + 0.3);
    ctx.fillStyle = 'rgba(235, 242, 248, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 118, -0.16, 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}

function createAircraftPbrTextures(spec) {
  const size = 512;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = size;
  diffCanvas.height = size;
  const d = diffCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const b = bumpCanvas.getContext('2d');

  d.fillStyle = spec.livery.primary;
  d.fillRect(0, 0, size, size);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, size, size);

  // Subtle brushed aluminum grain & light operational weathering streaks
  for (let i = 0; i < 640; i += 1) {
    const x = (Math.imul(i, 73856093) >>> 23) & 511;
    const y = (Math.imul(i, 19349663) >>> 23) & 511;
    d.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(28,36,44,0.045)';
    d.fillRect(x, y, 28, 2);
  }

  // Aircraft skin panel seams & riveted line details
  d.strokeStyle = 'rgba(24, 34, 44, 0.22)';
  d.lineWidth = 1.4;
  b.strokeStyle = 'rgba(42, 42, 42, 0.65)';
  b.lineWidth = 1.6;
  for (let p = 64; p < size; p += 64) {
    d.beginPath();
    d.moveTo(0, p);
    d.lineTo(size, p);
    d.moveTo(p, 0);
    d.lineTo(p, size);
    d.stroke();

    b.beginPath();
    b.moveTo(0, p);
    b.lineTo(size, p);
    b.moveTo(p, 0);
    b.lineTo(p, size);
    b.stroke();

    // Fine rivet dots along panel edges
    d.fillStyle = 'rgba(30, 40, 50, 0.24)';
    b.fillStyle = 'rgba(220, 220, 220, 0.58)';
    for (let r = 8; r < size; r += 16) {
      d.fillRect(r, p + 4, 2, 2);
      b.fillRect(r, p + 4, 2, 2);
    }
  }

  // Inspection access hatch squares
  d.strokeStyle = 'rgba(22, 30, 40, 0.34)';
  d.strokeRect(148, 212, 34, 24);
  d.strokeRect(334, 84, 28, 22);

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.colorSpace = THREE.SRGBColorSpace;
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.RepeatWrapping;
  diffTex.anisotropy = 8;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.anisotropy = 8;

  return { diffTex, bumpTex };
}

function createRegistrationDecal(regText, bgHex = null) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (bgHex) {
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 256, 96);
  }
  ctx.fillStyle = '#182634';
  ctx.font = 'bold 42px Bahnschrift, "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(regText, 128, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrushedMetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#232f3c';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 1) {
    const v = 30 + ((Math.imul(y, 1103515245) >>> 24) & 15);
    ctx.fillStyle = `rgba(${v + 12}, ${v + 20}, ${v + 30}, 0.35)`;
    ctx.fillRect(0, y, 256, 1);
  }
  for (let i = 0; i < 420; i += 1) {
    const x = (Math.imul(i, 48271) >>> 24) & 255;
    const y = (Math.imul(i, 16807) >>> 24) & 255;
    ctx.fillStyle = 'rgba(210, 228, 244, 0.08)';
    ctx.fillRect(x, y, 36, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCanopyGlintTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  // Subtle curved canopy glass sheen along window edges only (center stays 100% clear)
  const edgeGrad = ctx.createLinearGradient(0, 0, 256, 256);
  edgeGrad.addColorStop(0.0, 'rgba(215, 238, 255, 0.24)');
  edgeGrad.addColorStop(0.18, 'rgba(215, 238, 255, 0.06)');
  edgeGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.0)');
  edgeGrad.addColorStop(0.84, 'rgba(255, 224, 184, 0.05)');
  edgeGrad.addColorStop(1.0, 'rgba(255, 224, 184, 0.20)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, 256, 256);

  // Thin diagonal specular catch-light on outer glass margin
  ctx.strokeStyle = 'rgba(255, 248, 236, 0.14)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(16, 48);
  ctx.lineTo(68, 12);
  ctx.moveTo(192, 16);
  ctx.lineTo(244, 58);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePropellerAssembly(scale = 1.0) {
  const hubGroup = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x181e24, roughness: 0.34, metalness: 0.46 });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xffbc3b });

  for (let i = 0; i < 4; i += 1) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15 * scale, 1.18 * scale, 0.026), bladeMat);
    blade.position.y = 0.64 * scale;
    blade.rotation.y = 0.30;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.155 * scale, 0.15 * scale, 0.03), tipMat);
    tip.position.y = 1.16 * scale;
    tip.rotation.y = 0.30;
    arm.add(blade, tip);
    hubGroup.add(arm);
  }
  return hubGroup;
}

function makeSweptSurfaceGeometry(points2D, thickness) {
  const shape = new THREE.Shape();
  shape.moveTo(points2D[0][0], points2D[0][1]);
  for (let i = 1; i < points2D.length; i += 1) {
    shape.lineTo(points2D[i][0], points2D[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: Math.min(0.03, thickness * 0.25),
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

function enableShadows(group) {
  group.traverse((obj) => {
    if (obj.isMesh && obj.material && !obj.material.transparent) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

export function buildCockpitInterior(spec) {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'CockpitInterior3D';

  const brushedTex = createBrushedMetalTexture();
  const tubMat = new THREE.MeshStandardMaterial({ color: 0x0b1117, roughness: 0.9, metalness: 0.08 });
  const cowlMat = new THREE.MeshStandardMaterial({
    color: 0x131c26,
    roughness: 0.72,
    metalness: 0.24,
    bumpMap: brushedTex,
    bumpScale: 0.015,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x243342,
    map: brushedTex,
    bumpMap: brushedTex,
    bumpScale: 0.02,
    roughness: 0.46,
    metalness: 0.56,
  });
  const bezelOuterMat = new THREE.MeshStandardMaterial({
    color: 0x3a4c5e,
    map: brushedTex,
    roughness: 0.38,
    metalness: 0.64,
  });
  const bezelInnerMat = new THREE.MeshStandardMaterial({ color: 0x141d26, roughness: 0.65, metalness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3b5066, roughness: 0.42, metalness: 0.52 });
  const accentMat = new THREE.MeshStandardMaterial({ color: spec.livery.accent, roughness: 0.36, metalness: 0.18 });

  // Fully enclosed lower & side cockpit tub
  const firewall = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.15, 0.14), tubMat);
  firewall.position.set(0, -0.05, -2.02);
  const floorDeck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 1.85), tubMat);
  floorDeck.position.set(0, -0.44, -1.25);
  const lowerApron = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.52, 0.18), cowlMat);
  lowerApron.position.set(0, -0.08, -1.88);
  const leftSideWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 1.75), cowlMat);
  leftSideWall.position.set(-0.98, 0.12, -1.32);
  leftSideWall.rotation.z = -0.10;
  const rightSideWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 1.75), cowlMat);
  rightSideWall.position.set(0.98, 0.12, -1.32);
  rightSideWall.rotation.z = 0.10;
  cockpitGroup.add(firewall, floorDeck, lowerApron, leftSideWall, rightSideWall);

  // Main brushed-metal instrument dashboard & contoured glareshield visor
  const panelBoard = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.54, 0.14), frameMat);
  panelBoard.position.set(0, 0.33, -1.94);
  panelBoard.rotation.x = -0.16;
  cockpitGroup.add(panelBoard);

  const glareCenter = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 0.30), cowlMat);
  glareCenter.position.set(0, 0.585, -1.88);
  glareCenter.rotation.x = 0.04;
  const glareLeftSlope = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.048, 0.28), cowlMat);
  glareLeftSlope.position.set(-0.82, 0.545, -1.88);
  glareLeftSlope.rotation.set(0.04, 0, 0.26);
  const glareRightSlope = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.048, 0.28), cowlMat);
  glareRightSlope.position.set(0.82, 0.545, -1.88);
  glareRightSlope.rotation.set(0.04, 0, -0.26);
  const glareLip = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.022, 0.042), bezelOuterMat);
  glareLip.position.set(0, 0.568, -1.735);
  cockpitGroup.add(glareCenter, glareLeftSlope, glareRightSlope, glareLip);

  // Illuminated annunciator strip under glareshield
  const annStrip = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.045, 0.05), bezelInnerMat);
  annStrip.position.set(0, 0.535, -1.82);
  cockpitGroup.add(annStrip);
  const lampColors = [0x4bf598, 0x4bf598, 0x5af2b8, 0xff9f2e, 0x4bf598, 0x5af2b8];
  for (let i = 0; i < lampColors.length; i += 1) {
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.022, 0.015),
      new THREE.MeshBasicMaterial({ color: lampColors[i] }),
    );
    lamp.position.set(-0.52 + i * 0.208, 0.535, -1.79);
    cockpitGroup.add(lamp);
  }

  const cockpitFlood = new THREE.PointLight(0xffd8ab, 1.65, 4.0);
  cockpitFlood.position.set(0, 1.02, -1.26);
  cockpitGroup.add(cockpitFlood);

  // Contoured exterior nose cowling matching active aircraft livery
  const noseMat = new THREE.MeshStandardMaterial({
    color: spec.livery.secondary,
    roughness: 0.36,
    metalness: 0.42,
  });
  const noseCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.58, 1.22, 16), noseMat);
  noseCowl.rotation.x = Math.PI * 0.5 + 0.12;
  noseCowl.scale.set(1.12, 1.0, 0.68);
  noseCowl.position.set(0, 0.24, -2.58);
  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 1.05), accentMat);
  noseStripe.position.set(0, 0.49, -2.54);
  noseStripe.rotation.x = 0.12;
  cockpitGroup.add(noseCowl, noseStripe);

  // Panoramic canopy struts, corner gussets, overhead brow, and thin reflective canopy glass sheen
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.88, 0.085), frameMat);
  leftPillar.position.set(-0.84, 0.86, -1.74);
  leftPillar.rotation.set(0.30, 0, -0.20);
  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.88, 0.085), frameMat);
  rightPillar.position.set(0.84, 0.86, -1.74);
  rightPillar.rotation.set(0.30, 0, 0.20);
  const leftGusset = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.06), bezelOuterMat);
  leftGusset.position.set(-0.68, 1.14, -1.68);
  leftGusset.rotation.z = 0.36;
  const rightGusset = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.06), bezelOuterMat);
  rightGusset.position.set(0.68, 1.14, -1.68);
  rightGusset.rotation.z = -0.36;
  const topBrow = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.09, 0.28), cowlMat);
  topBrow.position.set(0, 1.21, -1.66);

  // Subtle curved canopy glass edge highlight pane
  const canopyGlassPane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.64, 0.66),
    new THREE.MeshBasicMaterial({
      map: createCanopyGlintTexture(),
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  canopyGlassPane.position.set(0, 0.89, -1.77);
  canopyGlassPane.rotation.x = 0.24;

  const compassPod = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.10), bezelOuterMat);
  compassPod.position.set(0, 1.13, -1.72);
  const compassWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.036),
    new THREE.MeshBasicMaterial({ color: 0xffe4a1 }),
  );
  compassWindow.position.set(0, 1.13, -1.668);
  cockpitGroup.add(leftPillar, rightPillar, leftGusset, rightGusset, topBrow, canopyGlassPane, compassPod, compassWindow);

  // 3 Live-rendered 3D EFIS / Moving-Map MFD / EICAS displays
  const pfdCanvas = document.createElement('canvas');
  pfdCanvas.width = 320;
  pfdCanvas.height = 240;
  const pfdTex = new THREE.CanvasTexture(pfdCanvas);
  pfdTex.colorSpace = THREE.SRGBColorSpace;

  const mfdCanvas = document.createElement('canvas');
  mfdCanvas.width = 320;
  mfdCanvas.height = 240;
  const mfdTex = new THREE.CanvasTexture(mfdCanvas);
  mfdTex.colorSpace = THREE.SRGBColorSpace;

  const eicasCanvas = document.createElement('canvas');
  eicasCanvas.width = 320;
  eicasCanvas.height = 240;
  const eicasTex = new THREE.CanvasTexture(eicasCanvas);
  eicasTex.colorSpace = THREE.SRGBColorSpace;

  const screenGeo = new THREE.PlaneGeometry(0.41, 0.295);
  const outerBezelGeo = new THREE.BoxGeometry(0.468, 0.358, 0.038);
  const innerBezelGeo = new THREE.BoxGeometry(0.434, 0.320, 0.044);
  const softKeyGeo = new THREE.BoxGeometry(0.032, 0.014, 0.012);

  const makeScreenUnit = (tex, xPos) => {
    const unit = new THREE.Group();
    unit.position.set(xPos, 0.365, -1.86);
    unit.rotation.x = -0.16;
    const outerB = new THREE.Mesh(outerBezelGeo, bezelOuterMat);
    const innerB = new THREE.Mesh(innerBezelGeo, bezelInnerMat);
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.z = 0.024;
    unit.add(outerB, innerB, screen);

    for (let k = 0; k < 6; k += 1) {
      const sk = new THREE.Mesh(softKeyGeo, trimMat);
      sk.position.set(-0.15 + k * 0.06, -0.164, 0.024);
      unit.add(sk);
    }
    const rotary = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 10), trimMat);
    rotary.rotation.x = Math.PI * 0.5;
    rotary.position.set(0.205, -0.158, 0.025);
    unit.add(rotary);
    cockpitGroup.add(unit);
  };

  makeScreenUnit(pfdTex, -0.49);
  makeScreenUnit(mfdTex, 0.0);
  makeScreenUnit(eicasTex, 0.49);

  // Rocker switch row & 3 Green gear indicators
  const switchBar = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.08, 0.06), bezelInnerMat);
  switchBar.position.set(0, 0.145, -1.82);
  switchBar.rotation.x = -0.16;
  cockpitGroup.add(switchBar);
  for (let s = 0; s < 10; s += 1) {
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.038, 0.022),
      s % 3 === 0 ? accentMat : bezelOuterMat,
    );
    sw.position.set(-0.56 + s * 0.11, 0.148, -1.785);
    sw.rotation.x = 0.15;
    cockpitGroup.add(sw);
  }
  for (let g = 0; g < 3; g += 1) {
    const gearLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38f27c }),
    );
    gearLed.position.set(0.54 + g * 0.036, 0.155, -1.782);
    cockpitGroup.add(gearLed);
  }

  // Physical control yoke & full-height pedestal
  const yokeColumn = new THREE.Group();
  yokeColumn.position.set(-0.35, 0.18, -1.60);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.36, 12), bezelOuterMat);
  shaft.rotation.x = Math.PI * 0.5;
  shaft.position.z = -0.16;
  const yokeWheel = new THREE.Group();
  const hubBox = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.045), bezelOuterMat);
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.032, 0.032), trimMat);
  const leftHorn = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.135, 0.036), trimMat);
  leftHorn.position.set(-0.135, 0.048, 0);
  const rightHorn = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.135, 0.036), trimMat);
  rightHorn.position.set(0.135, 0.048, 0);
  const pttCap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.04), accentMat);
  pttCap.position.set(-0.135, 0.12, 0);
  yokeWheel.add(hubBox, crossBar, leftHorn, rightHorn, pttCap);
  yokeColumn.add(shaft, yokeWheel);
  cockpitGroup.add(yokeColumn);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.58), frameMat);
  pedestal.position.set(0.22, -0.12, -1.60);
  const pedestalTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.54), bezelInnerMat);
  pedestalTop.position.set(0.22, 0.17, -1.60);
  const throttlePivot = new THREE.Group();
  throttlePivot.position.set(0.19, 0.18, -1.62);
  for (let side of [-0.045, 0.045]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.145, 0.018), bezelOuterMat);
    stalk.position.set(side, 0.07, 0);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.046, 12), accentMat);
    knob.rotation.z = Math.PI * 0.5;
    knob.position.set(side, 0.145, 0);
    throttlePivot.add(stalk, knob);
  }
  const flapHandle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.09, 0.024), trimMat);
  flapHandle.position.set(0.32, 0.22, -1.56);
  cockpitGroup.add(pedestal, pedestalTop, throttlePivot, flapHandle);

  cockpitGroup.visible = false;
  return {
    cockpitGroup,
    yokeColumn,
    yokeWheel,
    throttlePivot,
    pfdCanvas,
    pfdCtx: pfdCanvas.getContext('2d'),
    pfdTex,
    mfdCanvas,
    mfdCtx: mfdCanvas.getContext('2d'),
    mfdTex,
    eicasCanvas,
    eicasCtx: eicasCanvas.getContext('2d'),
    eicasTex,
    lastRedrawAt: -1,
  };
}

export function buildAircraftMesh(aircraftId = 'islander') {
  const spec = getAircraftSpec(aircraftId);
  const isRecon = spec.hullStyle === 'sleek-recon';
  const isAmphib = spec.hullStyle === 'amphibian-heavy';

  const aircraftRoot = new THREE.Group();
  aircraftRoot.name = `Aircraft_${spec.id}`;

  const exteriorShell = new THREE.Group();
  aircraftRoot.add(exteriorShell);

  const { diffTex, bumpTex } = createAircraftPbrTextures(spec);
  const skinMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    bumpMap: bumpTex,
    bumpScale: 0.035,
    roughness: spec.livery.roughness,
    metalness: spec.livery.metalness,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: spec.livery.secondary,
    bumpMap: bumpTex,
    bumpScale: 0.025,
    roughness: 0.38,
    metalness: 0.36,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.livery.accent,
    bumpMap: bumpTex,
    bumpScale: 0.02,
    roughness: 0.32,
    metalness: 0.22,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1f2e,
    roughness: 0.06,
    metalness: 0.90,
    emissive: 0x0a1e2e,
    emissiveIntensity: 0.30,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x26303a, roughness: 0.42, metalness: 0.62 });
  const spinnerMat = new THREE.MeshStandardMaterial({ color: 0xdbe4ed, roughness: 0.18, metalness: 0.85 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 0.88 });

  // 1. Sculpted PBR Fuselage customized by fleet hullStyle
  const fuselageGroup = new THREE.Group();
  const bodyScaleX = isRecon ? 0.78 : isAmphib ? 1.14 : 0.96;
  const bodyScaleY = isRecon ? 0.78 : isAmphib ? 1.12 : 0.92;

  const noseSection = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.76, isRecon ? 2.65 : 2.25, 16), skinMat);
  noseSection.rotation.x = Math.PI * 0.5;
  noseSection.scale.set(bodyScaleX, bodyScaleY * 0.92, 1.0);
  noseSection.position.set(0, -0.04, isRecon ? -2.85 : -2.65);

  const radome = new THREE.Mesh(new THREE.SphereGeometry(0.41, 16, 12), secondaryMat);
  radome.scale.set(bodyScaleX, bodyScaleY * 0.85, isRecon ? 1.85 : 1.45);
  radome.position.set(0, -0.06, isRecon ? -4.25 : -3.82);

  const cabinUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, isAmphib ? 4.4 : 3.85, 16), skinMat);
  cabinUpper.rotation.x = Math.PI * 0.5;
  cabinUpper.scale.set(bodyScaleX, bodyScaleY, 1.0);
  cabinUpper.position.set(0, 0.14, -0.05);

  // Flying-boat V-hull keel for Mariner vs streamlined belly chine
  const bellyChine = new THREE.Mesh(
    new THREE.CylinderGeometry(isAmphib ? 0.84 : 0.64, isAmphib ? 0.92 : 0.74, isAmphib ? 5.6 : 4.4, 14),
    secondaryMat,
  );
  bellyChine.rotation.x = Math.PI * 0.5;
  bellyChine.scale.set(isAmphib ? 1.24 : 1.10 * bodyScaleX, isAmphib ? 0.68 : 0.46, 1.0);
  bellyChine.position.set(0, isAmphib ? -0.48 : -0.38, -0.25);

  // Recon belly FLIR electro-optical sensor turret on VX-9 Peregrine
  if (isRecon) {
    const flirBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), darkMetalMat);
    flirBall.position.set(0, -0.68, -2.35);
    const flirLens = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), glassMat);
    flirLens.position.set(0, -0.68, -2.56);
    fuselageGroup.add(flirBall, flirLens);
  }

  // Tapered conical tailboom (+Y narrow 0.19 tip rotated by +PI/2 points aft +Z)
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.80, 4.35, 16), skinMat);
  tailCone.rotation.x = Math.PI * 0.5 - 0.065;
  tailCone.scale.set(bodyScaleX * 0.92, 1.0, bodyScaleY * 0.92);
  tailCone.position.set(0, 0.28, 3.92);

  const tailTipCap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 14), secondaryMat);
  tailTipCap.rotation.x = Math.PI * 0.5 - 0.065;
  tailTipCap.position.set(0, 0.42, 6.22);

  // Cheatline livery stripe & registration decal on both flanks
  const regTex = createRegistrationDecal(spec.registration);
  const regMat = new THREE.MeshBasicMaterial({ map: regTex, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 });
  for (let side of [-1, 1]) {
    const flankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 5.4), accentMat);
    flankStripe.position.set(side * (0.76 * bodyScaleX), 0.02, 0.25);
    flankStripe.rotation.y = side * -0.07;
    fuselageGroup.add(flankStripe);

    const regPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.42), regMat);
    regPlate.position.set(side * (0.64 * bodyScaleX), 0.30, 2.75);
    regPlate.rotation.y = side > 0 ? Math.PI * 0.5 - 0.12 : -Math.PI * 0.5 + 0.12;
    fuselageGroup.add(regPlate);
  }

  // Glossy stepped cockpit windscreen & cabin windows
  const windshield = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.74, 1.48, 14), glassMat);
  windshield.rotation.x = Math.PI * 0.5 - 0.24;
  windshield.scale.set(bodyScaleX * 1.02, bodyScaleY * 0.72, 1.0);
  windshield.position.set(0, 0.50, -1.78);

  const canopyRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 2.2, 12), skinMat);
  canopyRoof.rotation.x = Math.PI * 0.5;
  canopyRoof.scale.set(bodyScaleX * 0.90, 0.42, 1.0);
  canopyRoof.position.set(0, 0.76, -0.45);

  for (let side of [-1, 1]) {
    for (let w = 0; w < 5; w += 1) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.30, 0.44), darkMetalMat);
      winFrame.position.set(side * (0.78 * bodyScaleX), 0.30, -0.95 + w * 0.66);
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.38), glassMat);
      winGlass.position.set(side * (0.79 * bodyScaleX), 0.30, -0.95 + w * 0.66);
      fuselageGroup.add(winFrame, winGlass);
    }
  }
  fuselageGroup.add(noseSection, radome, cabinUpper, bellyChine, tailCone, tailTipCap, windshield, canopyRoof);
  exteriorShell.add(fuselageGroup);

  // 2. Wings, Canted Winglets, Nacelles, Spinners & Control Surfaces
  const wingAssembly = new THREE.Group();
  const wingY = isRecon ? 0.36 : isAmphib ? 1.18 : 0.96;
  const wingSpan = isRecon ? 13.0 : isAmphib ? 17.6 : 14.8;
  const halfSpan = wingSpan * 0.5;

  const wingCenterFairing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.28, 2.25), skinMat);
  wingCenterFairing.position.set(0, wingY - 0.04, -0.12);
  const mainWing = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, 0.21, isRecon ? 1.62 : 1.82), skinMat);
  mainWing.position.set(0, wingY, -0.15);
  const wingLeadEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, wingSpan + 0.04, 10), secondaryMat);
  wingLeadEdge.rotation.z = Math.PI * 0.5;
  wingLeadEdge.position.set(0, wingY, isRecon ? -0.95 : -1.06);
  wingAssembly.add(wingCenterFairing, mainWing, wingLeadEdge);

  const wingletGeo = makeSweptSurfaceGeometry(
    [
      [0, 0],
      [1.45, 0],
      [0.95, 0.72],
      [0.32, 0.72],
    ],
    0.08,
  );
  wingletGeo.rotateY(Math.PI * 0.5);

  for (let s of [-1, 1]) {
    const tipBand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, isRecon ? 1.60 : 1.80), accentMat);
    tipBand.position.set(s * (halfSpan - 0.72), wingY + 0.005, -0.15);

    const winglet = new THREE.Mesh(wingletGeo, accentMat);
    winglet.position.set(s * (halfSpan + 0.02), wingY, -0.82);
    winglet.rotation.z = s * -0.46;
    wingAssembly.add(tipBand, winglet);

    if (!isRecon) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, isAmphib ? 3.9 : 3.45), darkMetalMat);
      strut.position.set(s * 2.02, wingY - 0.74, -0.15);
      strut.rotation.y = Math.PI * 0.5;
      strut.rotation.z = s * 0.52;
      wingAssembly.add(strut);
    }

    // Stabilizing wingtip float pontoons on PL-40 Mariner Heavy amphibian
    if (isAmphib) {
      const floatX = s * 5.85;
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 0.45), darkMetalMat);
      pylon.position.set(floatX, wingY - 0.78, -0.25);
      const pontoon = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 3.2, 12), secondaryMat);
      pontoon.rotation.x = Math.PI * 0.5;
      pontoon.position.set(floatX, wingY - 1.52, -0.25);
      const pontoonNose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 12), accentMat);
      pontoonNose.rotation.x = -Math.PI * 0.5;
      pontoonNose.position.set(floatX, wingY - 1.52, -2.20);
      wingAssembly.add(pylon, pontoon, pontoonNose);
    }
  }

  const makeHingedSurface = (w, h, d, x, y, z, mat) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const surf = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    surf.position.set(0, 0, d * 0.5);
    pivot.add(surf);
    wingAssembly.add(pivot);
    return pivot;
  };

  const leftFlap = makeHingedSurface(2.8, 0.10, 0.54, -2.55, wingY - 0.08, 0.72, accentMat);
  const rightFlap = makeHingedSurface(2.8, 0.10, 0.54, 2.55, wingY - 0.08, 0.72, accentMat);
  const leftAileron = makeHingedSurface(2.4, 0.09, 0.44, -(halfSpan - 1.95), wingY - 0.05, 0.72, secondaryMat);
  const rightAileron = makeHingedSurface(2.4, 0.09, 0.44, halfSpan - 1.95, wingY - 0.05, 0.72, secondaryMat);
  const leftSpoiler = makeHingedSurface(2.05, 0.05, 0.32, -3.35, wingY + 0.11, -0.05, accentMat);
  const rightSpoiler = makeHingedSurface(2.05, 0.05, 0.32, 3.35, wingY + 0.11, -0.05, accentMat);

  // Twin cylindrical turboprop nacelles, exhaust pipes, spinners & prop blur discs
  const propBlurTex = createPropBlurTexture();
  const propDiscMat = new THREE.MeshBasicMaterial({
    map: propBlurTex,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const propHubs = [];
  const engineX = isRecon ? 2.45 : isAmphib ? 3.35 : 2.95;
  const propScale = isAmphib ? 1.12 : isRecon ? 0.94 : 1.0;

  for (let s of [-1, 1]) {
    const nacelle = new THREE.Group();
    nacelle.position.set(s * engineX, wingY - 0.12, -1.05);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 2.20, 16), skinMat);
    barrel.rotation.x = Math.PI * 0.5;
    const aftCone = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.43, 1.10, 14), secondaryMat);
    aftCone.rotation.x = Math.PI * 0.5;
    aftCone.position.set(0, 0.02, 1.60);
    const chinScoop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.92, 12), secondaryMat);
    chinScoop.rotation.x = Math.PI * 0.5;
    chinScoop.position.set(0, -0.34, -0.45);

    for (let ex of [-0.36, 0.36]) {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.34, 8), darkMetalMat);
      exhaust.rotation.z = ex > 0 ? -0.9 : 0.9;
      exhaust.rotation.y = 0.35;
      exhaust.position.set(ex, -0.08, -0.68);
      nacelle.add(exhaust);
    }

    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 16), spinnerMat);
    spinner.rotation.x = -Math.PI * 0.5;
    spinner.position.set(0, 0.02, -1.42);

    const blades = makePropellerAssembly(propScale);
    blades.position.set(0, 0.02, -1.24);
    propHubs.push(blades);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.34 * propScale, 28), propDiscMat);
    disc.position.set(0, 0.02, -1.25);

    nacelle.add(barrel, aftCone, chinScoop, spinner, blades, disc);
    wingAssembly.add(nacelle);
  }
  aircraftRoot.add(wingAssembly);

  // 3. Swept Empennage (Single swept T-tail or distinctive twin-fin recon tail on VX-9 Peregrine)
  const tailGroup = new THREE.Group();
  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(0, 1.68, 5.98);

  if (isRecon) {
    // Low-profile horizontal tailplane with canted twin vertical fins
    const hStab = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.98), skinMat);
    hStab.position.set(0, 0.85, 5.48);
    tailGroup.add(hStab);

    const twinFinGeo = makeSweptSurfaceGeometry(
      [
        [4.65, 0.78],
        [5.92, 0.78],
        [6.28, 2.38],
        [5.48, 2.38],
      ],
      0.13,
    );
    twinFinGeo.rotateY(-Math.PI * 0.5);
    for (let s of [-1, 1]) {
      const fin = new THREE.Mesh(twinFinGeo, accentMat);
      fin.position.set(s * 2.48, 0, 0);
      fin.rotation.z = s * -0.14;
      tailGroup.add(fin);
    }
    const rudderMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.7, 0.35), skinMat);
    rudderMesh.position.set(0, -0.55, 0.15);
    rudderPivot.add(rudderMesh);
  } else {
    const dorsalGeo = makeSweptSurfaceGeometry(
      [
        [2.6, 0.58],
        [4.65, 0.52],
        [4.65, 1.15],
      ],
      0.12,
    );
    dorsalGeo.rotateY(-Math.PI * 0.5);
    const dorsalFin = new THREE.Mesh(dorsalGeo, skinMat);

    const vFinGeo = makeSweptSurfaceGeometry(
      [
        [4.35, 0.52],
        [5.85, 0.55],
        [6.24, isAmphib ? 3.05 : 2.78],
        [5.28, isAmphib ? 3.05 : 2.78],
      ],
      0.18,
    );
    vFinGeo.rotateY(-Math.PI * 0.5);
    const vFin = new THREE.Mesh(vFinGeo, accentMat);

    const rudderGeo = makeSweptSurfaceGeometry(
      [
        [0.0, -1.08],
        [0.58, -1.02],
        [0.48, 1.08],
        [0.18, 1.08],
      ],
      0.14,
    );
    rudderGeo.rotateY(-Math.PI * 0.5);
    rudderPivot.add(new THREE.Mesh(rudderGeo, skinMat));

    const hY = isAmphib ? 2.78 : 2.42;
    const tailBullet = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.55, 12), secondaryMat);
    tailBullet.rotation.x = Math.PI * 0.5;
    tailBullet.position.set(0, hY, 5.68);
    const hStab = new THREE.Mesh(new THREE.BoxGeometry(isAmphib ? 5.85 : 5.15, 0.13, 0.96), skinMat);
    hStab.position.set(0, hY, 5.56);
    for (let s of [-1, 1]) {
      const hTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.135, 0.94), accentMat);
      hTip.position.set(s * (isAmphib ? 2.9 : 2.55), hY, 5.56);
      tailGroup.add(hTip);
    }
    tailGroup.add(dorsalFin, vFin, tailBullet, hStab);
  }

  const elevY = isRecon ? 0.85 : isAmphib ? 2.78 : 2.42;
  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(0, elevY, 6.04);
  const elevatorMesh = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.095, 0.44), secondaryMat);
  elevatorMesh.position.set(0, 0, 0.22);
  elevatorPivot.add(elevatorMesh);

  tailGroup.add(rudderPivot, elevatorPivot);
  exteriorShell.add(tailGroup);

  // 4. Tricycle Landing Gear
  const gearGroup = new THREE.Group();
  const makeWheel = (radius, width) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), tireMat);
    tire.rotation.z = Math.PI * 0.5;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.48, radius * 0.48, width + 0.02, 12), spinnerMat);
    hub.rotation.z = Math.PI * 0.5;
    wg.add(tire, hub);
    return wg;
  };

  const gearDrop = isAmphib ? -1.85 : isRecon ? -1.52 : -1.68;
  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.12, 10), darkMetalMat);
  noseStrut.position.set(0, gearDrop + 0.58, -2.85);
  const noseWheel = makeWheel(0.32, 0.20);
  noseWheel.position.set(0, gearDrop, -2.85);
  gearGroup.add(noseStrut, noseWheel);

  for (let s of [-1, 1]) {
    const sponson = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.65, 12), secondaryMat);
    sponson.rotation.x = Math.PI * 0.5;
    sponson.scale.set(1.3, 0.75, 1.0);
    sponson.position.set(s * 0.96, -0.58, 0.18);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.08, 0.16), darkMetalMat);
    strut.position.set(s * 1.38, gearDrop + 0.56, 0.18);
    strut.rotation.z = s * -0.30;
    const wheel = makeWheel(0.45, 0.28);
    wheel.position.set(s * 1.62, gearDrop, 0.18);
    gearGroup.add(sponson, strut, wheel);
  }
  exteriorShell.add(gearGroup);

  // Enable real-time castShadow & receiveShadow on the entire exterior aircraft & wing assembly
  enableShadows(exteriorShell);
  enableShadows(wingAssembly);

  // Nav lights, strobes & forward dusk/storm landing beams
  const portLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
  );
  portLight.position.set(-(halfSpan + 0.35), wingY + 0.56, -0.55);

  const stbdLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x30f26d }),
  );
  stbdLight.position.set(halfSpan + 0.35, wingY + 0.56, -0.55);

  const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tailStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), strobeMat);
  tailStrobe.position.set(0, isRecon ? 1.15 : 2.86, 6.18);
  const leftStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), strobeMat);
  leftStrobe.position.set(-(halfSpan + 0.35), wingY + 0.58, 0.25);
  const rightStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), strobeMat);
  rightStrobe.position.set(halfSpan + 0.35, wingY + 0.58, 0.25);

  const beamGeo = new THREE.ConeGeometry(1.1, 15, 12, 1, true);
  beamGeo.translate(0, -7.5, 0);
  beamGeo.rotateX(Math.PI * 0.5);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff3cc,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const leftBeam = new THREE.Mesh(beamGeo, beamMat);
  leftBeam.position.set(-engineX, wingY - 0.38, -2.35);
  const rightBeam = new THREE.Mesh(beamGeo, beamMat);
  rightBeam.position.set(engineX, wingY - 0.38, -2.35);

  aircraftRoot.add(portLight, stbdLight, tailStrobe, leftStrobe, rightStrobe, leftBeam, rightBeam);

  const cockpitRefs = buildCockpitInterior(spec);
  aircraftRoot.add(cockpitRefs.cockpitGroup);

  return {
    spec,
    aircraftRoot,
    exteriorShell,
    wingAssembly,
    cockpitRefs,
    propHubs,
    propDiscMat,
    leftFlap,
    rightFlap,
    leftAileron,
    rightAileron,
    leftSpoiler,
    rightSpoiler,
    elevatorPivot,
    rudderPivot,
    strobeMeshes: [tailStrobe, leftStrobe, rightStrobe],
    landingBeams: [leftBeam, rightBeam],
  };
}

export function updateCockpitInstruments3D(cockpitRefs, flightState, missionView, weather, elapsedSec, worldRefs, aids) {
  if (!cockpitRefs.cockpitGroup.visible) return;
  if (elapsedSec - cockpitRefs.lastRedrawAt < 0.045) return;
  cockpitRefs.lastRedrawAt = elapsedSec;

  const specTag = flightState.aircraftSpec?.shortLabel ?? 'ATW-28 ISLANDER';

  // 1. Left 3D PFD Screen (320x240)
  const pfd = cockpitRefs.pfdCtx;
  pfd.save();
  pfd.fillStyle = '#071018';
  pfd.fillRect(0, 0, 320, 240);

  pfd.fillStyle = '#0f1e2c';
  pfd.fillRect(0, 0, 320, 24);
  pfd.fillStyle = '#5af2b8';
  pfd.font = 'bold 11px Consolas, monospace';
  pfd.fillText(specTag.slice(0, 11), 10, 16);
  pfd.fillText('HDG NAV', 132, 16);
  pfd.fillStyle = '#ff9f2e';
  pfd.fillText('EFIS ON', 252, 16);

  pfd.save();
  pfd.beginPath();
  pfd.rect(58, 28, 204, 176);
  pfd.clip();
  pfd.translate(160, 116);
  pfd.rotate((flightState.rollDeg * Math.PI) / 180);
  const pitchOffset = flightState.pitchDeg * 3.4;
  pfd.fillStyle = '#1b6fab';
  pfd.fillRect(-200, -240 + pitchOffset, 400, 240);
  pfd.fillStyle = '#7d4d26';
  pfd.fillRect(-200, pitchOffset, 400, 240);
  pfd.strokeStyle = '#ffffff';
  pfd.lineWidth = 2.2;
  pfd.beginPath();
  pfd.moveTo(-180, pitchOffset);
  pfd.lineTo(180, pitchOffset);
  pfd.stroke();

  for (let deg of [-20, -10, 10, 20]) {
    const py = pitchOffset - deg * 3.4;
    pfd.beginPath();
    pfd.moveTo(-32, py);
    pfd.lineTo(32, py);
    pfd.stroke();
  }
  pfd.strokeStyle = '#eef5f9';
  pfd.lineWidth = 1.6;
  pfd.beginPath();
  pfd.arc(0, 0, 74, -Math.PI * 0.78, -Math.PI * 0.22);
  pfd.stroke();
  pfd.restore();

  pfd.strokeStyle = '#ff9f2e';
  pfd.lineWidth = 3.2;
  pfd.beginPath();
  pfd.moveTo(118, 116);
  pfd.lineTo(144, 116);
  pfd.lineTo(149, 122);
  pfd.moveTo(202, 116);
  pfd.lineTo(176, 116);
  pfd.lineTo(171, 122);
  pfd.stroke();

  pfd.fillStyle = '#0c1824';
  pfd.fillRect(4, 28, 50, 176);
  pfd.fillRect(266, 28, 50, 176);
  pfd.strokeStyle = '#335a73';
  pfd.lineWidth = 1.2;
  pfd.strokeRect(4, 28, 50, 176);
  pfd.strokeRect(266, 28, 50, 176);

  pfd.fillStyle = '#060d14';
  pfd.fillRect(6, 100, 46, 32);
  pfd.fillRect(268, 100, 46, 32);
  pfd.strokeStyle = '#ff9f2e';
  pfd.strokeRect(6, 100, 46, 32);
  pfd.strokeRect(268, 100, 46, 32);

  pfd.fillStyle = '#5af2b8';
  pfd.font = 'bold 17px Consolas, monospace';
  pfd.textAlign = 'center';
  pfd.fillText(`${Math.round(flightState.airspeedKts)}`, 29, 122);
  pfd.fillText(`${Math.round(flightState.altitudeFt)}`, 291, 122);
  pfd.fillStyle = '#e8f1f5';
  pfd.font = 'bold 12px Consolas, monospace';
  pfd.fillText(
    `HDG ${String(Math.round(flightState.headingDeg) % 360).padStart(3, '0')}°  VS ${Math.round(flightState.verticalSpeedFpm)} FPM`,
    160,
    224,
  );
  pfd.restore();
  cockpitRefs.pfdTex.needsUpdate = true;

  // 2. Center 3D Moving-Map Terrain & HSI Compass Rose MFD (320x240)
  const mfd = cockpitRefs.mfdCtx;
  mfd.save();
  mfd.fillStyle = '#050e17';
  mfd.fillRect(0, 0, 320, 240);

  const cx = 160;
  const cy = 136;
  const radius = 78;
  const hdgRad = (flightState.headingDeg * Math.PI) / 180;

  // Draw live heading-up topographic terrain map clipped inside the HSI compass circle
  if (worldRefs?.radarMapCanvas) {
    mfd.save();
    mfd.beginPath();
    mfd.arc(cx, cy, radius - 3, 0, Math.PI * 2);
    mfd.clip();

    const mapCanvas = worldRefs.radarMapCanvas;
    const rangeM = 3400; // visible radius in meters
    const scalePxPerM = radius / rangeM;
    const drawSize = TERRAIN_SPAN * scalePxPerM;

    mfd.translate(cx, cy);
    mfd.rotate(-hdgRad);
    mfd.drawImage(
      mapCanvas,
      -drawSize * 0.5 - flightState.position.x * scalePxPerM,
      -drawSize * 0.5 - flightState.position.z * scalePxPerM,
      drawSize,
      drawSize,
    );

    // Draw runways on cockpit moving map
    for (let i = 0; i < RUNWAY_SPECS.length; i += 1) {
      const rw = RUNWAY_SPECS[i];
      const rx = (rw.centerX - flightState.position.x) * scalePxPerM;
      const rz = (rw.centerZ - flightState.position.z) * scalePxPerM;
      mfd.save();
      mfd.translate(rx, rz);
      mfd.rotate((rw.headingDeg * Math.PI) / 180);
      mfd.fillStyle = rw.offshore ? '#ffcf54' : '#ffffff';
      mfd.fillRect(-2.5, -9, 5, 18);
      mfd.restore();
    }

    // Draw active navigation rings route line & diamonds
    if (aids?.ringInstances?.length) {
      mfd.strokeStyle = 'rgba(255, 159, 46, 0.78)';
      mfd.lineWidth = 1.8;
      mfd.setLineDash([4, 3]);
      mfd.beginPath();
      mfd.moveTo(0, 0);
      for (let i = 0; i < aids.ringInstances.length; i += 1) {
        const ring = aids.ringInstances[i];
        if (ring.captured) continue;
        const rx = (ring.holder.position.x - flightState.position.x) * scalePxPerM;
        const rz = (ring.holder.position.z - flightState.position.z) * scalePxPerM;
        mfd.lineTo(rx, rz);
      }
      mfd.stroke();
      mfd.setLineDash([]);

      for (let i = 0; i < aids.ringInstances.length; i += 1) {
        const ring = aids.ringInstances[i];
        if (ring.captured) continue;
        const rx = (ring.holder.position.x - flightState.position.x) * scalePxPerM;
        const rz = (ring.holder.position.z - flightState.position.z) * scalePxPerM;
        mfd.fillStyle = '#ff9f2e';
        mfd.beginPath();
        mfd.arc(rx, rz, 3.6, 0, Math.PI * 2);
        mfd.fill();
      }
    }
    mfd.restore();
  }

  // Compass ring bezel & 360-deg ticks overlaid crisply over moving map
  mfd.strokeStyle = '#4adbc2';
  mfd.lineWidth = 1.6;
  mfd.beginPath();
  mfd.arc(cx, cy, radius, 0, Math.PI * 2);
  mfd.stroke();
  mfd.strokeStyle = 'rgba(90, 242, 184, 0.35)';
  mfd.lineWidth = 1.0;
  mfd.beginPath();
  mfd.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  mfd.stroke();

  mfd.save();
  mfd.translate(cx, cy);
  mfd.rotate(-hdgRad);
  for (let deg = 0; deg < 360; deg += 10) {
    const a = (deg * Math.PI) / 180;
    const major = deg % 30 === 0;
    mfd.save();
    mfd.rotate(a);
    mfd.strokeStyle = deg % 90 === 0 ? '#ff9f2e' : '#e6f4fa';
    mfd.lineWidth = major ? 1.8 : 1.0;
    mfd.beginPath();
    mfd.moveTo(0, -radius);
    mfd.lineTo(0, -radius + (major ? 10 : 5));
    mfd.stroke();
    if (major) {
      const lbl =
        deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg / 10).padStart(2, '0');
      mfd.fillStyle = deg % 90 === 0 ? '#ff9f2e' : '#ffffff';
      mfd.font = 'bold 11px Consolas, monospace';
      mfd.textAlign = 'center';
      mfd.fillText(lbl, 0, -radius + 20);
    }
    mfd.restore();
  }

  if (missionView && typeof missionView.bearingDeg === 'number') {
    const brg = (missionView.bearingDeg * Math.PI) / 180;
    mfd.save();
    mfd.rotate(brg);
    mfd.fillStyle = '#ff9f2e';
    mfd.beginPath();
    mfd.moveTo(-6, -radius - 5);
    mfd.lineTo(6, -radius - 5);
    mfd.lineTo(4, -radius + 3);
    mfd.lineTo(0, -radius - 1);
    mfd.lineTo(-4, -radius + 3);
    mfd.closePath();
    mfd.fill();
    mfd.restore();
  }
  mfd.restore();

  // Fixed lubber triangle & aircraft center symbol
  mfd.fillStyle = '#ff9f2e';
  mfd.beginPath();
  mfd.moveTo(cx, cy - radius + 2);
  mfd.lineTo(cx - 5, cy - radius - 8);
  mfd.lineTo(cx + 5, cy - radius - 8);
  mfd.closePath();
  mfd.fill();

  mfd.strokeStyle = '#ffffff';
  mfd.lineWidth = 2.4;
  mfd.beginPath();
  mfd.moveTo(cx, cy - 9);
  mfd.lineTo(cx, cy + 10);
  mfd.moveTo(cx - 10, cy - 1);
  mfd.lineTo(cx + 10, cy - 1);
  mfd.moveTo(cx - 4, cy + 8);
  mfd.lineTo(cx + 4, cy + 8);
  mfd.stroke();

  const distNm = missionView ? (missionView.distanceM / 1852).toFixed(1) : '0.0';
  mfd.fillStyle = '#ff9f2e';
  mfd.font = 'bold 12px Consolas, monospace';
  mfd.textAlign = 'left';
  mfd.fillText(`TERR MAP`, 12, 30);
  mfd.fillText(`WPT ${distNm} NM`, 12, 46);
  mfd.textAlign = 'right';
  mfd.fillStyle = '#5af2b8';
  mfd.fillText(`WND ${String(Math.round(weather.currentWindFromDeg)).padStart(3, '0')}°/${Math.round(weather.currentWindSpeedKts)}KT`, 308, 30);
  mfd.fillStyle = '#eef5f9';
  mfd.fillText(`GS ${Math.round(flightState.groundSpeedKts)} KT`, 308, 46);
  mfd.restore();
  cockpitRefs.mfdTex.needsUpdate = true;

  // 3. Right 3D Twin-Engine EICAS (320x240)
  const eic = cockpitRefs.eicasCtx;
  eic.save();
  eic.fillStyle = '#071018';
  eic.fillRect(0, 0, 320, 240);

  const drawArcDial = (dx, dy, r, normVal, label, readout, warnHigh = 0.86) => {
    const startA = Math.PI * 0.80;
    const endA = Math.PI * 2.20;
    const valA = startA + Math.max(0, Math.min(1, normVal)) * (endA - startA);

    eic.strokeStyle = '#1d3345';
    eic.lineWidth = 6;
    eic.beginPath();
    eic.arc(dx, dy, r, startA, endA);
    eic.stroke();

    eic.strokeStyle = normVal > warnHigh ? '#ff9f2e' : '#5af2b8';
    eic.lineWidth = 6;
    eic.beginPath();
    eic.arc(dx, dy, r, startA, valA);
    eic.stroke();

    eic.strokeStyle = '#eef5f9';
    eic.lineWidth = 2.2;
    eic.beginPath();
    eic.moveTo(dx, dy);
    eic.lineTo(dx + Math.cos(valA) * (r - 2), dy + Math.sin(valA) * (r - 2));
    eic.stroke();

    eic.fillStyle = '#b9cbd6';
    eic.font = 'bold 10px Consolas, monospace';
    eic.textAlign = 'center';
    eic.fillText(label, dx, dy - r - 6);
    eic.fillStyle = '#eef5f9';
    eic.font = 'bold 11px Consolas, monospace';
    eic.fillText(readout, dx, dy + 14);
  };

  const rpmPct = Math.round(flightState.rpmNorm * 100);
  const egtC = Math.round(460 + flightState.throttle * 315 + flightState.engineStressPct * 1.4);
  drawArcDial(54, 68, 25, flightState.rpmNorm, 'PROP L', `${rpmPct}%`);
  drawArcDial(128, 68, 25, flightState.rpmNorm * 0.99, 'PROP R', `${rpmPct}%`);
  drawArcDial(202, 68, 25, (egtC - 400) / 480, 'ITT L', `${egtC}°C`);
  drawArcDial(272, 68, 25, (egtC - 395) / 480, 'ITT R', `${egtC + 4}°C`);

  eic.textAlign = 'left';
  eic.fillStyle = '#eef5f9';
  eic.font = 'bold 12px Consolas, monospace';
  eic.fillText(`FUEL QTY ${Math.round(flightState.fuelPct)}%`, 16, 122);
  eic.textAlign = 'right';
  eic.fillStyle = '#5af2b8';
  eic.fillText(`FF ${flightState.fuelFlowKgH} KG/H`, 304, 122);

  eic.fillStyle = '#162838';
  eic.fillRect(16, 129, 288, 12);
  eic.fillStyle = flightState.fuelPct < 22 ? '#f25c3b' : '#5af2b8';
  eic.fillRect(16, 129, 288 * (flightState.fuelPct / 100), 12);

  const flapDeg = [0, 15, 35][flightState.flapIndex] ?? 0;
  eic.textAlign = 'left';
  eic.fillStyle = '#eef5f9';
  eic.fillText(`FLAPS ${flapDeg}°`, 16, 162);
  eic.textAlign = 'right';
  eic.fillText(`ENG ${100 - Math.round(flightState.engineStressPct)}% OK`, 304, 162);

  const tiles = [
    { txt: 'GEAR 3 DN', col: '#143d2b', fg: '#5af2b8' },
    {
      txt: `STRCT ${100 - Math.round(flightState.airframeDmgPct)}%`,
      col: flightState.airframeDmgPct > 20 ? '#472a10' : '#143d2b',
      fg: flightState.airframeDmgPct > 20 ? '#ff9f2e' : '#5af2b8',
    },
    {
      txt: flightState.engineOverheatWarning ? 'ENG HOT' : flightState.brakes ? 'BRK ON' : 'GEN L/R OK',
      col: flightState.engineOverheatWarning || flightState.brakes ? '#472a10' : '#143d2b',
      fg: flightState.engineOverheatWarning || flightState.brakes ? '#ff9f2e' : '#5af2b8',
    },
  ];
  for (let t = 0; t < tiles.length; t += 1) {
    const tx = 16 + t * 98;
    eic.fillStyle = tiles[t].col;
    eic.fillRect(tx, 176, 92, 28);
    eic.strokeStyle = tiles[t].fg;
    eic.lineWidth = 1.2;
    eic.strokeRect(tx, 176, 92, 28);
    eic.fillStyle = tiles[t].fg;
    eic.font = 'bold 11px Consolas, monospace';
    eic.textAlign = 'center';
    eic.fillText(tiles[t].txt, tx + 46, 194);
  }
  eic.restore();
  cockpitRefs.eicasTex.needsUpdate = true;
}

export function updateAircraftAnimations(aircraft, flightState, cameraMode, missionView, weather, elapsedSec, worldRefs, aids) {
  aircraft.aircraftRoot.position.copy(flightState.position);
  aircraft.aircraftRoot.quaternion.copy(flightState.quaternion);
  aircraft.aircraftRoot.visible = !flightState.crashed;

  const inCockpit = cameraMode === 'cockpit';
  aircraft.exteriorShell.visible = !inCockpit;
  aircraft.cockpitRefs.cockpitGroup.visible = inCockpit;

  for (let i = 0; i < aircraft.propHubs.length; i += 1) {
    const dir = i === 0 ? 1 : -1;
    aircraft.propHubs[i].rotation.z = flightState.propPhase * dir;
  }
  aircraft.propDiscMat.opacity = 0.22 + flightState.rpmNorm * 0.48;

  const flapRad = flightState.flapNorm * 0.58;
  aircraft.leftFlap.rotation.x = flapRad;
  aircraft.rightFlap.rotation.x = flapRad;

  const ailRad = flightState.controlRoll * 0.42;
  aircraft.leftAileron.rotation.x = -ailRad;
  aircraft.rightAileron.rotation.x = ailRad;

  const spoilerRad = flightState.brakes ? -0.68 : 0;
  aircraft.leftSpoiler.rotation.x = spoilerRad;
  aircraft.rightSpoiler.rotation.x = spoilerRad;

  aircraft.elevatorPivot.rotation.x = -flightState.controlPitch * 0.42;
  aircraft.rudderPivot.rotation.y = flightState.controlYaw * 0.46;

  const cycle = elapsedSec % 1.25;
  const strobeOn = cycle < 0.08 || (cycle > 0.16 && cycle < 0.24);
  for (let i = 0; i < aircraft.strobeMeshes.length; i += 1) {
    aircraft.strobeMeshes[i].visible = strobeOn;
  }

  const beamOpacity = weather.presetKey === 'dusk' || weather.presetKey === 'storm' ? 0.16 : 0.0;
  for (let i = 0; i < aircraft.landingBeams.length; i += 1) {
    aircraft.landingBeams[i].visible = !inCockpit && beamOpacity > 0.01;
    aircraft.landingBeams[i].material.opacity = beamOpacity;
  }

  if (inCockpit) {
    aircraft.cockpitRefs.yokeColumn.position.z = -1.60 + flightState.controlPitch * 0.055;
    aircraft.cockpitRefs.yokeWheel.rotation.z = -flightState.controlRoll * 0.65;
    aircraft.cockpitRefs.throttlePivot.rotation.x = -0.35 + flightState.throttle * 0.72;
    updateCockpitInstruments3D(aircraft.cockpitRefs, flightState, missionView, weather, elapsedSec, worldRefs, aids);
  }
}
