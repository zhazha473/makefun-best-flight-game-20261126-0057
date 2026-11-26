// The three SALTWIND COURIER missions.
// Delivery: land on the marked water runway at each of the three clinics.
// Rings: thread eight golden gates between the volcanoes.
// Storm: cross the storm front and land the far clinic on limited fuel.
// Each mission tracks its own objectives, score and win/lose state.

import { MISSION_DEFS, SCORE } from './config.js';
import { inStormBand } from './terrain.js';

export function createMission(kind, archipelago) {
  const def = MISSION_DEFS[kind];
  const mission = {
    kind,
    title: def.title,
    blurb: def.blurb,
    parFuel: def.parFuel,
    score: 0,
    status: 'flying',
    objectives: [],
    stormCrossed: false,
    delivered: [],
    ringsPassed: 0,
    message: '',
    messageTimer: 0,
    elapsed: 0,
  };

  if (kind === 'delivery') {
    mission.objectives = archipelago.runways.map((runway) => ({
      label: `Land at ${clinicName(runway.clinic)}`,
      clinic: runway.clinic,
      done: false,
    }));
  } else if (kind === 'rings') {
    mission.objectives = archipelago.rings.map((ring, index) => ({
      label: `Ring ${index + 1} of ${archipelago.rings.length}`,
      ring: index,
      done: false,
    }));
  } else {
    mission.objectives = [
      { label: 'Cross the storm front', done: false },
      { label: 'Land at Storm Clinic', done: false },
    ];
  }
  return mission;
}

export function clinicName(key) {
  if (key === 'ember') return 'Ember Clinic';
  if (key === 'coral') return 'Coral Clinic';
  return 'Storm Clinic';
}

function flash(mission, text, seconds) {
  mission.message = text;
  mission.messageTimer = seconds;
}

export function updateMission(mission, plane, archipelago, dt, flightEvent) {
  if (mission.status !== 'flying') return mission;
  mission.elapsed += dt;
  if (mission.messageTimer > 0) mission.messageTimer -= dt;

  if (flightEvent && flightEvent.terrainHit) {
    mission.status = 'crashed';
    flash(mission, 'CRASHED — the seaplane is down.', 6);
    return mission;
  }

  if (plane.fuel <= 0 && !plane.landed && plane.altitude > 2) {
    mission.status = 'lost';
    flash(mission, 'OUT OF FUEL — ditching in the sea.', 6);
    return mission;
  }

  if (mission.kind === 'delivery') {
    if (flightEvent && flightEvent.touchdown) {
      const { runway, distance } = archipelago.nearestRunway(plane.x, plane.z);
      const objective = mission.objectives.find((item) => item.clinic === runway.clinic);
      if (distance < runway.length * 0.62 && objective && !objective.done) {
        objective.done = true;
        mission.delivered.push(runway.clinic);
        const points = flightEvent.touchdown === 'soft' ? SCORE.delivery + SCORE.landingSoft : SCORE.delivery + SCORE.landingHard;
        mission.score += points;
        flash(mission, `DELIVERED at ${clinicName(runway.clinic)} — +${points}`, 3);
        if (mission.delivered.length >= mission.objectives.length) {
          mission.status = 'won';
          mission.score += Math.round(plane.fuel) * SCORE.fuelBonusPerUnit;
          flash(mission, 'ALL THREE CLINICS SERVED — SORTIE COMPLETE!', 6);
        }
      } else if (!objective || objective.done) {
        flash(mission, 'Landed, but not on a clinic runway — take off and try again.', 3);
        plane.landed = false;
      } else {
        flash(mission, 'Too far from the runway markers — line up between the buoys.', 3);
        plane.landed = false;
      }
    }
  }

  if (mission.kind === 'rings') {
    for (let i = 0; i < archipelago.rings.length; i += 1) {
      const ring = archipelago.rings[i];
      if (ring.passed) continue;
      const dx = plane.x - ring.x;
      const dz = plane.z - ring.z;
      const dy = plane.altitude - ring.y;
      const horizontal = Math.hypot(dx, dz);
      if (horizontal < 26 && Math.abs(dy) < ring.radius + 6) {
        ring.passed = true;
        mission.ringsPassed += 1;
        mission.objectives[i].done = true;
        mission.score += SCORE.ring;
        flash(mission, `RING ${i + 1} — +${SCORE.ring}`, 2);
        if (mission.ringsPassed >= archipelago.rings.length) {
          mission.status = 'won';
          mission.score += Math.round(plane.fuel) * SCORE.fuelBonusPerUnit;
          flash(mission, 'ALL EIGHT RINGS — CLEAN RUN THROUGH THE CLIFFS!', 6);
        }
      }
    }
    if (flightEvent && flightEvent.touchdown) {
      flash(mission, 'Down on the water — throttle up to keep flying the rings.', 2);
      plane.landed = false;
    }
  }

  if (mission.kind === 'storm') {
    if (!mission.stormCrossed && inStormBand(archipelago, plane.z)) {
      mission.stormCrossed = true;
      mission.objectives[0].done = true;
      mission.score += SCORE.stormCross;
      flash(mission, `IN THE STORM — +${SCORE.stormCross} — hold her steady!`, 3);
    }
    if (flightEvent && flightEvent.touchdown) {
      const { runway, distance } = archipelago.nearestRunway(plane.x, plane.z);
      if (runway.clinic === 'storm' && distance < runway.length * 0.62 && mission.stormCrossed) {
        mission.objectives[1].done = true;
        mission.status = 'won';
        mission.score += SCORE.delivery + (flightEvent.touchdown === 'soft' ? SCORE.landingSoft : SCORE.landingHard);
        mission.score += Math.round(plane.fuel) * SCORE.fuelBonusPerUnit;
        flash(mission, 'STORM CLINIC REACHED — SORTIE COMPLETE!', 6);
      } else {
        flash(mission, 'Wrong water — the Storm Clinic runway is past the front.', 3);
        plane.landed = false;
      }
    }
  }

  if (plane.damage >= 100 && mission.status === 'flying') {
    mission.status = 'crashed';
    flash(mission, 'HULL TOO DAMAGED — the seaplane is down.', 6);
  }
  return mission;
}

export function missionProgress(mission) {
  const done = mission.objectives.filter((item) => item.done).length;
  return { done, total: mission.objectives.length };
}

export function finalScoreBreakdown(mission, plane) {
  return {
    missionScore: mission.score,
    fuelLeft: Math.round(plane.fuel),
    damage: Math.round(plane.damage),
    timeSeconds: Math.round(mission.elapsed),
  };
}
