// Spot the Difference — difference logic: hit-testing, found-state, hints.
import { SCENES } from './scenes.js';

export function sceneById(id) {
  return SCENES.find((s) => s.id === id) || SCENES[0];
}

// The difference whose hit circle contains (x, y) on the given scene, or null.
// A click counts when it lands within the diff's radius (generous, fair play).
export function findDiff(scene, x, y) {
  let best = null, bestD = Infinity;
  for (const d of scene.diffs) {
    const dx = x - d.x, dy = y - d.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= d.r && dist < bestD) { best = d; bestD = dist; }
  }
  return best;
}

export function remaining(scene, found) {
  return scene.diffs.filter((d) => !found.has(d.id));
}

// The next unfound difference, for the hint system (cycles through unfound ones).
export function nextHintDiff(scene, found, lastHintId) {
  const left = remaining(scene, found);
  if (left.length === 0) return null;
  const idx = lastHintId ? left.findIndex((d) => d.id === lastHintId) : -1;
  return left[(idx + 1) % left.length];
}
