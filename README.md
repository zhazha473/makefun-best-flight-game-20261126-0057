# SALTWIND COURIER: 3 island clinics, 2 storm fronts, 1 seaplane and a fuel gauge that hates you

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/zhazha473/makefun-best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/zhazha473/makefun-best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A vintage seaplane courier run across a volcanic archipelago at dawn. You fly
medical supplies to three island clinics, threading ring gates between the
volcanoes and crossing a storm front on a fuel gauge that hates you. Every
sortie is a decision: push on to the next clinic or turn home while you
still have fuel and hull to spare.

## How to play

Serve `game/` and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

Pick a mission on the title screen (click, or press `1`, `2`, `3`):

1. **Water-Runway Delivery** — land on the buoy-marked water runway at all
   three island clinics. Soft touchdowns score more; hard ones damage the hull.
2. **Ring Gates Over the Cliffs** — thread all eight golden rings between the
   volcanoes.
3. **Storm Front Sortie** — cross the storm front and land the far Storm
   Clinic before the fuel runs out.

Controls:

| Key | Action |
| --- | --- |
| `W` / `S` or `↑` / `↓` | Throttle up / down |
| `A` / `D` or `←` / `→` | Turn |
| `C` | Toggle chase / cockpit view |
| `P` | Pause |
| `M` | Mute |
| `R` | Restart the mission |
| `1` / `2` / `3` | Pick a mission |

Fuel burns with throttle; below stall speed the plane sinks. Land on water
slowly and gently — landing on land or slamming down hard wrecks the hull.
The cockpit view has a full dashboard: altitude, speed and heading gauges,
plus the same HUD fuel and damage bars.

## Layout

```text
main.ts                  entry program: copies game/ + screenshots/ to /output, writes dossier.json
serve.ts                 tiny static server for local play-testing (game/ on :8080)
shots.json               the four staged screenshot queries
vendor/makefun-game.ts   the kit's dossier library, unchanged
game/
  index.html             page shell (canvas + module entry)
  styles.css             page chrome around the canvas
  src/
    config.js            tuning numbers, dawn palette, mission definitions
    random.js            seeded RNG (mulberry32) for the procedural islands
    input.js             keyboard + mouse tracking
    flight-model.js      throttle/turn/lift/stall, fuel burn, touchdown damage
    terrain.js           volcanic islands, lagoon, villages, lighthouse, runways, rings
    missions.js          the three missions, objectives, scoring, win/lose
    hud.js               ALT/SPD/HDG instruments, fuel + hull gauges, compass, mission panel
    audio.js             procedural WebAudio: engine hum, wind, chimes, splash, crash
    render.js            pseudo-3D chase view, cockpit view, seaplane, spray, rain
    shots.js             deterministic ?shot= staging for the screenshots
    main.js              loop, title/mission/pause/end screens, debug handle
screenshots/             four real renders of the game running in a browser
```

All art and sound are drawn and synthesized in code — no external assets,
no network requests. The game runs entirely offline from its own files.

## License

MIT — see [LICENSE](LICENSE).
