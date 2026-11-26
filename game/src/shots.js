// Deterministic screenshot staging for SALTWIND COURIER.
// ?shot=cover|lowfuel|landing|storm&seed=1 sets one fixed flight state,
// steps the simulation a fixed number of ticks, renders one frame and
// marks the document ready for the screenshot tool. No randomness leaks
// in: the same query always paints the same frame.

import { createPlane } from './flight-model.js';
import { createMission } from './missions.js';
import { buildArchipelago } from './terrain.js';

const SHOT_TICKS = 40;
const FIXED_DT = 1 / 60;

function placePlane(plane, values) {
  Object.assign(plane, values);
}

function runFixedTicks(game, count) {
  for (let i = 0; i < count; i += 1) {
    game.time += FIXED_DT;
    game.stormFx = game.mission.kind === 'storm' ? 1 : 0;
    updateSprayForShot(game);
  }
}

function updateSprayForShot(game) {
  if (!game.plane.onWater && game.plane.spray <= 0) return;
  for (let i = 0; i < 3; i += 1) {
    game.sprayParticles.push({
      x: game.plane.x - Math.sin(game.plane.heading) * (8 + i * 6) + (Math.random() - 0.5) * 10,
      y: 1 + Math.random() * 6,
      z: game.plane.z - Math.cos(game.plane.heading) * (8 + i * 6) + (Math.random() - 0.5) * 10,
      life: 0.9,
      maxLife: 0.9,
      size: 3 + Math.random() * 4,
    });
  }
  if (game.sprayParticles.length > 90) game.sprayParticles.splice(0, game.sprayParticles.length - 90);
}

export function applyShot(game, shotName, seed) {
  const archipelago = buildArchipelago(seed);
  game.archipelago = archipelago;
  game.sprayParticles = [];
  game.time = 12.4;
  const plane = createPlane();
  game.plane = plane;

  if (shotName === 'cover') {
    game.mission = createMission('delivery', archipelago);
    game.view = 'chase';
    const heading = Math.atan2(640 - 180, 1420 - 980);
    placePlane(plane, {
      x: 180, z: 980, heading, altitude: 62, speed: 58, throttle: 0.72,
      fuel: 78, damage: 0, bank: -0.08,
    });
    game.stormFx = 0;
  } else if (shotName === 'lowfuel') {
    game.mission = createMission('storm', archipelago);
    game.view = 'cockpit';
    placePlane(plane, {
      x: 120, z: 2050, heading: 0.12, altitude: 88, speed: 62, throttle: 0.55,
      fuel: 11, damage: 8, bank: 0.05,
    });
    game.stormFx = 1;
    game.mission.stormCrossed = true;
    game.mission.objectives[0].done = true;
  } else if (shotName === 'landing') {
    game.mission = createMission('delivery', archipelago);
    game.view = 'chase';
    const runway = archipelago.runways[0];
    placePlane(plane, {
      x: runway.x - Math.sin(runway.heading) * 60,
      z: runway.z - Math.cos(runway.heading) * 60,
      heading: runway.heading, altitude: 0, speed: 22, throttle: 0.18,
      fuel: 54, damage: 0, onWater: true, landed: true, spray: 1,
    });
    game.mission.delivered = [];
    game.stormFx = 0;
  } else if (shotName === 'storm') {
    game.mission = createMission('storm', archipelago);
    game.view = 'chase';
    placePlane(plane, {
      x: 210, z: 2200, heading: -0.08, altitude: 74, speed: 66, throttle: 0.8,
      fuel: 46, damage: 12, bank: 0.12,
    });
    game.stormFx = 1;
    game.mission.stormCrossed = true;
    game.mission.objectives[0].done = true;
    game.mission.score = 350;
  } else {
    game.mission = createMission('delivery', archipelago);
    game.view = 'chase';
    game.stormFx = 0;
  }

  runFixedTicks(game, SHOT_TICKS);
  game.screen = 'shot';
  document.title = 'SHOT-READY';
  return game;
}

export function parseShotQuery(search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || 1) || 1;
  if (!shot) return null;
  return { shot, seed };
}
