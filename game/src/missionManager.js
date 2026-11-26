// Four distinct archipelago sortie missions: Runway Delivery, Canyon Ring Run, Storm Airdrop, Dusk Approach.
import * as THREE from '../vendor/three.min.js';
import { RUNWAY_SPECS } from './terrainWorld.js';
import { isStabilizedOnRunway } from './flightPhysics.js';
import { checkRingCapture } from './runwayAndRings.js';

export const MISSIONS = [
  {
    id: 'delivery',
    index: 0,
    title: 'Sortie 01: Karang to Kaldera Cargo',
    shortTitle: 'RUNWAY DELIVERY',
    weatherPreset: 'golden',
    briefing:
      'Depart the Karang Jaya RWY 09 corridor with medical cargo, hold 65-75% cruise throttle to conserve fuel across Selat Angin, and land to a full stop on highland Kaldera Timur RWY 14.',
    spawn: {
      x: -2590,
      y: 126,
      z: 224,
      headingDeg: 90,
      pitchDeg: 0.5,
      rollDeg: 0,
      airspeedKts: 94,
      throttle: 0.68,
      flapIndex: 1,
      fuelPct: 56,
      onGround: false,
    },
    targetRunwayId: 'WAKB',
    targetRunwayLabel: 'WAKB RWY 14',
    rings: [
      { x: -2140, y: 82, z: 220, headingDeg: 90, radius: 27 },
      { x: -1340, y: 98, z: 215, headingDeg: 86, radius: 28 },
      { x: -510, y: 142, z: 95, headingDeg: 78, radius: 28 },
      { x: 350, y: 168, z: -45, headingDeg: 108, radius: 28 },
      { x: 955, y: 148, z: -155, headingDeg: 140, radius: 27 },
    ],
    dropZones: [],
  },
  {
    id: 'canyon',
    index: 1,
    title: 'Sortie 02: Selat Angin Gorge Slalom',
    shortTitle: 'CANYON RING RUN',
    weatherPreset: 'canyon',
    briefing:
      'Carve low through 6 volcanic basalt gorge gates between Batu Kembar and Tanjung Api using coordinated bank-and-rudder turns, then touch down westbound on Karang Jaya RWY 27.',
    spawn: {
      x: 910,
      y: 178,
      z: -430,
      headingDeg: 236,
      pitchDeg: -1.5,
      rollDeg: -12,
      airspeedKts: 112,
      throttle: 0.74,
      flapIndex: 0,
      fuelPct: 68,
      onGround: false,
    },
    targetRunwayId: 'WARA',
    targetRunwayLabel: 'WARA RWY 27',
    rings: [
      { x: 520, y: 145, z: -265, headingDeg: 232, radius: 26 },
      { x: 95, y: 118, z: -65, headingDeg: 226, radius: 25 },
      { x: -245, y: 104, z: 95, headingDeg: 215, radius: 26 },
      { x: -460, y: 96, z: 420, headingDeg: 252, radius: 26 },
      { x: -745, y: 78, z: 315, headingDeg: 285, radius: 26 },
      { x: -935, y: 52, z: 222, headingDeg: 270, radius: 25 },
    ],
    dropZones: [],
  },
  {
    id: 'storm',
    index: 2,
    title: 'Sortie 03: Squall Coastal Airdrop',
    shortTitle: 'STORM AIRDROP',
    weatherPreset: 'storm',
    briefing:
      'Battle 21 KT squall crosswinds to deliver emergency supply canisters over two southern cove flare zones (fly below 280 FT AGL under 112 KTS and press Space or pass low over flare), then recover to WARA RWY 27.',
    spawn: {
      x: 845,
      y: 158,
      z: 1335,
      headingDeg: 264,
      pitchDeg: -1.0,
      rollDeg: 0,
      airspeedKts: 98,
      throttle: 0.72,
      flapIndex: 1,
      fuelPct: 60,
      onGround: false,
    },
    targetRunwayId: 'WARA',
    targetRunwayLabel: 'WARA RWY 27',
    rings: [
      { x: 540, y: 118, z: 1345, headingDeg: 268, radius: 29 },
      { x: -260, y: 112, z: 1295, headingDeg: 266, radius: 29 },
      { x: -925, y: 66, z: 430, headingDeg: 335, radius: 28 },
    ],
    dropZones: [
      { id: 'DZ-EAST', label: 'South Cove Alpha Flare', x: 240, z: 1355 },
      { id: 'DZ-WEST', label: 'Reef Station Bravo Flare', x: -760, z: 1285 },
    ],
  },
  {
    id: 'dusk',
    index: 3,
    title: 'Sortie 04: Twilight Beacon Approach',
    shortTitle: 'DUSK BEACON ILS',
    weatherPreset: 'dusk',
    briefing:
      'Low-visibility twilight recovery with only 26% reserve fuel. Track the sequenced approach strobes and hold 2-White / 2-Red on the RWY 09 PAPI lights to land before fuel exhaustion.',
    spawn: {
      x: -3160,
      y: 205,
      z: -210,
      headingDeg: 112,
      pitchDeg: -2.0,
      rollDeg: 8,
      airspeedKts: 90,
      throttle: 0.60,
      flapIndex: 1,
      fuelPct: 26,
      onGround: false,
    },
    targetRunwayId: 'WARA',
    targetRunwayLabel: 'WARA RWY 09',
    rings: [
      { x: -2750, y: 148, z: -35, headingDeg: 108, radius: 27 },
      { x: -2390, y: 94, z: 178, headingDeg: 96, radius: 26 },
      { x: -2085, y: 50, z: 220, headingDeg: 90, radius: 25 },
    ],
    dropZones: [],
  },
];

export function createMissionState(missionIndex = 0) {
  const mission = MISSIONS[missionIndex] ?? MISSIONS[0];
  return {
    mission,
    missionIndex: mission.index,
    activeRingIndex: 0,
    ringsCaptured: 0,
    totalRings: mission.rings.length,
    dropsCompleted: 0,
    totalDrops: mission.dropZones.length,
    elapsedSec: 0,
    completed: false,
    completionSummary: null,
    prevAircraftPos: new THREE.Vector3(mission.spawn.x, mission.spawn.y, mission.spawn.z),
    statusBanner: '',
    bannerTimer: 0,
  };
}

function getRunwayTargetPoint(runwayId) {
  const spec = RUNWAY_SPECS.find((r) => r.id === runwayId) ?? RUNWAY_SPECS[0];
  return new THREE.Vector3(spec.centerX, spec.elevation, spec.centerZ);
}

export function updateMissionProgress(mState, flightState, aids, dropRequested, callbacks = {}, dt = 0.016) {
  if (mState.completed || flightState.crashed) return getMissionHudView(mState, flightState, aids);

  mState.elapsedSec += dt;
  if (mState.bannerTimer > 0) {
    mState.bannerTimer = Math.max(0, mState.bannerTimer - dt);
  }

  // 1. Check active or upcoming ring captures
  for (let i = 0; i < aids.ringInstances.length; i += 1) {
    const ring = aids.ringInstances[i];
    if (!ring.captured && checkRingCapture(ring, mState.prevAircraftPos, flightState.position)) {
      mState.ringsCaptured += 1;
      while (
        mState.activeRingIndex < aids.ringInstances.length &&
        aids.ringInstances[mState.activeRingIndex].captured
      ) {
        mState.activeRingIndex += 1;
      }
      mState.statusBanner = `GATE ${mState.ringsCaptured}/${mState.totalRings} CLEARED`;
      mState.bannerTimer = 2.6;
      if (callbacks.onRingCaptured) callbacks.onRingCaptured(mState.ringsCaptured, mState.totalRings);
    }
  }

  // 2. Check Storm Airdrop canisters over flare drop zones
  for (let d = 0; d < aids.dropZoneInstances.length; d += 1) {
    const dz = aids.dropZoneInstances[d];
    if (dz.delivered) continue;
    const horizDist = Math.hypot(
      flightState.position.x - dz.position.x,
      flightState.position.z - dz.position.z,
    );
    const aglFt = flightState.radarAltFt;
    const inDropEnvelope =
      horizDist < 95 && aglFt < 320 && flightState.airspeedKts < 118 && !flightState.onGround;

    if (inDropEnvelope && (dropRequested || horizDist < 54)) {
      dz.delivered = true;
      dz.ringMat.color.setHex(0x4bf598);
      dz.flarePillar.material.color.setHex(0x4bf598);
      mState.dropsCompleted += 1;
      mState.statusBanner = `SUPPLY DROP ${mState.dropsCompleted}/${mState.totalDrops} DELIVERED`;
      mState.bannerTimer = 3.2;
      if (callbacks.onAirdropDelivered) callbacks.onAirdropDelivered(dz.position);
    }
  }

  // 3. Check final runway landing & full-stop completion
  const allGatesDone = mState.ringsCaptured >= mState.totalRings;
  const allDropsDone = mState.dropsCompleted >= mState.totalDrops;

  if (allGatesDone && allDropsDone && isStabilizedOnRunway(flightState, mState.mission.targetRunwayId)) {
    mState.completed = true;
    mState.completionSummary = scoreMissionCompletion(mState, flightState);
    if (callbacks.onMissionCompleted) callbacks.onMissionCompleted(mState.completionSummary);
  }

  mState.prevAircraftPos.copy(flightState.position);
  return getMissionHudView(mState, flightState, aids);
}

export function scoreMissionCompletion(mState, flightState) {
  const gateScore = mState.ringsCaptured * 250;
  const dropScore = mState.dropsCompleted * 450;
  const fuelBonus = Math.round(flightState.fuelPct * 12);
  const airframeBonus = Math.round((100 - flightState.damagePct) * 10);
  const smoothBonus =
    flightState.lastLandingCard?.rating === 'SMOOTH STOL TOUCHDOWN'
      ? 600
      : flightState.lastLandingCard?.rating === 'FIRM UTILITY LANDING'
        ? 350
        : 120;

  const totalScore = gateScore + dropScore + fuelBonus + airframeBonus + smoothBonus;
  const rank = totalScore >= 2450 ? 'GOLD WINGS' : totalScore >= 1900 ? 'SILVER WINGS' : 'QUALIFIED PILOT';

  return {
    missionTitle: mState.mission.title,
    totalScore,
    rank,
    elapsedSec: Math.round(mState.elapsedSec),
    fuelRemainingPct: Math.round(flightState.fuelPct),
    damagePct: Math.round(flightState.damagePct),
    landingRating: flightState.lastLandingCard?.rating ?? 'RUNWAY STOP',
    stoppingDistanceM: flightState.lastLandingCard?.stoppingDistanceM ?? 0,
    sinkRateFpm: flightState.lastLandingCard?.sinkRateFpm ?? 0,
  };
}

export function getMissionHudView(mState, flightState, aids) {
  let targetPos = null;
  let objectiveLabel = '';

  // Prioritize undelivered drop zone if closer than next ring, else next uncaptured ring, else target runway
  const nextDz = aids.dropZoneInstances.find((d) => !d.delivered);
  const nextRing =
    mState.activeRingIndex < aids.ringInstances.length
      ? aids.ringInstances[mState.activeRingIndex]
      : aids.ringInstances.find((r) => !r.captured);

  if (nextDz && (!nextRing || flightState.position.distanceTo(nextDz.position) < flightState.position.distanceTo(nextRing.holder.position))) {
    targetPos = nextDz.position;
    objectiveLabel = `DROP ${mState.dropsCompleted + 1}/${mState.totalDrops}: ${nextDz.def.label}`;
  } else if (nextRing) {
    targetPos = nextRing.holder.position;
    objectiveLabel = `NAV GATE ${mState.ringsCaptured + 1}/${mState.totalRings}`;
  } else {
    targetPos = getRunwayTargetPoint(mState.mission.targetRunwayId);
    objectiveLabel = `LAND FULL STOP: ${mState.mission.targetRunwayLabel}`;
  }

  const dx = targetPos.x - flightState.position.x;
  const dz = targetPos.z - flightState.position.z;
  const distanceM = Math.hypot(dx, dz);
  let bearingDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  if (bearingDeg < 0) bearingDeg += 360;

  return {
    shortTitle: mState.mission.shortTitle,
    objectiveLabel,
    distanceM,
    bearingDeg,
    ringsCaptured: mState.ringsCaptured,
    totalRings: mState.totalRings,
    dropsCompleted: mState.dropsCompleted,
    totalDrops: mState.totalDrops,
    statusBanner: mState.bannerTimer > 0 ? mState.statusBanner : '',
    completed: mState.completed,
  };
}
