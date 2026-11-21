# Double Take — Spot the Difference

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Ryukein19/spotdiff-game/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/Ryukein19/spotdiff-game/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

**Double Take** is an original spot-the-difference game: two near-identical pictures side by side, 48 differences hidden across 6 hand-drawn scenes. All art is drawn procedurally in code (canvas 2D, flat vector style) — no images, no network, plays fully offline in a desktop browser with mouse + keyboard.

## The scenes

| # | Scene | Differences |
|---|-------|-------------|
| 1 | Coral Reef Dive — underwater | 8 |
| 2 | Winter Village — snowy night | 8 |
| 3 | Jungle Temple — ancient ruins | 8 |
| 4 | Desert Oasis — golden dunes | 8 |
| 5 | Moon Base — lunar surface | 8 |
| 6 | Botanical Greenhouse — glass dome | 8 |

**48 differences in total**, difficulty rising across the scenes. Every difference is fair — something removed, recoloured, moved, resized, flipped, or added — visible when pointed at, but not obvious at a glance.

## Features

- **Two panels side by side** (LEFT Original / RIGHT Changed), found differences marked with gold circles + green checks on **both** panels, progress dots for the ones still hidden.
- **Big remaining counter** ("8 to find") plus found count, score, and streak (x3 and up glows orange).
- **Timer with progress bar** — 120s per scene; a wrong guess costs **−5s** and breaks the streak (red X + shake).
- **Hints** — 3 per scene; 💡 pulses one unfound difference for a couple of seconds.
- **Hover magnifier** — a 2x lens follows your cursor over either picture (L toggles it).
- **Keyboard** — arrows move the crosshair · Enter guesses · Tab switches picture · H hint · L lens · N next scene · R restart · 1–6 pick a scene · P pause.
- **Sound** — WebAudio beeps and chimes, synthesised in code (no audio files).
- **Level selector** and a **How to play** panel explaining the rules.

## Play

Serve it locally and open it in a browser:

```sh
node serve.ts   # http://localhost:8080
```

Or open `game/index.html` directly from the repository. No build step, no dependencies, no network requests.

## Structure

- `game/index.html` — page shell, HUD, panels, level select, how-to-play
- `game/style.css` — all styling
- `game/src/config.js` — every tunable number (timer, hints, penalty, scoring)
- `game/src/scenes.js` — the 6 scenes, all art drawn in code, plus each scene's difference list
- `game/src/differences.js` — hit-testing, remaining count, hint cycling
- `game/src/render.js` — panel drawing, found markers, hint pulses, crosshair, magnifier
- `game/src/input.js` — mouse + keyboard
- `game/src/timer.js` — countdown, progress bar, pause, penalty
- `game/src/audio.js` — WebAudio sounds, synthesised
- `game/src/main.js` — game state, scene flow, scoring, HUD, `?shot=` demo states

## License

MIT — see [LICENSE](LICENSE).
