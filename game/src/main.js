// SALTWIND COURIER — main loop and screens.
// Title, mission select, flying, pause, victory and game-over share one
// game object: a plane, a mission, a seeded archipelago and a view. The
// loop runs on requestAnimationFrame, spray particles age here, and a
// read-only debug handle is exposed for play-testing.

import { CANVAS_WIDTH, CANVAS_HEIGHT, DAWN_PALETTE } from './config.js';
import { InputTracker } from './input.js';
import { createPlane, resetPlane, stepPlane, applyTouchdownDamage } from './flight-model.js';
import { buildArchipelago, inStormBand } from './terrain.js';
import { createMission, updateMission, finalScoreBreakdown } from './missions.js';
import { drawInstruments, drawCompassStrip, drawFuelDamage, drawMissionPanel, drawThrottleBar, drawMessage, drawHints } from './hud.js';
import { renderGame } from './render.js';
import { SaltwindAudio } from './audio.js';
import { applyShot, parseShotQuery } from './shots.js';

const SEED = 20261126;

export function createGame() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const game = {
    canvas,
    ctx,
    input: new InputTracker(canvas),
    audio: new SaltwindAudio(),
    archipelago: buildArchipelago(SEED),
    plane: createPlane(),
    mission: createMission('delivery', buildArchipelago(SEED)),
    screen: 'title',
    view: 'chase',
    time: 0,
    menuHeading: 0,
    stormFx: 0,
    sprayParticles: [],
    muted: false,
    lastTimestamp: 0,
    touchCooldown: 0,
  };
  game.mission = createMission('delivery', game.archipelago);
  return game;
}

function startMission(game, kind) {
  game.archipelago = buildArchipelago(SEED);
  game.plane = createPlane();
  game.mission = createMission(kind, game.archipelago);
  game.screen = 'playing';
  game.view = 'chase';
  game.sprayParticles = [];
  game.audio.ensure();
}

function spawnSpray(game, plane, dt) {
  if (!plane.onWater && plane.spray <= 0) return;
  const count = plane.landed ? 4 : 2;
  for (let i = 0; i < count; i += 1) {
    game.sprayParticles.push({
      x: plane.x - Math.sin(plane.heading) * (10 + Math.random() * 14) + (Math.random() - 0.5) * 12,
      y: 1 + Math.random() * 7,
      z: plane.z - Math.cos(plane.heading) * (10 + Math.random() * 14) + (Math.random() - 0.5) * 12,
      life: 0.8,
      maxLife: 0.8,
      size: 3 + Math.random() * 4,
    });
  }
  if (game.sprayParticles.length > 120) game.sprayParticles.splice(0, game.sprayParticles.length - 120);
}

function ageSpray(game, dt) {
  for (const particle of game.sprayParticles) particle.life -= dt;
  game.sprayParticles = game.sprayParticles.filter((particle) => particle.life > 0);
}

function updatePlaying(game, dt) {
  const plane = game.plane;
  const mission = game.mission;
  const previousScore = mission.score;
  const event = stepPlane(plane, game.input, dt, game.archipelago);
  if (event.touchdown) {
    applyTouchdownDamage(plane, event.touchdown);
    game.audio.splashSound();
  }
  updateMission(mission, plane, game.archipelago, dt, event);
  if (mission.score > previousScore) {
    if (mission.kind === 'rings') game.audio.ringChime();
    else game.audio.deliveryChime();
  }
  if (event.terrainHit) game.audio.crashSound();
  if (inStormBand(game.archipelago, plane.z) && mission.kind === 'storm') {
    game.stormFx = Math.min(1, game.stormFx + dt * 1.5);
    if (Math.random() < dt * 2) {
      plane.heading += (Math.random() - 0.5) * 0.12;
    }
  } else {
    game.stormFx = Math.max(0, game.stormFx - dt);
  }
  spawnSpray(game, plane, dt);
  ageSpray(game, dt);
  game.audio.setFlight(plane.throttle, plane.speed, !plane.landed && plane.altitude > 1);
  if (mission.status === 'won') game.screen = 'won';
  else if (mission.status === 'crashed' || mission.status === 'lost') game.screen = 'over';
  if (plane.landed && mission.kind === 'delivery' && mission.status === 'flying') {
    game.touchCooldown += dt;
    if (game.touchCooldown > 0.4 && game.input.isDown('KeyW')) {
      plane.landed = false;
      plane.altitude = 2;
      plane.speed = Math.max(plane.speed, 24);
      game.touchCooldown = 0;
    }
  }
}

function handleGlobalKeys(game) {
  const input = game.input;
  if (input.wasPressed('KeyM')) {
    game.muted = game.audio.toggleMute();
  }
  if (input.wasPressed('KeyC') && (game.screen === 'playing' || game.screen === 'paused')) {
    game.view = game.view === 'chase' ? 'cockpit' : 'chase';
  }
  if (input.wasPressed('KeyR') && game.screen !== 'title' && game.screen !== 'mission') {
    startMission(game, game.mission.kind);
  }
  if (input.wasPressed('KeyP') && game.screen === 'playing') game.screen = 'paused';
  else if (input.wasPressed('KeyP') && game.screen === 'paused') game.screen = 'playing';
}

function drawTitleScreen(game) {
  const ctx = game.ctx;
  ctx.fillStyle = 'rgba(16,10,32,0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = DAWN_PALETTE.hudPaper;
  ctx.textAlign = 'center';
  ctx.font = '800 64px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('SALTWIND COURIER', CANVAS_WIDTH / 2, 190);
  ctx.fillStyle = DAWN_PALETTE.hudAmber;
  ctx.font = '700 24px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('3 island clinics · 2 storm fronts · 1 seaplane · a fuel gauge that hates you', CANVAS_WIDTH / 2, 232);
  ctx.fillStyle = DAWN_PALETTE.hudPaper;
  ctx.font = '400 19px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('A vintage seaplane courier run across a volcanic archipelago at dawn.', CANVAS_WIDTH / 2, 272);
  ctx.fillText('Fly supplies to the island clinics. Watch the fuel. Mind the volcanoes.', CANVAS_WIDTH / 2, 300);

  const buttons = [
    { key: '1', label: '1 — WATER-RUNWAY DELIVERY', y: 360 },
    { key: '2', label: '2 — RING GATES OVER THE CLIFFS', y: 420 },
    { key: '3', label: '3 — STORM FRONT SORTIE', y: 480 },
  ];
  game.titleButtons = buttons.map((button) => {
    const w = 460;
    const x = (CANVAS_WIDTH - w) / 2;
    ctx.fillStyle = 'rgba(13,21,38,0.82)';
    ctx.fillRect(x, button.y, w, 44);
    ctx.strokeStyle = DAWN_PALETTE.hudAmber;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, button.y, w, 44);
    ctx.fillStyle = DAWN_PALETTE.hudPaper;
    ctx.font = '700 19px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText(button.label, CANVAS_WIDTH / 2, button.y + 29);
    return { ...button, x, w, h: 44 };
  });

  ctx.fillStyle = 'rgba(255,243,214,0.85)';
  ctx.font = '400 17px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('W/S throttle · A/D turn · C cockpit view · P pause · M mute · R restart', CANVAS_WIDTH / 2, 570);
  ctx.fillText('Click a mission or press 1, 2 or 3 to fly.', CANVAS_WIDTH / 2, 600);
  ctx.textAlign = 'left';
}

function drawEndScreen(game, won) {
  const ctx = game.ctx;
  const breakdown = finalScoreBreakdown(game.mission, game.plane);
  ctx.fillStyle = 'rgba(16,10,32,0.62)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? DAWN_PALETTE.hudGreen : DAWN_PALETTE.hudRed;
  ctx.font = '800 52px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(won ? 'SORTIE COMPLETE' : 'SORTIE OVER', CANVAS_WIDTH / 2, 220);
  ctx.fillStyle = DAWN_PALETTE.hudPaper;
  ctx.font = '700 24px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(game.mission.title, CANVAS_WIDTH / 2, 268);
  ctx.font = '400 20px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText(`Score ${breakdown.missionScore}   ·   Fuel left ${breakdown.fuelLeft}%   ·   Hull damage ${breakdown.damage}%`, CANVAS_WIDTH / 2, 308);
  ctx.fillText(`Flight time ${breakdown.timeSeconds}s`, CANVAS_WIDTH / 2, 340);
  if (!won) {
    ctx.fillStyle = DAWN_PALETTE.hudAmber;
    ctx.fillText('The clinics are still waiting. Refuel, patch the hull, fly again.', CANVAS_WIDTH / 2, 380);
  } else {
    ctx.fillStyle = DAWN_PALETTE.hudAmber;
    ctx.fillText('The island clinics have their supplies. The dawn run is done.', CANVAS_WIDTH / 2, 380);
  }
  ctx.fillStyle = DAWN_PALETTE.hudPaper;
  ctx.font = '700 20px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('Press R to fly again · 1 / 2 / 3 for another mission', CANVAS_WIDTH / 2, 450);
  ctx.textAlign = 'left';
}

function drawPaused(game) {
  const ctx = game.ctx;
  ctx.fillStyle = 'rgba(16,10,32,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = DAWN_PALETTE.hudPaper;
  ctx.textAlign = 'center';
  ctx.font = '800 48px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 330);
  ctx.font = '400 20px "Trebuchet MS", Verdana, sans-serif';
  ctx.fillText('P to resume · R to restart · M to mute', CANVAS_WIDTH / 2, 372);
  ctx.textAlign = 'left';
}

function frame(game, timestamp) {
  const dt = Math.min(0.05, (timestamp - game.lastTimestamp) / 1000 || 0.016);
  game.lastTimestamp = timestamp;
  game.time += dt;
  const input = game.input;

  handleGlobalKeys(game);

  if (game.screen === 'title') {
    game.menuHeading = game.time * 0.06;
    renderGame(game.ctx, game);
    drawTitleScreen(game);
    const click = input.consumeClick();
    if (click && game.titleButtons) {
      for (const button of game.titleButtons) {
        if (click.x >= button.x && click.x <= button.x + button.w && click.y >= button.y && click.y <= button.y + button.h) {
          startMission(game, button.key === '1' ? 'delivery' : button.key === '2' ? 'rings' : 'storm');
        }
      }
    }
    if (input.wasPressed('Digit1')) startMission(game, 'delivery');
    if (input.wasPressed('Digit2')) startMission(game, 'rings');
    if (input.wasPressed('Digit3')) startMission(game, 'storm');
  } else if (game.screen === 'playing') {
    updatePlaying(game, dt);
    renderGame(game.ctx, game);
    drawInstruments(game.ctx, game.plane);
    drawCompassStrip(game.ctx, Math.round(((game.plane.heading * 180) / Math.PI + 360) % 360));
    drawFuelDamage(game.ctx, game.plane);
    drawMissionPanel(game.ctx, game.mission);
    drawThrottleBar(game.ctx, game.plane);
    drawMessage(game.ctx, game.mission);
    drawHints(game.ctx, game.view);
  } else if (game.screen === 'paused') {
    renderGame(game.ctx, game);
    drawInstruments(game.ctx, game.plane);
    drawCompassStrip(game.ctx, Math.round(((game.plane.heading * 180) / Math.PI + 360) % 360));
    drawFuelDamage(game.ctx, game.plane);
    drawMissionPanel(game.ctx, game.mission);
    drawPaused(game);
  } else if (game.screen === 'won' || game.screen === 'over') {
    renderGame(game.ctx, game);
    drawEndScreen(game, game.screen === 'won');
    if (input.wasPressed('Digit1')) startMission(game, 'delivery');
    if (input.wasPressed('Digit2')) startMission(game, 'rings');
    if (input.wasPressed('Digit3')) startMission(game, 'storm');
  } else if (game.screen === 'shot') {
    renderGame(game.ctx, game);
    drawInstruments(game.ctx, game.plane);
    drawCompassStrip(game.ctx, Math.round(((game.plane.heading * 180) / Math.PI + 360) % 360));
    drawFuelDamage(game.ctx, game.plane);
    drawMissionPanel(game.ctx, game.mission);
    drawThrottleBar(game.ctx, game.plane);
    drawMessage(game.ctx, game.mission);
  }

  input.endFrame();
  requestAnimationFrame((next) => frame(game, next));
}

export function bootGame() {
  const game = createGame();
  const shot = parseShotQuery(window.location.search);
  if (shot) {
    applyShot(game, shot.shot, shot.seed);
    renderGame(game.ctx, game);
    drawInstruments(game.ctx, game.plane);
    drawCompassStrip(game.ctx, Math.round(((game.plane.heading * 180) / Math.PI + 360) % 360));
    drawFuelDamage(game.ctx, game.plane);
    drawMissionPanel(game.ctx, game.mission);
    drawThrottleBar(game.ctx, game.plane);
    drawMessage(game.ctx, game.mission);
    window.__saltwind = {
      game,
      screen: () => game.screen,
      plane: () => game.plane,
      mission: () => game.mission,
      state: () => ({
        screen: game.screen,
        view: game.view,
        x: game.plane.x,
        z: game.plane.z,
        altitude: game.plane.altitude,
        speed: game.plane.speed,
        fuel: game.plane.fuel,
        damage: game.plane.damage,
        missionStatus: game.mission.status,
        score: game.mission.score,
      }),
    };
    return game;
  }
  window.__saltwind = {
    game,
    screen: () => game.screen,
    plane: () => game.plane,
    mission: () => game.mission,
    startMission: (kind) => startMission(game, kind),
    state: () => ({
      screen: game.screen,
      view: game.view,
      x: game.plane.x,
      z: game.plane.z,
      altitude: game.plane.altitude,
      speed: game.plane.speed,
      fuel: game.plane.fuel,
      damage: game.plane.damage,
      missionStatus: game.mission.status,
      score: game.mission.score,
    }),
  };
  requestAnimationFrame((first) => frame(game, first));
  return game;
}

bootGame();
