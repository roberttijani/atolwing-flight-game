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
    selectAircraft('islander', false);
    setMission(0, false);
    resetAircraftAtSpawn(flightState, {
      x: -2290,
      y: 50,
      z: 242,
      headingDeg: 85.0,
      pitchDeg: 2.0,
      rollDeg: -12,
      airspeedKts: 94,
      throttle: 0.68,
      flapIndex: 1,
      fuelPct: 84,
      sinkMps: -1.6,
      onGround: false,
    });
    if (aids.ringInstances[0]) {
      aids.ringInstances[0].holder.position.set(-2015, 62, 194);
      aids.ringInstances[0].holder.scale.setScalar(0.84);
    }
    toggleCameraMode(cameraRig, 'chase');
    cameraRig.orbitYaw = 0.22;
    cameraRig.orbitPitch = 0.14;
    snapCameraRig(cameraRig, flightState);
    flightState.gLoad = 1.1;
    flightState.verticalSpeedFpm = -320;
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
  } else if (shotName === 'action') {
    // Showcase agile VX-9 Peregrine Recon banking hard through tropical squall over South Cove LZ
    selectAircraft('peregrine', false);
    setMission(2, false);
    applyMissionWeather(weather, scene, 'storm');
    syncOceanWithWeather(worldRefs, weather);
    resetAircraftAtSpawn(flightState, {
      x: 358,
      y: 132,
      z: 1236,
      headingDeg: 222,
      pitchDeg: 2.2,
      rollDeg: 36,
      airspeedKts: 118,
      throttle: 0.79,
      flapIndex: 1,
      fuelPct: 58,
      sinkMps: -3.95,
      onGround: false,
    });
    flightState.gLoad = 2.4;
    flightState.groundSpeedKts = 109;
    flightState.verticalSpeedFpm = -780;
    flightState.controlRoll = 0.28;
    flightState.controlPitch = 0.20;
    flightState.stallWarning = false;
    flightState.terrainPullUp = false;

    if (aids.ringInstances[0]) {
      aids.ringInstances[0].holder.position.set(132, 118, 1418);
      aids.ringInstances[0].holder.rotation.y = -(224 * Math.PI) / 180;
    }
    spawnAirdropCanister(particles, new THREE.Vector3(286, 88, 1328));

    const wt = flightState.aircraftSpec.wingtipOffset;
    particles.leftTrailPts = [];
    particles.rightTrailPts = [];
    const q = new THREE.Quaternion();
    for (let s = 18; s >= 0; s -= 1) {
      const tBack = s * 0.024;
      const hdgS = 222 - s * 0.65;
      const hRad = (hdgS * Math.PI) / 180;
      setQuaternionFromAttitude(q, hdgS, 2.2, 36);
      const posS = new THREE.Vector3(
        flightState.position.x - Math.sin(hRad) * 54 * tBack,
        flightState.position.y + 3.4 * tBack,
        flightState.position.z + Math.cos(hRad) * 54 * tBack,
      );
      particles.leftTrailPts.push(new THREE.Vector3(-wt.x, wt.y, wt.z).applyQuaternion(q).add(posS));
      particles.rightTrailPts.push(new THREE.Vector3(wt.x, wt.y, wt.z).applyQuaternion(q).add(posS));
    }
    particles.leftTrailGeo.setFromPoints(particles.leftTrailPts);
    particles.rightTrailGeo.setFromPoints(particles.rightTrailPts);

    toggleCameraMode(cameraRig, 'chase');
    cameraRig.orbitYaw = -0.14;
    cameraRig.orbitPitch = 0.08;
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
    flightState.touchdownActive = true;
    flightState.rolloutDistanceM = 168;
    flightState.lastLandingCard = {
      rating: 'SMOOTH STOL TOUCHDOWN',
      runwayName: 'WARA RWY 09/27',
      sinkRateFpm: -142,
      touchdownKts: 66,
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
    crashDialog.hidden = false;
    document.getElementById('btn-crash-retry')?.focus();
    if (srStatus) srStatus.textContent = `Crash recorded: ${report.cause}. Press R to refly sortie.`;
  };

  const showCompleteModal = (summary) => {
    sortieLog.push(summary);
    renderLogbookDom();
    if (!completeDialog) return;
    document.getElementById('complete-rank').textContent = `${summary.rank} - ${summary.totalScore} PTS`;
    document.getElementById('complete-rating').textContent = summary.landingRating;
    document.getElementById('complete-sink').textContent = `${summary.sinkRateFpm} FPM`;
    document.getElementById('complete-stop').textContent = `${summary.stoppingDistanceM} m (${Math.round(summary.stoppingDistanceM * 3.28084)} ft)`;
    document.getElementById('complete-fuel').textContent = `${summary.fuelRemainingPct}% remaining`;
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

        stepFlightPhysics(flightState, controls, windVec, FIXED_DT);
        controls.flapStep = false;

        if (flightState.justTouchedDown) {
          spawnTireSmoke(particles, flightState.position, flightState.quaternion, 8);
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
