// Sculpted Kestrel-28 twin-turboprop STOL aircraft and enclosed 3D virtual cockpit with rich EFIS/HSI/EICAS displays.
import * as THREE from '../vendor/three.min.js';

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
  baseGrad.addColorStop(0.86, 'rgba(255, 184, 58, 0.42)');
  baseGrad.addColorStop(0.95, 'rgba(50, 58, 66, 0.12)');
  baseGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 122, 0, Math.PI * 2);
  ctx.fill();

  // Subtle swept blade motion wedges for convincing high-RPM photography look
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

function makePropellerAssembly() {
  const hubGroup = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x181e24, roughness: 0.35, metalness: 0.42 });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xffbc3b });

  for (let i = 0; i < 4; i += 1) {
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI) / 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.18, 0.026), bladeMat);
    blade.position.y = 0.64;
    blade.rotation.y = 0.30;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.15, 0.03), tipMat);
    tip.position.y = 1.16;
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

export function buildCockpitInterior() {
  const cockpitGroup = new THREE.Group();
  cockpitGroup.name = 'CockpitInterior3D';

  const tubMat = new THREE.MeshStandardMaterial({ color: 0x0b1117, roughness: 0.9, metalness: 0.08 });
  const cowlMat = new THREE.MeshStandardMaterial({ color: 0x121a24, roughness: 0.78, metalness: 0.18 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d2a38, roughness: 0.58, metalness: 0.36 });
  const bezelOuterMat = new THREE.MeshStandardMaterial({ color: 0x2d3b4a, roughness: 0.44, metalness: 0.52 });
  const bezelInnerMat = new THREE.MeshStandardMaterial({ color: 0x151e27, roughness: 0.65, metalness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x384c61, roughness: 0.45, metalness: 0.45 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xff8f29, roughness: 0.38 });

  // Enclosed cockpit tub: forward firewall, cabin floor, left/right interior sidewalls (zero water leak below panel!)
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

  // Main upper instrument dashboard & contoured multi-segment glareshield visor
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

  const glareLip = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.022, 0.04), bezelOuterMat);
  glareLip.position.set(0, 0.568, -1.735);
  cockpitGroup.add(glareCenter, glareLeftSlope, glareRightSlope, glareLip);

  // Under-glareshield illuminated annunciator strip & autopilot/baro knobs
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

  // Warm cockpit instrument flood light + cool avionics glow
  const cockpitFlood = new THREE.PointLight(0xffd8ab, 1.55, 3.8);
  cockpitFlood.position.set(0, 1.02, -1.28);
  cockpitGroup.add(cockpitFlood);

  // Contoured exterior nose cowling visible just past the lower windshield
  const noseCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.58, 1.22, 16), trimMat);
  noseCowl.rotation.x = Math.PI * 0.5 + 0.12;
  noseCowl.scale.set(1.12, 1.0, 0.68);
  noseCowl.position.set(0, 0.24, -2.58);
  cockpitGroup.add(noseCowl);

  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 1.05), accentMat);
  noseStripe.position.set(0, 0.49, -2.54);
  noseStripe.rotation.x = 0.12;
  cockpitGroup.add(noseStripe);

  // Panoramic canopy A-pillars, diagonal corner braces, and overhead switch rail
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
  cockpitGroup.add(leftPillar, rightPillar, leftGusset, rightGusset, topBrow);

  // Standby magnetic compass pod suspended from upper brow
  const compassPod = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.075, 0.10), bezelOuterMat);
  compassPod.position.set(0, 1.13, -1.72);
  const compassWindow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.036),
    new THREE.MeshBasicMaterial({ color: 0xffe4a1 }),
  );
  compassWindow.position.set(0, 1.13, -1.668);
  cockpitGroup.add(compassPod, compassWindow);

  // 3 Live-rendered high-resolution 3D EFIS/HSI/EICAS glass displays with beveled bezels & softkeys
  const pfdCanvas = document.createElement('canvas');
  pfdCanvas.width = 320;
  pfdCanvas.height = 240;
  const pfdTex = new THREE.CanvasTexture(pfdCanvas);

  const mfdCanvas = document.createElement('canvas');
  mfdCanvas.width = 320;
  mfdCanvas.height = 240;
  const mfdTex = new THREE.CanvasTexture(mfdCanvas);

  const eicasCanvas = document.createElement('canvas');
  eicasCanvas.width = 320;
  eicasCanvas.height = 240;
  const eicasTex = new THREE.CanvasTexture(eicasCanvas);

  const screenGeo = new THREE.PlaneGeometry(0.41, 0.295);
  const outerBezelGeo = new THREE.BoxGeometry(0.465, 0.355, 0.036);
  const innerBezelGeo = new THREE.BoxGeometry(0.432, 0.318, 0.042);
  const softKeyGeo = new THREE.BoxGeometry(0.032, 0.014, 0.012);

  const makeScreenUnit = (tex, xPos) => {
    const unit = new THREE.Group();
    unit.position.set(xPos, 0.365, -1.86);
    unit.rotation.x = -0.16;
    const outerB = new THREE.Mesh(outerBezelGeo, bezelOuterMat);
    const innerB = new THREE.Mesh(innerBezelGeo, bezelInnerMat);
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.z = 0.023;
    unit.add(outerB, innerB, screen);

    for (let k = 0; k < 6; k += 1) {
      const sk = new THREE.Mesh(softKeyGeo, trimMat);
      sk.position.set(-0.15 + k * 0.06, -0.164, 0.022);
      unit.add(sk);
    }
    const rotary = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 10), trimMat);
    rotary.rotation.x = Math.PI * 0.5;
    rotary.position.set(0.205, -0.158, 0.024);
    unit.add(rotary);

    cockpitGroup.add(unit);
  };

  makeScreenUnit(pfdTex, -0.49);
  makeScreenUnit(mfdTex, 0.0);
  makeScreenUnit(eicasTex, 0.49);

  // Lower sub-panel row of illuminated avionics rocker switches & gear status LEDs
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
  // 3 Green Landing Gear Down indicators
  for (let g = 0; g < 3; g += 1) {
    const gearLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x38f27c }),
    );
    gearLed.position.set(0.54 + g * 0.036, 0.155, -1.782);
    cockpitGroup.add(gearLed);
  }

  // Physical 3D control yoke (pitch slide + roll rotation)
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

  // Full-height center throttle pedestal console anchored cleanly to cockpit floor
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.58), frameMat);
  pedestal.position.set(0.22, -0.12, -1.60);
  const pedestalTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.54), bezelInnerMat);
  pedestalTop.position.set(0.22, 0.17, -1.60);
  cockpitGroup.add(pedestal, pedestalTop);

  // Quadrant detents & twin throttle + prop pitch levers
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
  cockpitGroup.add(throttlePivot, flapHandle);

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

export function buildAircraftMesh() {
  const aircraftRoot = new THREE.Group();
  aircraftRoot.name = 'Kestrel28Aircraft';

  const exteriorShell = new THREE.Group();
  aircraftRoot.add(exteriorShell);

  const ivoryMat = new THREE.MeshStandardMaterial({ color: 0xf1ede2, roughness: 0.34, metalness: 0.18 });
  const slateBellyMat = new THREE.MeshStandardMaterial({ color: 0x182b3d, roughness: 0.42, metalness: 0.28 });
  const signalOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf26b1d, roughness: 0.36, metalness: 0.16 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0d2130,
    roughness: 0.08,
    metalness: 0.84,
    emissive: 0x091c2b,
    emissiveIntensity: 0.28,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x26303a, roughness: 0.45, metalness: 0.55 });
  const spinnerMat = new THREE.MeshStandardMaterial({ color: 0xdbe3eb, roughness: 0.22, metalness: 0.78 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x171a1d, roughness: 0.88 });

  // Sculpted aerodynamic fuselage (aircraft noses along -Z)
  const fuselageGroup = new THREE.Group();

  // Forward contoured nose barrel & radome cone
  const noseSection = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.76, 2.25, 16), ivoryMat);
  noseSection.rotation.x = Math.PI * 0.5;
  noseSection.scale.set(0.96, 0.84, 1.0);
  noseSection.position.set(0, -0.04, -2.65);

  const radome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), slateBellyMat);
  radome.scale.set(0.94, 0.80, 1.45);
  radome.position.set(0, -0.06, -3.82);

  // Center pressurized cabin barrel (smooth octagonal/elliptical contour)
  const cabinUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 3.85, 16), ivoryMat);
  cabinUpper.rotation.x = Math.PI * 0.5;
  cabinUpper.scale.set(0.95, 0.92, 1.0);
  cabinUpper.position.set(0, 0.14, -0.05);

  const bellyChine = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.74, 4.4, 14), slateBellyMat);
  bellyChine.rotation.x = Math.PI * 0.5;
  bellyChine.scale.set(1.14, 0.48, 1.0);
  bellyChine.position.set(0, -0.38, -0.25);

  // Tapered conical tailboom (+Y narrow 0.19 tip rotated by +PI/2 points aft +Z; -Y wide 0.80 base joins cabin!)
  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.80, 4.35, 16), ivoryMat);
  tailCone.rotation.x = Math.PI * 0.5 - 0.065;
  tailCone.scale.set(0.90, 1.0, 0.88);
  tailCone.position.set(0, 0.28, 3.92);

  const tailTipCap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 14), slateBellyMat);
  tailTipCap.rotation.x = Math.PI * 0.5 - 0.065;
  tailTipCap.position.set(0, 0.42, 6.22);

  // Cheatline signal-orange stripe along fuselage flanks
  for (let side of [-1, 1]) {
    const flankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 5.4), signalOrangeMat);
    flankStripe.position.set(side * 0.73, 0.02, 0.25);
    flankStripe.rotation.y = side * -0.075;
    fuselageGroup.add(flankStripe);
  }

  // Glossy stepped cockpit windscreen & cabin windows
  const windshield = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.74, 1.48, 12), glassMat);
  windshield.rotation.x = Math.PI * 0.5 - 0.24;
  windshield.scale.set(0.98, 0.68, 1.0);
  windshield.position.set(0, 0.50, -1.78);

  const canopyRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 2.2, 12), ivoryMat);
  canopyRoof.rotation.x = Math.PI * 0.5;
  canopyRoof.scale.set(0.88, 0.42, 1.0);
  canopyRoof.position.set(0, 0.76, -0.45);

  for (let side of [-1, 1]) {
    for (let w = 0; w < 5; w += 1) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.44), darkMetalMat);
      winFrame.position.set(side * 0.755, 0.30, -0.95 + w * 0.66);
      const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.38), glassMat);
      winGlass.position.set(side * 0.76, 0.30, -0.95 + w * 0.66);
      fuselageGroup.add(winFrame, winGlass);
    }
  }

  fuselageGroup.add(noseSection, radome, cabinUpper, bellyChine, tailCone, tailTipCap, windshield, canopyRoof);
  exteriorShell.add(fuselageGroup);

  // High-mounted STOL wing + wing root fairing + canted winglets + streamlined struts
  const wingAssembly = new THREE.Group();

  const wingCenterFairing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 2.25), ivoryMat);
  wingCenterFairing.position.set(0, 0.92, -0.12);
  const mainWing = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.21, 1.78), ivoryMat);
  mainWing.position.set(0, 0.96, -0.15);
  const wingLeadEdge = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 14.82, 10), slateBellyMat);
  wingLeadEdge.rotation.z = Math.PI * 0.5;
  wingLeadEdge.position.set(0, 0.96, -1.04);
  wingAssembly.add(wingCenterFairing, mainWing, wingLeadEdge);

  // Wingtip visibility bands, canted aerodynamic winglets, and streamlined diagonal struts
  const wingletGeo = makeSweptSurfaceGeometry(
    [
      [0, 0],
      [1.45, 0],
      [0.95, 0.68],
      [0.32, 0.68],
    ],
    0.08,
  );
  wingletGeo.rotateY(Math.PI * 0.5);

  for (let s of [-1, 1]) {
    const tipBand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 1.76), signalOrangeMat);
    tipBand.position.set(s * 6.75, 0.965, -0.15);

    const winglet = new THREE.Mesh(wingletGeo, signalOrangeMat);
    winglet.position.set(s * 7.42, 0.96, -0.82);
    winglet.rotation.z = s * -0.46;

    // Main diagonal wing strut from sponson to engine nacelle station
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 3.45), darkMetalMat);
    strut.position.set(s * 1.98, 0.20, -0.15);
    strut.rotation.y = Math.PI * 0.5;
    strut.rotation.z = s * 0.52;

    wingAssembly.add(tipBand, winglet, strut);
  }

  // Hinged aerodynamic control surfaces
  const makeHingedSurface = (w, h, d, x, y, z, mat) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const surf = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    surf.position.set(0, 0, d * 0.5);
    pivot.add(surf);
    wingAssembly.add(pivot);
    return pivot;
  };

  const leftFlap = makeHingedSurface(2.8, 0.10, 0.54, -2.55, 0.88, 0.72, signalOrangeMat);
  const rightFlap = makeHingedSurface(2.8, 0.10, 0.54, 2.55, 0.88, 0.72, signalOrangeMat);
  const leftAileron = makeHingedSurface(2.4, 0.09, 0.44, -5.45, 0.91, 0.72, slateBellyMat);
  const rightAileron = makeHingedSurface(2.4, 0.09, 0.44, 5.45, 0.91, 0.72, slateBellyMat);
  const leftSpoiler = makeHingedSurface(2.05, 0.05, 0.32, -3.35, 1.07, -0.05, signalOrangeMat);
  const rightSpoiler = makeHingedSurface(2.05, 0.05, 0.32, 3.35, 1.07, -0.05, signalOrangeMat);

  // Cylindrical twin turboprop nacelles, exhaust stacks, parabolic spinners & prop blur discs
  const propBlurTex = createPropBlurTexture();
  const propDiscMat = new THREE.MeshBasicMaterial({
    map: propBlurTex,
    transparent: true,
    opacity: 0.52,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const propHubs = [];
  for (let s of [-1, 1]) {
    const nacelle = new THREE.Group();
    nacelle.position.set(s * 2.95, 0.82, -1.05);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 2.15, 16), ivoryMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.scale.set(0.96, 1.04, 1.0);

    const aftCone = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.43, 1.08, 14), slateBellyMat);
    aftCone.rotation.x = Math.PI * 0.5;
    aftCone.position.set(0, 0.02, 1.58);

    const chinScoop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.92, 12), slateBellyMat);
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

    const blades = makePropellerAssembly();
    blades.position.set(0, 0.02, -1.24);
    propHubs.push(blades);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.34, 28), propDiscMat);
    disc.position.set(0, 0.02, -1.25);

    nacelle.add(barrel, aftCone, chinScoop, spinner, blades, disc);
    wingAssembly.add(nacelle);
  }
  aircraftRoot.add(wingAssembly);

  // Swept aerodynamic empennage (Dorsal Fin Strake, Swept Vertical Fin, Rudder, Tapered H-Stab & Elevator)
  const tailGroup = new THREE.Group();

  // Dorsal fin fillet & swept vertical fin (2D X = Z along fuselage, 2D Y = height)
  const dorsalGeo = makeSweptSurfaceGeometry(
    [
      [2.6, 0.58],
      [4.65, 0.52],
      [4.65, 1.15],
    ],
    0.12,
  );
  dorsalGeo.rotateY(-Math.PI * 0.5);
  const dorsalFin = new THREE.Mesh(dorsalGeo, ivoryMat);

  const vFinGeo = makeSweptSurfaceGeometry(
    [
      [4.35, 0.52],
      [5.85, 0.55],
      [6.22, 2.78],
      [5.28, 2.78],
    ],
    0.18,
  );
  vFinGeo.rotateY(-Math.PI * 0.5);
  const vFin = new THREE.Mesh(vFinGeo, signalOrangeMat);

  const rudderPivot = new THREE.Group();
  rudderPivot.position.set(0, 1.68, 5.98);
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
  const rudderMesh = new THREE.Mesh(rudderGeo, ivoryMat);
  rudderPivot.add(rudderMesh);

  // Swept horizontal stabilizer & elevator mounted on cruciform tail bullet
  const tailBullet = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.55, 12), slateBellyMat);
  tailBullet.rotation.x = Math.PI * 0.5;
  tailBullet.position.set(0, 2.42, 5.68);

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(5.15, 0.13, 0.96), ivoryMat);
  hStab.position.set(0, 2.42, 5.56);
  for (let s of [-1, 1]) {
    const hTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.135, 0.94), signalOrangeMat);
    hTip.position.set(s * 2.55, 2.42, 5.56);
    tailGroup.add(hTip);
  }

  const elevatorPivot = new THREE.Group();
  elevatorPivot.position.set(0, 2.42, 6.04);
  const elevatorMesh = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.095, 0.44), slateBellyMat);
  elevatorMesh.position.set(0, 0, 0.22);
  elevatorPivot.add(elevatorMesh);

  tailGroup.add(dorsalFin, vFin, rudderPivot, tailBullet, hStab, elevatorPivot);
  exteriorShell.add(tailGroup);

  // Rugged STOL tricycle landing gear with streamlined sponsons
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

  const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.12, 10), darkMetalMat);
  noseStrut.position.set(0, -1.08, -2.85);
  const noseWheel = makeWheel(0.32, 0.20);
  noseWheel.position.set(0, -1.68, -2.85);
  gearGroup.add(noseStrut, noseWheel);

  for (let s of [-1, 1]) {
    const sponson = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.65, 12), slateBellyMat);
    sponson.rotation.x = Math.PI * 0.5;
    sponson.scale.set(1.3, 0.75, 1.0);
    sponson.position.set(s * 0.96, -0.58, 0.18);

    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.06, 0.16), darkMetalMat);
    strut.position.set(s * 1.38, -1.10, 0.18);
    strut.rotation.z = s * -0.30;
    const wheel = makeWheel(0.45, 0.28);
    wheel.position.set(s * 1.62, -1.68, 0.18);
    gearGroup.add(sponson, strut, wheel);
  }
  exteriorShell.add(gearGroup);

  // Winglet nav lights, strobes, and subtle dusk/storm landing beams
  const portLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
  );
  portLight.position.set(-7.75, 1.52, -0.55);

  const stbdLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x30f26d }),
  );
  stbdLight.position.set(7.75, 1.52, -0.55);

  const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tailStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), strobeMat);
  tailStrobe.position.set(0, 2.86, 6.18);
  const leftStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), strobeMat);
  leftStrobe.position.set(-7.75, 1.54, 0.25);
  const rightStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), strobeMat);
  rightStrobe.position.set(7.75, 1.54, 0.25);

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
  leftBeam.position.set(-2.95, 0.55, -2.35);
  const rightBeam = new THREE.Mesh(beamGeo, beamMat);
  rightBeam.position.set(2.95, 0.55, -2.35);

  aircraftRoot.add(portLight, stbdLight, tailStrobe, leftStrobe, rightStrobe, leftBeam, rightBeam);

  const cockpitRefs = buildCockpitInterior();
  aircraftRoot.add(cockpitRefs.cockpitGroup);

  return {
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

export function updateCockpitInstruments3D(cockpitRefs, flightState, missionView, weather, elapsedSec) {
  if (!cockpitRefs.cockpitGroup.visible) return;
  if (elapsedSec - cockpitRefs.lastRedrawAt < 0.045) return;
  cockpitRefs.lastRedrawAt = elapsedSec;

  // 1. Left 3D PFD Screen (320x240): Mode bar, Attitude Horizon, Bank Scale, Speed/Alt Tapes
  const pfd = cockpitRefs.pfdCtx;
  pfd.save();
  pfd.fillStyle = '#071018';
  pfd.fillRect(0, 0, 320, 240);

  // Flight Director mode annunciator header
  pfd.fillStyle = '#0f1e2c';
  pfd.fillRect(0, 0, 320, 24);
  pfd.fillStyle = '#5af2b8';
  pfd.font = 'bold 12px Consolas, monospace';
  pfd.fillText('SPD MAN', 12, 16);
  pfd.fillText('HDG NAV', 128, 16);
  pfd.fillStyle = '#ff9f2e';
  pfd.fillText('STOL FD', 248, 16);

  pfd.save();
  pfd.beginPath();
  pfd.rect(58, 28, 204, 176);
  pfd.clip();
  pfd.translate(160, 116);
  pfd.rotate((flightState.rollDeg * Math.PI) / 180);
  const pitchOffset = flightState.pitchDeg * 3.4;
  pfd.fillStyle = '#1d74b5';
  pfd.fillRect(-200, -240 + pitchOffset, 400, 240);
  pfd.fillStyle = '#825028';
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
  // Bank angle arc ticks at top of attitude sphere
  pfd.strokeStyle = '#eef5f9';
  pfd.lineWidth = 1.6;
  pfd.beginPath();
  pfd.arc(0, 0, 74, -Math.PI * 0.78, -Math.PI * 0.22);
  pfd.stroke();
  pfd.restore();

  // Fixed aircraft reference chevron
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

  // Side digital speed & altitude columns
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
  pfd.font = 'bold 13px Consolas, monospace';
  pfd.fillText(
    `HDG ${String(Math.round(flightState.headingDeg) % 360).padStart(3, '0')}°   VS ${Math.round(flightState.verticalSpeedFpm)} FPM`,
    160,
    224,
  );
  pfd.restore();
  cockpitRefs.pfdTex.needsUpdate = true;

  // 2. Center 3D HSI / Navigation Compass Rose with full ticks & Heading Bug (320x240)
  const mfd = cockpitRefs.mfdCtx;
  mfd.save();
  mfd.fillStyle = '#061019';
  mfd.fillRect(0, 0, 320, 240);

  const cx = 160;
  const cy = 136;
  const radius = 78;

  mfd.strokeStyle = '#264b63';
  mfd.lineWidth = 1.4;
  mfd.beginPath();
  mfd.arc(cx, cy, radius, 0, Math.PI * 2);
  mfd.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
  mfd.stroke();

  mfd.save();
  mfd.translate(cx, cy);
  const hdgRad = (flightState.headingDeg * Math.PI) / 180;
  mfd.rotate(-hdgRad);

  // Full 360-deg tick marks every 5 & 10 deg + cardinal/30-deg labels
  for (let deg = 0; deg < 360; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const major = deg % 10 === 0;
    const len = deg % 30 === 0 ? 11 : major ? 7 : 4;
    mfd.save();
    mfd.rotate(a);
    mfd.strokeStyle = deg % 90 === 0 ? '#ff9f2e' : '#d8e8f2';
    mfd.lineWidth = major ? 1.8 : 1.0;
    mfd.beginPath();
    mfd.moveTo(0, -radius);
    mfd.lineTo(0, -radius + len);
    mfd.stroke();

    if (deg % 30 === 0) {
      const lbl =
        deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg / 10).padStart(2, '0');
      mfd.fillStyle = deg % 90 === 0 ? '#ff9f2e' : '#eef5f9';
      mfd.font = 'bold 12px Consolas, monospace';
      mfd.textAlign = 'center';
      mfd.fillText(lbl, 0, -radius + 23);
    }
    mfd.restore();
  }

  // Waypoint Bearing Bug on outer ring + CDI Course Arrow
  if (missionView && typeof missionView.bearingDeg === 'number') {
    const brg = (missionView.bearingDeg * Math.PI) / 180;
    mfd.save();
    mfd.rotate(brg);

    // Notched amber heading/bearing bug on perimeter
    mfd.fillStyle = '#ff9f2e';
    mfd.beginPath();
    mfd.moveTo(-7, -radius - 5);
    mfd.lineTo(7, -radius - 5);
    mfd.lineTo(5, -radius + 3);
    mfd.lineTo(0, -radius - 1);
    mfd.lineTo(-5, -radius + 3);
    mfd.closePath();
    mfd.fill();

    // Magenta/Amber course needle with CDI deviation scale
    mfd.strokeStyle = '#5af2b8';
    mfd.lineWidth = 3;
    mfd.beginPath();
    mfd.moveTo(0, 46);
    mfd.lineTo(0, -58);
    mfd.lineTo(-7, -46);
    mfd.moveTo(0, -58);
    mfd.lineTo(7, -46);
    mfd.stroke();
    mfd.restore();
  }
  mfd.restore();

  // Fixed lubber triangle at top & aircraft icon in center
  mfd.fillStyle = '#ff9f2e';
  mfd.beginPath();
  mfd.moveTo(cx, cy - radius + 2);
  mfd.lineTo(cx - 6, cy - radius - 8);
  mfd.lineTo(cx + 6, cy - radius - 8);
  mfd.closePath();
  mfd.fill();

  mfd.strokeStyle = '#eef5f9';
  mfd.lineWidth = 2.2;
  mfd.beginPath();
  mfd.moveTo(cx, cy - 10);
  mfd.lineTo(cx, cy + 11);
  mfd.moveTo(cx - 11, cy - 1);
  mfd.lineTo(cx + 11, cy - 1);
  mfd.moveTo(cx - 5, cy + 9);
  mfd.lineTo(cx + 5, cy + 9);
  mfd.stroke();

  const distNm = missionView ? (missionView.distanceM / 1852).toFixed(1) : '0.0';
  mfd.fillStyle = '#ff9f2e';
  mfd.font = 'bold 12px Consolas, monospace';
  mfd.textAlign = 'left';
  mfd.fillText(`CRS ${String(Math.round(missionView?.bearingDeg ?? 90)).padStart(3, '0')}°`, 14, 32);
  mfd.fillText(`DIST ${distNm} NM`, 14, 48);
  mfd.textAlign = 'right';
  mfd.fillStyle = '#5af2b8';
  mfd.fillText(`WND ${String(Math.round(weather.currentWindFromDeg)).padStart(3, '0')}°/${Math.round(weather.currentWindSpeedKts)}KT`, 306, 32);
  mfd.fillStyle = '#eef5f9';
  mfd.fillText(`GS ${Math.round(flightState.groundSpeedKts)} KT`, 306, 48);
  mfd.restore();
  cockpitRefs.mfdTex.needsUpdate = true;

  // 3. Right 3D Twin-Engine EICAS (320x240): Dual RPM & EGT Arc Dials, Fuel Flow, Annunciators
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

    // Pointer needle
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
  const egtC = Math.round(460 + flightState.throttle * 315);
  drawArcDial(54, 68, 25, flightState.rpmNorm, 'PROP L', `${rpmPct}%`);
  drawArcDial(128, 68, 25, flightState.rpmNorm * 0.99, 'PROP R', `${rpmPct}%`);
  drawArcDial(202, 68, 25, (egtC - 400) / 450, 'ITT L', `${egtC}°C`);
  drawArcDial(272, 68, 25, (egtC - 395) / 450, 'ITT R', `${egtC + 4}°C`);

  // Fuel quantity & fuel flow bars
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

  // Flaps & Trim bar
  const flapDeg = [0, 15, 35][flightState.flapIndex] ?? 0;
  eic.textAlign = 'left';
  eic.fillStyle = '#eef5f9';
  eic.fillText(`FLAPS ${flapDeg}°`, 16, 162);
  eic.textAlign = 'right';
  eic.fillText(`THR ${Math.round(flightState.throttle * 100)}%`, 304, 162);

  // Annunciator status tiles at bottom of EICAS
  const tiles = [
    { txt: 'GEAR 3 DN', col: '#143d2b', fg: '#5af2b8' },
    { txt: `STRCT ${100 - Math.round(flightState.damagePct)}%`, col: flightState.damagePct > 20 ? '#472a10' : '#143d2b', fg: flightState.damagePct > 20 ? '#ff9f2e' : '#5af2b8' },
    { txt: flightState.brakes ? 'BRK ON' : 'GEN L/R OK', col: flightState.brakes ? '#472a10' : '#143d2b', fg: flightState.brakes ? '#ff9f2e' : '#5af2b8' },
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

export function updateAircraftAnimations(aircraft, flightState, cameraMode, missionView, weather, elapsedSec) {
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
    updateCockpitInstruments3D(aircraft.cockpitRefs, flightState, missionView, weather, elapsedSec);
  }
}
