// Cohesive golden-hour & squall weather system: sky dome, layered sunlit cumulus clouds, wind-slanted rain, and wind vectors.
import * as THREE from '../vendor/three.min.js';

export const WEATHER_PRESETS = {
  golden: {
    label: 'Golden Hour Clear',
    zenithColor: 0x16395c,
    midSkyColor: 0x486b8a,
    horizonColor: 0xf09b59,
    fogColor: 0xd98f5c,
    fogDensity: 0.00019,
    sunColor: 0xffca85,
    sunIntensity: 2.38,
    hemiSky: 0x9bc4e6,
    hemiGround: 0x574636,
    hemiIntensity: 1.02,
    cloudTopColor: 0xfff6e8,
    cloudEmissive: 0xe89a5a,
    cloudEmissiveInt: 0.44,
    cloudBaseColor: 0xd99b78,
    sunElevationDeg: 14,
    sunAzimuthDeg: 108,
    windDirFromDeg: 105,
    windSpeedKts: 9,
    gustKts: 3,
    rain: false,
  },
  canyon: {
    label: 'Tradewind Crisp',
    zenithColor: 0x14416b,
    midSkyColor: 0x3b78a1,
    horizonColor: 0xf2b579,
    fogColor: 0xdba97c,
    fogDensity: 0.00016,
    sunColor: 0xffd79c,
    sunIntensity: 2.45,
    hemiSky: 0xa2d4f2,
    hemiGround: 0x4d523b,
    hemiIntensity: 1.05,
    cloudTopColor: 0xfffaf0,
    cloudEmissive: 0xdea46f,
    cloudEmissiveInt: 0.38,
    cloudBaseColor: 0xcfa48a,
    sunElevationDeg: 22,
    sunAzimuthDeg: 124,
    windDirFromDeg: 80,
    windSpeedKts: 13,
    gustKts: 5,
    rain: false,
  },
  storm: {
    label: 'Tropical Squall & Crosswind',
    zenithColor: 0x162433,
    midSkyColor: 0x344a5e,
    horizonColor: 0x768896,
    fogColor: 0x627482,
    fogDensity: 0.00036,
    sunColor: 0xc4d2de,
    sunIntensity: 1.28,
    hemiSky: 0x7a92a6,
    hemiGround: 0x2f3940,
    hemiIntensity: 0.88,
    cloudTopColor: 0x6d8296,
    cloudEmissive: 0x2a3b4c,
    cloudEmissiveInt: 0.46,
    cloudBaseColor: 0x3e4f61,
    sunElevationDeg: 26,
    sunAzimuthDeg: 95,
    windDirFromDeg: 185,
    windSpeedKts: 21,
    gustKts: 9,
    rain: true,
  },
  dusk: {
    label: 'Twilight Beacon Haze',
    zenithColor: 0x0b162b,
    midSkyColor: 0x2c3559,
    horizonColor: 0xd96b43,
    fogColor: 0x8f4e45,
    fogDensity: 0.00030,
    sunColor: 0xff8a4d,
    sunIntensity: 1.65,
    hemiSky: 0x6577a3,
    hemiGround: 0x30262b,
    hemiIntensity: 0.78,
    cloudTopColor: 0xf7b28d,
    cloudEmissive: 0xb8563d,
    cloudEmissiveInt: 0.45,
    cloudBaseColor: 0x6e4759,
    sunElevationDeg: 5.5,
    sunAzimuthDeg: 94,
    windDirFromDeg: 98,
    windSpeedKts: 12,
    gustKts: 4,
    rain: false,
  },
};

function pseudoRand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
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
  };

  const skyGeo = new THREE.SphereGeometry(7600, 36, 24);
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
      varying vec3 vWorldDir;
      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, -0.15, 1.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.02, 0.28, h));
        col = mix(col, uZenith, smoothstep(0.24, 0.88, h));
        float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
        col += uSunColor * pow(sunDot, 18.0) * 0.42;
        col += vec3(1.0, 0.95, 0.84) * smoothstep(0.9982, 0.9997, sunDot) * 1.15;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const hemiLight = new THREE.HemisphereLight(0x9bc4e6, 0x574636, 1.02);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffca85, 2.38);
  sunLight.position.set(1800, 520, 620);
  scene.add(sunLight);

  scene.fog = new THREE.FogExp2(WEATHER_PRESETS.golden.fogColor, WEATHER_PRESETS.golden.fogDensity);

  // Soft wide layered cumulus cloud decks (sunlit cream-gold billows + shadowed flat bases)
  const cloudGroup = new THREE.Group();
  const cloudTopMat = new THREE.MeshLambertMaterial({
    color: 0xfff6e8,
    emissive: 0xe89a5a,
    emissiveIntensity: 0.44,
    transparent: true,
    opacity: 0.86,
  });
  const cloudBaseMat = new THREE.MeshLambertMaterial({
    color: 0xd99b78,
    emissive: 0x7d4e42,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.72,
  });

  const smoothPuffGeo = new THREE.SphereGeometry(1, 14, 10);
  for (let c = 0; c < 30; c += 1) {
    const cluster = new THREE.Group();
    const cx = (pseudoRand(c * 3 + 1) - 0.5) * 7400;
    const cz = (pseudoRand(c * 3 + 2) - 0.5) * 6600;
    const cy = 440 + pseudoRand(c * 3 + 3) * 320;
    cluster.position.set(cx, cy, cz);
    cluster.rotation.y = pseudoRand(c * 11) * Math.PI;

    // Multi-lobe organic cumulus cluster (no dark saucer disc underneath)
    const puffs = 5 + (c % 3);
    for (let p = 0; p < puffs; p += 1) {
      const isCrown = p > 0 && p < puffs - 1;
      const puff = new THREE.Mesh(smoothPuffGeo, isCrown ? cloudTopMat : cloudBaseMat);
      const sx = 82 + pseudoRand(c * 19 + p) * 92;
      const sy = 18 + pseudoRand(c * 23 + p) * 24;
      const sz = 62 + pseudoRand(c * 29 + p) * 70;
      puff.scale.set(sx, sy, sz);
      puff.position.set(
        (p - (puffs - 1) * 0.5) * 54,
        (isCrown ? 10 : -2) + pseudoRand(c * 37 + p) * 12,
        (pseudoRand(c * 31 + p) - 0.5) * 44,
      );
      cluster.add(puff);
    }
    cloudGroup.add(cluster);
  }
  scene.add(cloudGroup);

  // Multi-tiered angled crosswind rain streaks (soft graded opacity, tilted with squall crosswind)
  const rainGroup = new THREE.Group();
  const slant = new THREE.Vector3(-3.8, -9.6, 2.4);
  const rainNear = buildRainLayer(190, 120, 95, slant, 0.28, 100);
  const rainMid = buildRainLayer(260, 190, 115, slant.clone().multiplyScalar(0.85), 0.16, 2000);
  const rainFar = buildRainLayer(280, 260, 130, slant.clone().multiplyScalar(0.70), 0.09, 5000);
  rainGroup.add(rainNear, rainMid, rainFar);
  rainGroup.visible = false;
  scene.add(rainGroup);

  const system = {
    presetKey: 'golden',
    preset: WEATHER_PRESETS.golden,
    skyDome,
    skyUniforms,
    hemiLight,
    sunLight,
    cloudGroup,
    cloudTopMat,
    cloudBaseMat,
    rainGroup,
    rainLayers: [rainNear, rainMid, rainFar],
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

  const elev = (p.sunElevationDeg * Math.PI) / 180;
  const azim = (p.sunAzimuthDeg * Math.PI) / 180;
  const sunDir = new THREE.Vector3(
    Math.cos(elev) * Math.sin(azim),
    Math.sin(elev),
    -Math.cos(elev) * Math.cos(azim),
  ).normalize();
  weather.skyUniforms.uSunDir.value.copy(sunDir);

  weather.sunLight.color.setHex(p.sunColor);
  weather.sunLight.intensity = p.sunIntensity;
  weather.sunLight.position.copy(sunDir).multiplyScalar(2200);

  weather.hemiLight.color.setHex(p.hemiSky);
  weather.hemiLight.groundColor.setHex(p.hemiGround);
  weather.hemiLight.intensity = p.hemiIntensity;

  scene.fog.color.setHex(p.fogColor);
  scene.fog.density = p.fogDensity;

  weather.cloudTopMat.color.setHex(p.cloudTopColor);
  weather.cloudTopMat.emissive.setHex(p.cloudEmissive);
  weather.cloudTopMat.emissiveIntensity = p.cloudEmissiveInt;
  weather.cloudBaseMat.color.setHex(p.rain ? 0x5c7085 : 0xfae4ca);
  weather.cloudBaseMat.emissive.setHex(p.rain ? 0x243445 : 0xd98a55);

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

  for (let i = 0; i < weather.cloudGroup.children.length; i += 1) {
    const cl = weather.cloudGroup.children[i];
    cl.position.x -= dt * 3.8;
    if (cl.position.x < -3800) cl.position.x = 3800;
  }

  if (weather.rainGroup.visible) {
    const fallOffset = (elapsedSec * 44) % 22;
    weather.rainGroup.position.set(
      anchorPos.x + fallOffset * 0.36,
      anchorPos.y - fallOffset,
      anchorPos.z - fallOffset * 0.22,
    );
  }
}
