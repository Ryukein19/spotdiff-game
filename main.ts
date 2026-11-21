// Double Take — the hand-in program for the spot-the-difference entry.
// This game lives in game/ as plain static files: index.html plus ES modules,
// all drawn on canvas, no library, no network request, so a desktop browser
// can open it offline and play it with mouse and keyboard. This program's
// only job is to hand those files in: it copies game/ and screenshots/ from
// beside this file into the output directory and writes dossier.json, the
// summary the judge reads, using the vendored make.fun library.
//
// Play it locally first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse to hand in a broken entry: the game must have an index.html to open.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — nothing for the browser to open');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Say what went out, so a silent hand-in never hides a missing piece.
const handedGameFiles = readdirSync(join(out, 'game'), { recursive: true }).length;
const handedShots = readdirSync(join(out, 'screenshots')).length;
console.log(`handed in ${handedGameFiles} game files and ${handedShots} screenshots to ${out}`);
