// Smooth velocity-aligned Chase Camera & pilot-perspective 3D Cockpit Camera rig.
import * as THREE from '../vendor/three.min.js';
import { SEA_LEVEL, sampleTerrainHeight } from './terrainWorld.js';

const LOCAL_FORWARD = new THREE.Vector3(0, 0, -1);
const LOCAL_UP = new THREE.Vector3(0, 1, 0);
const LOCAL_RIGHT = new THREE.Vector3(1, 0, 0);

export function createCameraRig(aspect = 16 / 9) {
  const camera = new THREE.PerspectiveCamera(58, aspect, 0.22, 12000);
  return {
    camera,
    mode: 'chase', // 'chase' | 'cockpit'
    smoothedPos: new THREE.Vector3(-2570, 144, 220),
    smoothedLookAt: new THREE.Vector3(-2500, 136, 220),
    orbitYaw: 0,
    orbitPitch: 0,
    reducedMotion: false,
    initialized: false,
  };
}

export function toggleCameraMode(rig, forcedMode = null) {
  rig.mode = forcedMode ?? (rig.mode === 'chase' ? 'cockpit' : 'chase');
  rig.orbitYaw = 0;
  rig.orbitPitch = 0;
  return rig.mode;
}

export function snapCameraRig(rig, flightState) {
  rig.initialized = false;
  updateCameraRig(rig, flightState, 0.016, 0);
}

export function updateCameraRig(rig, flightState, dt, elapsedSec = 0) {
  const forward = LOCAL_FORWARD.clone().applyQuaternion(flightState.quaternion).normalize();
  const up = LOCAL_UP.clone().applyQuaternion(flightState.quaternion).normalize();
  const right = LOCAL_RIGHT.clone().applyQuaternion(flightState.quaternion).normalize();

  // Decay free-look mouse offset smoothly back toward forward flight path when not dragging
  rig.orbitYaw *= Math.max(0, 1 - dt * 2.2);
  rig.orbitPitch *= Math.max(0, 1 - dt * 2.2);

  if (rig.mode === 'cockpit') {
    rig.camera.fov = 66;
    rig.camera.updateProjectionMatrix();

    // Pilot eye position inside 3D cockpit frame, showing all 3 lit displays, yoke, throttles & panoramic windshield
    const eyeLocal = new THREE.Vector3(0.0, 0.85, -0.94);
    if (!rig.reducedMotion && !flightState.onGround) {
      eyeLocal.y += Math.max(-0.03, Math.min(0.03, -(flightState.gLoad - 1.0) * 0.012));
    }
    const eyeWorld = eyeLocal.applyQuaternion(flightState.quaternion).add(flightState.position);
    rig.camera.position.copy(eyeWorld);

    // Pitch gaze slightly downward (-9.5 deg) so 3D EFIS glareshield & throttles frame lower third while horizon & terrain fill windshield
    const lookDir = forward
      .clone()
      .addScaledVector(up, -0.165 + rig.orbitPitch * 0.55)
      .addScaledVector(right, rig.orbitYaw * 0.75)
      .normalize();

    const target = eyeWorld.clone().addScaledVector(lookDir, 120);
    rig.camera.up.copy(up);
    rig.camera.lookAt(target);
    rig.initialized = true;
    return;
  }

  // Chase camera: crisp horizon-stabilized follow with subtle bank coupling & terrain floor protection
  const speedFov = 55 + Math.min(9, Math.max(0, (flightState.airspeedKts - 65) * 0.075));
  if (Math.abs(rig.camera.fov - speedFov) > 0.05) {
    rig.camera.fov += (speedFov - rig.camera.fov) * Math.min(1, dt * 4);
    rig.camera.updateProjectionMatrix();
  }

  // Blend aircraft forward vector with velocity direction so sideslip/aoa feels tangible without fighting pilot
  const velDir =
    flightState.velocity.lengthSq() > 25
      ? flightState.velocity.clone().normalize()
      : forward.clone();
  const trackDir = forward.clone().lerp(velDir, 0.35).normalize();

  const chaseDist = flightState.crashed ? 28.0 : 19.2;
  const chaseHeight = flightState.crashed ? 9.5 : 4.35;

  const desiredPos = flightState.position
    .clone()
    .addScaledVector(trackDir, -chaseDist)
    .add(new THREE.Vector3(0, chaseHeight, 0))
    .addScaledVector(right, rig.orbitYaw * 12.0);
  desiredPos.y += rig.orbitPitch * 8.0;

  if (flightState.crashed) {
    desiredPos.x += Math.sin(elapsedSec * 0.35) * 5.0;
  }

  // Keep chase camera clear of volcanic ridges and ocean surface
  const groundBelowCam = Math.max(SEA_LEVEL, sampleTerrainHeight(desiredPos.x, desiredPos.z));
  if (desiredPos.y < groundBelowCam + 2.6) {
    desiredPos.y = groundBelowCam + 2.6;
  }

  // Aim slightly ahead & above nose so aircraft sits in lower-middle third and target ring/runway ahead stays clear
  const desiredLook = flightState.position
    .clone()
    .addScaledVector(forward, 18.0)
    .add(new THREE.Vector3(0, 1.45, 0));

  if (!rig.initialized) {
    rig.smoothedPos.copy(desiredPos);
    rig.smoothedLookAt.copy(desiredLook);
    rig.initialized = true;
  } else {
    const posFollow = Math.min(1, dt * 8.5);
    const lookFollow = Math.min(1, dt * 12.0);
    rig.smoothedPos.lerp(desiredPos, posFollow);
    rig.smoothedLookAt.lerp(desiredLook, lookFollow);
  }

  rig.camera.position.copy(rig.smoothedPos);
  // Subtle horizon bank tilt (22% of aircraft bank) so high-bank maneuvers look dynamic without disorienting pilot
  const worldUp = new THREE.Vector3(0, 1, 0);
  const blendedUp = worldUp.lerp(up, rig.reducedMotion ? 0.0 : 0.22).normalize();
  rig.camera.up.copy(blendedUp);
  rig.camera.lookAt(rig.smoothedLookAt);
}
