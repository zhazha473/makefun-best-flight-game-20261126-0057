// Procedural archipelago for SALTWIND COURIER.
// One dawn-lit volcanic island chain: a home base, three clinic islands with
// marked water runways, a lighthouse, coastal villages, a lagoon, and the
// storm band that mission three must cross. Everything is seeded, so the
// same seed always builds the same islands.

import { makeRng } from './random.js';
import { DAWN_PALETTE } from './config.js';

export function buildArchipelago(seed) {
  const rng = makeRng(seed);
  const islands = [
    {
      key: 'home',
      name: 'Saltwind Base',
      x: 0,
      z: 0,
      radius: 290,
      peak: 235,
      crater: 0.42,
      jungle: 0.9,
      village: true,
      lighthouse: false,
      clinic: null,
    },
    {
      key: 'ember',
      name: 'Ember Isle',
      x: 640,
      z: 1420,
      radius: 310,
      peak: 330,
      crater: 0.5,
      jungle: 0.75,
      village: true,
      lighthouse: true,
      clinic: 'ember',
    },
    {
      key: 'coral',
      name: 'Coral Lagoon',
      x: -920,
      z: 1280,
      radius: 250,
      peak: 120,
      crater: 0.2,
      jungle: 0.85,
      village: true,
      lighthouse: false,
      clinic: 'coral',
    },
    {
      key: 'storm',
      name: 'Storm Isle',
      x: 240,
      z: 2680,
      radius: 350,
      peak: 390,
      crater: 0.55,
      jungle: 0.6,
      village: true,
      lighthouse: false,
      clinic: 'storm',
    },
  ];

  for (const island of islands) {
    island.huts = [];
    const hutCount = island.village ? 7 + rng.int(0, 4) : 0;
    for (let i = 0; i < hutCount; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = island.radius * rng.range(0.62, 0.86);
      island.huts.push({
        x: island.x + Math.cos(angle) * dist,
        z: island.z + Math.sin(angle) * dist,
        size: rng.range(9, 15),
        roof: rng.pick([DAWN_PALETTE.villageRoof, '#c94f38', '#e08a3c']),
      });
    }
    island.palms = [];
    for (let i = 0; i < 14; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = island.radius * rng.range(0.55, 0.92);
      island.palms.push({ x: island.x + Math.cos(angle) * dist, z: island.z + Math.sin(angle) * dist });
    }
  }

  const runways = [
    { clinic: 'ember', x: 300, z: 1720, heading: 2.29, length: 260, width: 60 },
    { clinic: 'coral', x: -640, z: 1480, heading: -2.18, length: 240, width: 56 },
    { clinic: 'storm', x: -160, z: 2960, heading: 2.18, length: 280, width: 64 },
  ];

  const rings = [];
  const ringPath = [
    [120, 620, 70], [330, 880, 95], [480, 1080, 80], [180, 1180, 110],
    [300, 1420, 100], [180, 1680, 115], [980, 1760, 100], [700, 1980, 130],
  ];
  for (const [x, z, y] of ringPath) {
    rings.push({ x, z, y, radius: 30, passed: false });
  }

  const stormBand = { zMin: 2050, zMax: 2380, strength: 1 };

  const waveStreaks = [];
  for (let i = 0; i < 90; i += 1) {
    waveStreaks.push({
      x: rng.range(-1600, 1600),
      z: rng.range(-400, 3200),
      length: rng.range(18, 46),
      phase: rng.range(0, Math.PI * 2),
    });
  }

  const clouds = [];
  for (let i = 0; i < 12; i += 1) {
    clouds.push({
      angle: rng.range(-1.1, 1.1),
      height: rng.range(0.06, 0.42),
      width: rng.range(120, 320),
      speed: rng.range(2, 9),
      tint: rng.pick(['#ffb36b', '#e88aa0', '#c98bb8', '#ffd9a0']),
    });
  }

  function surfaceAt(x, z) {
    let best = null;
    for (const island of islands) {
      const dx = x - island.x;
      const dz = z - island.z;
      const dist = Math.hypot(dx, dz);
      if (dist < island.radius) {
        const t = dist / island.radius;
        const height = island.peak * Math.max(0, 1 - t * t) * (1 - island.crater * Math.max(0, 1 - t * 4));
        if (!best || height > best.height) best = { kind: 'land', height, island };
      }
    }
    if (best) return best;
    return { kind: 'water', height: 0, island: null };
  }

  function nearestRunway(x, z) {
    let best = null;
    let bestDist = Infinity;
    for (const runway of runways) {
      const d = Math.hypot(x - runway.x, z - runway.z);
      if (d < bestDist) {
        bestDist = d;
        best = runway;
      }
    }
    return { runway: best, distance: bestDist };
  }

  return {
    seed,
    islands,
    runways,
    rings,
    stormBand,
    waveStreaks,
    clouds,
    surfaceAt,
    nearestRunway,
  };
}

export function runwayCenter(runway) {
  return { x: runway.x, z: runway.z };
}

export function inStormBand(archipelago, z) {
  return z >= archipelago.stormBand.zMin && z <= archipelago.stormBand.zMax;
}
