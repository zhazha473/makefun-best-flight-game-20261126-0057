// Renderer for SALTWIND COURIER.
// A pseudo-3D chase view: the dawn sky, a perspective sea, seeded volcanic
// islands projected through one camera, buoy-marked water runways, golden
// ring gates, a vector-drawn vintage seaplane, water spray and storm rain,
// plus a cockpit view with a full dashboard. All art is drawn in code.

import { CANVAS_WIDTH, CANVAS_HEIGHT, DAWN_PALETTE, WORLD } from './config.js';
import { planeAltitudeFeet } from './flight-model.js';

const P = DAWN_PALETTE;

function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function makeCamera(plane, view, menuHeading) {
  const heading = view === 'menu' ? menuHeading : plane.heading;
  const distance = view === 'cockpit' ? 8 : WORLD.cameraDistance;
  const height = view === 'cockpit' ? 5 : WORLD.cameraHeight;
  const baseX = view === 'menu' ? 0 : plane.x;
  const baseZ = view === 'menu' ? 320 : plane.z;
  const baseAlt = view === 'menu' ? 70 : plane.altitude;
  return {
    x: baseX - Math.sin(heading) * distance,
    z: baseZ - Math.cos(heading) * distance,
    y: baseAlt + height,
    heading,
  };
}

export function project(camera, wx, wy, wz) {
  const dx = wx - camera.x;
  const dz = wz - camera.z;
  const forward = dx * Math.sin(camera.heading) + dz * Math.cos(camera.heading);
  if (forward < 10) return null;
  const lateral = dx * Math.cos(camera.heading) - dz * Math.sin(camera.heading);
  const focal = WORLD.focalLength;
  return {
    x: CANVAS_WIDTH / 2 + (lateral * focal) / forward,
    y: WORLD.horizonY - ((wy - camera.y) * focal) / forward,
    depth: forward,
    scale: focal / forward,
  };
}

function drawSky(ctx, camera, time, stormy) {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.horizonY + 40);
  gradient.addColorStop(0, P.skyTop);
  gradient.addColorStop(0.45, P.skyMid);
  gradient.addColorStop(0.8, P.skyLow);
  gradient.addColorStop(1, P.horizonGlow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, WORLD.horizonY + 40);

  const sunAzimuth = 0.42;
  const rel = wrapAngle(sunAzimuth - camera.heading);
  if (Math.abs(rel) < 1.1) {
    const sx = CANVAS_WIDTH / 2 + Math.tan(rel) * WORLD.focalLength * 0.85;
    const sy = WORLD.horizonY - 46;
    const halo = ctx.createRadialGradient(sx, sy, 4, sx, sy, 150);
    halo.addColorStop(0, P.sunCore);
    halo.addColorStop(0.25, P.sunHalo);
    halo.addColorStop(1, 'rgba(255,154,82,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sx, sy, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.sunCore;
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  return gradient;
}

function drawClouds(ctx, camera, archipelago, time, stormy) {
  for (const cloud of archipelago.clouds) {
    const rel = wrapAngle(cloud.angle - camera.heading);
    if (Math.abs(rel) > 1.2) continue;
    const sx = CANVAS_WIDTH / 2 + Math.tan(rel) * WORLD.focalLength * 0.9;
    const sy = WORLD.horizonY - cloud.height * 240 - Math.sin(time * 0.05 + cloud.speed) * 3;
    const drift = Math.sin(time * 0.02 + cloud.speed * 3) * 12;
    ctx.fillStyle = stormy ? 'rgba(52,38,66,0.85)' : cloud.tint;
    ctx.globalAlpha = stormy ? 0.9 : 0.55;
    ctx.beginPath();
    ctx.ellipse(sx + drift, sy, cloud.width / 2, cloud.width / 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + drift + cloud.width * 0.22, sy - 10, cloud.width / 3, cloud.width / 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawSea(ctx, camera, archipelago, time) {
  const gradient = ctx.createLinearGradient(0, WORLD.horizonY, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, P.seaShallow);
  gradient.addColorStop(0.25, P.seaMid);
  gradient.addColorStop(1, P.seaDeep);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, WORLD.horizonY, CANVAS_WIDTH, CANVAS_HEIGHT - WORLD.horizonY);

  ctx.strokeStyle = 'rgba(255,220,170,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.horizonY);
  ctx.lineTo(CANVAS_WIDTH, WORLD.horizonY);
  ctx.stroke();

  for (const streak of archipelago.waveStreaks) {
    const projected = project(camera, streak.x, 0, streak.z);
    if (!projected || projected.y < WORLD.horizonY + 4) continue;
    const wobble = Math.sin(time * 1.4 + streak.phase) * 3;
    const alpha = Math.max(0.05, Math.min(0.4, 320 / projected.depth));
    ctx.strokeStyle = `rgba(255,240,210,${alpha.toFixed(2)})`;
    ctx.lineWidth = Math.max(1, 2.4 * projected.scale / 10);
    const half = (streak.length * projected.scale) / 2;
    ctx.beginPath();
    ctx.moveTo(projected.x - half, projected.y + wobble);
    ctx.lineTo(projected.x + half, projected.y + wobble);
    ctx.stroke();
  }
}

function drawIsland(ctx, camera, island, time) {
  const base = project(camera, island.x, 0, island.z);
  const peak = project(camera, island.x, island.peak, island.z);
  if (!base || !peak) return;
  const depth = base.depth;
  const rx = (island.radius * WORLD.focalLength) / depth;
  if (rx < 2) return;

  ctx.fillStyle = P.sand;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(base.x, base.y, rx * 1.06, Math.max(3, rx * 0.16), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (island.key === 'coral') {
    ctx.fillStyle = P.lagoon;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, rx * 0.8, Math.max(3, rx * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const slope = ctx.createLinearGradient(base.x - rx, 0, base.x + rx, 0);
  slope.addColorStop(0, P.volcanoRock);
  slope.addColorStop(0.5, P.volcanoSlope);
  slope.addColorStop(1, P.volcanoRock);
  ctx.fillStyle = slope;
  ctx.beginPath();
  ctx.moveTo(base.x - rx, base.y);
  ctx.quadraticCurveTo(base.x - rx * 0.45, peak.y + (base.y - peak.y) * 0.45, peak.x, peak.y);
  ctx.quadraticCurveTo(base.x + rx * 0.45, peak.y + (base.y - peak.y) * 0.45, base.x + rx, base.y);
  ctx.closePath();
  ctx.fill();

  const jungleY = peak.y + (base.y - peak.y) * 0.52;
  ctx.fillStyle = P.jungle;
  ctx.beginPath();
  ctx.moveTo(base.x - rx * 0.82, base.y);
  ctx.quadraticCurveTo(base.x - rx * 0.4, jungleY, peak.x, peak.y + (base.y - peak.y) * 0.28);
  ctx.quadraticCurveTo(base.x + rx * 0.4, jungleY, base.x + rx * 0.82, base.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.jungleLight;
  ctx.beginPath();
  ctx.moveTo(base.x - rx * 0.55, base.y);
  ctx.quadraticCurveTo(base.x - rx * 0.25, jungleY + 8, peak.x, peak.y + (base.y - peak.y) * 0.34);
  ctx.quadraticCurveTo(base.x + rx * 0.25, jungleY + 8, base.x + rx * 0.55, base.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = P.volcanoAsh;
  ctx.beginPath();
  ctx.ellipse(peak.x, peak.y + 4, Math.max(3, rx * 0.16), Math.max(2, rx * 0.05), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,40,50,0.9)';
  ctx.beginPath();
  ctx.ellipse(peak.x, peak.y + 2, Math.max(2, rx * 0.09), Math.max(1.5, rx * 0.03), 0, 0, Math.PI * 2);
  ctx.fill();

  const smokeX = peak.x + Math.sin(time * 0.7) * 4;
  ctx.fillStyle = 'rgba(240,220,200,0.35)';
  ctx.beginPath();
  ctx.ellipse(smokeX, peak.y - 14 - Math.sin(time * 0.9) * 3, Math.max(4, rx * 0.12), Math.max(3, rx * 0.05), 0, 0, Math.PI * 2);
  ctx.fill();

  for (const hut of island.huts) {
    const hp = project(camera, hut.x, 2, hut.z);
    if (!hp) continue;
    const s = Math.max(1.5, hut.size * hp.scale / 14);
    ctx.fillStyle = P.villageWall;
    ctx.fillRect(hp.x - s / 2, hp.y - s * 0.7, s, s * 0.7);
    ctx.fillStyle = hut.roof;
    ctx.beginPath();
    ctx.moveTo(hp.x - s * 0.65, hp.y - s * 0.7);
    ctx.lineTo(hp.x, hp.y - s * 1.25);
    ctx.lineTo(hp.x + s * 0.65, hp.y - s * 0.7);
    ctx.closePath();
    ctx.fill();
  }

  for (const palm of island.palms) {
    const pp = project(camera, palm.x, 0, palm.z);
    if (!pp) continue;
    const h = Math.max(2, 16 * pp.scale / 14);
    ctx.strokeStyle = P.jungle;
    ctx.lineWidth = Math.max(1, h / 6);
    ctx.beginPath();
    ctx.moveTo(pp.x, pp.y);
    ctx.lineTo(pp.x + 2, pp.y - h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pp.x + 2, pp.y - h);
    ctx.quadraticCurveTo(pp.x + h * 0.5, pp.y - h - 2, pp.x + h * 0.7, pp.y - h * 0.6);
    ctx.moveTo(pp.x + 2, pp.y - h);
    ctx.quadraticCurveTo(pp.x - h * 0.4, pp.y - h - 2, pp.x - h * 0.6, pp.y - h * 0.5);
    ctx.stroke();
  }

  if (island.lighthouse) {
    const lx = island.x - island.radius * 0.52;
    const lz = island.z - island.radius * 0.28;
    const foot = project(camera, lx, 0, lz);
    const top = project(camera, lx, 58, lz);
    if (foot && top) {
      const towerW = Math.max(3, 14 * top.scale / 12);
      const beamAngle = time * 0.6;
      ctx.save();
      ctx.globalAlpha = 0.16 + 0.08 * Math.sin(beamAngle);
      ctx.fillStyle = '#fff8d0';
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(top.x + Math.cos(beamAngle) * 260, top.y + Math.sin(beamAngle) * 40 + 30);
      ctx.lineTo(top.x + Math.cos(beamAngle) * 260, top.y + Math.sin(beamAngle) * 40 - 30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = P.lighthouseWhite;
      ctx.beginPath();
      ctx.moveTo(foot.x - towerW / 2, foot.y);
      ctx.lineTo(top.x - towerW * 0.32, top.y);
      ctx.lineTo(top.x + towerW * 0.32, top.y);
      ctx.lineTo(foot.x + towerW / 2, foot.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.lighthouseRed;
      const bandH = (foot.y - top.y) / 3;
      ctx.fillRect(top.x - towerW * 0.36, top.y + bandH * 0.9, towerW * 0.72, bandH * 0.5);
      ctx.fillRect(top.x - towerW * 0.44, top.y + bandH * 2.1, towerW * 0.88, bandH * 0.5);
      ctx.fillStyle = '#2c2438';
      ctx.beginPath();
      ctx.arc(top.x, top.y - 3, Math.max(2, towerW * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(top.x, top.y - 3, Math.max(1.5, towerW * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (island.clinic && base.x > 60 && base.x < CANVAS_WIDTH - 60) {
    const font = `800 ${Math.max(11, Math.min(20, rx * 0.14))}px "Trebuchet MS", Verdana, sans-serif`;
    ctx.font = font;
    const labelText = island.name.toUpperCase();
    const labelWidth = ctx.measureText(labelText).width;
    let labelX = base.x + rx * 0.45;
    let align = 'left';
    if (labelX + labelWidth > CANVAS_WIDTH - 16) {
      labelX = base.x - rx * 0.45;
      align = 'right';
    }
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = align;
    ctx.fillText(labelText, labelX, base.y + 10);
    ctx.textAlign = 'left';
  }
}

function drawRunway(ctx, camera, runway) {
  const dirX = Math.sin(runway.heading);
  const dirZ = Math.cos(runway.heading);
  const perpX = Math.cos(runway.heading);
  const perpZ = -Math.sin(runway.heading);
  const half = runway.length / 2;
  const corners = [];
  for (const [along, across] of [[-half, -runway.width / 2], [half, -runway.width / 2], [half, runway.width / 2], [-half, runway.width / 2]]) {
    corners.push(project(camera, runway.x + dirX * along + perpX * across, 0, runway.z + dirZ * along + perpZ * across));
  }
  if (corners.every(Boolean)) {
    ctx.fillStyle = 'rgba(255,250,230,0.20)';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
  }
  const buoyCount = 9;
  for (let i = 0; i < buoyCount; i += 1) {
    const along = -half + (runway.length * i) / (buoyCount - 1);
    for (const side of [-1, 1]) {
      const bx = runway.x + dirX * along + perpX * side * runway.width * 0.62;
      const bz = runway.z + dirZ * along + perpZ * side * runway.width * 0.62;
      const bp = project(camera, bx, 1, bz);
      if (!bp) continue;
      const r = Math.max(2, 260 / bp.depth);
      ctx.fillStyle = P.buoyOrange;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(bp.x - r * 0.25, bp.y - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRing(ctx, camera, ring, index, time) {
  const center = project(camera, ring.x, ring.y, ring.z);
  if (!center) return;
  const rx = (ring.radius * WORLD.focalLength) / center.depth;
  if (rx < 2) return;
  const ry = rx * 0.92;
  const passed = ring.passed;
  ctx.save();
  ctx.shadowColor = passed ? P.ringGreen : P.ringGold;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = passed ? P.ringGreen : P.ringGold;
  ctx.lineWidth = Math.max(2, rx * 0.12);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = passed ? 'rgba(125,255,138,0.5)' : 'rgba(255,210,63,0.5)';
  ctx.lineWidth = Math.max(1, rx * 0.05);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (center.depth < 700) {
    ctx.fillStyle = passed ? P.ringGreen : P.ringGold;
    ctx.font = '800 15px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(passed ? '✓' : `R${index + 1}`, center.x, center.y - ry - 10);
    ctx.textAlign = 'left';
  }
}

export function drawSeaplane(ctx, x, y, scale, bank, pitch, propPhase, damage) {
  // Chase view: the camera sits behind the seaplane, so this is the tail
  // end — wide horizontal stabilizer, red vertical fin, the fuselage seen
  // end-on, main wings reaching out ahead of it, and two floats below.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bank * 0.7);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(10,16,32,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 74, 66, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Main wings, seen from behind and slightly ahead of the tail.
  ctx.fillStyle = '#3a6ea8';
  ctx.beginPath();
  ctx.moveTo(-104, 8);
  ctx.lineTo(104, 8);
  ctx.lineTo(88, 26);
  ctx.lineTo(-88, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c5484';
  ctx.beginPath();
  ctx.moveTo(-104, 8);
  ctx.lineTo(104, 8);
  ctx.lineTo(96, 14);
  ctx.lineTo(-96, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-104, 10, 10, 4);
  ctx.fillRect(94, 10, 10, 4);

  // Float struts and floats.
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-52, 30);
  ctx.lineTo(-70, 52);
  ctx.moveTo(52, 30);
  ctx.lineTo(70, 52);
  ctx.stroke();
  ctx.fillStyle = '#d96b3f';
  ctx.beginPath();
  ctx.ellipse(-72, 56, 20, 7, 0.12, 0, Math.PI * 2);
  ctx.ellipse(72, 56, 20, 7, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a4a2a';
  ctx.fillRect(-92, 50, 7, 9);
  ctx.fillRect(85, 50, 7, 9);

  // Fuselage end-on: a rounded, wider-than-tall body.
  const body = ctx.createLinearGradient(-30, 0, 30, 0);
  body.addColorStop(0, '#c9a06a');
  body.addColorStop(0.25, '#f7ead0');
  body.addColorStop(0.75, '#eed9ae');
  body.addColorStop(1, '#c9a06a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 4, 30, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a6a42';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Red cheatline ring around the fuselage.
  ctx.strokeStyle = '#c23b2e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 4, 29, 33, 0, 0.25, Math.PI - 0.25);
  ctx.stroke();

  // Tail cone and navigation light.
  ctx.fillStyle = '#eed9ae';
  ctx.beginPath();
  ctx.ellipse(0, 30, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff5a4e';
  ctx.beginPath();
  ctx.arc(0, 36, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal stabilizer across the tail.
  ctx.fillStyle = '#3a6ea8';
  ctx.beginPath();
  ctx.moveTo(-58, -18);
  ctx.lineTo(58, -18);
  ctx.lineTo(48, -8);
  ctx.lineTo(-48, -8);
  ctx.closePath();
  ctx.fill();

  // Vertical fin with red tip.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.lineTo(0, -58);
  ctx.lineTo(12, -16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.moveTo(-6, -16);
  ctx.lineTo(0, -40);
  ctx.lineTo(7, -16);
  ctx.closePath();
  ctx.fill();

  if (damage > 40) {
    ctx.fillStyle = 'rgba(40,30,26,0.55)';
    ctx.beginPath();
    ctx.ellipse(-14, 20, 11, 8, 0.4, 0, Math.PI * 2);
    ctx.ellipse(14, 10, 8, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCockpit(ctx, plane, mission) {
  ctx.fillStyle = 'rgba(20,16,34,0.92)';
  ctx.beginPath();
  ctx.moveTo(0, 720);
  ctx.lineTo(0, 560);
  ctx.quadraticCurveTo(640, 520, 1280, 560);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1c2436';
  ctx.fillRect(0, 0, 26, 720);
  ctx.fillRect(1254, 0, 26, 720);
  ctx.fillStyle = '#2c2438';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(1280, 0);
  ctx.lineTo(1254, 46);
  ctx.lineTo(26, 46);
  ctx.closePath();
  ctx.fill();

  const gauges = [
    { x: 300, label: 'ALT', value: String(planeAltitudeFeet(plane)), unit: 'FT' },
    { x: 640, label: 'SPD', value: String(Math.round(plane.speed * 2.1)), unit: 'KT' },
    { x: 980, label: 'HDG', value: String(Math.round(((plane.heading * 180) / Math.PI + 360) % 360)).padStart(3, '0'), unit: 'DEG' },
  ];
  for (const gauge of gauges) {
    ctx.save();
    ctx.translate(gauge.x, 618);
    ctx.fillStyle = '#0d1526';
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P.hudPaper;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,243,214,0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 47, Math.sin(a) * 47);
      ctx.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
      ctx.stroke();
    }
    ctx.fillStyle = P.hudAmber;
    ctx.font = '700 13px "Trebuchet MS", Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gauge.label, 0, -30);
    ctx.fillStyle = P.hudPaper;
    ctx.font = '800 26px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(gauge.value, 0, 8);
    ctx.font = '700 12px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillStyle = 'rgba(255,243,214,0.7)';
    ctx.fillText(gauge.unit, 0, 30);
    ctx.restore();
  }

  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.moveTo(606, 720);
  ctx.lineTo(640, 688);
  ctx.lineTo(674, 720);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.moveTo(624, 720);
  ctx.lineTo(640, 688);
  ctx.lineTo(656, 720);
  ctx.closePath();
  ctx.fill();
}

function drawSprayParticles(ctx, camera, particles) {
  for (const particle of particles) {
    const projected = project(camera, particle.x, particle.y, particle.z);
    if (!projected) continue;
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.8).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, Math.max(1, particle.size * projected.scale / 8), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRain(ctx, game, count) {
  ctx.save();
  ctx.strokeStyle = 'rgba(200,210,235,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < count; i += 1) {
    const x = ((i * 137.5 + game.time * 260) % 1400) - 60;
    const y = ((i * 89.3 + game.time * 520) % 760) - 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 14, y + 34);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObjectiveMarker(ctx, camera, plane, mission, archipelago) {
  let target = null;
  let labelText = '';
  if (mission.kind === 'delivery') {
    const next = mission.objectives.find((item) => !item.done);
    if (next) {
      const runway = archipelago.runways.find((item) => item.clinic === next.clinic);
      if (runway) {
        target = { x: runway.x, y: 4, z: runway.z };
        labelText = `${next.label} — ${Math.round(Math.hypot(plane.x - runway.x, plane.z - runway.z))}m`;
      }
    }
  } else if (mission.kind === 'rings') {
    const ring = archipelago.rings.find((item) => !item.passed);
    if (ring) {
      target = { x: ring.x, y: ring.y, z: ring.z };
      labelText = `Next ring — ${Math.round(Math.hypot(plane.x - ring.x, plane.z - ring.z))}m`;
    }
  } else if (mission.kind === 'storm') {
    if (!mission.stormCrossed) {
      target = { x: plane.x + Math.sin(plane.heading) * 500, y: 60, z: plane.z + Math.cos(plane.heading) * 500 };
      labelText = 'Storm front ahead';
    } else {
      const runway = archipelago.runways.find((item) => item.clinic === 'storm');
      target = { x: runway.x, y: 4, z: runway.z };
      labelText = `Storm Clinic — ${Math.round(Math.hypot(plane.x - runway.x, plane.z - runway.z))}m`;
    }
  }
  if (!target) return;
  const projected = project(camera, target.x, target.y, target.z);
  if (!projected) return;
  const cx = Math.max(60, Math.min(CANVAS_WIDTH - 60, projected.x));
  const cy = Math.max(90, Math.min(560, projected.y));
  const pulse = 1 + 0.15 * Math.sin(performance.now() / 240);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = P.ringGold;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK_COLOR;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = P.hudPaper;
  ctx.font = '700 14px "Trebuchet MS", Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(13,21,38,0.9)';
  ctx.lineWidth = 4;
  ctx.strokeText(labelText, cx, cy + 30);
  ctx.fillText(labelText, cx, cy + 30);
  ctx.textAlign = 'left';
}

const INK_COLOR = '#0d1526';

export function renderGame(ctx, game) {
  const { plane, mission, archipelago } = game;
  const stormy = game.stormFx > 0.3 || (mission && mission.kind === 'storm' && plane.z > 1800);
  const camera = makeCamera(plane, game.view, game.menuHeading || 0);

  drawSky(ctx, camera, game.time, stormy);
  drawClouds(ctx, camera, archipelago, game.time, stormy);
  drawSea(ctx, camera, archipelago, game.time);

  const sorted = [...archipelago.islands].sort((a, b) => {
    const da = Math.hypot(a.x - camera.x, a.z - camera.z);
    const db = Math.hypot(b.x - camera.x, b.z - camera.z);
    return db - da;
  });
  for (const island of sorted) drawIsland(ctx, camera, island, game.time);

  for (const runway of archipelago.runways) drawRunway(ctx, camera, runway);

  if (mission && mission.kind === 'rings') {
    archipelago.rings.forEach((ring, i) => drawRing(ctx, camera, ring, i, game.time));
  }

  drawSprayParticles(ctx, camera, game.sprayParticles);

  if (game.view === 'chase' || game.view === 'menu') {
    const planeY = game.view === 'menu' ? 470 : 462 + plane.pitch * 120;
    drawSeaplane(ctx, CANVAS_WIDTH / 2, planeY, 1.05, plane.bank, plane.pitch, game.time * 28, plane.damage);
  }

  if (game.view === 'cockpit') drawCockpit(ctx, plane, mission);

  if (stormy) {
    drawRain(ctx, game, 90);
    const fog = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    fog.addColorStop(0, 'rgba(70,58,96,0.28)');
    fog.addColorStop(1, 'rgba(70,58,96,0.12)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  if (game.view !== 'menu' && mission) {
    drawObjectiveMarker(ctx, camera, plane, mission, archipelago);
  }
}
