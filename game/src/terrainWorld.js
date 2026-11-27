// Smooth PBR textured volcanic archipelago, custom GLSL ocean shader with shoreline foam, volcano plume, harbour & village landmarks.
import * as THREE from '../vendor/three.min.js';

export const WORLD_SIZE = 9600;
export const TERRAIN_SPAN = 7200;
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
    offshore: false,
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
    offshore: false,
  },
  {
    id: 'WAPO',
    name: 'Bara Deep Offshore STOL Deck',
    code: '09/27',
    primaryLabel: '09',
    secondaryLabel: '27',
    centerX: -880,
    centerZ: -1080,
    elevation: 24.0,
    headingDeg: 90,
    length: 260,
    width: 58,
    offshore: true,
  },
];

export const LIGHTHOUSE_POS = { x: -520, z: 620 };
export const CALDERA_PEAK_POS = { x: 1920, y: 315, z: -760 };

const ISLAND_LOBES = [
  // Western Karang Jaya Atoll
  { x: -1520, z: 210, rx: 840, rz: 440, height: 34, power: 1.5 },
  { x: -1480, z: -380, rx: 690, rz: 470, height: 220, power: 1.85 },
  { x: -2050, z: -120, rx: 470, rz: 395, height: 132, power: 1.95 },
  { x: -960, z: -190, rx: 430, rz: 350, height: 96, power: 1.75 },
  // Central Selat Angin Gorge & Volcanic Sea-Stacks
  { x: -135, z: -275, rx: 310, rz: 270, height: 228, power: 1.58, crater: 0.24 },
  { x: 235, z: 155, rx: 325, rz: 285, height: 245, power: 1.62, crater: 0.28 },
  { x: -520, z: 620, rx: 255, rz: 225, height: 74, power: 1.62 },
  { x: 460, z: -560, rx: 270, rz: 235, height: 182, power: 1.66 },
  // Eastern Kaldera Timur Volcanic Island
  { x: 1440, z: 310, rx: 700, rz: 590, height: 118, power: 1.45 },
  { x: 1920, z: -760, rx: 990, rz: 890, height: 472, power: 1.72, crater: 0.44 },
  { x: 2240, z: 180, rx: 585, rz: 525, height: 242, power: 1.85 },
  { x: 1080, z: -480, rx: 495, rz: 435, height: 178, power: 1.80 },
  // Southern Rescue Cove & Reef Chain
  { x: 240, z: 1360, rx: 570, rz: 390, height: 114, power: 1.72 },
  { x: -760, z: 1290, rx: 490, rz: 345, height: 88, power: 1.78 },
  { x: 1020, z: 1490, rx: 350, rz: 295, height: 70, power: 1.85 },
];

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
  let base = -18.0;
  const detail = ridgedFbm(x, z);

  for (let i = 0; i < ISLAND_LOBES.length; i += 1) {
    const lobe = ISLAND_LOBES[i];
    const nx = (x - lobe.x) / lobe.rx;
    const nz = (z - lobe.z) / lobe.rz;
    const d2 = nx * nx + nz * nz;
    if (d2 >= 1.38) continue;
    const d = Math.sqrt(d2);
    const falloff = Math.pow(Math.max(0, 1.0 - d / 1.16), lobe.power);
    let h = lobe.height * falloff * (0.64 + 0.58 * detail);

    if (lobe.crater && d < 0.48) {
      const craterDepth = smoothstep(0.48, 0.08, d) * lobe.height * lobe.crater;
      h -= craterDepth;
    }
    if (h > 14 && h < 170) {
      h += Math.sin(h * 0.13) * 2.8;
    }
    if (h - 8.0 > base) {
      base = Math.max(base, h - 6.0);
    }
  }

  // Blend graded flat land runway mesas smoothly (skip offshore platform so ocean flows underneath)
  for (let i = 0; i < RUNWAY_SPECS.length; i += 1) {
    const rwy = RUNWAY_SPECS[i];
    if (rwy.offshore) continue;
    const proj = projectOntoRunway(x, z, rwy);
    const halfL = rwy.length * 0.5 + 56;
    const halfW = rwy.width * 0.5 + 38;
    const overL = Math.max(0, Math.abs(proj.along) - halfL);
    const overW = Math.max(0, Math.abs(proj.cross) - halfW);
    const padDist = Math.hypot(overL / 160, overW / 110);
    if (padDist < 1.0) {
      const flatten = 1.0 - smoothstep(0.0, 1.0, padDist);
      base = base * (1.0 - flatten) + rwy.elevation * flatten;
    }
  }

  return base;
}

export function classifySurfaceMaterial(x, z, height) {
  const onRunway = findContainingRunway(x, z, 6, 2);
  if (onRunway && !onRunway.runway.offshore) return 'runway';
  if (height <= SEA_LEVEL + 0.15) return 'water';
  if (height < 5.5) return 'sand';
  if (height > 180) return 'volcanic_rock';
  return 'island_ground';
}

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function computeTerrainColor(x, z, h, slope) {
  const macro = valueNoise2D(x * 0.0085, z * 0.0085);
  const micro = valueNoise2D(x * 0.032, z * 0.032);

  // Underwater coral shelf -> wet tidal sand -> warm dry beach
  if (h < -1.5) return [0.10, 0.34, 0.40];
  if (h < 1.2) {
    const t = smoothstep(-1.5, 1.2, h);
    return lerp3([0.16, 0.55, 0.58], [0.58, 0.50, 0.36], t);
  }
  if (h < 5.8) {
    const t = smoothstep(1.2, 5.8, h);
    return lerp3([0.62, 0.54, 0.39], [0.80, 0.72, 0.55], t);
  }

  // Airport cleared gravel & grass apron shoulder
  for (let i = 0; i < RUNWAY_SPECS.length; i += 1) {
    const rwy = RUNWAY_SPECS[i];
    if (rwy.offshore) continue;
    const proj = projectOntoRunway(x, z, rwy);
    if (Math.abs(proj.along) < rwy.length * 0.5 + 42 && Math.abs(proj.cross) < rwy.width * 0.5 + 32) {
      return [0.34 + micro * 0.06, 0.39 + micro * 0.05, 0.30 + micro * 0.04];
    }
  }

  // Varied lush rainforest canopy vs highland golden scrub
  const lowJungle = [0.16 + macro * 0.11, 0.40 + micro * 0.14, 0.18 + macro * 0.06];
  const highland = [0.43 + macro * 0.09, 0.46 + micro * 0.08, 0.23 + macro * 0.05];
  let col = lerp3(lowJungle, highland, smoothstep(125, 215, h));

  // Stratified dark volcanic basalt rock on steeper cliffs
  const rockMask = smoothstep(0.32, 0.56, slope);
  const strata = 0.5 + 0.5 * Math.sin(h * 0.24 + macro * 4.5);
  const basalt = [
    0.26 + strata * 0.14,
    0.22 + strata * 0.10,
    0.20 + strata * 0.07,
  ];
  col = lerp3(col, basalt, rockMask);

  // Volcanic ash & warm sulfur-ochre rim on Mount Bara summit
  if (h > 245) {
    const ashT = smoothstep(245, 340, h);
    const ashCol = [0.22 + strata * 0.08, 0.20 + strata * 0.06, 0.19 + strata * 0.05];
    col = lerp3(col, ashCol, ashT);
  }

  return col;
}

function createTerrainPbrTextures() {
  const size = 512;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dCtx = diffCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  // Neutral high-value albedo micro-texture with isotropic organic mottling (zero directional banding!)
  dCtx.fillStyle = '#dad8d2';
  dCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Soft broad organic patches (tiled seamlessly across wrap boundaries)
  for (let i = 0; i < 420; i += 1) {
    const cx = hash2D(i, 17) * size;
    const cy = hash2D(i, 53) * size;
    const rad = 14 + hash2D(i, 89) * 34;
    const v = hash2D(i, 137);
    const shade = Math.round(205 + (v - 0.5) * 44);
    const bVal = Math.round(128 + (v - 0.5) * 58);

    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const px = cx + ox;
        const py = cy + oy;
        if (px + rad < 0 || px - rad > size || py + rad < 0 || py - rad > size) continue;
        const dg = dCtx.createRadialGradient(px, py, 2, px, py, rad);
        dg.addColorStop(0, `rgba(${shade}, ${shade + 2}, ${shade - 3}, 0.16)`);
        dg.addColorStop(1, `rgba(${shade}, ${shade + 2}, ${shade - 3}, 0.0)`);
        dCtx.fillStyle = dg;
        dCtx.beginPath();
        dCtx.arc(px, py, rad, 0, Math.PI * 2);
        dCtx.fill();

        const bg = bCtx.createRadialGradient(px, py, 2, px, py, rad);
        bg.addColorStop(0, `rgba(${bVal}, ${bVal}, ${bVal}, 0.22)`);
        bg.addColorStop(1, `rgba(${bVal}, ${bVal}, ${bVal}, 0.0)`);
        bCtx.fillStyle = bg;
        bCtx.beginPath();
        bCtx.arc(px, py, rad, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  }

  // Fine isotropic soil, sand, basalt, and canopy grain speckles
  for (let i = 0; i < 4800; i += 1) {
    const x = hash2D(i, 211) * size;
    const y = hash2D(i, 307) * size;
    const r = 1.5 + hash2D(i, 419) * 4.2;
    const v = hash2D(i, 523);
    const shade = Math.round(194 + (v - 0.5) * 56);
    dCtx.fillStyle = `rgba(${shade}, ${shade + 1}, ${shade - 3}, 0.18)`;
    dCtx.beginPath();
    dCtx.arc(x, y, r, 0, Math.PI * 2);
    dCtx.fill();

    const bVal = Math.round(128 + (v - 0.5) * 76);
    bCtx.fillStyle = `rgba(${bVal}, ${bVal}, ${bVal}, 0.22)`;
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.colorSpace = THREE.SRGBColorSpace;
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.RepeatWrapping;
  diffTex.repeat.set(34, 34);
  diffTex.anisotropy = 16;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(34, 34);
  bumpTex.anisotropy = 16;

  return { diffTex, bumpTex };
}

function bakeCoastalDepthDataTexture() {
  const res = 512;
  const data = new Uint8Array(res * res * 4);
  for (let iz = 0; iz < res; iz += 1) {
    const wz = ((iz + 0.5) / res - 0.5) * TERRAIN_SPAN;
    for (let ix = 0; ix < res; ix += 1) {
      const wx = ((ix + 0.5) / res - 0.5) * TERRAIN_SPAN;
      const h = sampleTerrainHeight(wx, wz);
      const encoded = Math.max(0, Math.min(255, Math.round(((h + 24.0) / 64.0) * 255)));
      const idx = (iz * res + ix) * 4;
      data[idx] = encoded;
      data[idx + 1] = encoded;
      data[idx + 2] = encoded;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createTerrainRadarCanvas(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let py = 0; py < size; py += 1) {
    const wz = ((py + 0.5) / size - 0.5) * TERRAIN_SPAN;
    for (let px = 0; px < size; px += 1) {
      const wx = ((px + 0.5) / size - 0.5) * TERRAIN_SPAN;
      const h = sampleTerrainHeight(wx, wz);
      const idx = (py * size + px) * 4;

      let r = 8;
      let g = 24;
      let b = 38;
      if (h > -6 && h <= 0) {
        r = 16;
        g = 62;
        b = 76;
      } else if (h > 0 && h < 45) {
        r = 34;
        g = 94;
        b = 62;
      } else if (h >= 45 && h < 150) {
        r = 56;
        g = 116;
        b = 58;
      } else if (h >= 150 && h < 260) {
        r = 116;
        g = 104;
        b = 62;
      } else if (h >= 260) {
        r = 152;
        g = 96;
        b = 72;
      }
      // Elevation contour rings every 60m for true aeronautical chart readability
      if (h > 4 && Math.abs((h % 60) - 30) > 27.2) {
        r = Math.min(255, r + 26);
        g = Math.min(255, g + 26);
        b = Math.min(255, b + 18);
      }
      d[idx] = r;
      d[idx + 1] = g;
      d[idx + 2] = b;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function createGlslOceanMesh(depthTex) {
  const oceanUniforms = {
    uTime: { value: 0.0 },
    uSunDir: { value: new THREE.Vector3(0.85, 0.24, 0.35).normalize() },
    uSunColor: { value: new THREE.Color(0xffd296) },
    uZenithColor: { value: new THREE.Color(0x102d4f) },
    uHorizonColor: { value: new THREE.Color(0xf4a261) },
    uFogColor: { value: new THREE.Color(0xdc9866) },
    uFogDensity: { value: 0.000175 },
    uDeepColor: { value: new THREE.Color(0x0b3650) },
    uShallowColor: { value: new THREE.Color(0x1da3a8) },
    uStormFactor: { value: 0.12 },
    uHeightMap: { value: depthTex },
    uTerrainSpan: { value: TERRAIN_SPAN },
  };

  const geo = new THREE.PlaneGeometry(WORLD_SIZE * 1.9, WORLD_SIZE * 1.9, 128, 128);
  geo.rotateX(-Math.PI * 0.5);

  const mat = new THREE.ShaderMaterial({
    uniforms: oceanUniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uStormFactor;
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float amp = 0.42 + uStormFactor * 1.05;
        float w1 = sin(wp.x * 0.032 + wp.z * 0.018 + uTime * 1.35) * amp;
        float w2 = cos(wp.x * 0.019 - wp.z * 0.041 + uTime * 1.12) * (amp * 0.72);
        wp.y += (w1 + w2) * 0.55;
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform float uStormFactor;
      uniform sampler2D uHeightMap;
      uniform float uTerrainSpan;
      varying vec3 vWorldPos;

      float waveHeight(vec2 p, float t, float nearAtten, float farAtten) {
        float h = 0.0;
        h += sin(p.x * 0.044 + p.y * 0.027 + t * 1.55) * (0.46 * farAtten);
        h += sin(p.x * -0.068 + p.y * 0.059 + t * 2.05) * (0.30 * farAtten);
        h += sin(p.x * 0.132 - p.y * 0.108 + t * 2.65) * (0.14 * nearAtten);
        h += cos(p.x * 0.245 + p.y * 0.210 - t * 3.10) * (0.07 * nearAtten * nearAtten);
        return h;
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float dist = length(cameraPosition - vWorldPos);
        // Smooth two-band distance attenuation removes distant Nyquist moire striping cleanly
        float nearAtten = 1.0 - smoothstep(140.0, 760.0, dist);
        float farAtten = 1.0 - smoothstep(340.0, 1650.0, dist);
        float eps = 1.15 + dist * 0.0022;
        float hC = waveHeight(p, uTime, nearAtten, farAtten);
        float hX = waveHeight(p + vec2(eps, 0.0), uTime, nearAtten, farAtten);
        float hZ = waveHeight(p + vec2(0.0, eps), uTime, nearAtten, farAtten);

        float chop = (0.34 + uStormFactor * 0.44) * farAtten;
        vec3 N = normalize(vec3((hC - hX) * chop, 1.0, (hC - hZ) * chop));
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 L = normalize(uSunDir);

        // Sample high-res baked coastal depth texture for turquoise lagoons & crisp surf foam
        vec2 hmUv = p / uTerrainSpan + 0.5;
        float waterDepth = 32.0;
        if (hmUv.x > 0.005 && hmUv.x < 0.995 && hmUv.y > 0.005 && hmUv.y < 0.995) {
          float bedH = texture2D(uHeightMap, hmUv).r * 64.0 - 24.0;
          waterDepth = max(0.0, -bedH);
        }

        float shallowFactor = exp(-waterDepth * 0.19);
        vec3 waterBase = mix(uDeepColor, uShallowColor, shallowFactor * 0.85);

        // Fresnel reflection of Rayleigh-Mie sky gradient
        float NdotV = clamp(dot(N, V), 0.0, 1.0);
        float fresnel = 0.04 + 0.96 * pow(1.0 - NdotV, 4.2);
        vec3 R = reflect(-V, N);
        vec3 skyRefl = mix(uHorizonColor, uZenithColor, clamp(max(R.y, 0.0) * 1.45, 0.0, 1.0));
        vec3 col = mix(waterBase, skyRefl, fresnel * (0.62 + uStormFactor * 0.12));

        // Dual-lobe sun glitter path across wave facets (smoothly anti-aliased with distance)
        vec3 H = normalize(L + V);
        float specSharp = pow(max(dot(N, H), 0.0), mix(95.0, 210.0, nearAtten)) * (1.65 - uStormFactor * 1.15);
        float specBroad = pow(max(dot(N, H), 0.0), 22.0) * (0.36 - uStormFactor * 0.18);
        col += uSunColor * (specSharp + specBroad);

        // Crisp frothy coastal breaking surf ribbon + storm offshore whitecaps (no milky blobs!)
        float surfBreak = sin(waterDepth * 5.2 - uTime * 2.6 + hC * 3.8 + sin(p.x * 0.09) * 1.4) * 0.5 + 0.5;
        float innerEdge = smoothstep(1.35, 0.08, waterDepth) * (0.45 + 0.55 * surfBreak);
        float outerRoller = smoothstep(2.9, 1.1, waterDepth) * smoothstep(0.68, 0.94, surfBreak) * 0.55;
        float shoreFoam = clamp(innerEdge + outerRoller, 0.0, 0.88);
        float crestFoam = smoothstep(0.56 - uStormFactor * 0.18, 0.92, hC) * (0.06 + uStormFactor * 0.28) * (0.25 + 0.75 * nearAtten) * farAtten;
        float totalFoam = clamp(shoreFoam + crestFoam, 0.0, 0.88);
        vec3 foamColor = mix(vec3(0.86, 0.92, 0.96), uSunColor * 0.30 + vec3(0.78), 0.42);
        col = mix(col, foamColor, totalFoam);

        // Exponential aerial perspective fog matching scene.fog seamlessly
        float fogAmt = 1.0 - exp(-(uFogDensity * dist) * (uFogDensity * dist));
        col = mix(col, uFogColor, clamp(fogAmt, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = SEA_LEVEL;
  return { mesh, uniforms: oceanUniforms };
}

function buildLighthouseHarbourAndVillage(group) {
  // 1. Coastal Lighthouse with rotating golden beacon
  const lhY = sampleTerrainHeight(LIGHTHOUSE_POS.x, LIGHTHOUSE_POS.z);
  const lhGroup = new THREE.Group();
  lhGroup.position.set(LIGHTHOUSE_POS.x, lhY - 0.5, LIGHTHOUSE_POS.z);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.52 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xd94832, roughness: 0.48 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd275 });

  for (let band = 0; band < 4; band += 1) {
    const rBot = 4.6 - band * 0.55;
    const rTop = 4.05 - band * 0.55;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, 6.5, 14),
      band % 2 === 0 ? whiteMat : redMat,
    );
    seg.position.y = 3.25 + band * 6.5;
    seg.castShadow = true;
    lhGroup.add(seg);
  }
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 4.2, 14), beaconMat);
  lantern.position.y = 28.0;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.2, 14), redMat);
  roof.position.y = 31.5;
  lhGroup.add(lantern, roof);

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

  // 2. Karang Jaya Harbour Pier, Crane, Containers & Coastal Cargo Vessels
  const pierGroup = new THREE.Group();
  pierGroup.position.set(-1240, 0, 445);
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x767d82, roughness: 0.85 });
  const craneMat = new THREE.MeshStandardMaterial({ color: 0xe37222, roughness: 0.45, metalness: 0.35 });
  const quay = new THREE.Mesh(new THREE.BoxGeometry(118, 4.2, 24), concreteMat);
  quay.position.set(0, 1.8, 0);
  quay.receiveShadow = true;
  quay.castShadow = true;
  const jetty = new THREE.Mesh(new THREE.BoxGeometry(14, 3.4, 72), concreteMat);
  jetty.position.set(36, 1.4, 42);
  jetty.receiveShadow = true;
  pierGroup.add(quay, jetty);

  // Port crane & stacked intermodal containers
  const cranePost = new THREE.Mesh(new THREE.BoxGeometry(3.2, 18, 3.2), craneMat);
  cranePost.position.set(-22, 12.5, 4);
  cranePost.castShadow = true;
  const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 28), craneMat);
  craneBoom.position.set(-22, 20.5, 12);
  craneBoom.rotation.x = -0.18;
  pierGroup.add(cranePost, craneBoom);

  const boxCols = [0xc94f34, 0x265c78, 0xd49635, 0x2e6f5e];
  for (let c = 0; c < 8; c += 1) {
    const cm = new THREE.MeshStandardMaterial({ color: boxCols[c % boxCols.length], roughness: 0.6 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(11, 3.6, 4.6), cm);
    box.position.set(-42 + (c % 4) * 14, 5.6 + Math.floor(c / 4) * 3.7, -4);
    box.castShadow = true;
    pierGroup.add(box);
  }
  group.add(pierGroup);

  // Detailed cargo freighters & harbour boats with white foam wakes
  const boatCoords = [
    { x: -1205, z: 515, hdg: 1.56, scale: 1.15 },
    { x: -340, z: 320, hdg: 1.9, scale: 1.05 },
    { x: 760, z: 640, hdg: -0.7, scale: 1.0 },
    { x: 180, z: 1020, hdg: 2.4, scale: 0.9 },
    { x: -980, z: -870, hdg: 0.85, scale: 1.1 }, // Offshore supply vessel near WAPO
  ];
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x243647, roughness: 0.58 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xcf5d2d, roughness: 0.65 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xedeae2, roughness: 0.48 });
  const wakeMat = new THREE.MeshBasicMaterial({
    color: 0xe6f4fa,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });

  for (let i = 0; i < boatCoords.length; i += 1) {
    const b = boatCoords[i];
    const ship = new THREE.Group();
    ship.position.set(b.x, 1.3, b.z);
    ship.rotation.y = b.hdg;
    ship.scale.setScalar(b.scale);

    const hull = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.8, 30), hullMat);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(4.8, 7.5, 4), hullMat);
    bow.rotation.x = -Math.PI * 0.5;
    bow.rotation.z = Math.PI * 0.25;
    bow.position.set(0, 0, -18.5);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.2, 25), deckMat);
    deck.position.y = 2.1;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(6.6, 5.8, 7.2), cabinMat);
    bridge.position.set(0, 5.2, 6.2);
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(11, 34), wakeMat);
    wake.rotation.x = -Math.PI * 0.5;
    wake.position.set(0, -1.0, 31);
    ship.add(hull, bow, deck, bridge, wake);
    group.add(ship);
  }

  // 3. Coastal Settlement Village Clusters with warm glowing amber windows
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.72 });
  const roofCols = [0xb84a2a, 0x3b586e, 0x8f5232];
  const winGlowMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
  const villageAnchors = [
    { cx: -1675, cz: 32, count: 14 },
    { cx: -1290, cz: 335, count: 10 },
    { cx: 1210, cz: 195, count: 9 },
  ];

  for (let v = 0; v < villageAnchors.length; v += 1) {
    const va = villageAnchors[v];
    for (let b = 0; b < va.count; b += 1) {
      const bx = va.cx + (hash2D(v * 31 + b, 11) - 0.5) * 190;
      const bz = va.cz + (hash2D(v * 31 + b, 29) - 0.5) * 125;
      if (findContainingRunway(bx, bz, 60, 40)) continue;
      const by = sampleTerrainHeight(bx, bz);
      if (by < 5.5 || by > 120) continue;

      const bw = 9 + hash2D(b, 77) * 8;
      const bd = 8 + hash2D(b, 99) * 7;
      const bh = 4.5 + hash2D(b, 113) * 4.5;
      const house = new THREE.Group();
      house.position.set(bx, by, bz);
      house.rotation.y = hash2D(b, 149) * Math.PI;

      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat);
      body.position.y = bh * 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      const rMat = new THREE.MeshStandardMaterial({ color: roofCols[b % roofCols.length], roughness: 0.65 });
      const rMesh = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.74, 3.2, 4), rMat);
      rMesh.rotation.y = Math.PI * 0.25;
      rMesh.position.y = bh + 1.5;

      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.65, 0.9, bd + 0.14), winGlowMat);
      glowStrip.position.y = bh * 0.56;
      house.add(body, rMesh, glowStrip);
      group.add(house);
    }
  }

  return { beamMesh };
}

function buildVolcanicPlume(group) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  g.addColorStop(0.0, 'rgba(218, 214, 212, 0.55)');
  g.addColorStop(0.55, 'rgba(175, 168, 166, 0.26)');
  g.addColorStop(1.0, 'rgba(160, 155, 155, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);

  const wisps = [];
  for (let i = 0; i < 16; i += 1) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: i < 5 ? 0xf2c9b0 : 0xd6d1cf,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    group.add(sp);
    wisps.push({ sp, mat, phase: i / 16 });
  }
  return wisps;
}

function buildTropicalTreeInstances(group) {
  const positions = [];
  for (let i = 0; i < 1200; i += 1) {
    const x = (hash2D(i, 701) - 0.5) * 5600;
    const z = (hash2D(i, 919) - 0.5) * 4400;
    const h = sampleTerrainHeight(x, z);
    if (h < 13.0 || h > 152) continue;
    if (findContainingRunway(x, z, 115, 62)) continue;
    const hx = sampleTerrainHeight(x + 6, z) - h;
    const hz = sampleTerrainHeight(x, z + 6) - h;
    if (Math.hypot(hx, hz) / 6 > 0.42) continue;
    positions.push({ x, y: h, z, scale: 0.92 + hash2D(i, 313) * 0.78, tint: hash2D(i, 577) });
    if (positions.length >= 420) break;
  }

  if (positions.length === 0) return;

  const count = positions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.38, 0.65, 4.4, 7);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6e4b30,
    emissive: 0x24170c,
    emissiveIntensity: 0.26,
    roughness: 0.9,
  });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);

  // Lush rounded tropical rainforest canopy domes (organic archipelago silhouette, not sharp pine cones)
  const lowerCrownGeo = new THREE.SphereGeometry(4.4, 9, 7);
  lowerCrownGeo.scale(1.22, 0.68, 1.16);
  const upperCrownGeo = new THREE.SphereGeometry(3.2, 9, 7);
  upperCrownGeo.scale(1.12, 0.74, 1.08);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x162b12,
    emissiveIntensity: 0.28,
    roughness: 0.88,
  });
  const lowerCrowns = new THREE.InstancedMesh(lowerCrownGeo, foliageMat, count);
  const upperCrowns = new THREE.InstancedMesh(upperCrownGeo, foliageMat, count);
  lowerCrowns.castShadow = true;
  lowerCrowns.receiveShadow = true;

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

  // Smooth-shaded high-resolution PBR textured volcanic terrain (no harsh flat low-poly triangles!)
  const segs = 256;
  const geo = new THREE.PlaneGeometry(TERRAIN_SPAN, TERRAIN_SPAN, segs, segs);
  geo.rotateX(-Math.PI * 0.5);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, sampleTerrainHeight(x, z));
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

  const { diffTex, bumpTex } = createTerrainPbrTextures();
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: diffTex,
    bumpMap: bumpTex,
    bumpScale: 0.85,
    roughness: 0.90,
    metalness: 0.02,
    flatShading: false,
  });
  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  worldGroup.add(terrainMesh);

  // Custom GLSL Ocean with baked coastal depth texture for turquoise reefs & breaking shoreline foam
  const depthTex = bakeCoastalDepthDataTexture();
  const ocean = createGlslOceanMesh(depthTex);
  worldGroup.add(ocean.mesh);

  const landmarks = buildLighthouseHarbourAndVillage(worldGroup);
  const volcanoPlume = buildVolcanicPlume(worldGroup);
  buildTropicalTreeInstances(worldGroup);
  scene.add(worldGroup);

  return {
    worldGroup,
    terrainMesh,
    oceanMesh: ocean.mesh,
    oceanUniforms: ocean.uniforms,
    lighthouseBeam: landmarks.beamMesh,
    volcanoPlume,
    radarMapCanvas: createTerrainRadarCanvas(256),
  };
}

export function syncOceanWithWeather(worldRefs, weather) {
  if (!worldRefs?.oceanUniforms || !weather) return;
  const u = worldRefs.oceanUniforms;
  const p = weather.preset;
  u.uSunDir.value.copy(weather.sunDir);
  u.uSunColor.value.setHex(p.sunColor);
  u.uZenithColor.value.setHex(p.zenithColor);
  u.uHorizonColor.value.setHex(p.horizonColor);
  u.uFogColor.value.setHex(p.fogColor);
  u.uFogDensity.value = p.fogDensity;
  u.uDeepColor.value.setHex(p.oceanDeep);
  u.uShallowColor.value.setHex(p.oceanShallow);
  u.uStormFactor.value = p.stormFactor;
}

export function updateOceanWaves(worldRefs, elapsedSec) {
  if (!worldRefs) return;
  if (worldRefs.oceanUniforms) {
    worldRefs.oceanUniforms.uTime.value = elapsedSec;
  }
  if (worldRefs.lighthouseBeam) {
    worldRefs.lighthouseBeam.rotation.y = elapsedSec * 1.15;
  }
  if (worldRefs.volcanoPlume) {
    for (let i = 0; i < worldRefs.volcanoPlume.length; i += 1) {
      const w = worldRefs.volcanoPlume[i];
      const t = (w.phase + elapsedSec * 0.045) % 1.0;
      const driftX = t * 240 + Math.sin(elapsedSec * 0.5 + i) * 18;
      const driftZ = -t * 145 + Math.cos(elapsedSec * 0.4 + i) * 16;
      w.sp.position.set(
        CALDERA_PEAK_POS.x + driftX,
        CALDERA_PEAK_POS.y + t * 290,
        CALDERA_PEAK_POS.z + driftZ,
      );
      const scale = 68 + t * 210;
      w.sp.scale.set(scale * 1.25, scale * 0.85, 1);
      w.mat.opacity = Math.sin(t * Math.PI) * 0.42;
    }
  }
}
