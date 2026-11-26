// SALTWIND COURIER — shared tuning numbers and palette.
// One place for every magic number so the flight feel, the dawn palette
// and the mission economy can be tuned without hunting through files.

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const DAWN_PALETTE = {
  skyTop: '#241640',
  skyMid: '#6e2a72',
  skyLow: '#c94f38',
  horizonGlow: '#ffb36b',
  sunCore: '#ffd9a0',
  sunHalo: '#ff9a52',
  seaDeep: '#123a5e',
  seaMid: '#1d6a8a',
  seaShallow: '#3fa8a0',
  lagoon: '#7fd4c0',
  sand: '#e8c98f',
  volcanoRock: '#4a2f3d',
  volcanoSlope: '#6e4038',
  volcanoAsh: '#8a6a58',
  jungle: '#2f6b4a',
  jungleLight: '#4d8f5f',
  villageRoof: '#d96b3f',
  villageWall: '#f2e3c2',
  lighthouseWhite: '#f7f2e6',
  lighthouseRed: '#c23b2e',
  ringGold: '#ffd23f',
  ringGreen: '#7dff8a',
  buoyOrange: '#ff7a2f',
  hudInk: '#0d1526',
  hudPaper: '#fff3d6',
  hudAmber: '#ffb347',
  hudRed: '#ff5a4e',
  hudGreen: '#8dff9e',
};

export const WORLD = {
  size: 4200,
  seaLevel: 0,
  gravitySink: 14,
  stallSpeed: 20,
  maxSpeed: 92,
  cruiseSpeed: 52,
  turnRate: 0.85,
  climbRate: 9,
  descendRate: 11,
  fuelCapacity: 100,
  fuelBurnIdle: 0.22,
  fuelBurnFull: 0.62,
  damageHardLanding: 26,
  damageTerrain: 100,
  cameraDistance: 62,
  cameraHeight: 15,
  focalLength: 760,
  horizonY: 300,
};

export const PLANE_START = {
  x: 0,
  z: 320,
  heading: 0,
  altitude: 58,
  speed: 46,
  throttle: 0.62,
};

export const MISSION_DEFS = {
  delivery: {
    id: 'delivery',
    title: 'WATER-RUNWAY DELIVERY',
    blurb: 'Land on the marked water runway at all three island clinics.',
    parFuel: 62,
  },
  rings: {
    id: 'rings',
    title: 'RING GATES OVER THE CLIFFS',
    blurb: 'Thread all eight golden rings between the volcanoes.',
    parFuel: 55,
  },
  storm: {
    id: 'storm',
    title: 'STORM FRONT SORTIE',
    blurb: 'Cross the storm front and land the last clinic before the fuel gauge gives up.',
    parFuel: 70,
  },
};

export const CLINICS = [
  { key: 'ember', name: 'Ember Clinic', island: 'Ember Isle' },
  { key: 'coral', name: 'Coral Clinic', island: 'Coral Lagoon' },
  { key: 'storm', name: 'Storm Clinic', island: 'Storm Isle' },
];

export const SCORE = {
  delivery: 400,
  ring: 150,
  stormCross: 350,
  landingSoft: 120,
  landingHard: 40,
  fuelBonusPerUnit: 6,
  damagePenaltyPerUnit: 4,
};
