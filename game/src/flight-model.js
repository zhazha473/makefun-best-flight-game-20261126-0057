// Flight model for the SALTWIND COURIER seaplane.
// Throttle sets target speed, turning bleeds a little speed, lift holds the
// plane up only above stall speed, fuel burns with throttle, and a touchdown
// is judged soft, hard or fatal by vertical speed and what is underneath.

import { WORLD, PLANE_START } from './config.js';
import { throttleKeysDown, throttleKeysUp, turnKeysLeft, turnKeysRight } from './input.js';

export function createPlane() {
  return {
    x: PLANE_START.x,
    z: PLANE_START.z,
    heading: PLANE_START.heading,
    altitude: PLANE_START.altitude,
    speed: PLANE_START.speed,
    throttle: PLANE_START.throttle,
    pitch: 0,
    bank: 0,
    verticalSpeed: 0,
    fuel: WORLD.fuelCapacity,
    damage: 0,
    onWater: false,
    landed: false,
    crashed: false,
    stalled: false,
    spray: 0,
  };
}

export function resetPlane(plane) {
  const fresh = createPlane();
  Object.assign(plane, fresh);
}

export function stepPlane(plane, input, dt, terrain) {
  if (plane.crashed || plane.landed) return { touchdown: null, terrainHit: false };

  if (throttleKeysDown(input)) plane.throttle = Math.min(1, plane.throttle + dt * 0.55);
  if (throttleKeysUp(input)) plane.throttle = Math.max(0, plane.throttle - dt * 0.7);

  const targetSpeed = plane.throttle * WORLD.maxSpeed;
  const accel = targetSpeed > plane.speed ? 16 : 22;
  plane.speed += Math.max(-accel * dt, Math.min(accel * dt, targetSpeed - plane.speed));

  let turn = 0;
  if (turnKeysLeft(input)) turn -= 1;
  if (turnKeysRight(input)) turn += 1;
  const speedFactor = Math.min(1, plane.speed / WORLD.cruiseSpeed);
  const turnRate = WORLD.turnRate * (0.35 + 0.65 * speedFactor);
  plane.heading += turn * turnRate * dt;
  plane.speed = Math.max(0, plane.speed - Math.abs(turn) * 4.5 * dt);
  plane.bank += (turn * 0.55 - plane.bank) * Math.min(1, dt * 6);

  plane.stalled = plane.speed < WORLD.stallSpeed;
  let climb = 0;
  if (!plane.stalled) {
    if (plane.throttle > 0.62) climb = WORLD.climbRate * (plane.throttle - 0.62) * 2.4;
    else if (plane.throttle < 0.38) climb = -WORLD.descendRate * (0.38 - plane.throttle) * 2.2;
    climb += (plane.speed - WORLD.cruiseSpeed) * 0.06;
  } else {
    climb = -WORLD.gravitySink;
  }
  const previousAltitude = plane.altitude;
  plane.altitude = Math.max(0, plane.altitude + climb * dt);
  plane.verticalSpeed = (plane.altitude - previousAltitude) / dt;
  plane.pitch += (Math.max(-0.28, Math.min(0.28, climb * 0.02)) - plane.pitch) * Math.min(1, dt * 4);

  const forwardX = Math.sin(plane.heading);
  const forwardZ = Math.cos(plane.heading);
  plane.x += forwardX * plane.speed * dt;
  plane.z += forwardZ * plane.speed * dt;

  const burn = WORLD.fuelBurnIdle + plane.throttle * WORLD.fuelBurnFull;
  plane.fuel = Math.max(0, plane.fuel - burn * dt);

  const ground = terrain.surfaceAt(plane.x, plane.z);

  if (plane.altitude <= 0.01 && plane.speed < 46) {
    if (ground.kind === 'water') {
      plane.onWater = true;
      plane.landed = true;
      plane.spray = Math.min(1, plane.speed / 30);
      const hard = plane.verticalSpeed < -7;
      return { touchdown: hard ? 'hard' : 'soft', terrainHit: false };
    }
    plane.crashed = true;
    plane.damage = 100;
    return { touchdown: null, terrainHit: true };
  }

  if (ground.kind === 'land' && plane.altitude < ground.height) {
    plane.crashed = true;
    plane.damage = 100;
    return { touchdown: null, terrainHit: true };
  }

  if (plane.fuel <= 0 && plane.speed <= 1 && plane.altitude <= 0.01) {
    plane.crashed = true;
    return { touchdown: null, terrainHit: false };
  }

  plane.onWater = false;
  plane.spray = Math.max(0, plane.spray - dt * 2);
  return { touchdown: null, terrainHit: false };
}

export function applyTouchdownDamage(plane, kind) {
  if (kind === 'hard') {
    plane.damage = Math.min(100, plane.damage + WORLD.damageHardLanding);
    if (plane.damage >= 100) {
      plane.crashed = true;
      plane.landed = false;
    }
  }
}

export function planeSpeedKnots(plane) {
  return Math.round(plane.speed * 2.1);
}

export function planeAltitudeFeet(plane) {
  return Math.round(plane.altitude * 11);
}

export function planeHeadingDegrees(plane) {
  const degrees = ((plane.heading * 180) / Math.PI) % 360;
  return Math.round((degrees + 360) % 360);
}
