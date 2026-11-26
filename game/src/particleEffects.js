// Soft radial sprite tire touchdown smoke, crash plumes, supply parachute canisters, and smooth wingtip ribbons.
import * as THREE from '../vendor/three.min.js';

function createSoftPuffTexture(innerStop = 'rgba(248, 250, 252, 0.85)', midStop = 'rgba(214, 222, 230, 0.38)') {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  // Multi-lobe organic cloud puff so sprites blend naturally without hard circular edges
  const lobes = [
    { x: 64, y: 64, r: 54, a: 1.0 },
    { x: 48, y: 58, r: 38, a: 0.65 },
    { x: 80, y: 60, r: 36, a: 0.62 },
    { x: 58, y: 46, r: 34, a: 0.55 },
    { x: 70, y: 76, r: 35, a: 0.58 },
  ];

  for (let i = 0; i < lobes.length; i += 1) {
    const l = lobes[i];
    const grad = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
    grad.addColorStop(0.0, innerStop);
    grad.addColorStop(0.45, midStop);
    grad.addColorStop(0.78, 'rgba(195, 204, 214, 0.10)');
    grad.addColorStop(1.0, 'rgba(195, 204, 214, 0.0)');
    ctx.globalAlpha = l.a;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

export function createParticleSystem(scene) {
  const group = new THREE.Group();
  group.name = 'FlightParticleEffects';
  scene.add(group);

  const smokeTex = createSoftPuffTexture(
    'rgba(248, 251, 255, 0.78)',
    'rgba(212, 220, 228, 0.34)',
  );
  const fireTex = createSoftPuffTexture(
    'rgba(255, 232, 132, 0.92)',
    'rgba(255, 118, 28, 0.48)',
  );
  const darkSmokeTex = createSoftPuffTexture(
    'rgba(52, 56, 62, 0.82)',
    'rgba(34, 38, 44, 0.40)',
  );

  const boxGeo = new THREE.BoxGeometry(0.65, 0.22, 0.85);
  const chuteGeo = new THREE.SphereGeometry(3.5, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);

  const trailMat = new THREE.LineBasicMaterial({
    color: 0xeaf6ff,
    transparent: true,
    opacity: 0.52,
  });
  const leftTrailGeo = new THREE.BufferGeometry();
  const rightTrailGeo = new THREE.BufferGeometry();
  const leftTrailLine = new THREE.Line(leftTrailGeo, trailMat);
  const rightTrailLine = new THREE.Line(rightTrailGeo, trailMat);
  leftTrailLine.frustumCulled = false;
  rightTrailLine.frustumCulled = false;
  group.add(leftTrailLine, rightTrailLine);

  return {
    group,
    smokeTex,
    fireTex,
    darkSmokeTex,
    boxGeo,
    chuteGeo,
    particles: [],
    parachutes: [],
    leftTrailPts: [],
    rightTrailPts: [],
    leftTrailGeo,
    rightTrailGeo,
    smokeTimer: 0,
    seedCounter: 1,
  };
}

export function clearParticles(ps) {
  for (let i = 0; i < ps.particles.length; i += 1) {
    ps.group.remove(ps.particles[i].mesh);
    ps.particles[i].mat?.dispose?.();
  }
  for (let i = 0; i < ps.parachutes.length; i += 1) {
    ps.group.remove(ps.parachutes[i].holder);
  }
  ps.particles = [];
  ps.parachutes = [];
  ps.leftTrailPts = [];
  ps.rightTrailPts = [];
  ps.leftTrailGeo.setFromPoints([]);
  ps.rightTrailGeo.setFromPoints([]);
}

function detRand(n) {
  const x = Math.sin(n * 91.3458 + 17.23) * 47453.5453;
  return x - Math.floor(x);
}

export function spawnTireSmoke(ps, aircraftPos, aircraftQuat, count = 6) {
  const offsets = [
    new THREE.Vector3(-1.68, -1.66, 0.42),
    new THREE.Vector3(1.68, -1.66, 0.42),
  ];
  const rightWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(aircraftQuat);
  const backWorld = new THREE.Vector3(0, 0, 1).applyQuaternion(aircraftQuat);

  for (let i = 0; i < count; i += 1) {
    const seed = ps.seedCounter++;
    const sideSign = i % 2 === 0 ? -1 : 1;
    const baseOff = offsets[i % 2].clone().applyQuaternion(aircraftQuat).add(aircraftPos);

    const baseOpacity = 0.50 + detRand(seed * 3) * 0.22;
    const mat = new THREE.SpriteMaterial({
      map: ps.smokeTex,
      color: i % 3 === 0 ? 0xffffff : 0xe9eff5,
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      rotation: detRand(seed * 5) * Math.PI * 2,
    });

    const sprite = new THREE.Sprite(mat);
    const startW = 1.65 + detRand(seed * 7) * 0.95;
    sprite.scale.set(startW, startW * 0.78, 1);
    sprite.position.set(
      baseOff.x + (detRand(seed * 11) - 0.5) * 0.55,
      baseOff.y + 0.18 + detRand(seed * 13) * 0.16,
      baseOff.z + (detRand(seed * 17) - 0.5) * 0.55,
    );
    ps.group.add(sprite);

    const lateralSpread = 1.6 + detRand(seed * 19) * 2.1;
    const wakeDrift = 2.4 + detRand(seed * 23) * 2.5;
    ps.particles.push({
      mesh: sprite,
      mat,
      isSprite: true,
      baseOpacity,
      vel: new THREE.Vector3(
        rightWorld.x * sideSign * lateralSpread + backWorld.x * wakeDrift,
        0.55 + detRand(seed * 29) * 0.55,
        rightWorld.z * sideSign * lateralSpread + backWorld.z * wakeDrift,
      ),
      drag: 1.45,
      growX: 3.1 + detRand(seed * 31) * 1.4,
      growY: 2.1 + detRand(seed * 37) * 1.0,
      rotVel: (detRand(seed * 41) - 0.5) * 1.3,
      age: 0,
      maxAge: 1.35 + detRand(seed * 43) * 0.65,
    });
  }
}

export function spawnCrashExplosion(ps, crashPos) {
  for (let i = 0; i < 38; i += 1) {
    const seed = ps.seedCounter++;
    const isFire = i < 16;
    const baseOpacity = isFire ? 0.88 : 0.68;
    const mat = new THREE.SpriteMaterial({
      map: isFire ? ps.fireTex : ps.darkSmokeTex,
      transparent: true,
      opacity: baseOpacity,
      depthWrite: false,
      rotation: detRand(seed * 3) * Math.PI * 2,
    });
    const sprite = new THREE.Sprite(mat);
    const s = isFire ? 3.2 : 4.4;
    sprite.scale.set(s, s, 1);
    sprite.position.set(
      crashPos.x + (detRand(seed * 5) - 0.5) * 4.2,
      crashPos.y + 1.0 + detRand(seed * 7) * 2.2,
      crashPos.z + (detRand(seed * 11) - 0.5) * 4.2,
    );
    ps.group.add(sprite);

    const ang = (i / 38) * Math.PI * 2;
    const spd = isFire ? 8 + detRand(seed * 13) * 9 : 3.5 + detRand(seed * 17) * 6.5;
    ps.particles.push({
      mesh: sprite,
      mat,
      isSprite: true,
      baseOpacity,
      vel: new THREE.Vector3(
        Math.cos(ang) * spd,
        (isFire ? 5.5 : 10.5) + detRand(seed * 19) * 5,
        Math.sin(ang) * spd,
      ),
      drag: 0.9,
      growX: isFire ? 5.5 : 6.8,
      growY: isFire ? 5.5 : 6.8,
      rotVel: (detRand(seed * 23) - 0.5) * 1.6,
      age: 0,
      maxAge: isFire ? 1.35 : 4.2,
    });
  }

  for (let d = 0; d < 14; d += 1) {
    const mat = new THREE.MeshStandardMaterial({
      color: d % 2 === 0 ? 0xf26b1d : 0xd8dee4,
      roughness: 0.55,
    });
    const mesh = new THREE.Mesh(ps.boxGeo, mat);
    mesh.position.copy(crashPos).add(new THREE.Vector3(0, 1.5, 0));
    ps.group.add(mesh);

    const ang = d * 1.45;
    ps.particles.push({
      mesh,
      mat,
      isSprite: false,
      baseOpacity: 1.0,
      vel: new THREE.Vector3(Math.cos(ang) * 16, 12 + (d % 4) * 4, Math.sin(ang) * 16),
      gravity: -16,
      spin: new THREE.Vector3(3.5, 5.1, 2.4),
      age: 0,
      maxAge: 3.4,
    });
  }
}

export function spawnAirdropCanister(ps, originPos) {
  const holder = new THREE.Group();
  holder.position.copy(originPos).add(new THREE.Vector3(0, -1.8, 0));

  const canopy = new THREE.Mesh(
    ps.chuteGeo,
    new THREE.MeshLambertMaterial({ color: 0xff7a1f, side: THREE.DoubleSide }),
  );
  canopy.position.y = 4.4;

  const shroudMat = new THREE.LineBasicMaterial({ color: 0xd8e2eb, transparent: true, opacity: 0.65 });
  for (let c = 0; c < 4; c += 1) {
    const a = (c * Math.PI) / 2 + 0.4;
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(Math.cos(a) * 3.1, 4.3, Math.sin(a) * 3.1),
    ]);
    holder.add(new THREE.Line(lineGeo, shroudMat));
  }

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.2, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xeae6dc, roughness: 0.6 }),
  );
  holder.add(canopy, crate);
  ps.group.add(holder);

  ps.parachutes.push({
    holder,
    age: 0,
  });
}

export function updateParticles(ps, flightState, dt) {
  if (
    flightState.onGround &&
    !flightState.crashed &&
    flightState.groundSpeedKts > 26 &&
    (flightState.brakes || flightState.rolloutDistanceM < 85)
  ) {
    ps.smokeTimer += dt;
    if (ps.smokeTimer >= 0.05) {
      ps.smokeTimer = 0;
      spawnTireSmoke(ps, flightState.position, flightState.quaternion, 2);
    }
  }

  // Smooth aerodynamic wingtip vortex ribbons during high-bank maneuvers
  if (!flightState.onGround && !flightState.crashed && Math.abs(flightState.rollDeg) > 25 && flightState.airspeedKts > 82) {
    const lTip = new THREE.Vector3(-7.95, 1.18, 0.65)
      .applyQuaternion(flightState.quaternion)
      .add(flightState.position);
    const rTip = new THREE.Vector3(7.95, 1.18, 0.65)
      .applyQuaternion(flightState.quaternion)
      .add(flightState.position);
    ps.leftTrailPts.push(lTip);
    ps.rightTrailPts.push(rTip);
    if (ps.leftTrailPts.length > 42) ps.leftTrailPts.shift();
    if (ps.rightTrailPts.length > 42) ps.rightTrailPts.shift();
  } else {
    if (ps.leftTrailPts.length > 0) ps.leftTrailPts.shift();
    if (ps.rightTrailPts.length > 0) ps.rightTrailPts.shift();
  }
  ps.leftTrailGeo.setFromPoints(ps.leftTrailPts);
  ps.rightTrailGeo.setFromPoints(ps.rightTrailPts);

  for (let i = ps.particles.length - 1; i >= 0; i -= 1) {
    const p = ps.particles[i];
    p.age += dt;
    if (p.age >= p.maxAge) {
      ps.group.remove(p.mesh);
      p.mat?.dispose?.();
      ps.particles.splice(i, 1);
      continue;
    }
    if (p.gravity) p.vel.y += p.gravity * dt;
    if (p.drag) {
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vel.multiplyScalar(damp);
    }
    p.mesh.position.addScaledVector(p.vel, dt);
    if (p.mesh.position.y < 0.35) {
      p.mesh.position.y = 0.35;
      p.vel.y = Math.abs(p.vel.y) * 0.15;
    }

    const lifeRatio = p.age / p.maxAge;
    if (p.isSprite) {
      p.mesh.scale.x += p.growX * dt;
      p.mesh.scale.y += p.growY * dt;
      p.mat.rotation += p.rotVel * dt;
      // Smooth bell fade-in & long feather fade-out
      const fadeIn = Math.min(1, lifeRatio * 5.5);
      const fadeOut = Math.pow(1 - lifeRatio, 1.65);
      p.mat.opacity = p.baseOpacity * fadeIn * fadeOut;
    } else if (p.spin) {
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
    }
  }

  for (let i = ps.parachutes.length - 1; i >= 0; i -= 1) {
    const ch = ps.parachutes[i];
    ch.age += dt;
    if (ch.holder.position.y > 2.2) {
      ch.holder.position.y -= 6.5 * dt;
      ch.holder.rotation.z = Math.sin(ch.age * 2.5) * 0.12;
    }
    if (ch.age > 24) {
      ps.group.remove(ch.holder);
      ps.parachutes.splice(i, 1);
    }
  }
}
