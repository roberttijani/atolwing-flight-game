// High-contrast sunlit-readable EFIS HUD with Tactical Terrain Mini-Radar, subsystem telemetry, and landing readout card.
import { FLAP_ANGLES_DEG } from './flightPhysics.js';
import { RUNWAY_SPECS, TERRAIN_SPAN } from './terrainWorld.js';

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

    if (norm % 30 === 0 && Math.abs(tx - cx) <= w * 0.5 - 22) {
      const card =
        norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : String(norm / 10).padStart(2, '0');
      ctx.fillStyle = norm % 90 === 0 ? AMBER : CRISP_WHITE;
      ctx.fillText(card, tx, topY + 19);
    }
  }

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

  const hdgText = `${String(Math.round(headingDeg) % 360).padStart(3, '0')}°`;
  drawBevelPanel(ctx, cx - 38, topY + h + 3, 76, 24, AMBER, SLATE_SOLID);
  ctx.fillStyle = PHOSPHOR;
  ctx.font = 'bold 15px Consolas, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hdgText, cx, topY + h + 20);

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

  ctx.strokeStyle = 'rgba(90, 242, 184, 0.85)';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-118, pitchY);
  ctx.lineTo(-34, pitchY);
  ctx.moveTo(34, pitchY);
  ctx.lineTo(118, pitchY);
  ctx.stroke();

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

function drawIlsNeedles(ctx, width, cx, cy, ils) {
  if (!ils?.active) return;

  // Boxless transparent combiner-glass ILS Localizer (under heading box) & Glideslope (inner edge of ALT tape)
  const locY = 96;
  const gsX = width - 134;

  ctx.save();
  ctx.shadowColor = 'rgba(4, 10, 16, 0.85)';
  ctx.shadowBlur = 4;

  // Delicate Localizer baseline + 4 crisp dots + amber center datum
  ctx.strokeStyle = 'rgba(238, 245, 249, 0.42)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(cx - 72, locY);
  ctx.lineTo(cx + 72, locY);
  ctx.moveTo(gsX, cy - 68);
  ctx.lineTo(gsX, cy + 68);
  ctx.stroke();

  ctx.strokeStyle = CRISP_WHITE;
  ctx.lineWidth = 1.4;
  for (let d = -2; d <= 2; d += 1) {
    if (d === 0) {
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(cx, locY - 6);
      ctx.lineTo(cx, locY + 6);
      ctx.moveTo(gsX - 6, cy);
      ctx.lineTo(gsX + 6, cy);
      ctx.stroke();
      ctx.strokeStyle = CRISP_WHITE;
      ctx.lineWidth = 1.4;
    } else {
      ctx.beginPath();
      ctx.arc(cx + d * 30, locY, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(gsX, cy + d * 30, 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Subtle boxless glass captions with crisp dark outline for contrast over sunlit clouds/buildings
  ctx.font = 'bold 10px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(5, 11, 18, 0.88)';
  ctx.lineWidth = 3.0;
  ctx.lineJoin = 'round';
  ctx.strokeText(`ILS ${ils.runwayLabel}`, cx, locY + 15);
  ctx.fillStyle = ils.aligned ? PHOSPHOR : '#ff8ae9';
  ctx.fillText(`ILS ${ils.runwayLabel}`, cx, locY + 15);
  ctx.strokeText('G/S', gsX, cy - 75);
  ctx.fillStyle = '#ff8ae9';
  ctx.fillText('G/S', gsX, cy - 75);

  const drawDiamond = (dx, dy) => {
    ctx.fillStyle = '#ff6be6';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(dx, dy - 5.5);
    ctx.lineTo(dx + 5.5, dy);
    ctx.lineTo(dx, dy + 5.5);
    ctx.lineTo(dx - 5.5, dy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const locPx = Math.max(-68, Math.min(68, ils.locDots * 30));
  const gsPx = Math.max(-64, Math.min(64, -ils.gsDots * 30));
  drawDiamond(cx + locPx, locY);
  drawDiamond(gsX, cy + gsPx);
  ctx.restore();
}

function drawAoaIndexer(ctx, x, centerY, flightState) {
  // Boxless combiner-glass AoA indexer tucked beside the IAS tape inner edge
  const bx = x + 16;
  const topY = centerY - 40;
  const aoa = flightState.alphaDeg ?? 0;
  const isSlow = aoa > 9.5 || flightState.stallWarning;
  const isOnSpeed = !isSlow && aoa >= 3.2 && aoa <= 9.5;
  const isFast = !isSlow && aoa < 3.2;

  ctx.save();
  ctx.shadowColor = 'rgba(4, 10, 16, 0.90)';
  ctx.shadowBlur = 4;

  // Top chevron (SLOW / high AoA - amber/red)
  ctx.strokeStyle = isSlow ? (flightState.stallWarning ? ALERT_RED : AMBER) : 'rgba(255, 159, 46, 0.28)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(bx - 7, topY + 6);
  ctx.lineTo(bx, topY + 13);
  ctx.lineTo(bx + 7, topY + 6);
  ctx.stroke();

  // Center donut (ON-SPEED - phosphor green)
  ctx.strokeStyle = isOnSpeed ? PHOSPHOR : 'rgba(90, 242, 184, 0.28)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(bx, topY + 24, 5.5, 0, Math.PI * 2);
  ctx.stroke();

  // Bottom chevron (FAST / low AoA - cyan)
  ctx.strokeStyle = isFast ? '#58d4ff' : 'rgba(88, 212, 255, 0.28)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(bx - 7, topY + 41);
  ctx.lineTo(bx, topY + 34);
  ctx.lineTo(bx + 7, topY + 41);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(5, 11, 18, 0.90)';
  ctx.lineWidth = 3.0;
  ctx.lineJoin = 'round';
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.strokeText(`AoA ${aoa.toFixed(1)}°`, bx + 4, topY + 58);
  ctx.fillStyle = isSlow ? AMBER : isOnSpeed ? PHOSPHOR : CRISP_WHITE;
  ctx.fillText(`AoA ${aoa.toFixed(1)}°`, bx + 4, topY + 58);

  const margin = Math.round(flightState.stallMarginKts ?? 35);
  ctx.font = 'bold 10px Consolas, monospace';
  ctx.strokeText(`+${margin} KT`, bx + 4, topY + 71);
  ctx.fillStyle = margin < 14 ? ALERT_RED : margin < 24 ? AMBER : '#c8e0ee';
  ctx.fillText(`+${margin} KT`, bx + 4, topY + 71);
  ctx.restore();
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
  const cleanStall = flightState.aircraftSpec?.stallCleanKts ?? 53;
  const redline = flightState.aircraftSpec?.redlineKts ?? 196;
  const stallKts = cleanStall - flightState.flapNorm * 11;
  const redlineKts = flightState.flapIndex === 2 ? 122 : flightState.flapIndex === 1 ? 148 : redline;

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

  drawBevelPanel(ctx, leftX + 4, centerY - 17, w - 12, 34, AMBER, SLATE_SOLID);
  ctx.fillStyle = PHOSPHOR;
  ctx.font = 'bold 20px Consolas, "Cascadia Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(kts)}`, leftX + (w - 8) * 0.5, centerY + 7);

  // High-contrast smoked-slate telemetry pill (>10:1 contrast even over bright surf foam)
  drawBevelPanel(ctx, leftX, topY + h + 5, w, 22, BORDER_CYAN, 'rgba(7, 15, 23, 0.90)');
  ctx.fillStyle = Math.abs(flightState.gLoad) > 3.6 ? AMBER : CRISP_WHITE;
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`G ${flightState.gLoad.toFixed(1)}`, leftX + 6, topY + h + 20);
  ctx.textAlign = 'right';
  ctx.fillText(`GS ${Math.round(flightState.groundSpeedKts)}`, leftX + w - 6, topY + h + 20);
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

  const vsi = Math.round(flightState.verticalSpeedFpm / 10) * 10;
  const vsiSign = vsi > 0 ? `+${vsi}` : `${vsi}`;
  // High-contrast smoked-slate pill behind VS & RAD readouts (>10:1 over bright coastal surf)
  drawBevelPanel(ctx, leftX - 4, topY + h + 5, w + 4, 38, BORDER_CYAN, 'rgba(7, 15, 23, 0.90)');
  ctx.fillStyle = vsi < -700 ? ALERT_RED : CRISP_WHITE;
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`VS ${vsiSign} FPM`, rightX - 6, topY + h + 20);
  ctx.fillStyle = flightState.radarAltFt < 150 && !flightState.onGround ? AMBER : PHOSPHOR;
  ctx.fillText(`RAD ${Math.round(flightState.radarAltFt)} FT`, rightX - 6, topY + h + 36);
}

function drawWindAndSystems(ctx, width, height, flightState, weather, cameraMode) {
  drawBevelPanel(ctx, 18, 16, 224, 62);
  const wx = 48;
  const wy = 47;
  ctx.strokeStyle = BORDER_CYAN;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(wx, wy, 19, 0, Math.PI * 2);
  ctx.stroke();

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

  const sysY = cameraMode === 'cockpit' ? height - 166 : height - 170;
  const sysW = cameraMode === 'cockpit' ? 216 : 258;
  const sysH = 152;
  drawBevelPanel(ctx, 16, sysY, sysW, sysH);

  const drawBar = (label, valueText, ratio, yOff, barColor, sweetSpot = false) => {
    ctx.fillStyle = CRISP_WHITE;
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, 25, sysY + yOff);
    ctx.textAlign = 'right';
    ctx.fillText(valueText, 16 + sysW - 9, sysY + yOff);

    const bx = 25;
    const by = sysY + yOff + 4;
    const bw = sysW - 18;
    ctx.fillStyle = '#162636';
    ctx.fillRect(bx, by, bw, 7);
    if (sweetSpot) {
      ctx.fillStyle = 'rgba(90, 242, 184, 0.25)';
      ctx.fillRect(bx + bw * 0.58, by - 1, bw * 0.18, 9);
    }
    ctx.fillStyle = barColor;
    ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, ratio)), 7);
  };

  const thrColor = flightState.throttle > 0.85 ? AMBER : PHOSPHOR;
  drawBar('THROTTLE', `${Math.round(flightState.throttle * 100)}%`, flightState.throttle, 18, thrColor, true);

  const fuelColor = flightState.fuelPct < 20 ? ALERT_RED : PHOSPHOR;
  drawBar(
    'FUEL',
    `${Math.round(flightState.fuelPct)}% (${flightState.fuelFlowKgH} KG/H)`,
    flightState.fuelPct / 100,
    45,
    fuelColor,
  );

  const egtVal = Math.round(flightState.egtC ?? 670);
  const egtColor = egtVal > 795 ? ALERT_RED : egtVal > 745 ? AMBER : PHOSPHOR;
  drawBar('EGT TEMP', `${egtVal}°C`, (egtVal - 420) / 430, 72, egtColor);

  const integrity = Math.max(0, 100 - Math.round(flightState.airframeDmgPct));
  const engHealth = Math.max(0, 100 - Math.round(flightState.engineStressPct));
  const dmgColor = flightState.damagePct > 35 ? ALERT_RED : flightState.damagePct > 12 ? AMBER : PHOSPHOR;
  drawBar('AIRFRAME / ENG', `${integrity}% / ${engHealth}%`, Math.min(integrity, engHealth) / 100, 99, dmgColor);

  const flapDeg = FLAP_ANGLES_DEG[flightState.flapIndex] ?? 0;
  ctx.font = 'bold 10.5px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = flapDeg > 0 ? AMBER : CRISP_WHITE;
  ctx.fillText(`FLP:${flapDeg === 0 ? 'UP' : `${flapDeg}°`}`, 25, sysY + 128);
  ctx.textAlign = 'center';
  ctx.fillStyle = flightState.tailhookDeployed ? AMBER : '#9db7c7';
  ctx.fillText(`HOOK:${flightState.tailhookDeployed ? 'DN' : 'UP'}`, 16 + sysW * 0.52, sysY + 128);
  ctx.textAlign = 'right';
  ctx.fillStyle = flightState.brakes ? AMBER : CRISP_WHITE;
  ctx.fillText(`BRK:${flightState.brakes ? 'ON' : 'OFF'}`, 16 + sysW - 9, sysY + 128);

  // Active aircraft tag at bottom of systems pod
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9db7c7';
  ctx.font = 'bold 10px Consolas, monospace';
  ctx.fillText(flightState.aircraftSpec?.shortLabel ?? 'ATW-28 ISLANDER', 25, sysY + 144);
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

export function drawTacticalMiniRadar(ctx, x, y, size, flightState, missionView, weather, worldRefs, aids) {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5 + 7;
  const r = size * 0.5 - 12;

  drawBevelPanel(ctx, x, y, size, size + 16, BORDER_CYAN, 'rgba(7, 15, 23, 0.90)');

  ctx.fillStyle = PHOSPHOR;
  ctx.font = 'bold 10px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('TERR RADAR 2NM', x + 8, y + 13);
  ctx.textAlign = 'right';
  ctx.fillStyle = AMBER;
  ctx.fillText('HDG UP', x + size - 8, y + 13);

  const hdgRad = (flightState.headingDeg * Math.PI) / 180;
  const rangeM = 3500;
  const scale = r / rangeM;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#071826';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  if (worldRefs?.radarMapCanvas) {
    const drawSize = TERRAIN_SPAN * scale;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-hdgRad);
    ctx.drawImage(
      worldRefs.radarMapCanvas,
      -drawSize * 0.5 - flightState.position.x * scale,
      -drawSize * 0.5 - flightState.position.z * scale,
      drawSize,
      drawSize,
    );

    // Runways & Offshore platform on mini-radar
    for (let i = 0; i < RUNWAY_SPECS.length; i += 1) {
      const rw = RUNWAY_SPECS[i];
      const rx = (rw.centerX - flightState.position.x) * scale;
      const rz = (rw.centerZ - flightState.position.z) * scale;
      ctx.save();
      ctx.translate(rx, rz);
      ctx.rotate((rw.headingDeg * Math.PI) / 180);
      const isTarget = missionView?.targetRunwayId === rw.id;
      ctx.fillStyle = isTarget ? AMBER : '#e6f2fa';
      ctx.fillRect(-2.2, -7.5, 4.4, 15);
      ctx.restore();
    }

    // Active mission route legs & waypoint diamonds
    if (aids?.ringInstances?.length) {
      ctx.strokeStyle = 'rgba(255, 159, 46, 0.80)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i < aids.ringInstances.length; i += 1) {
        const ring = aids.ringInstances[i];
        if (ring.captured) continue;
        ctx.lineTo(
          (ring.holder.position.x - flightState.position.x) * scale,
          (ring.holder.position.z - flightState.position.z) * scale,
        );
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < aids.ringInstances.length; i += 1) {
        const ring = aids.ringInstances[i];
        if (ring.captured) continue;
        const wx = (ring.holder.position.x - flightState.position.x) * scale;
        const wz = (ring.holder.position.z - flightState.position.z) * scale;
        ctx.fillStyle = i === 0 ? AMBER : PHOSPHOR;
        ctx.beginPath();
        ctx.arc(wx, wz, 3.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Drop zone flare markers
    if (aids?.dropZoneInstances?.length) {
      for (let d = 0; d < aids.dropZoneInstances.length; d += 1) {
        const dz = aids.dropZoneInstances[d];
        if (dz.delivered) continue;
        const dx = (dz.position.x - flightState.position.x) * scale;
        const dzp = (dz.position.z - flightState.position.z) * scale;
        ctx.strokeStyle = ALERT_RED;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(dx, dzp, 4.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Range ring + radar crosshair
  ctx.strokeStyle = 'rgba(90, 242, 184, 0.34)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();
  ctx.restore();

  // Outer compass rim & North tick
  ctx.strokeStyle = BORDER_CYAN;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  const northAngle = -hdgRad - Math.PI * 0.5;
  const nx = cx + Math.cos(northAngle) * (r - 6);
  const ny = cy + Math.sin(northAngle) * (r - 6);
  ctx.fillStyle = AMBER;
  ctx.font = 'bold 9px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny + 3);

  // Center own-aircraft symbol
  ctx.strokeStyle = CRISP_WHITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx, cy + 7);
  ctx.moveTo(cx - 7, cy);
  ctx.lineTo(cx + 7, cy);
  ctx.stroke();
}

export function renderTouchdownCard(ctx, width, height, card) {
  if (!card) return;
  const w = 332;
  const h = 148;
  const x = width - w - 18;
  const y = height - h - 24;

  const isTopRating =
    card.rating === 'SMOOTH STOL TOUCHDOWN' ||
    card.rating === 'DECK ARREST STOL LANDING' ||
    card.rating?.includes('CARRIER TRAP');
  const accent = isTopRating ? PHOSPHOR : card.rating === 'FIRM UTILITY LANDING' ? AMBER : ALERT_RED;

  drawBevelPanel(ctx, x, y, w, h, accent, 'rgba(8, 16, 24, 0.93)');

  ctx.fillStyle = accent;
  ctx.font = 'bold 13px Bahnschrift, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(card.rating, x + 14, y + 23);

  // Grade pill badge (S / A / B / C)
  const grade = card.grade ?? 'A';
  drawBevelPanel(ctx, x + w - 72, y + 8, 58, 21, accent, '#0c1d2b');
  ctx.fillStyle = accent;
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`GRD ${grade}`, x + w - 43, y + 22);

  const aoaTxt = typeof card.touchdownAoaDeg === 'number' ? `${card.touchdownAoaDeg.toFixed(1)}°` : '5.5°';
  const ilsTxt = typeof card.ilsDevDots === 'number' ? `${card.ilsDevDots.toFixed(2)} DOT` : '0.25 DOT';
  const maxGTxt = typeof card.maxG === 'number' ? `${card.maxG.toFixed(1)}G` : '1.4G';
  const burnTxt = typeof card.fuelBurnedPct === 'number' ? `-${card.fuelBurnedPct}%` : '-12%';

  // Compact 4-row high-scannability landing & flight recorder card
  const rows = [
    ['SINK / IAS / CL', `${card.sinkRateFpm} FPM | ${card.touchdownKts} KT | ${card.centerlineM}M`],
    ['AoA / ILS DEV', `${aoaTxt} ON-SPD | ${ilsTxt}`],
    ['ROLLOUT / MAX G', `${card.stoppingDistanceM} M (${Math.round(card.stoppingDistanceM * 3.28084)} FT) | ${maxGTxt}`],
    ['FUEL / AIRFRAME', `${card.fuelRemainingPct}% (${burnTxt}) | ${100 - card.damagePct}% OK`],
  ];

  ctx.font = 'bold 11.5px Consolas, monospace';
  for (let i = 0; i < rows.length; i += 1) {
    const ry = y + 51 + i * 24;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a8c2d1';
    ctx.fillText(rows[i][0], x + 14, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = CRISP_WHITE;
    ctx.fillText(rows[i][1], x + w - 14, ry);
  }
}

export function renderCockpitHud(hud, flightState, missionView, weather, cameraMode, elapsedSec, worldRefs, aids) {
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
  if (cameraMode !== 'cockpit' && !flightState.onGround) {
    drawIlsNeedles(ctx, width, width * 0.5, centerY, flightState.ils);
  }
  drawHeadingTape(ctx, width * 0.5, 14, flightState.headingDeg, missionView?.bearingDeg, cameraMode);
  drawSpeedTape(ctx, 18, centerY, flightState);
  if (width >= 760) {
    drawAoaIndexer(ctx, 126, centerY, flightState);
  }
  drawAltitudeTape(ctx, width - 18, centerY, flightState);
  drawWindAndSystems(ctx, width, height, flightState, weather, cameraMode);
  drawMissionDirector(ctx, width, missionView);

  // Master caution & flight envelope alerts
  let alertMsg = '';
  if (flightState.terrainPullUp) alertMsg = 'TERRAIN AHEAD - PULL UP';
  else if (flightState.stallWarning) alertMsg = 'STALL WARNING - LOWER NOSE & ADD POWER';
  else if (flightState.overspeedWarning) alertMsg = 'OVERSPEED - REDUCE THROTTLE / RETRACT FLAPS';
  else if (flightState.engineOverheatWarning) alertMsg = 'ENGINE ITT HIGH - REDUCE THROTTLE TO CRUISE';
  else if (flightState.fuelPct < 15) alertMsg = 'FUEL RESERVE CRITICAL - LAND IMMEDIATELY';

  if (alertMsg && Math.floor(elapsedSec * 5) % 2 === 0) {
    drawBevelPanel(ctx, width * 0.5 - 195, centerY - 165, 390, 32, ALERT_RED, 'rgba(38, 10, 10, 0.92)');
    ctx.fillStyle = '#ffd7cf';
    ctx.font = 'bold 13px Bahnschrift, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(alertMsg, width * 0.5, centerY - 144);
  } else if (flightState.thermalUpdraftMps > 1.2) {
    drawBevelPanel(ctx, width * 0.5 - 115, centerY - 165, 230, 26, AMBER, SLATE_BG);
    ctx.fillStyle = AMBER;
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`CALDERA THERMAL +${Math.round(flightState.thermalUpdraftMps * 196.85)} FPM`, width * 0.5, centerY - 148);
  }

  const showingLandingCard = Boolean(
    flightState.lastLandingCard && (flightState.touchdownActive || flightState.onGround),
  );
  if (showingLandingCard) {
    renderTouchdownCard(ctx, width, height, flightState.lastLandingCard);
  } else if (width >= 680 && cameraMode !== 'cockpit') {
    // Tactical Terrain Mini-Radar in Chase View (3D Cockpit already renders live Moving-Map Terrain MFD on center glass)
    const radarSize = 152;
    drawTacticalMiniRadar(
      ctx,
      width - radarSize - 18,
      height - radarSize - 38,
      radarSize,
      flightState,
      missionView,
      weather,
      worldRefs,
      aids,
    );
  }

  ctx.restore();
}
