// Rayleigh + Mie GLSL atmospheric scattering sky, real-time soft shadow rig, volumetric sprite clouds, and slanted storm rain.
import * as THREE from '../vendor/three.min.js';

export const WEATHER_PRESETS = {
  golden: {
    label: 'Golden Hour Clear',
    zenithColor: 0x102d4f,
    midSkyColor: 0x3b658c,
    horizonColor: 0xf4a261,
    fogColor: 0xdc9866,
    fogDensity: 0.000175,
    sunColor: 0xffd296,
    sunIntensity: 2.65,
    fillColor: 0x7cb0db,
    fillIntensity: 0.45,
    hemiSky: 0x9ac6eb,
    hemiGround: 0x574534,
    hemiIntensity: 0.88,
    mieStrength: 0.68,
    cloudLightColor: 0xfff5e4,
    cloudMidColor: 0xf5cfb0,
    cloudShadeColor: 0xa68993,
    oceanDeep: 0x0b3650,
    oceanShallow: 0x1da3a8,
    stormFactor: 0.12,
    sunElevationDeg: 13.5,
    sunAzimuthDeg: 108,
    windDirFromDeg: 105,
    windSpeedKts: 9,
    gustKts: 3,
    rain: false,
  },
  canyon: {
    label: 'Tradewind Crisp',
    zenithColor: 0x0f3b69,
    midSkyColor: 0x3776a6,
    horizonColor: 0xf2bc85,
    fogColor: 0xd9ae82,
    fogDensity: 0.00015,
    sunColor: 0xffe0ad,
    sunIntensity: 2.75,
    fillColor: 0x8cc8f0,
    fillIntensity: 0.48,
    hemiSky: 0xa8d8f5,
    hemiGround: 0x4e543c,
    hemiIntensity: 0.92,
    mieStrength: 0.52,
    cloudLightColor: 0xfffaf2,
    cloudMidColor: 0xebd7c3,
    cloudShadeColor: 0x9aa4b2,
    oceanDeep: 0x0a405e,
    oceanShallow: 0x22b4b8,
    stormFactor: 0.18,
    sunElevationDeg: 22,
    sunAzimuthDeg: 124,
    windDirFromDeg: 80,
    windSpeedKts: 13,
    gustKts: 5,
    rain: false,
  },
  storm: {
    label: 'Tropical Squall & Crosswind',
    zenithColor: 0x152230,
    midSkyColor: 0x304558,
    horizonColor: 0x6f8291,
    fogColor: 0x5c6f7e,
    fogDensity: 0.00034,
    sunColor: 0xc2d2e0,
    sunIntensity: 1.45,
    fillColor: 0x5d768c,
    fillIntensity: 0.42,
    hemiSky: 0x768fa3,
    hemiGround: 0x2c363d,
    hemiIntensity: 0.84,
    mieStrength: 0.24,
    cloudLightColor: 0x8699ab,
    cloudMidColor: 0x5c6f82,
    cloudShadeColor: 0x364454,
    oceanDeep: 0x0c2636,
    oceanShallow: 0x245d69,
    stormFactor: 0.92,
    sunElevationDeg: 26,
    sunAzimuthDeg: 95,
    windDirFromDeg: 185,
    windSpeedKts: 21,
    gustKts: 9,
    rain: true,
  },
  dusk: {
    label: 'Twilight Beacon Haze',
    zenithColor: 0x091326,
    midSkyColor: 0x2b345c,
    horizonColor: 0xd96b45,
    fogColor: 0x8d4f48,
    fogDensity: 0.00027,
    sunColor: 0xff8e52,
    sunIntensity: 1.95,
    fillColor: 0x526399,
    fillIntensity: 0.40,
    hemiSky: 0x5f71a1,
    hemiGround: 0x2e2328,
    hemiIntensity: 0.72,
    mieStrength: 0.82,
    cloudLightColor: 0xfcb58d,
    cloudMidColor: 0xc97b74,
    cloudShadeColor: 0x5a435c,
    oceanDeep: 0x081e33,
    oceanShallow: 0x1e5c6b,
    stormFactor: 0.22,
    sunElevationDeg: 5.5,
    sunAzimuthDeg: 94,
    windDirFromDeg: 98,
    windSpeedKts: 12,
    gustKts: 4,
    rain: false,
  },
  volcanic: {
    label: 'Caldera Thermal Haze',
    zenithColor: 0x17324f,
    midSkyColor: 0x576b7d,
    horizonColor: 0xeb985b,
    fogColor: 0xc9885b,
    fogDensity: 0.00022,
    sunColor: 0xffc680,
    sunIntensity: 2.50,
    fillColor: 0x8aa8c2,
    fillIntensity: 0.44,
    hemiSky: 0x99b8cf,
    hemiGround: 0x523c2c,
    hemiIntensity: 0.86,
    mieStrength: 0.74,
    cloudLightColor: 0xffeeda,
    cloudMidColor: 0xe3baa0,
    cloudShadeColor: 0x8f7a7c,
    oceanDeep: 0x0d364d,
    oceanShallow: 0x21989e,
    stormFactor: 0.28,
    sunElevationDeg: 17,
    sunAzimuthDeg: 112,
    windDirFromDeg: 135,
    windSpeedKts: 15,
    gustKts: 6,
    rain: false,
  },
};

function pseudoRand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function createVolumetricCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);

  // Sweeping sunlit cumulus bank: bright golden-white billowy tops + soft shaded flat base
  const puffs = [
    { x: 112, y: 146, r: 82, top: 'rgba(225,228,236,0.42)', mid: 'rgba(182,188,202,0.16)' },
    { x: 256, y: 152, r: 96, top: 'rgba(218,222,232,0.48)', mid: 'rgba(176,184,198,0.18)' },
    { x: 398, y: 146, r: 84, top: 'rgba(225,228,236,0.42)', mid: 'rgba(182,188,202,0.16)' },
    { x: 168, y: 128, r: 86, top: 'rgba(246,246,250,0.58)', mid: 'rgba(218,222,232,0.24)' },
    { x: 338, y: 128, r: 86, top: 'rgba(246,246,250,0.58)', mid: 'rgba(218,222,232,0.24)' },
    { x: 252, y: 112, r: 98, top: 'rgba(255,255,255,0.68)', mid: 'rgba(236,238,244,0.28)' },
    { x: 204, y: 88, r: 66, top: 'rgba(255,255,255,0.72)', mid: 'rgba(242,244,248,0.26)' },
    { x: 298, y: 92, r: 62, top: 'rgba(255,255,255,0.68)', mid: 'rgba(240,242,248,0.24)' },
    { x: 86, y: 138, r: 58, top: 'rgba(242,244,248,0.48)', mid: 'rgba(210,214,224,0.16)' },
    { x: 426, y: 138, r: 58, top: 'rgba(242,244,248,0.48)', mid: 'rgba(210,214,224,0.16)' },
  ];

  for (let i = 0; i < puffs.length; i += 1) {
    const p = puffs[i];
    const g = ctx.createRadialGradient(p.x, p.y - p.r * 0.22, 6, p.x, p.y, p.r);
    g.addColorStop(0.0, p.top);
    g.addColorStop(0.48, p.mid);
    g.addColorStop(0.80, 'rgba(205, 210, 222, 0.05)');
    g.addColorStop(1.0, 'rgba(205, 210, 222, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRainLayer(count, spreadXZ, spreadY, slantVec, opacity, seedBase) {
  const positions = new Float32Array(count * 6);
  for (let i = 0; i < count; i += 1) {
    const s = seedBase + i * 7;
    const rx = (pseudoRand(s + 1) - 0.5) * spreadXZ;
    const ry = (pseudoRand(s + 2) - 0.5) * spreadY;
    const rz = (pseudoRand(s + 3) - 0.5) * spreadXZ;
    const lenScale = 0.65 + pseudoRand(s + 4) * 0.75;
    const base = i * 6;
    positions[base] = rx;
    positions[base + 1] = ry;
    positions[base + 2] = rz;
    positions[base + 3] = rx + slantVec.x * lenScale;
    positions[base + 4] = ry + slantVec.y * lenScale;
    positions[base + 5] = rz + slantVec.z * lenScale;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xd4e9f7,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.LineSegments(geo, mat);
}

export function createWeatherSystem(scene) {
  const skyUniforms = {
    uZenith: { value: new THREE.Color(WEATHER_PRESETS.golden.zenithColor) },
    uMid: { value: new THREE.Color(WEATHER_PRESETS.golden.midSkyColor) },
    uHorizon: { value: new THREE.Color(WEATHER_PRESETS.golden.horizonColor) },
    uSunDir: { value: new THREE.Vector3(0.85, 0.24, 0.35).normalize() },
    uSunColor: { value: new THREE.Color(WEATHER_PRESETS.golden.sunColor) },
    uMieStrength: { value: WEATHER_PRESETS.golden.mieStrength },
  };

  // Custom GLSL Rayleigh + Henyey-Greenstein Mie Atmospheric Scattering Sky Dome
  const skyGeo = new THREE.SphereGeometry(8200, 40, 28);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uMieStrength;
      varying vec3 vWorldDir;
      void main() {
        vec3 dir = normalize(vWorldDir);
        vec3 sDir = normalize(uSunDir);
        float h = clamp(dir.y, 0.0, 1.0);
        float cosTheta = dot(dir, sDir);

        // Rayleigh atmospheric depth falloff from zenith to warm horizon haze
        float rayleighCurve = pow(1.0 - h, 2.65);
        vec3 sky = mix(uZenith, uMid, smoothstep(0.0, 0.62, pow(1.0 - h, 1.35)));
        sky = mix(sky, uHorizon, smoothstep(0.28, 1.0, rayleighCurve));

        // Warm horizon scattering belt stronger toward sun azimuth
        float sunAzGlow = 0.45 + 0.55 * max(0.0, cosTheta);
        float horizonBand = pow(1.0 - h, 6.2) * sunAzGlow;
        sky += uSunColor * horizonBand * (0.28 * uMieStrength);

        // Henyey-Greenstein Mie forward scattering halo around sun
        float g = 0.78;
        float g2 = g * g;
        float denom = max(0.06, 1.0 + g2 - 2.0 * g * cosTheta);
        float miePhase = (1.0 - g2) / (4.0 * 3.1415926 * pow(denom, 1.5));
        sky += uSunColor * clamp(miePhase * 0.22 * uMieStrength, 0.0, 1.15);

        // Soft solar corona and smooth photographic Mie sun disc
        float corona = pow(max(0.0, cosTheta), 42.0) * 0.48 * uMieStrength;
        float innerGlow = pow(max(0.0, cosTheta), 420.0) * 0.72 * uMieStrength;
        float sunDisc = smoothstep(0.9988, 0.99975, cosTheta);
        sky += uSunColor * (corona + innerGlow) + vec3(1.0, 0.95, 0.86) * sunDisc * 1.15;

        // Subtle below-horizon aerial reflection tint
        if (dir.y < 0.0) {
          sky = mix(sky, uHorizon * 0.65, clamp(-dir.y * 4.0, 0.0, 1.0));
        }
        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Three-point atmospheric lighting rig with real-time PCFSoftShadowMap sun directional light
  const hemiLight = new THREE.HemisphereLight(0x9ac6eb, 0x574534, 0.88);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffd296, 2.65);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -88;
  sunLight.shadow.camera.right = 88;
  sunLight.shadow.camera.top = 88;
  sunLight.shadow.camera.bottom = -88;
  sunLight.shadow.camera.near = 15;
  sunLight.shadow.camera.far = 920;
  sunLight.shadow.bias = -0.00025;
  sunLight.shadow.normalBias = 0.04;
  sunLight.shadow.radius = 2.0;
  sunLight.position.set(420, 120, 140);
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Opposite sky-bounce fill light for crisp PBR metallic highlights in shadow
  const fillLight = new THREE.DirectionalLight(0x7cb0db, 0.45);
  fillLight.position.set(-400, 260, -240);
  scene.add(fillLight);

  scene.fog = new THREE.FogExp2(WEATHER_PRESETS.golden.fogColor, WEATHER_PRESETS.golden.fogDensity);

  // Sweeping volumetric-style cumulus cloud banks
  const cloudTex = createVolumetricCloudTexture();
  const cloudGroup = new THREE.Group();
  cloudGroup.name = 'VolumetricSpriteClouds';

  const cloudTopMat = new THREE.SpriteMaterial({
    map: cloudTex,
    color: 0xfff5e4,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const cloudMidMat = new THREE.SpriteMaterial({
    map: cloudTex,
    color: 0xf5cfb0,
    transparent: true,
    opacity: 0.60,
    depthWrite: false,
  });
  const cloudShadeMat = new THREE.SpriteMaterial({
    map: cloudTex,
    color: 0xa68993,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });

  for (let c = 0; c < 38; c += 1) {
    const cluster = new THREE.Group();
    const cx = (pseudoRand(c * 3 + 1) - 0.5) * 7600;
    const cz = (pseudoRand(c * 3 + 2) - 0.5) * 6800;
    const cy = 440 + pseudoRand(c * 3 + 3) * 420;
    cluster.position.set(cx, cy, cz);

    const puffCount = 7 + (c % 4);
    for (let p = 0; p < puffCount; p += 1) {
      const layer = p < 2 ? 'shade' : p < 5 ? 'mid' : 'top';
      const mat = layer === 'top' ? cloudTopMat : layer === 'mid' ? cloudMidMat : cloudShadeMat;
      const sp = new THREE.Sprite(mat);
      const spreadX = (pseudoRand(c * 29 + p * 3 + 1) - 0.5) * 440;
      const spreadZ = (pseudoRand(c * 29 + p * 3 + 2) - 0.5) * 240;
      const yOff =
        layer === 'shade'
          ? -14 + pseudoRand(c * 31 + p) * 10
          : layer === 'mid'
            ? 2 + pseudoRand(c * 31 + p) * 18
            : 16 + pseudoRand(c * 31 + p) * 24;
      const w = 260 + pseudoRand(c * 37 + p) * 260;
      const h = w * (0.28 + pseudoRand(c * 41 + p) * 0.14);
      sp.position.set(spreadX, yOff, spreadZ);
      sp.scale.set(w, h, 1);
      cluster.add(sp);
    }
    cloudGroup.add(cluster);
  }
  scene.add(cloudGroup);

  // Multi-tiered angled crosswind rain streaks
  const rainGroup = new THREE.Group();
  const slant = new THREE.Vector3(-3.4, -7.8, 2.0);
  const rainNear = buildRainLayer(200, 120, 95, slant, 0.22, 100);
  const rainMid = buildRainLayer(280, 190, 115, slant.clone().multiplyScalar(0.85), 0.13, 2000);
  const rainFar = buildRainLayer(300, 260, 130, slant.clone().multiplyScalar(0.70), 0.07, 5000);
  rainGroup.add(rainNear, rainMid, rainFar);
  rainGroup.visible = false;
  scene.add(rainGroup);

  const system = {
    presetKey: 'golden',
    preset: WEATHER_PRESETS.golden,
    skyDome,
    skyUniforms,
    sunDir: new THREE.Vector3(0.85, 0.24, 0.35).normalize(),
    hemiLight,
    sunLight,
    fillLight,
    cloudGroup,
    cloudTopMat,
    cloudMidMat,
    cloudShadeMat,
    rainGroup,
    currentWindVec: new THREE.Vector3(),
    currentWindSpeedKts: 9,
    currentWindFromDeg: 105,
  };

  applyMissionWeather(system, scene, 'golden');
  return system;
}

export function applyMissionWeather(weather, scene, presetKey) {
  const p = WEATHER_PRESETS[presetKey] ?? WEATHER_PRESETS.golden;
  weather.presetKey = presetKey;
  weather.preset = p;

  weather.skyUniforms.uZenith.value.setHex(p.zenithColor);
  weather.skyUniforms.uMid.value.setHex(p.midSkyColor);
  weather.skyUniforms.uHorizon.value.setHex(p.horizonColor);
  weather.skyUniforms.uSunColor.value.setHex(p.sunColor);
  weather.skyUniforms.uMieStrength.value = p.mieStrength;

  const elev = (p.sunElevationDeg * Math.PI) / 180;
  const azim = (p.sunAzimuthDeg * Math.PI) / 180;
  weather.sunDir
    .set(
      Math.cos(elev) * Math.sin(azim),
      Math.sin(elev),
      -Math.cos(elev) * Math.cos(azim),
    )
    .normalize();
  weather.skyUniforms.uSunDir.value.copy(weather.sunDir);

  weather.sunLight.color.setHex(p.sunColor);
  weather.sunLight.intensity = p.sunIntensity;
  weather.fillLight.color.setHex(p.fillColor);
  weather.fillLight.intensity = p.fillIntensity;

  weather.hemiLight.color.setHex(p.hemiSky);
  weather.hemiLight.groundColor.setHex(p.hemiGround);
  weather.hemiLight.intensity = p.hemiIntensity;

  scene.fog.color.setHex(p.fogColor);
  scene.fog.density = p.fogDensity;

  weather.cloudTopMat.color.setHex(p.cloudLightColor);
  weather.cloudMidMat.color.setHex(p.cloudMidColor);
  weather.cloudShadeMat.color.setHex(p.cloudShadeColor);
  weather.cloudTopMat.opacity = p.rain ? 0.84 : 0.78;
  weather.cloudMidMat.opacity = p.rain ? 0.76 : 0.66;
  weather.cloudShadeMat.opacity = p.rain ? 0.68 : 0.52;

  weather.rainGroup.visible = Boolean(p.rain);
}

export function sampleWindAtPosition(weather, position, elapsedSec) {
  const p = weather.preset;
  const gustWave =
    Math.sin(elapsedSec * 0.65 + position.x * 0.0015) * 0.6 +
    Math.cos(elapsedSec * 1.35 + position.z * 0.002) * 0.4;
  const altFactor = Math.min(1.35, 0.72 + Math.max(0, position.y) / 380);
  const speedKts = Math.max(0, (p.windSpeedKts + gustWave * p.gustKts) * altFactor);
  const speedMps = speedKts / 1.943844;

  const dirShift = Math.sin(elapsedSec * 0.25) * 6;
  const fromDeg = (p.windDirFromDeg + dirShift + 360) % 360;
  const fromRad = (fromDeg * Math.PI) / 180;

  weather.currentWindFromDeg = fromDeg;
  weather.currentWindSpeedKts = speedKts;
  weather.currentWindVec.set(
    -Math.sin(fromRad) * speedMps,
    p.rain ? Math.sin(elapsedSec * 2.1 + position.x * 0.01) * 0.65 : 0,
    Math.cos(fromRad) * speedMps,
  );
  return weather.currentWindVec;
}

export function updateWeatherVisuals(weather, anchorPos, elapsedSec, dt) {
  weather.skyDome.position.copy(anchorPos);

  // Snap real-time shadow frustum around aircraft/runway area for crisp grounded shadows
  const snapX = Math.round(anchorPos.x / 2) * 2;
  const snapY = Math.round(anchorPos.y / 2) * 2;
  const snapZ = Math.round(anchorPos.z / 2) * 2;
  weather.sunLight.target.position.set(snapX, snapY, snapZ);
  weather.sunLight.position
    .set(snapX, snapY, snapZ)
    .addScaledVector(weather.sunDir, 420);
  weather.sunLight.target.updateMatrixWorld();

  for (let i = 0; i < weather.cloudGroup.children.length; i += 1) {
    const cl = weather.cloudGroup.children[i];
    cl.position.x -= dt * 3.8;
    if (cl.position.x < -3800) cl.position.x = 3800;
  }

  if (weather.rainGroup.visible) {
    const fallOffset = (elapsedSec * 44) % 22;
    weather.rainGroup.position.set(
      anchorPos.x + fallOffset * 0.42,
      anchorPos.y - fallOffset,
      anchorPos.z - fallOffset * 0.25,
    );
  }
}
