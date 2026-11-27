// Main 3D simulation engine, PBR real-time shadow renderer, 3-aircraft fleet switcher, 6 sorties, and v3 showcase staging.
import * as THREE from '../vendor/three.min.js';
import {
  MISSIONS,
  createMissionState,
  getMissionHudView,
  updateMissionProgress,
} from './missionManager.js';
import {
  applyMissionWeather,
  createWeatherSystem,
  sampleWindAtPosition,
  updateWeatherVisuals,
} from './weatherSystem.js';
import {
  applyAircraftProfile,
  computeIlsGuidance,
  createFlightState,
  resetAircraftAtSpawn,
  setQuaternionFromAttitude,
  stepFlightPhysics,
} from './flightPhysics.js';
import {
  createCockpitHud,
  renderCockpitHud,
  resizeCockpitHud,
} from './cockpitHud.js';
import { FlightAudioSynth } from './audioSynth.js';
import {
  createCameraRig,
  snapCameraRig,
  toggleCameraMode,
  updateCameraRig,
} from './cameraRig.js';
import { createInputController, samplePilotControls } from './inputController.js';
import {
  clearParticles,
  createParticleSystem,
  spawnAirdropCanister,
  spawnArrestorSparks,
  spawnCrashExplosion,
  spawnTireSmoke,
  updateParticles,
} from './particleEffects.js';
import {
  buildArchipelagoWorld,
  syncOceanWithWeather,
  updateOceanWaves,
} from './terrainWorld.js';
import {
  buildAerodromesAndRings,
  rebuildMissionRings,
  updateRunwayAidsAndRings,
} from './runwayAndRings.js';
import { buildAircraftMesh, updateAircraftAnimations } from './aircraftModel.js';

const FIXED_DT = 1 / 60;

export function stageShowcaseScene(shotName, ctx) {
  const {
    scene,
    flightState,
    weather,
    aids,
    particles,
    cameraRig,
    worldRefs,
    hud,
    setMission,
    selectAircraft,
  } = ctx;

  if (shotName === 'cover') {
    // Dynamic 3/4 rear-port-upper hero approach revealing ATW-28 PBR livery, twin props, glowing gate & WARA RWY 09
    selectAircraft('islander', false);
    setMission(0, false);
    resetAircraftAtSpawn(flightState, {
      x: -2285,
      y: 47,
      z: 244,
      headingDeg: 84.5,
      pitchDeg: 2.2,
      rollDeg: 11.5,
      airspeedKts: 94,
      throttle: 0.68,
      flapIndex: 1,
      fuelPct: 84,
      sinkMps: -1.6,
      onGround: false,
    });
    if (aids.ringInstances[0]) {
      aids.ringInstances[0].holder.position.set(-1995, 58, 204);
      aids.ringInstances[0].holder.scale.setScalar(0.84);
    }
    toggleCameraMode(cameraRig, 'chase');
    cameraRig.orbitYaw = -0.44;
    cameraRig.orbitPitch = 0.22;
    snapCameraRig(cameraRig, flightState);
    flightState.gLoad = 1.1;
    flightState.verticalSpeedFpm = -320;
    flightState.alphaDeg = 5.4;
    flightState.egtC = 672;
    flightState.stallMarginKts = 48;
    computeIlsGuidance(flightState, 'WARA');
  } else if (shotName === 'cockpit') {
    selectAircraft('islander', false);
    setMission(4, false); // Sortie 05: Volcanic Thermal Rescue facing smoking Mount Bara caldera & golden ocean
    applyMissionWeather(weather, scene, 'volcanic');
    syncOceanWithWeather(worldRefs, weather);
    resetAircraftAtSpawn(flightState, {
      x: 1125,
      y: 266,
      z: -485,
      headingDeg: 68,
      pitchDeg: -2.2,
      rollDeg: -8,
      airspeedKts: 108,
      throttle: 0.72,
      flapIndex: 0,
      fuelPct: 76,
      sinkMps: 0.9,
      onGround: false,
    });
    if (aids.ringInstances[0]) {
      aids.ringInstances[0].holder.position.set(1455, 272, -578);
    }
    toggleCameraMode(cameraRig, 'cockpit');
    snapCameraRig(cameraRig, flightState);
    flightState.controlRoll = -0.14;
    flightState.gLoad = 1.1;
    flightState.verticalSpeedFpm = 180;
    flightState.alphaDeg = 4.2;
    flightState.egtC = 684;
    flightState.stallMarginKts = 55;
    computeIlsGuidance(flightState, 'WAKB');
  } else if (shotName === 'action') {
    // Iconic Offshore Carrier Deck (WAPO) Dusk Trap Approach with VX-9 Peregrine, deployed tailhook, 3 arrestor wires & lit OLS Meatball
    selectAircraft('peregrine', false);
    setMission(5, false); // Sortie 06: Offshore Platform Approach (WAPO)
    applyMissionWeather(weather, scene, 'dusk');
    syncOceanWithWeather(worldRefs, weather);
    for (let r = 0; r < aids.ringInstances.length; r += 1) {
      aids.ringInstances[r].captured = true;
      aids.ringInstances[r].holder.visible = false;
    }
    ctx.missionState.ringsCaptured = ctx.missionState.totalRings;
    ctx.missionState.activeRingIndex = ctx.missionState.totalRings;

    resetAircraftAtSpawn(flightState, {
      x: -1104,
      y: 34.8,
      z: -1077,
      headingDeg: 90.0,
      pitchDeg: 4.8,
      rollDeg: -6.5,
      airspeedKts: 84,
      throttle: 0.56,
      flapIndex: 2,
      fuelPct: 48,
      sinkMps: -1.75,
      tailhookDeployed: true,
      onGround: false,
    });
    flightState.gLoad = 1.2;
    flightState.groundSpeedKts = 76;
    flightState.verticalSpeedFpm = -340;
    flightState.alphaDeg = 7.4;
    flightState.egtC = 648;
    flightState.stallMarginKts = 28;
    flightState.controlRoll = -0.10;
    flightState.controlPitch = 0.16;
    flightState.stallWarning = false;
    flightState.terrainPullUp = false;
    computeIlsGuidance(flightState, 'WAPO');

    if (ctx.aircraft.tailhookPivot) {
      ctx.aircraft.tailhookPivot.rotation.x = 0.68;
    }

    particles.leftTrailPts = [];
    particles.rightTrailPts = [];
    particles.leftTrailGeo.setFromPoints([]);
    particles.rightTrailGeo.setFromPoints([]);

    toggleCameraMode(cameraRig, 'chase');
    cameraRig.orbitYaw = 0.24;
    cameraRig.orbitPitch = 0.17;
    snapCameraRig(cameraRig, flightState);
  } else if (shotName === 'touchdown') {
    selectAircraft('islander', false);
    setMission(3, false);
    applyMissionWeather(weather, scene, 'golden');
    syncOceanWithWeather(worldRefs, weather);
    for (let r = 0; r < aids.ringInstances.length; r += 1) {
      aids.ringInstances[r].captured = true;
      aids.ringInstances[r].holder.visible = false;
    }
    ctx.missionState.ringsCaptured = ctx.missionState.totalRings;
    ctx.missionState.activeRingIndex = ctx.missionState.totalRings;

    resetAircraftAtSpawn(flightState, {
      x: -1935,
      y: 20.35,
      z: 221.2,
      headingDeg: 90,
      pitchDeg: 4.0,
      rollDeg: 0,
      airspeedKts: 62,
      throttle: 0.12,
      flapIndex: 2,
      fuelPct: 71,
      brakes: true,
      onGround: true,
    });
    setQuaternionFromAttitude(flightState.quaternion, 90, 4.0, 0);
    flightState.alphaDeg = 5.8;
    flightState.egtC = 518;
    flightState.stallMarginKts = 20;
    flightState.touchdownActive = true;
    flightState.rolloutDistanceM = 168;
    computeIlsGuidance(flightState, 'WARA');
    flightState.lastLandingCard = {
      rating: 'SMOOTH STOL TOUCHDOWN',
      grade: 'S',
      wireNumber: 0,
      runwayName: 'WARA RWY 09/27',
      sinkRateFpm: -142,
      touchdownKts: 66,
      touchdownAoaDeg: 5.8,
      ilsDevDots: 0.22,
      maxG: 1.4,
      fuelBurnedPct: 13,
      centerlineM: 1.0,
      stoppingDistanceM: 168,
      fuelRemainingPct: 71,
      damagePct: 0,
      stopped: false,
    };
    toggleCameraMode(cameraRig, 'chase');
    cameraRig.orbitYaw = -0.14;
    cameraRig.orbitPitch = 0.14;
    snapCameraRig(cameraRig, flightState);

    for (let s = 0; s < 24; s += 1) {
      const trailPos = new THREE.Vector3(-1936 - s * 1.55, 20.35, 221.2);
      spawnTireSmoke(particles, trailPos, flightState.quaternion, 2);
      updateParticles(particles, flightState, 0.036);
    }
  }

  const elapsed = 18.4;
  sampleWindAtPosition(weather, flightState.position, elapsed);
  updateWeatherVisuals(weather, flightState.position, elapsed, FIXED_DT);
  syncOceanWithWeather(worldRefs, weather);
  updateOceanWaves(worldRefs, elapsed);
  const mView = getMissionHudView(ctx.missionState, flightState, aids);
  updateRunwayAidsAndRings(aids, flightState.position, ctx.missionState.activeRingIndex, weather, elapsed);
  updateAircraftAnimations(ctx.aircraft, flightState, cameraRig.mode, mView, weather, elapsed, worldRefs, aids);
  renderCockpitHud(hud, flightState, mView, weather, cameraRig.mode, elapsed, worldRefs, aids);
}

export function bootFlightGame() {
  const flightCanvas = document.getElementById('flight-canvas');
  const hudCanvas = document.getElementById('hud-canvas');
  const bootStateEl = document.getElementById('boot-state');
  const errorStateEl = document.getElementById('error-state');
  const briefingDialog = document.getElementById('briefing-modal');
  const crashDialog = document.getElementById('crash-modal');
  const completeDialog = document.getElementById('complete-modal');
  const footerTagEl = document.getElementById('deck-footer-label');
  const srStatus = document.getElementById('sr-status');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: flightCanvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    if (bootStateEl) bootStateEl.hidden = true;
    if (errorStateEl) {
      errorStateEl.hidden = false;
      const detail = document.getElementById('error-detail');
      if (detail) {
        detail.textContent = `WebGL context initialization failed (${err?.message ?? 'unsupported GPU context'}). Enable hardware acceleration in browser settings and reload.`;
      }
    }
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const weather = createWeatherSystem(scene);
  const worldRefs = buildArchipelagoWorld(scene);
  const aids = buildAerodromesAndRings(scene);
  let aircraft = buildAircraftMesh('islander');
  scene.add(aircraft.aircraftRoot);
  const particles = createParticleSystem(scene);

  const cameraRig = createCameraRig(window.innerWidth / Math.max(1, window.innerHeight));
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  cameraRig.reducedMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener?.('change', (e) => {
    cameraRig.reducedMotion = e.matches;
  });

  const hud = createCockpitHud(hudCanvas);
  const audio = new FlightAudioSynth();
  const input = createInputController(flightCanvas);
  const flightState = createFlightState('islander');

  const sortieLog = [];
  let missionState = createMissionState(0);
  let paused = true;
  let elapsedSec = 0;

  const updateToolbarLabels = () => {
    const camBtn = document.getElementById('btn-camera');
    const flapBtn = document.getElementById('btn-flaps');
    const hookBtn = document.getElementById('btn-hook');
    const brakeBtn = document.getElementById('btn-brakes');
    const muteBtn = document.getElementById('btn-mute');
    const pauseBtn = document.getElementById('btn-pause');
    const toolbar = document.getElementById('deck-header');

    if (toolbar) {
      toolbar.classList.toggle('cockpit-docked', cameraRig.mode === 'cockpit');
    }
    if (footerTagEl) {
      footerTagEl.textContent = `${flightState.aircraftSpec.shortLabel} // ATOLWING EFIS`;
    }
    if (camBtn) {
      camBtn.textContent = cameraRig.mode === 'cockpit' ? 'Cam: Cockpit [C]' : 'Cam: Chase [C]';
      camBtn.setAttribute('aria-pressed', String(cameraRig.mode === 'cockpit'));
    }
    if (flapBtn) {
      const deg = [0, 15, 35][flightState.flapIndex] ?? 0;
      flapBtn.textContent = `Flaps: ${deg} deg [F]`;
    }
    if (hookBtn) {
      hookBtn.textContent = `Hook: ${flightState.tailhookDeployed ? 'DN' : 'UP'} [H]`;
      hookBtn.setAttribute('aria-pressed', String(Boolean(flightState.tailhookDeployed)));
    }
    if (brakeBtn) {
      brakeBtn.textContent = `Brakes: ${flightState.brakes || input.pending.brakeLatch ? 'ON' : 'OFF'} [B]`;
      brakeBtn.setAttribute('aria-pressed', String(Boolean(flightState.brakes || input.pending.brakeLatch)));
    }
    if (muteBtn) {
      muteBtn.textContent = audio.muted ? 'Audio: Muted [M]' : 'Audio: Live [M]';
      muteBtn.setAttribute('aria-pressed', String(audio.muted));
    }
    if (pauseBtn) {
      pauseBtn.textContent = paused ? 'Resume Sortie [P]' : 'Pause / Deck [P]';
      pauseBtn.setAttribute('aria-expanded', String(paused));
    }
  };

  const renderLogbookDom = () => {
    const emptyEl = document.getElementById('flight-log-empty');
    const listEl = document.getElementById('flight-log-list');
    if (!emptyEl || !listEl) return;

    if (sortieLog.length === 0) {
      emptyEl.hidden = false;
      listEl.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = '';
    for (let i = sortieLog.length - 1; i >= 0; i -= 1) {
      const entry = sortieLog[i];
      const li = document.createElement('li');
      li.textContent = `${entry.aircraftName} | ${entry.missionTitle}: ${entry.landingRating} (${entry.sinkRateFpm} FPM, stop ${entry.stoppingDistanceM} m, ${entry.totalScore} pts)`;
      listEl.appendChild(li);
    }
  };

  const syncBriefingCards = () => {
    document.querySelectorAll('[data-mission-index]').forEach((btn) => {
      const idx = Number(btn.getAttribute('data-mission-index'));
      const selected = idx === missionState.missionIndex;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-aircraft-id]').forEach((btn) => {
      const id = btn.getAttribute('data-aircraft-id');
      const selected = id === flightState.aircraftId;
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
    const descEl = document.getElementById('selected-mission-brief');
    if (descEl) {
      descEl.textContent = `${flightState.aircraftSpec.name} (${flightState.aircraftSpec.registration}): ${missionState.mission.briefing}`;
    }
  };

  const selectAircraft = (aircraftId, announce = true) => {
    if (flightState.aircraftId === aircraftId && aircraft.spec.id === aircraftId) {
      syncBriefingCards();
      updateToolbarLabels();
      return;
    }
    scene.remove(aircraft.aircraftRoot);
    applyAircraftProfile(flightState, aircraftId);
    aircraft = buildAircraftMesh(aircraftId);
    scene.add(aircraft.aircraftRoot);
    resetAircraftAtSpawn(flightState, missionState.mission.spawn);
    syncBriefingCards();
    updateToolbarLabels();
    if (announce && srStatus) {
      srStatus.textContent = `Selected aircraft ${flightState.aircraftSpec.name}.`;
    }
  };

  const showCrashModal = (report) => {
    if (!crashDialog || !report) return;
    document.getElementById('crash-cause').textContent = report.cause;
    document.getElementById('crash-detail').textContent = report.detail;
    document.getElementById('crash-speed').textContent = `${report.airspeedKts} KTS`;
    document.getElementById('crash-sink').textContent = `${report.sinkRateFpm} FPM`;
    document.getElementById('crash-attitude').textContent = `Pitch ${report.pitchDeg} deg / Roll ${report.rollDeg} deg`;
    document.getElementById('crash-fuel').textContent = `${report.fuelPct}%`;
    const recEl = document.getElementById('crash-recorder');
    if (recEl) recEl.textContent = `${report.maxG ?? 1.0}G / +${report.minStallMarginKts ?? 0} KT`;
    const aoaEl = document.getElementById('crash-aoa');
    if (aoaEl) aoaEl.textContent = `${report.aoaDeg ?? 0} deg / ${report.fuelBurnedPct ?? 0}% burned`;
    crashDialog.hidden = false;
    document.getElementById('btn-crash-retry')?.focus();
    if (srStatus) srStatus.textContent = `Crash recorded: ${report.cause}. Press R to refly sortie.`;
  };

  const showCompleteModal = (summary) => {
    sortieLog.push(summary);
    renderLogbookDom();
    if (!completeDialog) return;
    document.getElementById('complete-rank').textContent = `${summary.rank} (GRADE ${summary.grade ?? 'A'}) - ${summary.totalScore} PTS`;
    document.getElementById('complete-rating').textContent = summary.landingRating;
    document.getElementById('complete-sink').textContent = `${summary.sinkRateFpm} FPM`;
    document.getElementById('complete-stop').textContent = `${summary.stoppingDistanceM} m (${Math.round(summary.stoppingDistanceM * 3.28084)} ft)`;
    document.getElementById('complete-fuel').textContent = `${summary.fuelRemainingPct}% remaining`;
    const ilsEl = document.getElementById('complete-ils');
    if (ilsEl) ilsEl.textContent = `${summary.touchdownAoaDeg ?? 0} deg / ${summary.ilsDevDots ?? 0} DOT`;
    const recEl = document.getElementById('complete-recorder');
    if (recEl) recEl.textContent = `Grade ${summary.grade ?? 'A'} | Max ${summary.maxG ?? 1.0}G | ${summary.fuelBurnedPct ?? 0}% burn`;
    completeDialog.hidden = false;
    document.getElementById('btn-next-sortie')?.focus();
    if (srStatus) srStatus.textContent = `Sortie complete: ${summary.rank}, score ${summary.totalScore}.`;
  };

  const setMission = (index, openBriefing = false) => {
    const cleanIdx = ((index % MISSIONS.length) + MISSIONS.length) % MISSIONS.length;
    missionState = createMissionState(cleanIdx);
    const m = missionState.mission;

    applyMissionWeather(weather, scene, m.weatherPreset);
    syncOceanWithWeather(worldRefs, weather);
    rebuildMissionRings(aids, m.rings, m.dropZones);
    clearParticles(particles);
    resetAircraftAtSpawn(flightState, m.spawn);
    input.pending.brakeLatch = false;
    snapCameraRig(cameraRig, flightState);

    if (crashDialog) crashDialog.hidden = true;
    if (completeDialog) completeDialog.hidden = true;
    paused = openBriefing;
    if (briefingDialog) briefingDialog.hidden = !openBriefing;

    syncBriefingCards();
    updateToolbarLabels();
    if (srStatus) srStatus.textContent = `Loaded ${m.title}.`;
  };

  const handleResize = () => {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    renderer.setSize(w, h, false);
    cameraRig.camera.aspect = w / h;
    cameraRig.camera.updateProjectionMatrix();
    resizeCockpitHud(hud, w, h, Math.min(window.devicePixelRatio || 1, 2));
  };

  window.addEventListener('resize', handleResize);
  handleResize();

  document.querySelectorAll('[data-aircraft-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.initAudio();
      selectAircraft(btn.getAttribute('data-aircraft-id'), true);
    });
  });

  document.querySelectorAll('[data-mission-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.initAudio();
      setMission(Number(btn.getAttribute('data-mission-index')), true);
    });
  });

  document.getElementById('btn-launch-sortie')?.addEventListener('click', () => {
    audio.initAudio();
    paused = false;
    if (briefingDialog) briefingDialog.hidden = true;
    updateToolbarLabels();
    flightCanvas.focus?.();
  });

  document.getElementById('btn-camera')?.addEventListener('click', () => {
    audio.initAudio();
    toggleCameraMode(cameraRig);
    updateToolbarLabels();
  });

  document.getElementById('btn-flaps')?.addEventListener('click', () => {
    audio.initAudio();
    flightState.flapIndex = (flightState.flapIndex + 1) % 3;
    updateToolbarLabels();
  });

  document.getElementById('btn-hook')?.addEventListener('click', () => {
    audio.initAudio();
    flightState.tailhookDeployed = !flightState.tailhookDeployed;
    updateToolbarLabels();
  });

  document.getElementById('btn-brakes')?.addEventListener('click', () => {
    audio.initAudio();
    input.triggerAction('brakes');
    updateToolbarLabels();
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    audio.initAudio();
    setMission(missionState.missionIndex, false);
  });

  document.getElementById('btn-mute')?.addEventListener('click', () => {
    audio.initAudio();
    audio.toggleMute();
    updateToolbarLabels();
  });

  document.getElementById('btn-pause')?.addEventListener('click', () => {
    audio.initAudio();
    paused = !paused;
    if (briefingDialog) briefingDialog.hidden = !paused;
    updateToolbarLabels();
  });

  document.getElementById('btn-crash-retry')?.addEventListener('click', () => {
    audio.initAudio();
    setMission(missionState.missionIndex, false);
  });

  document.getElementById('btn-crash-deck')?.addEventListener('click', () => {
    setMission(missionState.missionIndex, true);
  });

  document.getElementById('btn-next-sortie')?.addEventListener('click', () => {
    audio.initAudio();
    setMission((missionState.missionIndex + 1) % MISSIONS.length, false);
  });

  document.getElementById('btn-complete-deck')?.addEventListener('click', () => {
    setMission(missionState.missionIndex, true);
  });

  const params = new URLSearchParams(window.location.search);
  const requestedMission = params.get('mission');
  const requestedAircraft = params.get('aircraft');
  const shotParam = params.get('shot');

  if (requestedAircraft) {
    selectAircraft(requestedAircraft, false);
  }
  const initialMissionIdx = requestedMission ? Math.max(0, Math.min(MISSIONS.length - 1, Number(requestedMission) - 1)) : 0;
  setMission(initialMissionIdx, !shotParam);
  renderLogbookDom();

  if (bootStateEl) bootStateEl.hidden = true;

  if (shotParam) {
    paused = true;
    if (briefingDialog) briefingDialog.hidden = true;
    const toolbar = document.getElementById('deck-header');
    if (toolbar) toolbar.classList.add('is-compact');

    const ctx = {
      scene,
      flightState,
      weather,
      aids,
      particles,
      cameraRig,
      worldRefs,
      hud,
      get aircraft() {
        return aircraft;
      },
      get missionState() {
        return missionState;
      },
      setMission,
      selectAircraft,
    };
    stageShowcaseScene(shotParam, ctx);
    renderer.render(scene, cameraRig.camera);
    window.__ATOLWING_READY = true;
    return;
  }

  let lastTimeMs = performance.now();
  let accumulator = 0;

  const tick = (nowMs) => {
    requestAnimationFrame(tick);
    const frameDt = Math.min(0.1, Math.max(0.001, (nowMs - lastTimeMs) / 1000));
    lastTimeMs = nowMs;

    const controls = samplePilotControls(input);
    if (controls.hadInteraction) audio.initAudio();

    const look = input.consumeLookDelta();
    cameraRig.orbitYaw = Math.max(-1.1, Math.min(1.1, cameraRig.orbitYaw - look.dx));
    cameraRig.orbitPitch = Math.max(-0.65, Math.min(0.65, cameraRig.orbitPitch - look.dy));

    if (controls.toggleCamera) {
      toggleCameraMode(cameraRig);
      updateToolbarLabels();
    }
    if (controls.toggleTailhook) {
      flightState.tailhookDeployed = !flightState.tailhookDeployed;
      controls.toggleTailhook = false;
      updateToolbarLabels();
    }
    if (controls.toggleMute) {
      audio.toggleMute();
      updateToolbarLabels();
    }
    if (controls.resetSortie) {
      setMission(missionState.missionIndex, false);
    }
    if (controls.togglePause && !flightState.crashed && !missionState.completed) {
      paused = !paused;
      if (briefingDialog) briefingDialog.hidden = !paused;
      updateToolbarLabels();
    }

    if (!paused) {
      accumulator += frameDt;
      while (accumulator >= FIXED_DT) {
        accumulator -= FIXED_DT;
        elapsedSec += FIXED_DT;

        const windVec = sampleWindAtPosition(weather, flightState.position, elapsedSec);
        const wasCrashed = flightState.crashed;

        stepFlightPhysics(flightState, controls, windVec, FIXED_DT, missionState.mission.targetRunwayId);
        controls.flapStep = false;
        controls.toggleTailhook = false;

        if (flightState.justTouchedDown) {
          spawnTireSmoke(particles, flightState.position, flightState.quaternion, 8);
          audio.playTouchdownScreech();
        }
        if (flightState.justArrestedWire > 0) {
          spawnArrestorSparks(particles, flightState.position, flightState.quaternion);
          spawnTireSmoke(particles, flightState.position, flightState.quaternion, 10);
          audio.playTouchdownScreech();
        }

        if (!wasCrashed && flightState.crashed) {
          spawnCrashExplosion(particles, flightState.position);
          audio.playCrashBoom();
          showCrashModal(flightState.crashReport);
        }

        updateMissionProgress(
          missionState,
          flightState,
          aids,
          controls.dropCargo,
          {
            onRingCaptured: () => audio.playRingChime(),
            onAirdropDelivered: () => {
              spawnAirdropCanister(particles, flightState.position);
              audio.playRingChime();
            },
            onMissionCompleted: (summary) => showCompleteModal(summary),
          },
          FIXED_DT,
        );
        controls.dropCargo = false;

        updateParticles(particles, flightState, FIXED_DT);
        updateWeatherVisuals(weather, flightState.position, elapsedSec, FIXED_DT);
        updateOceanWaves(worldRefs, elapsedSec);
        updateCameraRig(cameraRig, flightState, FIXED_DT, elapsedSec);
      }
      updateToolbarLabels();
    } else {
      elapsedSec += frameDt * (cameraRig.reducedMotion ? 0 : 0.35);
      sampleWindAtPosition(weather, flightState.position, elapsedSec);
      updateWeatherVisuals(weather, flightState.position, elapsedSec, 0);
      updateOceanWaves(worldRefs, elapsedSec);
      updateCameraRig(cameraRig, flightState, frameDt, elapsedSec);
    }

    const mView = getMissionHudView(missionState, flightState, aids);
    updateRunwayAidsAndRings(aids, flightState.position, missionState.activeRingIndex, weather, elapsedSec);
    updateAircraftAnimations(aircraft, flightState, cameraRig.mode, mView, weather, elapsedSec, worldRefs, aids);
    audio.updateFlightAudio(flightState, paused, elapsedSec);
    renderCockpitHud(hud, flightState, mView, weather, cameraRig.mode, elapsedSec, worldRefs, aids);
    renderer.render(scene, cameraRig.camera);
    window.__ATOLWING_READY = true;
  };

  requestAnimationFrame(tick);
}

bootFlightGame();
