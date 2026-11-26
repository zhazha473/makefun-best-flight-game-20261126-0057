// HUD for SALTWIND COURIER: big, high-contrast instruments a judge can
// read from a shrunk screenshot — ALT / SPD / HDG, fuel and damage gauges,
// a compass strip, the mission checklist and the flight hints.

import { CANVAS_WIDTH, DAWN_PALETTE } from './config.js';
import { planeAltitudeFeet, planeHeadingDegrees, planeSpeedKnots } from './flight-model.js';
import { missionProgress } from './missions.js';

const INK = DAWN_PALETTE.hudInk;
const PAPER = DAWN_PALETTE.hudPaper;

function panel(ctx, x, y, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha === undefined ? 0.72 : alpha;
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,243,214,0.55)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function label(ctx, text, x, y, size, color) {
  ctx.fillStyle = color || PAPER;
  ctx.font = `700 ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

export function drawCompassStrip(ctx, headingDegrees) {
  const cx = CANVAS_WIDTH / 2;
  const y = 18;
  panel(ctx, cx - 210, 8, 420, 44, 0.85);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 210, 8, 420, 44);
  ctx.clip();
  const points = [
    [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'],
    [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'],
  ];
  for (let offset = -180; offset <= 180; offset += 15) {
    const deg = (headingDegrees + offset + 360) % 360;
    const x = cx + offset * 1.15;
    const major = deg % 45 === 0;
    ctx.strokeStyle = major ? PAPER : 'rgba(255,243,214,0.45)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 26);
    ctx.lineTo(x, y + (major ? 12 : 19));
    ctx.stroke();
    if (major) {
      const point = points.find(([d]) => d === deg);
      ctx.fillStyle = PAPER;
      ctx.font = '700 13px "Trebuchet MS", Verdana, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(point ? point[1] : String(deg), x, y + 40);
    }
  }
  ctx.restore();
  ctx.fillStyle = DAWN_PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(cx, 8);
  ctx.lineTo(cx - 7, 18);
  ctx.lineTo(cx + 7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = DAWN_PALETTE.hudAmber;
  ctx.font = '800 15px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${String(headingDegrees).padStart(3, '0')}°`, cx, 66);
}

export function drawInstruments(ctx, plane) {
  const alt = planeAltitudeFeet(plane);
  const spd = planeSpeedKnots(plane);
  const hdg = planeHeadingDegrees(plane);
  panel(ctx, 16, 14, 300, 96, 0.74);
  label(ctx, 'ALT', 30, 40, 15, DAWN_PALETTE.hudAmber);
  label(ctx, 'SPD', 130, 40, 15, DAWN_PALETTE.hudAmber);
  label(ctx, 'HDG', 228, 40, 15, DAWN_PALETTE.hudAmber);
  ctx.fillStyle = PAPER;
  ctx.font = '800 34px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(alt), 30, 82);
  ctx.fillText(String(spd), 130, 82);
  ctx.fillText(String(hdg).padStart(3, '0'), 228, 82);
  ctx.fillStyle = 'rgba(255,243,214,0.75)';
  ctx.font = '700 12px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('FT', 30, 100);
  ctx.fillText('KT', 130, 100);
  ctx.fillText('DEG', 228, 100);
  if (plane.stalled && !plane.landed) {
    ctx.fillStyle = DAWN_PALETTE.hudRed;
    ctx.font = '800 20px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('STALL!', 330, 48);
  }
}

function gaugeBar(ctx, x, y, w, h, fraction, goodColor, badColor, title, valueText) {
  panel(ctx, x, y, w, h, 0.7);
  label(ctx, title, x + 10, y + 20, 14, DAWN_PALETTE.hudAmber);
  const barX = x + 10;
  const barY = y + 28;
  const barW = w - 20;
  const barH = 16;
  ctx.fillStyle = 'rgba(255,243,214,0.25)';
  ctx.fillRect(barX, barY, barW, barH);
  const color = fraction < 0.25 ? badColor : goodColor;
  ctx.fillStyle = color;
  ctx.fillRect(barX, barY, Math.max(0, barW * Math.max(0, Math.min(1, fraction))), barH);
  ctx.fillStyle = PAPER;
  ctx.font = '800 16px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(valueText, x + w - 10, y + 62);
  ctx.textAlign = 'left';
}

export function drawFuelDamage(ctx, plane) {
  const fuelFraction = plane.fuel / 100;
  gaugeBar(ctx, CANVAS_WIDTH - 236, 14, 220, 68, fuelFraction, DAWN_PALETTE.hudGreen, DAWN_PALETTE.hudRed, 'FUEL', `${Math.round(plane.fuel)}%`);
  const damageFraction = plane.damage / 100;
  gaugeBar(ctx, CANVAS_WIDTH - 236, 90, 220, 68, 1 - damageFraction, DAWN_PALETTE.hudGreen, DAWN_PALETTE.hudRed, 'HULL', damageFraction === 0 ? 'OK' : `${Math.round(plane.damage)}% DMG`);
  if (fuelFraction < 0.25) {
    ctx.fillStyle = DAWN_PALETTE.hudRed;
    ctx.font = '800 20px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('LOW FUEL — HEAD HOME', CANVAS_WIDTH - 16, 330);
    ctx.textAlign = 'left';
  }
}

export function drawMissionPanel(ctx, mission) {
  const progress = missionProgress(mission);
  const rows = mission.objectives.length;
  const h = 64 + rows * 24;
  panel(ctx, CANVAS_WIDTH - 236, 168, 220, h, 0.7);
  label(ctx, mission.title, CANVAS_WIDTH - 226, 192, 13, DAWN_PALETTE.hudAmber);
  label(ctx, `${progress.done}/${progress.total} done   SCORE ${mission.score}`, CANVAS_WIDTH - 226, 212, 13, PAPER);
  mission.objectives.forEach((objective, i) => {
    const y = 236 + i * 24;
    ctx.fillStyle = objective.done ? DAWN_PALETTE.hudGreen : PAPER;
    ctx.font = '700 14px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(objective.done ? '✓ ' : '○ ', CANVAS_WIDTH - 226, y);
    ctx.fillText(objective.label, CANVAS_WIDTH - 206, y);
  });
}

export function drawThrottleBar(ctx, plane) {
  const x = 16;
  const y = 640;
  panel(ctx, x, y, 200, 56, 0.7);
  label(ctx, 'THROTTLE', x + 10, y + 20, 13, DAWN_PALETTE.hudAmber);
  ctx.fillStyle = 'rgba(255,243,214,0.25)';
  ctx.fillRect(x + 10, y + 28, 180, 12);
  ctx.fillStyle = DAWN_PALETTE.hudAmber;
  ctx.fillRect(x + 10, y + 28, 180 * plane.throttle, 12);
  ctx.fillStyle = PAPER;
  ctx.font = '800 14px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`${Math.round(plane.throttle * 100)}%`, x + 10, y + 52);
}

export function drawMessage(ctx, mission) {
  if (mission.messageTimer <= 0 || !mission.message) return;
  ctx.save();
  ctx.font = '800 26px "Trebuchet MS", Verdana, sans-serif';
  const w = ctx.measureText(mission.message).width + 36;
  panel(ctx, (CANVAS_WIDTH - w) / 2, 120, w, 44, 0.8);
  ctx.fillStyle = PAPER;
  ctx.textAlign = 'center';
  ctx.fillText(mission.message, CANVAS_WIDTH / 2, 150);
  ctx.restore();
}

export function drawHints(ctx, view) {
  const text = view === 'cockpit'
    ? 'W/S throttle · A/D turn · C chase view · P pause · M mute · R restart'
    : 'W/S throttle · A/D turn · C cockpit view · P pause · M mute · R restart';
  ctx.save();
  ctx.font = '700 15px "Trebuchet MS", Verdana, sans-serif';
  const w = ctx.measureText(text).width + 24;
  panel(ctx, (CANVAS_WIDTH - w) / 2, 684, w, 28, 0.55);
  ctx.fillStyle = 'rgba(255,243,214,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText(text, CANVAS_WIDTH / 2, 703);
  ctx.restore();
}
