// High-contrast sunlit-readable EFIS HUD: pitch ladder, airspeed/altitude/heading tapes, wind, fuel, damage, and touchdown telemetry.
import { FLAP_ANGLES_DEG } from './flightPhysics.js';

const SLATE_BG = 'rgba(9, 17, 26, 0.86)';
const SLATE_SOLID = '#0b141e';
const BORDER_CYAN = 'rgba(90, 242, 184, 0.52)';
const PHOSPHOR = '#5af2b8';
const CRISP_WHITE = '#eef5f9';
const AMBER = '#ff9f2e';
const ALERT_RED = '#f25c3b';

function drawBevelPanel(ctx, x, y, w, h, borderColor = BORDER_CYAN, bg = SLATE_BG) {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function createCockpitHud(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    canvas,
    ctx,
    width: canvas.width,
    height: canvas.height,
    dpr: 1,
  };
}

export function resizeCockpitHud(hud, width, height, dpr = 1) {
  hud.dpr = dpr;
  hud.width = width;
  hud.height = height;
  hud.canvas.width = Math.floor(width * dpr);
  hud.canvas.height = Math.floor(height * dpr);
}

function drawHeadingTape(ctx, cx, topY, headingDeg, bearingDeg, cameraMode) {
  const w = 356;
  const h = 44;
  const x = cx - w * 0.5;
  drawBevelPanel(ctx, x, topY, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 6, topY + 2, w - 12, h - 4);
  ctx.clip();

  const pxPerDeg = 4.2;
  const baseDeg = Math.floor(headingDeg / 5) * 5;
  ctx.strokeStyle = CRISP_WHITE;
  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 12px Consolas, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';

  for (let offset = -45; offset <= 45; offset += 5) {
    const d = baseDeg + offset;
    const norm = ((d % 360) + 360) % 360;
    let diff = d - headingDeg;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const tx = cx + diff * pxPerDeg;
    if (Math.abs(tx - cx) > w * 0.5 - 10) continue;

    const major = norm % 10 === 0;
    ctx.beginPath();
    ctx.moveTo(tx, topY + h - (major ? 14 : 8));
    ctx.lineTo(tx, topY + h - 2);
    ctx.stroke();

    // Prevent two-character heading numbers (e.g. '12', '06') from clipping at left/right tape edges
    if (norm % 30 === 0 && Math.abs(tx - cx) <= w * 0.5 - 22) {
      const card =
        norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : String(norm / 10).padStart(2, '0');
      ctx.fillStyle = norm % 90 === 0 ? AMBER : CRISP_WHITE;
      ctx.fillText(card, tx, topY + 19);
    }
  }

  // Waypoint bearing bug on heading tape
  if (typeof bearingDeg === 'number') {
    let bDiff = bearingDeg - headingDeg;
    while (bDiff > 180) bDiff -= 360;
    while (bDiff < -180) bDiff += 360;
    const bx = Math.max(x + 14, Math.min(x + w - 14, cx + bDiff * pxPerDeg));
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.moveTo(bx, topY + h - 2);
    ctx.lineTo(bx - 6, topY + h - 11);
    ctx.lineTo(bx + 6, topY + h - 11);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Digital heading readout box centered above lubber tick
  const hdgText = `${String(Math.round(headingDeg) % 360).padStart(3, '0')}°`;
  drawBevelPanel(ctx, cx - 38, topY + h + 3, 76, 24, AMBER, SLATE_SOLID);
  ctx.fillStyle = PHOSPHOR;
  ctx.font = 'bold 15px Consolas, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hdgText, cx, topY + h + 20);

  // Camera mode indicator badge beside heading readout
  const camLabel = cameraMode === 'cockpit' ? '3D COCKPIT [C]' : 'CHASE CAM [C]';
  drawBevelPanel(ctx, cx + 46, topY + h + 3, 118, 24, BORDER_CYAN, SLATE_BG);
  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 11px Bahnschrift, "Segoe UI", sans-serif';
  ctx.fillText(camLabel, cx + 105, topY + h + 19);
}

function drawArtificialHorizon(ctx, cx, cy, flightState) {
  const clipR = 132;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, clipR, 0, Math.PI * 2);
  ctx.clip();

  ctx.translate(cx, cy);
  ctx.rotate((flightState.rollDeg * Math.PI) / 180);

  const pxPerPitchDeg = 4.4;
  const pitchY = flightState.pitchDeg * pxPerPitchDeg;

  // Horizon line (subtle translucent wings so 3D aircraft & target ring remain crystal clear!)
  ctx.strokeStyle = 'rgba(90, 242, 184, 0.85)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-118, pitchY);
  ctx.lineTo(-34, pitchY);
  ctx.moveTo(34, pitchY);
  ctx.lineTo(118, pitchY);
  ctx.stroke();

  // Pitch ladder rungs (-25 to +25 deg)
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.fillStyle = PHOSPHOR;
  for (let p = -30; p <= 30; p += 10) {
    if (p === 0) continue;
    const ry = pitchY - p * pxPerPitchDeg;
    if (Math.abs(ry) > 112) continue;

    ctx.beginPath();
    if (p < 0) ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);
    ctx.moveTo(-54, ry);
    ctx.lineTo(-24, ry);
    ctx.moveTo(24, ry);
    ctx.lineTo(54, ry);
    // Vertical tick tips pointing toward horizon
    const tip = p > 0 ? 5 : -5;
    ctx.moveTo(-54, ry);
    ctx.lineTo(-54, ry + tip);
    ctx.moveTo(54, ry);
    ctx.lineTo(54, ry + tip);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'right';
    ctx.fillText(`${Math.abs(p)}`, -58, ry + 4);
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.abs(p)}`, 58, ry + 4);
  }
  ctx.restore();

  // Fixed aircraft boresight reference symbol ("- v -")
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy);
  ctx.lineTo(cx - 10, cy);
  ctx.lineTo(cx - 5, cy + 5);
  ctx.moveTo(cx + 28, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.lineTo(cx + 5, cy + 5);
  ctx.stroke();

  // Flight-path velocity vector (FPV) indicator showing true climb/sink angle
  const gammaDeg =
    flightState.airspeedMps > 5
      ? (Math.asin(Math.max(-1, Math.min(1, flightState.velocity.y / flightState.airspeedMps))) * 180) / Math.PI
      : 0;
  const fpvOffsetY = Math.max(-95, Math.min(95, (flightState.pitchDeg - gammaDeg) * 4.4));
  const fpvOffsetX = Math.max(-65, Math.min(65, -flightState.betaDeg * 3.2));
  const fx = cx + fpvOffsetX;
  const fy = cy + fpvOffsetY;

  ctx.strokeStyle = PHOSPHOR;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(fx, fy, 7, 0, Math.PI * 2);
  ctx.moveTo(fx - 16, fy);
  ctx.lineTo(fx - 7, fy);
  ctx.moveTo(fx + 7, fy);
  ctx.lineTo(fx + 16, fy);
  ctx.moveTo(fx, fy - 7);
  ctx.lineTo(fx, fy - 14);
  ctx.stroke();
}

function drawSpeedTape(ctx, leftX, centerY, flightState) {
  const w = 96;
  const h = 236;
  const topY = centerY - h * 0.5;
  drawBevelPanel(ctx, leftX, topY, w, h);

  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 11px Bahnschrift, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('IAS KTS', leftX + 8, topY - 6);

  ctx.save();
  ctx.beginPath();
  ctx.rect(leftX + 2, topY + 4, w - 4, h - 8);
  ctx.clip();

  const kts = flightState.airspeedKts;
  const pxPerKt = 2.4;
  const stallKts = 53 - flightState.flapNorm * 11;
  const redlineKts = flightState.flapIndex === 2 ? 118 : flightState.flapIndex === 1 ? 142 : 196;

  // Stall low-speed red band & overspeed high band on right spine
  const stallY = centerY + (kts - stallKts) * pxPerKt;
  if (stallY < topY + h) {
    ctx.fillStyle = 'rgba(242, 92, 59, 0.75)';
    ctx.fillRect(leftX + w - 9, Math.max(topY, stallY), 7, topY + h - Math.max(topY, stallY));
  }
  const overY = centerY + (kts - redlineKts) * pxPerKt;
  if (overY > topY) {
    ctx.fillStyle = 'rgba(242, 92, 59, 0.75)';
    ctx.fillRect(leftX + w - 9, topY, 7, Math.min(h, overY - topY));
  }

  const baseKt = Math.floor(kts / 10) * 10;
  ctx.strokeStyle = CRISP_WHITE;
  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 12px Consolas, monospace';
  ctx.textAlign = 'right';

  for (let v = baseKt - 50; v <= baseKt + 50; v += 10) {
    if (v < 0) continue;
    const ty = centerY + (kts - v) * pxPerKt;
    if (ty < topY + 8 || ty > topY + h - 8) continue;
    ctx.beginPath();
    ctx.moveTo(leftX + w - 18, ty);
    ctx.lineTo(leftX + w - 9, ty);
    ctx.stroke();
    if (ty >= topY + 15 && ty <= topY + h - 12 && Math.abs(ty - centerY) >= 26) {
      ctx.fillText(`${v}`, leftX + w - 22, ty + 4);
    }
  }
  ctx.restore();

  // Highlighted current speed drum box
  drawBevelPanel(ctx, leftX + 4, centerY - 17, w - 12, 34, AMBER, SLATE_SOLID);
  ctx.fillStyle = PHOSPHOR;
  ctx.font = 'bold 20px Consolas, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(kts)}`, leftX + (w - 8) * 0.5, centerY + 7);

  // G-load footer readout
  ctx.fillStyle = Math.abs(flightState.gLoad) > 3.6 ? AMBER : CRISP_WHITE;
  ctx.font = 'bold 12px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`G ${flightState.gLoad.toFixed(1)}`, leftX + 6, topY + h + 17);
  ctx.textAlign = 'right';
  ctx.fillText(`GS ${Math.round(flightState.groundSpeedKts)}`, leftX + w, topY + h + 17);
}

function drawAltitudeTape(ctx, rightX, centerY, flightState) {
  const w = 108;
  const h = 236;
  const leftX = rightX - w;
  const topY = centerY - h * 0.5;
  drawBevelPanel(ctx, leftX, topY, w, h);

  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 11px Bahnschrift, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ALT FT MSL', rightX - 6, topY - 6);

  ctx.save();
  ctx.beginPath();
  ctx.rect(leftX + 2, topY + 4, w - 4, h - 8);
  ctx.clip();

  const alt = flightState.altitudeFt;
  const pxPerFt = 0.28;
  const baseAlt = Math.floor(alt / 100) * 100;

  ctx.strokeStyle = CRISP_WHITE;
  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 12px Consolas, monospace';
  ctx.textAlign = 'left';

  for (let a = baseAlt - 400; a <= baseAlt + 400; a += 100) {
    if (a < 0) continue;
    const ty = centerY + (alt - a) * pxPerFt;
    if (ty < topY + 8 || ty > topY + h - 8) continue;
    ctx.beginPath();
    ctx.moveTo(leftX + 8, ty);
    ctx.lineTo(leftX + 18, ty);
    ctx.stroke();
    if (ty >= topY + 15 && ty <= topY + h - 12 && Math.abs(ty - centerY) >= 26) {
      ctx.fillText(`${a}`, leftX + 22, ty + 4);
    }
  }
  ctx.restore();

  drawBevelPanel(ctx, leftX + 8, centerY - 17, w - 12, 34, AMBER, SLATE_SOLID);
  ctx.fillStyle = PHOSPHOR;
  ctx.font = 'bold 20px Consolas, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(alt)}`, leftX + 8 + (w - 12) * 0.5, centerY + 7);

  // VSI & Radar Altitude below tape
  const vsi = Math.round(flightState.verticalSpeedFpm / 10) * 10;
  const vsiSign = vsi > 0 ? `+${vsi}` : `${vsi}`;
  ctx.fillStyle = vsi < -700 ? ALERT_RED : CRISP_WHITE;
  ctx.font = 'bold 12px Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`VS ${vsiSign} FPM`, rightX, topY + h + 17);
  ctx.fillStyle = flightState.radarAltFt < 150 && !flightState.onGround ? AMBER : PHOSPHOR;
  ctx.fillText(`RAD ${Math.round(flightState.radarAltFt)} FT`, rightX, topY + h + 33);
}

function drawWindAndSystems(ctx, width, height, flightState, weather, cameraMode) {
  // Top-left Wind Vector & Weather Pod
  drawBevelPanel(ctx, 18, 16, 214, 62);
  const wx = 48;
  const wy = 47;
  ctx.strokeStyle = BORDER_CYAN;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(wx, wy, 19, 0, Math.PI * 2);
  ctx.stroke();

  // Wind arrow relative to aircraft nose (up = headwind from ahead, down = tailwind)
  const relWindRad = (((weather.currentWindFromDeg - flightState.headingDeg + 180) % 360) * Math.PI) / 180;
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(relWindRad);
  ctx.strokeStyle = AMBER;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 13);
  ctx.lineTo(-5, 6);
  ctx.moveTo(0, 13);
  ctx.lineTo(5, 6);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 12px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(
    `WIND ${String(Math.round(weather.currentWindFromDeg)).padStart(3, '0')}° / ${Math.round(weather.currentWindSpeedKts)} KT`,
    76,
    38,
  );
  ctx.fillStyle = PHOSPHOR;
  ctx.font = '11px Bahnschrift, "Segoe UI", sans-serif';
  ctx.fillText(weather.preset.label, 76, 58);

  // Engine, Fuel, Damage & Flaps cluster (sized in 3D Cockpit mode so all 3 physical 3D EFIS screens stay 100% uncovered)
  const sysY = cameraMode === 'cockpit' ? height - 144 : height - 148;
  const sysW = cameraMode === 'cockpit' ? 212 : 248;
  const sysH = 128;
  drawBevelPanel(ctx, 16, sysY, sysW, sysH);

  const drawBar = (label, valueText, ratio, yOff, barColor, sweetSpot = false) => {
    ctx.fillStyle = CRISP_WHITE;
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, 25, sysY + yOff);
    ctx.textAlign = 'right';
    ctx.fillText(valueText, 16 + sysW - 9, sysY + yOff);

    const bx = 25;
    const by = sysY + yOff + 5;
    const bw = sysW - 18;
    ctx.fillStyle = '#162636';
    ctx.fillRect(bx, by, bw, 9);
    if (sweetSpot) {
      ctx.fillStyle = 'rgba(90, 242, 184, 0.25)';
      ctx.fillRect(bx + bw * 0.58, by - 1, bw * 0.18, 11);
    }
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, ratio)), 9);
  };

  const thrColor = flightState.throttle > 0.82 ? AMBER : PHOSPHOR;
  drawBar('THROTTLE', `${Math.round(flightState.throttle * 100)}%`, flightState.throttle, 20, thrColor, true);

  const fuelColor = flightState.fuelPct < 20 ? ALERT_RED : PHOSPHOR;
  drawBar(
    'FUEL',
    `${Math.round(flightState.fuelPct)}% (${flightState.fuelFlowKgH} KG/H)`,
    flightState.fuelPct / 100,
    54,
    fuelColor,
  );

  const integrity = Math.max(0, 100 - Math.round(flightState.damagePct));
  const dmgColor = flightState.damagePct > 35 ? ALERT_RED : flightState.damagePct > 10 ? AMBER : PHOSPHOR;
  drawBar('AIRFRAME', `${integrity}% OK`, integrity / 100, 88, dmgColor);

  const flapDeg = FLAP_ANGLES_DEG[flightState.flapIndex] ?? 0;
  ctx.fillStyle = flapDeg > 0 ? AMBER : CRISP_WHITE;
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FLAPS: ${flapDeg === 0 ? 'UP' : `${flapDeg}°`}`, 25, sysY + 118);
  ctx.textAlign = 'right';
  ctx.fillStyle = flightState.brakes ? AMBER : CRISP_WHITE;
  ctx.fillText(`BRK: ${flightState.brakes ? 'ON' : 'OFF'}`, 16 + sysW - 9, sysY + 118);
}

function drawMissionDirector(ctx, width, missionView) {
  if (!missionView) return;
  const w = 296;
  const x = width - w - 18;
  drawBevelPanel(ctx, x, 16, w, 72);

  ctx.fillStyle = AMBER;
  ctx.font = 'bold 11px Bahnschrift, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(missionView.shortTitle, x + 12, 34);

  const distNm = (missionView.distanceM / 1852).toFixed(1);
  ctx.textAlign = 'right';
  ctx.fillStyle = PHOSPHOR;
  ctx.font = 'bold 13px Consolas, monospace';
  ctx.fillText(`${distNm} NM (${Math.round(missionView.distanceM)} M)`, x + w - 12, 34);

  ctx.textAlign = 'left';
  ctx.fillStyle = CRISP_WHITE;
  ctx.font = 'bold 13px Bahnschrift, "Segoe UI", sans-serif';
  ctx.fillText(missionView.objectiveLabel, x + 12, 56);

  ctx.fillStyle = PHOSPHOR;
  ctx.font = '11px Consolas, monospace';
  ctx.fillText(
    `BRG ${String(Math.round(missionView.bearingDeg) % 360).padStart(3, '0')}° | GATES ${missionView.ringsCaptured}/${missionView.totalRings}`,
    x + 12,
    76,
  );

  if (missionView.statusBanner) {
    drawBevelPanel(ctx, width * 0.5 - 145, 92, 290, 30, PHOSPHOR, SLATE_SOLID);
    ctx.fillStyle = PHOSPHOR;
    ctx.font = 'bold 13px Bahnschrift, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(missionView.statusBanner, width * 0.5, 112);
  }
}

export function renderTouchdownCard(ctx, width, height, card) {
  if (!card) return;
  const w = 312;
  const h = 148;
  const x = width - w - 18;
  const y = height - h - 20;

  const accent =
    card.rating === 'SMOOTH STOL TOUCHDOWN'
      ? PHOSPHOR
      : card.rating === 'FIRM UTILITY LANDING'
        ? AMBER
        : ALERT_RED;

  drawBevelPanel(ctx, x, y, w, h, accent, 'rgba(8, 16, 24, 0.92)');

  ctx.fillStyle = accent;
  ctx.font = 'bold 13px Bahnschrift, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(card.rating, x + 14, y + 24);

  ctx.fillStyle = CRISP_WHITE;
  ctx.font = '11px Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(card.runwayName, x + w - 14, y + 24);

  const rows = [
    ['TOUCHDOWN SINK RATE', `${card.sinkRateFpm} FPM`],
    ['TOUCHDOWN AIRSPEED', `${card.touchdownKts} KTS`],
    ['CENTERLINE OFFSET', `${card.centerlineM} M`],
    ['RUNWAY ROLLOUT DIST', `${card.stoppingDistanceM} M (${Math.round(card.stoppingDistanceM * 3.28084)} FT)`],
    ['FUEL / AIRFRAME', `${card.fuelRemainingPct}% FUEL | ${100 - card.damagePct}% OK`],
  ];

  ctx.font = 'bold 12px Consolas, monospace';
  for (let i = 0; i < rows.length; i += 1) {
    const ry = y + 48 + i * 21;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b9cbd6';
    ctx.fillText(rows[i][0], x + 14, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = CRISP_WHITE;
    ctx.fillText(rows[i][1], x + w - 14, ry);
  }
}

export function renderCockpitHud(hud, flightState, missionView, weather, cameraMode, elapsedSec) {
  const { ctx, width, height } = hud;
  ctx.save();
  ctx.scale(hud.dpr, hud.dpr);
  ctx.clearRect(0, 0, width, height);

  if (flightState.crashed) {
    ctx.restore();
    return;
  }

  const centerY = cameraMode === 'cockpit' ? height * 0.39 : height * 0.47;

  drawArtificialHorizon(ctx, width * 0.5, centerY, flightState);
  drawHeadingTape(ctx, width * 0.5, 14, flightState.headingDeg, missionView?.bearingDeg, cameraMode);
  drawSpeedTape(ctx, 18, centerY, flightState);
  drawAltitudeTape(ctx, width - 18, centerY, flightState);
  drawWindAndSystems(ctx, width, height, flightState, weather, cameraMode);
  drawMissionDirector(ctx, width, missionView);

  // Master caution / stall / overspeed / terrain pull-up alerts
  let alertMsg = '';
  if (flightState.terrainPullUp) alertMsg = 'TERRAIN AHEAD - PULL UP';
  else if (flightState.stallWarning) alertMsg = 'STALL WARNING - LOWER NOSE & ADD POWER';
  else if (flightState.overspeedWarning) alertMsg = 'OVERSPEED - REDUCE THROTTLE / RETRACT FLAPS';
  else if (flightState.fuelPct < 15) alertMsg = 'FUEL RESERVE CRITICAL - LAND IMMEDIATELY';

  if (alertMsg && Math.floor(elapsedSec * 5) % 2 === 0) {
    drawBevelPanel(ctx, width * 0.5 - 190, centerY - 165, 380, 32, ALERT_RED, 'rgba(38, 10, 10, 0.92)');
    ctx.fillStyle = '#ffd7cf';
    ctx.font = 'bold 13px Bahnschrift, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(alertMsg, width * 0.5, centerY - 144);
  }

  if (flightState.lastLandingCard && (flightState.touchdownActive || flightState.onGround)) {
    renderTouchdownCard(ctx, width, height, flightState.lastLandingCard);
  }

  ctx.restore();
}
