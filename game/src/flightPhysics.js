// Six-DoF STOL twin-turboprop flight physics, throttle fuel burn, damage, and runway contact telemetry.
import * as THREE from '../vendor/three.min.js';
import {
  SEA_LEVEL,
  classifySurfaceMaterial,
  findContainingRunway,
  projectOntoRunway,
  sampleTerrainHeight,
} from './terrainWorld.js';

export const MPS_TO_KTS = 1.943844;
export const KTS_TO_MPS = 1 / MPS_TO_KTS;
export const M_TO_FT = 3.28084;
export const MPS_TO_FPM = 196.8504;

export const FLAP_ANGLES_DEG = [0, 15, 35];
export const GEAR_CLEARANCE_M = 2.35;

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const LOCAL_FORWARD = new THREE.Vector3(0, 0, -1);
const LOCAL_RIGHT = new THREE.Vector3(1, 0, 0);
const LOCAL_UP = new THREE.Vector3(0, 1, 0);

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function createFlightState() {
  return {
    position: new THREE.Vector3(-2550, 138, 220),
    velocity: new THREE.Vector3(46, -2.2, 0),
    quaternion: new THREE.Quaternion(),
    angularVel: new THREE.Vector3(0, 0, 0), // pitch, yaw, roll rates in body frame

    headingDeg: 90,
    pitchDeg: 2.0,
    rollDeg: 0,
    alphaDeg: 2.5,
    betaDeg: 0,

    airspeedMps: 46,
    airspeedKts: 89.4,
    groundSpeedKts: 89.4,
    altitudeFt: 452,
    radarAltFt: 452,
    verticalSpeedFpm: -430,
    gLoad: 1.0,

    throttle: 0.68,
    rpmNorm: 0.72,
    flapIndex: 1, // 0 = UP, 1 = T/O 15°, 2 = LND 35°
    flapNorm: 0.45,
    brakes: false,
    controlPitch: 0,
    controlRoll: 0,
    controlYaw: 0,

    fuelPct: 86.0,
    fuelFlowKgH: 142,
    damagePct: 0.0,

    onGround: false,
    onRunwayId: null,
    stallWarning: false,
    overspeedWarning: false,
    terrainPullUp: false,
    crashed: false,
    crashReport: null,

    touchdownActive: false,
    touchdownSinkFpm: 0,
    touchdownSpeedKts: 0,
    touchdownOffsetM: 0,
    touchdownPos: new THREE.Vector3(),
    rolloutDistanceM: 0,
    bounceCount: 0,
    lastLandingCard: null,
    justTouchedDown: false,
    propPhase: 0,
  };
}

export function setQuaternionFromAttitude(quaternion, headingDeg, pitchDeg, rollDeg) {
  const hdgRad = (headingDeg * Math.PI) / 180;
  const pitchRad = (pitchDeg * Math.PI) / 180;
  const rollRad = (rollDeg * Math.PI) / 180;
  const euler = new THREE.Euler(pitchRad, -hdgRad, -rollRad, 'YXZ');
  quaternion.setFromEuler(euler).normalize();
}

export function extractAttitudeFromQuaternion(quaternion) {
  const forward = LOCAL_FORWARD.clone().applyQuaternion(quaternion).normalize();
  const right = LOCAL_RIGHT.clone().applyQuaternion(quaternion).normalize();

  let headingDeg = (Math.atan2(forward.x, -forward.z) * 180) / Math.PI;
  if (headingDeg < 0) headingDeg += 360;

  const pitchRad = Math.asin(clamp(forward.y, -1, 1));
  const pitchDeg = (pitchRad * 180) / Math.PI;

  const levelRight = new THREE.Vector3().crossVectors(forward, UP_AXIS);
  let rollDeg = 0;
  if (levelRight.lengthSq() > 1e-5) {
    levelRight.normalize();
    const levelUp = new THREE.Vector3().crossVectors(levelRight, forward).normalize();
    const rollRad = Math.atan2(-right.dot(levelUp), right.dot(levelRight));
    rollDeg = (rollRad * 180) / Math.PI;
  }

  return { headingDeg, pitchDeg, rollDeg, forward, right };
}

export function resetAircraftAtSpawn(state, spawn) {
  const hdg = spawn.headingDeg ?? 90;
  const pitch = spawn.pitchDeg ?? 1.5;
  const roll = spawn.rollDeg ?? 0;
  const speedKts = spawn.airspeedKts ?? 92;
  const speedMps = speedKts * KTS_TO_MPS;

  state.position.set(spawn.x, spawn.y, spawn.z);
  setQuaternionFromAttitude(state.quaternion, hdg, pitch, roll);

  const { forward } = extractAttitudeFromQuaternion(state.quaternion);
  if (spawn.onGround) {
    const groundY = sampleTerrainHeight(spawn.x, spawn.z);
    state.position.y = groundY + GEAR_CLEARANCE_M;
    const hdgRad = (hdg * Math.PI) / 180;
    state.velocity.set(Math.sin(hdgRad) * speedMps, 0, -Math.cos(hdgRad) * speedMps);
  } else {
    state.velocity.copy(forward).multiplyScalar(speedMps);
    if (typeof spawn.sinkMps === 'number') {
      state.velocity.y = spawn.sinkMps;
    }
  }

  state.angularVel.set(0, 0, 0);
  state.headingDeg = hdg;
  state.pitchDeg = pitch;
  state.rollDeg = roll;
  state.airspeedMps = speedMps;
  state.airspeedKts = speedKts;
  state.groundSpeedKts = speedKts;
  state.altitudeFt = state.position.y * M_TO_FT;
  state.radarAltFt = Math.max(0, (state.position.y - sampleTerrainHeight(spawn.x, spawn.z)) * M_TO_FT);
  state.verticalSpeedFpm = state.velocity.y * MPS_TO_FPM;
  state.gLoad = 1.0;

  state.throttle = spawn.throttle ?? (spawn.onGround ? 0.0 : 0.68);
  state.rpmNorm = Math.max(0.24, state.throttle);
  state.flapIndex = spawn.flapIndex ?? 0;
  state.flapNorm = FLAP_ANGLES_DEG[state.flapIndex] / 35;
  state.brakes = Boolean(spawn.brakes);
  state.controlPitch = 0;
  state.controlRoll = 0;
  state.controlYaw = 0;

  state.fuelPct = spawn.fuelPct ?? 82.0;
  state.fuelFlowKgH = 95;
  state.damagePct = 0.0;

  state.onGround = Boolean(spawn.onGround);
  state.onRunwayId = spawn.onGround ? (findContainingRunway(spawn.x, spawn.z)?.runway.id ?? null) : null;
  state.stallWarning = false;
  state.overspeedWarning = false;
  state.terrainPullUp = false;
  state.crashed = false;
  state.crashReport = null;

  state.touchdownActive = false;
  state.touchdownSinkFpm = 0;
  state.touchdownSpeedKts = 0;
  state.touchdownOffsetM = 0;
  state.rolloutDistanceM = 0;
  state.bounceCount = 0;
  state.lastLandingCard = null;
  state.justTouchedDown = false;
}

export function computeLiftAndDrag(alphaRad, flapNorm, airbrakeActive) {
  const alphaDeg = (alphaRad * 180) / Math.PI;
  const criticalAlpha = 15.5 + flapNorm * 3.8;

  // Linear lift slope up to critical STOL angle of attack, smooth post-stall dropoff
  let cl = 0.30 + flapNorm * 0.58 + alphaDeg * 0.092;
  let stalled = false;
  if (alphaDeg > criticalAlpha) {
    stalled = true;
    const excess = alphaDeg - criticalAlpha;
    cl = Math.max(0.18, cl - excess * 0.115);
  } else if (alphaDeg < -13) {
    const negExcess = -13 - alphaDeg;
    cl = Math.min(-0.15, cl + negExcess * 0.08);
  }

  const cd0 = 0.029 + flapNorm * 0.044 + (airbrakeActive ? 0.068 : 0);
  const inducedDrag = 0.048 * cl * cl;
  const stallDrag = stalled ? Math.pow((alphaDeg - criticalAlpha) * 0.09, 2) * 0.35 : 0;
  return { cl, cd: cd0 + inducedDrag + stallDrag, stalled };
}

export function applyThrottleFuelBurn(state, dt) {
  if (state.fuelPct <= 0) {
    state.fuelPct = 0;
    state.throttle = 0;
    state.fuelFlowKgH = 0;
    return;
  }
  // Economy cruise sweet spot sits at 58%..72% throttle; full WEP burns disproportionately faster
  const thr = state.throttle;
  const wOTPenalty = thr > 0.78 ? Math.pow((thr - 0.78) / 0.22, 2) * 0.44 : 0;
  const burnPctPerSec = 0.045 + thr * 0.16 + thr * thr * 0.19 + wOTPenalty;
  state.fuelPct = Math.max(0, state.fuelPct - burnPctPerSec * dt);
  state.fuelFlowKgH = Math.round(48 + burnPctPerSec * 560);
}

function recordCrash(state, causeTitle, detailText) {
  state.crashed = true;
  state.damagePct = 100;
  state.throttle = 0;
  state.crashReport = {
    cause: causeTitle,
    detail: detailText,
    airspeedKts: Math.round(state.airspeedKts),
    sinkRateFpm: Math.round(state.verticalSpeedFpm),
    altitudeFt: Math.round(state.altitudeFt),
    pitchDeg: Math.round(state.pitchDeg),
    rollDeg: Math.round(state.rollDeg),
    fuelPct: Math.round(state.fuelPct),
  };
}

export function evaluateRunwayContact(state, prevVelY, runwayHit) {
  const sinkFpm = Math.abs(Math.min(0, prevVelY * MPS_TO_FPM));
  const rollAbs = Math.abs(state.rollDeg);
  const speedKts = state.airspeedKts;

  if (sinkFpm > 1080 || rollAbs > 28 || state.pitchDeg < -18) {
    const reason =
      sinkFpm > 1080
        ? `Excessive touchdown descent rate (-${Math.round(sinkFpm)} FPM > 1080 FPM structural limit)`
        : rollAbs > 28
          ? `Wingtip strike on touchdown (${Math.round(rollAbs)} deg bank angle)`
          : `Nose-gear collapse from steep nose-down impact (${Math.round(state.pitchDeg)} deg pitch)`;
    recordCrash(state, 'Runway Structural Impact', reason);
    return;
  }

  state.justTouchedDown = true;

  if (!state.touchdownActive) {
    state.touchdownActive = true;
    state.touchdownSinkFpm = -Math.round(sinkFpm);
    state.touchdownSpeedKts = Math.round(speedKts);
    state.touchdownOffsetM = Number(Math.abs(runwayHit.cross).toFixed(1));
    state.touchdownPos.copy(state.position);
    state.rolloutDistanceM = 0;
    state.bounceCount = 0;
  }

  // Hard landing damage & bounce physics
  if (sinkFpm > 540) {
    const dmgAdd = ((sinkFpm - 520) / 520) * 34;
    state.damagePct = clamp(state.damagePct + dmgAdd, 0, 100);
    if (sinkFpm > 620 && speedKts > 48) {
      state.bounceCount += 1;
      state.velocity.y = Math.min(3.4, Math.abs(prevVelY) * 0.34);
      state.onGround = false;
    }
  } else if (rollAbs > 14) {
    state.damagePct = clamp(state.damagePct + 8, 0, 100);
  }

  const rating =
    state.bounceCount > 0
      ? 'BOUNCED LANDING'
      : sinkFpm <= 210 && state.touchdownOffsetM <= 6.5
        ? 'SMOOTH STOL TOUCHDOWN'
        : sinkFpm <= 460
          ? 'FIRM UTILITY LANDING'
          : 'HARD LANDING';

  state.lastLandingCard = {
    rating,
    runwayName: `${runwayHit.runway.id} RWY ${runwayHit.runway.code}`,
    sinkRateFpm: state.touchdownSinkFpm,
    touchdownKts: state.touchdownSpeedKts,
    centerlineM: state.touchdownOffsetM,
    stoppingDistanceM: Math.round(state.rolloutDistanceM),
    fuelRemainingPct: Math.round(state.fuelPct),
    damagePct: Math.round(state.damagePct),
    stopped: speedKts < 6,
  };
}

export function stepFlightPhysics(state, controls, windVec, dt) {
  state.justTouchedDown = false;
  if (state.crashed) return;

  // Smooth pilot control inputs & flap deployment
  state.throttle = clamp(state.throttle + controls.throttleDelta * dt, 0, 1);
  if (controls.flapStep) {
    state.flapIndex = (state.flapIndex + 1) % FLAP_ANGLES_DEG.length;
  }
  const targetFlapNorm = FLAP_ANGLES_DEG[state.flapIndex] / 35;
  state.flapNorm += (targetFlapNorm - state.flapNorm) * Math.min(1, dt * 3.4);
  state.brakes = Boolean(controls.brakes);

  const ctrlLerp = Math.min(1, dt * 10.5);
  state.controlPitch += (controls.pitch - state.controlPitch) * ctrlLerp;
  state.controlRoll += (controls.roll - state.controlRoll) * ctrlLerp;
  state.controlYaw += (controls.yaw - state.controlYaw) * ctrlLerp;

  applyThrottleFuelBurn(state, dt);
  const targetRpm = state.fuelPct > 0 ? 0.22 + state.throttle * 0.78 : 0.08;
  state.rpmNorm += (targetRpm - state.rpmNorm) * Math.min(1, dt * 2.8);
  state.propPhase = (state.propPhase + dt * (14 + state.rpmNorm * 46)) % (Math.PI * 2);

  // World basis vectors of aircraft
  const forward = LOCAL_FORWARD.clone().applyQuaternion(state.quaternion).normalize();
  const right = LOCAL_RIGHT.clone().applyQuaternion(state.quaternion).normalize();
  const up = LOCAL_UP.clone().applyQuaternion(state.quaternion).normalize();

  // Relative air velocity = aircraft inertial velocity minus ambient wind
  const airVel = state.velocity.clone().sub(windVec);
  const airspeed = airVel.length();
  state.airspeedMps = airspeed;
  state.airspeedKts = airspeed * MPS_TO_KTS;
  state.groundSpeedKts = Math.hypot(state.velocity.x, state.velocity.z) * MPS_TO_KTS;

  // Local body velocity components for angle of attack (alpha) & sideslip (beta)
  const vFwd = Math.max(0.5, airVel.dot(forward));
  const vUp = airVel.dot(up);
  const vSide = airVel.dot(right);
  const alphaRad = airspeed > 4.0 ? Math.atan2(-vUp, vFwd) : 0;
  const betaRad = airspeed > 4.0 ? Math.asin(clamp(vSide / airspeed, -1, 1)) : 0;
  state.alphaDeg = (alphaRad * 180) / Math.PI;
  state.betaDeg = (betaRad * 180) / Math.PI;

  // Aerodynamic forces (Twin-turboprop Kestrel-28: mass 2,350 kg, wing area 25.4 m^2)
  const mass = 2350;
  const wingArea = 25.4;
  const rho = 1.20 * Math.exp(-Math.max(0, state.position.y) / 9200);
  const qDyn = 0.5 * rho * airspeed * airspeed;

  const aero = computeLiftAndDrag(alphaRad, state.flapNorm, state.brakes && !state.onGround);

  // Twin-turboprop thrust with low-speed static STOL pull and high-speed prop efficiency taper
  const propEff = clamp(1.16 - airspeed / 138, 0.36, 1.15);
  const maxStaticThrustN = 14800 * (1.0 - state.damagePct * 0.0035);
  const thrustMag = state.fuelPct > 0 ? state.throttle * maxStaticThrustN * propEff : 0;

  const totalForce = new THREE.Vector3(0, -9.81 * mass, 0);
  totalForce.addScaledVector(forward, thrustMag);

  let liftMag = 0;
  if (airspeed > 2.5) {
    const airDir = airVel.clone().normalize();
    const dragMag = qDyn * wingArea * aero.cd;
    totalForce.addScaledVector(airDir, -dragMag);

    const liftDir = new THREE.Vector3().crossVectors(airDir, right);
    if (liftDir.lengthSq() > 1e-5) {
      liftDir.normalize();
      liftMag = qDyn * wingArea * aero.cl;
      totalForce.addScaledVector(liftDir, liftMag);
    }

    // Weathervane side-force restoring sideslip
    const sideForceMag = -qDyn * wingArea * 0.62 * betaRad;
    totalForce.addScaledVector(right, sideForceMag);
  }

  // Control authority scales smoothly with airspeed + twin-prop slipstream wash so STOL speeds remain crisp
  const slipstreamAuthority = state.throttle * 0.34;
  const speedAuthority = clamp(airspeed / 36, 0.12, 1.28);
  const authority = clamp(speedAuthority + slipstreamAuthority, 0.22, 1.32);

  const curAtt = extractAttitudeFromQuaternion(state.quaternion);
  const bankRad = (curAtt.rollDeg * Math.PI) / 180;

  // Natural aerodynamic stability + coordinated-turn yaw coupling (camera & nose never fight pilot)
  const pitchStability = -alphaRad * 0.85 * speedAuthority;
  const yawStability = -betaRad * 1.65 * speedAuthority;
  const coordinatedTurnYaw =
    !state.onGround && airspeed > 14 ? Math.sin(bankRad) * Math.cos((curAtt.pitchDeg * Math.PI) / 180) * (9.81 / Math.max(22, airspeed)) * 0.92 : 0;
  const stallBuffetPitch = aero.stalled && !state.onGround ? -0.28 + Math.sin(state.propPhase * 1.7) * 0.08 : 0;

  const targetPitchRate = state.controlPitch * 1.18 * authority + pitchStability + stallBuffetPitch;
  const targetRollRate = state.controlRoll * 1.95 * authority - (state.onGround ? curAtt.rollDeg * 0.08 : 0);
  const targetYawRate =
    state.controlYaw * (state.onGround ? 0.95 : 0.72 * authority) + yawStability + coordinatedTurnYaw;

  const rateResponse = Math.min(1, dt * 8.2);
  state.angularVel.x += (targetPitchRate - state.angularVel.x) * rateResponse;
  state.angularVel.y += (targetYawRate - state.angularVel.y) * rateResponse;
  state.angularVel.z += (targetRollRate - state.angularVel.z) * rateResponse;

  // Apply body-frame angular rates to quaternion: +X pitch up, -Y heading right, -Z roll right
  const dq = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      state.angularVel.x * dt,
      -state.angularVel.y * dt,
      -state.angularVel.z * dt,
      'YXZ',
    ),
  );
  state.quaternion.multiply(dq).normalize();

  // Integrate linear velocity & position
  const prevVelY = state.velocity.y;
  state.velocity.addScaledVector(totalForce, dt / mass);

  // Ground roll friction, wheel brakes, and nosewheel steering when on runway
  const groundH = sampleTerrainHeight(state.position.x, state.position.z);
  const surfaceType = classifySurfaceMaterial(state.position.x, state.position.z, groundH);
  const runwayHit = findContainingRunway(state.position.x, state.position.z, 10, 4);

  state.position.addScaledVector(state.velocity, dt);

  const postGroundH = sampleTerrainHeight(state.position.x, state.position.z);
  const gearY = Math.max(SEA_LEVEL, postGroundH) + GEAR_CLEARANCE_M;

  if (state.position.y <= gearY) {
    const postSurface = classifySurfaceMaterial(state.position.x, state.position.z, postGroundH);
    const postRunway = findContainingRunway(state.position.x, state.position.z, 10, 4);

    if (postSurface === 'water' || postGroundH <= SEA_LEVEL + 0.2) {
      recordCrash(
        state,
        'Ocean Ditching Impact',
        `Aircraft struck sea surface at ${Math.round(state.airspeedKts)} KTS (${Math.round(prevVelY * MPS_TO_FPM)} FPM)`,
      );
      state.position.y = SEA_LEVEL + 0.6;
      return;
    }

    if (!postRunway && (state.airspeedKts > 42 || Math.abs(prevVelY * MPS_TO_FPM) > 380)) {
      recordCrash(
        state,
        'Controlled Flight Into Terrain (CFIT)',
        `Impacted volcanic island terrain off-runway at ${Math.round(state.airspeedKts)} KTS and ${Math.round( postGroundH * M_TO_FT )} FT MSL`,
      );
      state.position.y = gearY;
      return;
    }

    state.position.y = gearY;
    if (!state.onGround && postRunway) {
      evaluateRunwayContact(state, prevVelY, postRunway);
      if (state.crashed) return;
    }

    if (state.velocity.y < 0) state.velocity.y = 0;
    state.onGround = state.velocity.y <= 0.25;
    state.onRunwayId = postRunway ? postRunway.runway.id : null;

    if (state.onGround) {
      // Gently level wings and prevent excessive nose-down pitch on landing gear
      const att = extractAttitudeFromQuaternion(state.quaternion);
      const clampedPitch = clamp(att.pitchDeg, -1.5, 13.5);
      const leveledRoll = att.rollDeg * Math.max(0, 1 - dt * 7.5);
      setQuaternionFromAttitude(state.quaternion, att.headingDeg, clampedPitch, leveledRoll);

      // Wheel braking + runway directional tire alignment
      const brakeDecel = state.brakes ? 9.4 : 0.85;
      const offRunwayDrag = postRunway ? 0 : 4.8;
      const horizSpeed = Math.hypot(state.velocity.x, state.velocity.z);
      if (horizSpeed > 0.05) {
        const nextHoriz = Math.max(0, horizSpeed - (brakeDecel + offRunwayDrag) * dt);
        const ratio = nextHoriz / horizSpeed;
        state.velocity.x *= ratio;
        state.velocity.z *= ratio;
      }

      // Align ground roll vector with aircraft nose to eliminate sideways skating
      const groundFwd = LOCAL_FORWARD.clone().applyQuaternion(state.quaternion);
      groundFwd.y = 0;
      if (groundFwd.lengthSq() > 1e-4) {
        groundFwd.normalize();
        const curHoriz = Math.hypot(state.velocity.x, state.velocity.z);
        const blend = Math.min(1, dt * 6.5);
        state.velocity.x = state.velocity.x * (1 - blend) + groundFwd.x * curHoriz * blend;
        state.velocity.z = state.velocity.z * (1 - blend) + groundFwd.z * curHoriz * blend;
      }

      if (state.touchdownActive && postRunway) {
        state.rolloutDistanceM = Math.hypot(
          state.position.x - state.touchdownPos.x,
          state.position.z - state.touchdownPos.z,
        );
        if (state.lastLandingCard) {
          state.lastLandingCard.stoppingDistanceM = Math.round(state.rolloutDistanceM);
          state.lastLandingCard.fuelRemainingPct = Math.round(state.fuelPct);
          state.lastLandingCard.damagePct = Math.round(state.damagePct);
          state.lastLandingCard.stopped = state.groundSpeedKts < 4.5;
        }
      }
    }
  } else {
    state.onGround = false;
    state.onRunwayId = null;
    if (state.position.y - gearY > 12.0 && state.airspeedKts > 62) {
      state.touchdownActive = false;
    }
  }

  // Update derived telemetry, warnings, and overspeed/G-load structural damage
  const finalAtt = extractAttitudeFromQuaternion(state.quaternion);
  state.headingDeg = finalAtt.headingDeg;
  state.pitchDeg = finalAtt.pitchDeg;
  state.rollDeg = finalAtt.rollDeg;
  state.altitudeFt = state.position.y * M_TO_FT;
  const aglM = Math.max(0, state.position.y - Math.max(SEA_LEVEL, postGroundH));
  state.radarAltFt = aglM * M_TO_FT;
  state.verticalSpeedFpm = state.velocity.y * MPS_TO_FPM;
  state.gLoad = state.onGround ? 1.0 : clamp(liftMag / (mass * 9.81), -1.8, 6.2);

  const stallThresholdKts = 53 - state.flapNorm * 11;
  state.stallWarning = !state.onGround && (aero.stalled || state.airspeedKts < stallThresholdKts);

  const maxFlapKts = state.flapIndex === 2 ? 118 : state.flapIndex === 1 ? 142 : 196;
  state.overspeedWarning = state.airspeedKts > maxFlapKts || state.airspeedKts > 192;

  if (state.overspeedWarning) {
    const excess = Math.max(0, state.airspeedKts - maxFlapKts);
    state.damagePct = clamp(state.damagePct + (1.6 + excess * 0.24) * dt, 0, 100);
  }
  if (Math.abs(state.gLoad) > 4.1) {
    state.damagePct = clamp(state.damagePct + (Math.abs(state.gLoad) - 4.1) * 5.2 * dt, 0, 100);
  }

  state.terrainPullUp =
    !state.onGround &&
    !runwayHit &&
    state.radarAltFt < 230 &&
    state.verticalSpeedFpm < -680;

  if (state.damagePct >= 100 && !state.crashed) {
    recordCrash(
      state,
      'Airframe Structural Failure',
      `Exceeded structural airspeed or G-load limits (${Math.round(state.airspeedKts)} KTS, ${state.gLoad.toFixed(1)} G)`,
    );
  }
}

export function isStabilizedOnRunway(state, targetRunwayId) {
  if (!state.onGround || state.crashed) return false;
  if (targetRunwayId && state.onRunwayId !== targetRunwayId) return false;
  return state.groundSpeedKts < 4.5;
}
