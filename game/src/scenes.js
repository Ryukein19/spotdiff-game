// Spot the Difference — scene art. Every scene is drawn procedurally (flat vector
// style, canvas 2D, no images). A scene's draw(ctx, variant, W, H) draws the whole
// picture; variant 0 is the LEFT (original) panel, variant 1 is the RIGHT (changed)
// panel. Each difference is one small conditional inside draw() plus one entry in
// the scene's diffs list (id, type, hit x/y/radius). Fair differences only: removed,
// recoloured, moved, resized, flipped, added.

// ---- tiny drawing helpers ----
export function circle(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
export function ellipse(ctx, x, y, rx, ry, fill, stroke, lw) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
export function rect(ctx, x, y, w, h, fill, stroke, lw) {
  if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.strokeRect(x, y, w, h); }
}
export function poly(ctx, pts, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
export function line(ctx, x1, y1, x2, y2, color, w) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = w || 2; ctx.stroke();
}
export function star(ctx, x, y, r, fill, points) {
  const n = points || 5; ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / n - Math.PI / 2;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
export function text(ctx, s, x, y, size, color, align, weight) {
  ctx.font = (weight || '700') + ' ' + size + 'px system-ui, sans-serif';
  ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

// A fish drawn facing dir (1 = right, -1 = left), body colour c.
function fish(ctx, x, y, s, c, dir) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir * s, s);
  ellipse(ctx, 0, 0, 26, 14, c);
  poly(ctx, [[-24, 0], [-36, -11], [-36, 11]], c);
  circle(ctx, 12, -3, 3.4, '#fff'); circle(ctx, 13, -3, 1.7, '#222');
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.quadraticCurveTo(2, -22, 10, -12); ctx.closePath();
  ctx.fillStyle = c; ctx.fill();
  ctx.restore();
}
// A pine tree: trunk + 3 snowy tiers.
function pine(ctx, x, y, s, snow) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rect(ctx, -5, 28, 10, 18, '#7a4a21');
  poly(ctx, [[0, -52], [-30, 6], [30, 6]], '#1d7a3d');
  poly(ctx, [[0, -34], [-24, 18], [24, 18]], '#1d7a3d');
  poly(ctx, [[0, -16], [-18, 30], [18, 30]], '#1d7a3d');
  if (snow) {
    poly(ctx, [[0, -52], [-12, -28], [12, -28]], '#fff');
    poly(ctx, [[0, -34], [-10, -14], [10, -14]], '#fff');
    poly(ctx, [[0, -16], [-8, 2], [8, 2]], '#fff');
  }
  ctx.restore();
}
// A branching coral in colour c at (x, y), scale s.
function coral(ctx, x, y, s, c) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = c; ctx.lineCap = 'round';
  const branch = (x0, y0, x1, y1, w) => {
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = w; ctx.stroke();
  };
  branch(0, 0, 0, -34, 7); branch(0, -14, -20, -34, 5); branch(0, -22, 18, -44, 5);
  branch(-20, -34, -30, -50, 4); branch(-20, -34, -8, -48, 4);
  branch(18, -44, 30, -58, 4); branch(18, -44, 8, -60, 4);
  branch(0, -34, 2, -56, 5); branch(2, -56, -8, -70, 3); branch(2, -56, 12, -72, 3);
  ctx.restore();
}
// A wavy seaweed strand.
function seaweed(ctx, x, y, h, c, phase) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(10 * Math.sin(phase), -h * 0.3, -10 * Math.sin(phase), -h * 0.6, 4, -h);
  ctx.stroke(); ctx.restore();
}

// ---- Scene 1: Coral Reef Dive ----
function drawReef(ctx, v, W, H) {
  // water
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#0b5fa5'], [0.55, '#0e7d8c'], [1, '#0f8f7a']]);
  ctx.fillRect(0, 0, W, H);
  // light rays
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  poly(ctx, [[90, 0], [130, 0], [60, H], [20, H]], 'rgba(255,255,255,0.10)');
  poly(ctx, [[300, 0], [330, 0], [290, H], [250, H]], 'rgba(255,255,255,0.08)');
  poly(ctx, [[480, 0], [505, 0], [520, H], [485, H]], 'rgba(255,255,255,0.09)');
  // sandy floor
  ctx.fillStyle = '#e8cf9a'; ctx.beginPath(); ctx.moveTo(0, 345);
  ctx.bezierCurveTo(150, 325, 300, 355, 460, 338); ctx.bezierCurveTo(540, 330, 590, 345, W, 340);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  circle(ctx, 60, 372, 5, '#d9b77c'); circle(ctx, 560, 368, 6, '#d9b77c');
  // corals (orange one MOVES in the right panel)
  coral(ctx, 82, 340, 1.15, '#ff7f9e');
  const ocx = v ? 545 : 520, ocy = v ? 160 : 330;
  coral(ctx, ocx, ocy, 1.0, '#ff9f43');
  // seaweed (middle strand RECOLOURED teal in the right panel)
  seaweed(ctx, 150, 345, 90, '#2fae5f', 1);
  seaweed(ctx, 300, 348, 110, v ? '#2bb3a3' : '#2fae5f', 2.4);
  seaweed(ctx, 455, 345, 80, '#2fae5f', 0.4);
  // anemone
  ctx.fillStyle = '#ff8fb3'; ellipse(ctx, 285, 338, 26, 10, '#ff8fb3');
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.15 + i * 0.12);
    line(ctx, 285 + Math.cos(a) * 8, 338 + Math.sin(a) * 4, 285 + Math.cos(a) * 22, 338 + Math.sin(a) * 16, '#ff6fa0', 3);
  }
  // octopus
  ctx.save(); ctx.translate(95, 255);
  ellipse(ctx, 0, -8, 22, 18, '#9b59d0');
  circle(ctx, -8, -12, 3.5, '#fff'); circle(ctx, 8, -12, 3.5, '#fff');
  circle(ctx, -7, -12, 1.8, '#222'); circle(ctx, 9, -12, 1.8, '#222');
  ctx.strokeStyle = '#9b59d0'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(-16 + i * 8, 6);
    ctx.quadraticCurveTo(-14 + i * 8, 26, -20 + i * 8, 30); ctx.stroke();
  }
  ctx.restore();
  // turtle (FLIPPED in the right panel)
  ctx.save(); ctx.translate(420, 300); ctx.scale(v ? -1 : 1, 1);
  ellipse(ctx, 0, 0, 34, 20, '#3d9b4f');
  ellipse(ctx, 0, -2, 24, 13, '#57b368');
  circle(ctx, 36, -6, 9, '#3d9b4f');
  circle(ctx, 39, -8, 2.4, '#fff'); circle(ctx, 40, -8, 1.2, '#222');
  poly(ctx, [[-32, -4], [-44, -12], [-44, 4]], '#57b368');
  line(ctx, -16, 16, -22, 28, '#3d9b4f', 5); line(ctx, 14, 16, 20, 28, '#3d9b4f', 5);
  ctx.restore();
  // treasure chest
  rect(ctx, 505, 330, 52, 30, '#8b5a2b'); rect(ctx, 505, 330, 52, 10, '#a06a35');
  line(ctx, 531, 330, 531, 360, '#ffd700', 4); circle(ctx, 531, 348, 4, '#ffd700');
  // fish: yellow one RECOLOURED purple in the right panel; blue one plain
  fish(ctx, 200, 150, 1, v ? '#8b5cf6' : '#facc15', 1);
  fish(ctx, 380, 215, 0.85, '#38bdf8', -1);
  // extra small fish ADDED in the right panel
  if (v) fish(ctx, 100, 100, 0.55, '#fb923c', 1);
  // starfish (REMOVED in the right panel)
  if (!v) star(ctx, 320, 368, 16, '#ff8c42');
  // shells: pink one RESIZED bigger in the right panel
  const shR = v ? 20 : 13;
  ctx.fillStyle = '#ffb6c1'; ctx.beginPath(); ctx.arc(180, 378, shR, Math.PI, 0); ctx.closePath(); ctx.fill();
  line(ctx, 180 - shR + 3, 378, 180 + shR - 3, 378, '#e58aa0', 2);
  ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(450, 382, 11, Math.PI, 0); ctx.closePath(); ctx.fill();
  // bubbles (one ADDED near the top in the right panel)
  const bubbles = [[250, 300, 6], [420, 270, 5], [500, 240, 7], [180, 240, 4], [560, 200, 5]];
  if (v) bubbles.push([350, 62, 6]);
  for (const [bx, by, br] of bubbles) circle(ctx, bx, by, br, 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.7)', 1.5);
}

const REEF_DIFFS = [
  { id: 'reef-fish', type: 'recoloured', x: 200, y: 150, r: 30, hint: 'The yellow fish changed colour' },
  { id: 'reef-star', type: 'removed', x: 320, y: 368, r: 22, hint: 'Something is missing from the sand' },
  { id: 'reef-bubble', type: 'added', x: 350, y: 62, r: 14, hint: 'A new bubble near the top' },
  { id: 'reef-coral', type: 'moved', x: 520, y: 330, r: 34, hint: 'The orange coral is not where it was' },
  { id: 'reef-turtle', type: 'flipped', x: 420, y: 300, r: 36, hint: 'The turtle is facing the other way' },
  { id: 'reef-shell', type: 'resized', x: 180, y: 378, r: 24, hint: 'A shell grew bigger' },
  { id: 'reef-weed', type: 'recoloured', x: 300, y: 300, r: 30, hint: 'A seaweed strand changed colour' },
  { id: 'reef-minnow', type: 'added', x: 100, y: 100, r: 20, hint: 'A small fish appeared top-left' },
];

// ---- Scene 2: Winter Village ----
function drawVillage(ctx, v, W, H) {
  // night sky
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#0d1b3d'], [0.6, '#274b7a'], [1, '#3d6a9e']]);
  ctx.fillRect(0, 0, W, H);
  // moon + stars
  circle(ctx, 520, 70, 30, '#fdf6d8'); circle(ctx, 510, 62, 6, '#e8ddb0'); circle(ctx, 530, 78, 4, '#e8ddb0');
  for (const [sx, sy] of [[60, 50], [150, 90], [240, 40], [330, 70], [420, 45], [580, 130], [90, 140], [380, 120]]) {
    star(ctx, sx, sy, 4, '#fff');
  }
  // snow ground
  ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.moveTo(0, 305);
  ctx.bezierCurveTo(150, 290, 320, 312, 480, 298); ctx.bezierCurveTo(540, 292, 590, 302, W, 300);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  // house 1 (red, chimney smoke REMOVED in right panel)
  rect(ctx, 80, 200, 140, 105, '#c0392b'); poly(ctx, [[70, 202], [150, 160], [230, 202]], '#f4f8ff');
  rect(ctx, 175, 168, 18, 34, '#8b5a2b');
  if (!v) { // smoke puffs
    circle(ctx, 184, 152, 9, 'rgba(255,255,255,0.75)'); circle(ctx, 192, 138, 12, 'rgba(255,255,255,0.6)');
    circle(ctx, 202, 122, 14, 'rgba(255,255,255,0.45)');
  }
  rect(ctx, 100, 230, 26, 30, '#ffd76a'); rect(ctx, 170, 230, 26, 30, '#ffd76a');
  line(ctx, 113, 230, 113, 260, '#8b5a2b', 2); line(ctx, 100, 245, 126, 245, '#8b5a2b', 2);
  rect(ctx, 138, 265, 26, 40, '#6b3a1f'); circle(ctx, 158, 285, 2.5, '#ffd76a');
  // house 2 (blue, window RECOLOURED blue in right panel, wreath FLIPPED)
  rect(ctx, 280, 210, 140, 95, '#2e6db4'); poly(ctx, [[272, 212], [350, 172], [428, 212]], '#f4f8ff');
  rect(ctx, 300, 235, 26, 30, v ? '#7cc7ff' : '#ffd76a');
  rect(ctx, 375, 235, 26, 30, '#ffd76a');
  rect(ctx, 338, 265, 26, 40, '#1f3a5f');
  circle(ctx, 351, 252, 11, '#2fae5f'); circle(ctx, 351, 252, 6, '#e74c3c');
  if (v) { circle(ctx, 351, 252, 3, '#ffd76a'); } // wreath bow flips side
  // house 3 (green)
  rect(ctx, 460, 215, 110, 90, '#3d8b4f'); poly(ctx, [[452, 217], [515, 180], [578, 217]], '#f4f8ff');
  rect(ctx, 480, 240, 24, 28, '#ffd76a'); rect(ctx, 530, 240, 24, 28, '#ffd76a');
  rect(ctx, 505, 270, 22, 35, '#234d2c');
  // pine trees (right one RESIZED taller in right panel)
  pine(ctx, 245, 285, 1, true);
  pine(ctx, 445, 285, v ? 1.45 : 1.1, true);
  // snowman (carrot MOVED to the other side in right panel)
  circle(ctx, 320, 345, 22, '#fff'); circle(ctx, 320, 312, 16, '#fff'); circle(ctx, 320, 288, 12, '#fff');
  circle(ctx, 315, 285, 2, '#222'); circle(ctx, 325, 285, 2, '#222');
  poly(ctx, v ? [[320, 290], [306, 293], [320, 296]] : [[320, 290], [334, 293], [320, 296]], '#ff7f2a');
  rect(ctx, 308, 272, 24, 6, '#222'); rect(ctx, 313, 260, 14, 14, '#222');
  line(ctx, 306, 312, 296, 322, '#7a4a21', 3); line(ctx, 334, 312, 344, 322, '#7a4a21', 3);
  // lamp post (light RECOLOURED in right panel)
  rect(ctx, 147, 250, 6, 58, '#2c2c2c'); circle(ctx, 150, 246, 10, v ? '#9fd8ff' : '#ffd76a', '#2c2c2c', 2);
  circle(ctx, 150, 246, 22, v ? 'rgba(159,216,255,0.25)' : 'rgba(255,215,106,0.30)');
  // fence
  for (let fx = 40; fx < 600; fx += 34) { rect(ctx, fx, 296, 5, 16, '#8b5a2b'); }
  line(ctx, 30, 300, 600, 300, '#8b5a2b', 3);
  // sled (REMOVED in right panel)
  if (!v) {
    poly(ctx, [[470, 360], [520, 360], [512, 372], [478, 372]], '#b03a2e');
    line(ctx, 474, 374, 516, 374, '#7a4a21', 3);
  }
  // gifts (one ADDED in right panel)
  rect(ctx, 250, 366, 18, 14, '#e74c3c'); line(ctx, 259, 366, 259, 380, '#ffd76a', 3);
  if (v) { rect(ctx, 200, 368, 16, 12, '#8e44ad'); line(ctx, 208, 368, 208, 380, '#ffd76a', 3); }
  // footprints
  for (let i = 0; i < 6; i++) ellipse(ctx, 380 + i * 14, 352 + (i % 2) * 6, 5, 3, '#dbe7f5');
}

const VILLAGE_DIFFS = [
  { id: 'vil-smoke', type: 'removed', x: 190, y: 140, r: 26, hint: 'Smoke vanished from a chimney' },
  { id: 'vil-window', type: 'recoloured', x: 313, y: 250, r: 20, hint: 'A window light changed colour' },
  { id: 'vil-nose', type: 'moved', x: 320, y: 292, r: 16, hint: 'The snowman\u2019s nose points the other way' },
  { id: 'vil-pine', type: 'resized', x: 445, y: 250, r: 30, hint: 'A pine tree grew taller' },
  { id: 'vil-wreath', type: 'flipped', x: 351, y: 252, r: 16, hint: 'The wreath\u2019s bow swapped sides' },
  { id: 'vil-gift', type: 'added', x: 208, y: 374, r: 16, hint: 'A new gift appeared in the snow' },
  { id: 'vil-lamp', type: 'recoloured', x: 150, y: 246, r: 18, hint: 'The lamp glow changed colour' },
  { id: 'vil-sled', type: 'removed', x: 495, y: 366, r: 24, hint: 'The sled is gone' },
];

// ---- Scene 3: Jungle Temple ----
function drawTemple(ctx, v, W, H) {
  // jungle sky + canopy
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#ffe9a8'], [0.4, '#a8d08d'], [1, '#3f7a44']]);
  ctx.fillRect(0, 0, W, H);
  circle(ctx, 90, 70, 34, '#fff3b0');
  // distant trees
  poly(ctx, [[0, 400], [60, 180], [120, 400]], '#2e6b34');
  poly(ctx, [[500, 400], [560, 170], [620, 400]], '#2e6b34');
  // temple pyramid
  ctx.fillStyle = '#9a9a8e';
  poly(ctx, [[230, 300], [390, 300], [360, 240], [260, 240]], '#9a9a8e');
  poly(ctx, [[255, 240], [365, 240], [345, 190], [275, 190]], '#a8a89c');
  poly(ctx, [[280, 190], [340, 190], [328, 150], [292, 150]], '#b5b5a8');
  // doorway
  poly(ctx, [[298, 300], [322, 300], [318, 250], [302, 250]], '#2b2b26');
  // steps
  for (let i = 0; i < 4; i++) rect(ctx, 240 - i * 8, 300 + i * 12, 140 + i * 16, 12, i % 2 ? '#8f8f83' : '#9a9a8e');
  // statue on top (arm MOVED in right panel)
  circle(ctx, 310, 132, 12, '#c9c9bc');
  rect(ctx, 302, 142, 16, 22, '#c9c9bc');
  line(ctx, 304, 150, v ? 292 : 288, 138, '#c9c9bc', 5); // raised arm side
  line(ctx, 316, 150, 326, 160, '#c9c9bc', 5);
  // torches (left flame REMOVED in right panel)
  rect(ctx, 218, 200, 6, 26, '#6b4a2a'); rect(ctx, 396, 200, 6, 26, '#6b4a2a');
  if (!v) { ellipse(ctx, 221, 192, 7, 12, '#ff9f1c'); ellipse(ctx, 221, 194, 4, 7, '#ffe66d'); }
  ellipse(ctx, 399, 192, 7, 12, '#ff9f1c'); ellipse(ctx, 399, 194, 4, 7, '#ffe66d');
  // moss patches (one RECOLOURED in right panel)
  ellipse(ctx, 285, 210, 16, 7, v ? '#e0a800' : '#4e9b47');
  ellipse(ctx, 340, 225, 12, 6, '#4e9b47'); ellipse(ctx, 310, 175, 10, 5, '#4e9b47');
  // vines (left one RESIZED longer in right panel)
  const vineLen = v ? 150 : 100;
  ctx.strokeStyle = '#2f7a33'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(150, 0); ctx.quadraticCurveTo(140, vineLen * 0.5, 155, vineLen); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(470, 0); ctx.quadraticCurveTo(480, 50, 462, 95); ctx.stroke();
  ellipse(ctx, 152, vineLen * 0.6, 8, 5, '#3d9b4f'); ellipse(ctx, 465, 60, 8, 5, '#3d9b4f');
  // foliage edges
  ellipse(ctx, 30, 200, 40, 90, '#2e6b34'); ellipse(ctx, 590, 210, 40, 90, '#2e6b34');
  ellipse(ctx, 45, 120, 30, 50, '#3d8b4f'); ellipse(ctx, 575, 120, 30, 50, '#3d8b4f');
  // monkeys (right one FLIPPED in right panel)
  ctx.save(); ctx.translate(180, 205); circle(ctx, 0, 0, 14, '#8b5a2b');
  circle(ctx, -5, -3, 2, '#222'); circle(ctx, 5, -3, 2, '#222');
  ellipse(ctx, 0, 6, 8, 5, '#d9b48f'); ctx.restore();
  ctx.save(); ctx.translate(430, 182); ctx.scale(v ? -1 : 1, 1);
  circle(ctx, 0, 0, 14, '#8b5a2b'); circle(ctx, -5, -3, 2, '#222'); circle(ctx, 5, -3, 2, '#222');
  ellipse(ctx, 0, 6, 8, 5, '#d9b48f');
  ctx.beginPath(); ctx.moveTo(12, 4); ctx.quadraticCurveTo(26, 2, 24, -10); ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
  // parrot (RECOLOURED blue in right panel)
  ctx.save(); ctx.translate(520, 150);
  ellipse(ctx, 0, 0, 14, 9, v ? '#3b82f6' : '#e74c3c');
  circle(ctx, 12, -6, 7, v ? '#3b82f6' : '#e74c3c');
  poly(ctx, [[18, -6], [26, -3], [18, -1]], '#f5a623');
  line(ctx, -4, 8, -12, 20, v ? '#1d4ed8' : '#c0392b', 4);
  ctx.restore();
  // waterfall (REMOVED in right panel)
  if (!v) {
    ctx.fillStyle = '#7cc7e8'; ctx.beginPath(); ctx.moveTo(548, 150);
    ctx.bezierCurveTo(540, 220, 560, 260, 552, 330); ctx.lineTo(572, 330);
    ctx.bezierCurveTo(578, 260, 566, 220, 570, 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ellipse(ctx, 560, 335, 22, 6, 'rgba(255,255,255,0.6)');
  }
  // treasure coins + chest ADDED in right panel
  for (let i = 0; i < 8; i++) circle(ctx, 292 + (i % 4) * 12, 318 + Math.floor(i / 4) * 7, 5, '#ffd700', '#b8860b', 1.5);
  if (v) { rect(ctx, 352, 302, 30, 18, '#8b5a2b'); rect(ctx, 352, 302, 30, 6, '#a06a35'); }
  // skull
  circle(ctx, 250, 322, 9, '#f5f0e6'); rect(ctx, 243, 326, 14, 8, '#f5f0e6');
  circle(ctx, 247, 321, 2, '#222'); circle(ctx, 253, 321, 2, '#222');
}

const TEMPLE_DIFFS = [
  { id: 'tem-parrot', type: 'recoloured', x: 520, y: 150, r: 22, hint: 'The parrot changed colour' },
  { id: 'tem-torch', type: 'removed', x: 221, y: 192, r: 18, hint: 'A torch flame went out' },
  { id: 'tem-statue', type: 'moved', x: 300, y: 142, r: 22, hint: 'The statue\u2019s arm moved' },
  { id: 'tem-vine', type: 'resized', x: 150, y: 90, r: 26, hint: 'A vine grew longer' },
  { id: 'tem-monkey', type: 'flipped', x: 430, y: 182, r: 22, hint: 'A monkey turned around' },
  { id: 'tem-chest', type: 'added', x: 367, y: 311, r: 20, hint: 'A chest appeared by the coins' },
  { id: 'tem-moss', type: 'recoloured', x: 285, y: 210, r: 20, hint: 'A moss patch changed colour' },
  { id: 'tem-falls', type: 'removed', x: 560, y: 250, r: 30, hint: 'The waterfall dried up' },
];

// ---- Scene 4: Desert Oasis ----
function drawOasis(ctx, v, W, H) {
  // sky + sun (RECOLOURED red in right panel)
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#ffb347'], [0.5, '#ffd98a'], [1, '#f7e3b0']]);
  ctx.fillRect(0, 0, W, H);
  circle(ctx, 520, 80, 34, v ? '#ff5a3c' : '#ffcf3f');
  circle(ctx, 520, 80, 44, v ? 'rgba(255,90,60,0.25)' : 'rgba(255,207,63,0.30)');
  // birds (middle one REMOVED in right panel)
  const bird = (bx, by) => {
    ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bx - 10, by); ctx.quadraticCurveTo(bx - 4, by - 7, bx, by);
    ctx.quadraticCurveTo(bx + 4, by - 7, bx + 10, by); ctx.stroke();
  };
  bird(200, 100); if (!v) bird(300, 90); bird(400, 110);
  // dunes
  ctx.fillStyle = '#e8b96a'; ctx.beginPath(); ctx.moveTo(0, 300);
  ctx.bezierCurveTo(140, 270, 260, 310, 420, 285); ctx.bezierCurveTo(520, 272, 580, 292, W, 285);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#dfa856'; ctx.beginPath(); ctx.moveTo(0, 340);
  ctx.bezierCurveTo(180, 320, 380, 352, W, 335); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  // oasis pond
  ellipse(ctx, 310, 330, 95, 26, '#4db2e8'); ellipse(ctx, 310, 328, 70, 18, '#7cc7e8');
  // palm trees (coconut RECOLOURED in right panel)
  const palm = (px, py, s) => {
    ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -40, -2, -70); ctx.stroke();
    ctx.strokeStyle = '#2f9e4f'; ctx.lineWidth = 6;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * (0.1 + i * 0.2);
      ctx.beginPath(); ctx.moveTo(-2, -70);
      ctx.quadraticCurveTo(Math.cos(a) * 26, -70 + Math.sin(a) * 18, Math.cos(a) * 44, -70 + Math.sin(a) * 26);
      ctx.stroke();
    }
    ctx.restore();
  };
  palm(150, 300, 1); palm(455, 295, 0.9);
  circle(ctx, 148, 228, 6, v ? '#ff5a3c' : '#8b5a2b'); circle(ctx, 158, 232, 6, '#8b5a2b');
  // camel (MOVED right in right panel)
  const cx = v ? 285 : 250;
  ctx.save(); ctx.translate(cx, 300);
  ellipse(ctx, 0, 0, 34, 18, '#c08a4b');
  ellipse(ctx, -6, -16, 12, 10, '#c08a4b'); ellipse(ctx, 12, -16, 12, 10, '#c08a4b');
  ctx.beginPath(); ctx.moveTo(30, -6); ctx.quadraticCurveTo(44, -26, 40, -40); ctx.strokeStyle = '#c08a4b'; ctx.lineWidth = 9; ctx.stroke();
  circle(ctx, 40, -44, 8, '#c08a4b'); poly(ctx, [[46, -46], [52, -42], [44, -40]], '#c08a4b');
  line(ctx, -22, 14, -24, 32, '#8b5a2b', 5); line(ctx, -8, 16, -8, 32, '#8b5a2b', 5);
  line(ctx, 12, 16, 12, 32, '#8b5a2b', 5); line(ctx, 24, 14, 26, 32, '#8b5a2b', 5);
  ctx.restore();
  // cactus (RESIZED taller in right panel)
  ctx.save(); ctx.translate(552, 330); ctx.scale(1, v ? 1.5 : 1);
  ctx.fillStyle = '#2f9e4f';
  ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-10, -20, 20, 22);
  ctx.beginPath(); ctx.arc(-16, -6, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-22, -6, 12, 12);
  ctx.beginPath(); ctx.arc(16, -12, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(10, -12, 12, 14);
  ctx.restore();
  // tent (FLIPPED in right panel)
  ctx.save(); ctx.translate(100, 300); ctx.scale(v ? -1 : 1, 1);
  poly(ctx, [[-45, 0], [0, -42], [45, 0]], '#e74c3c');
  poly(ctx, [[-15, 0], [0, -42], [15, 0]], '#f5f0e6');
  poly(ctx, [[-8, 0], [0, -14], [8, 0]], '#2b2b26');
  ctx.restore();
  // well
  ellipse(ctx, 480, 330, 26, 10, '#9a9a8e'); rect(ctx, 462, 300, 6, 26, '#8b5a2b'); rect(ctx, 492, 300, 6, 26, '#8b5a2b');
  poly(ctx, [[458, 302], [480, 282], [502, 302]], '#c0392b');
  // flowers (one ADDED in right panel)
  const flower = (fx, fy, c) => {
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; circle(ctx, fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 4, c); }
    circle(ctx, fx, fy, 3.5, '#ffd700');
  };
  flower(280, 352, '#ff6fa0'); flower(340, 356, '#ff6fa0');
  if (v) flower(385, 356, '#ff6fa0');
  // rocks (one REMOVED in right panel)
  ellipse(ctx, 200, 372, 16, 8, '#b8a88a'); ellipse(ctx, 230, 378, 11, 6, '#b8a88a');
  if (!v) ellipse(ctx, 410, 374, 13, 7, '#b8a88a');
  // rug
  rect(ctx, 90, 330, 46, 16, '#8e44ad'); rect(ctx, 96, 334, 34, 8, '#ffd700');
}

const OASIS_DIFFS = [
  { id: 'oas-bird', type: 'removed', x: 300, y: 90, r: 18, hint: 'A bird flew away' },
  { id: 'oas-nut', type: 'recoloured', x: 148, y: 228, r: 12, hint: 'A coconut changed colour' },
  { id: 'oas-camel', type: 'moved', x: 250, y: 300, r: 36, hint: 'The camel shuffled sideways' },
  { id: 'oas-cactus', type: 'resized', x: 552, y: 305, r: 26, hint: 'The cactus grew taller' },
  { id: 'oas-tent', type: 'flipped', x: 100, y: 280, r: 30, hint: 'The tent faces the other way' },
  { id: 'oas-flower', type: 'added', x: 385, y: 356, r: 14, hint: 'A flower bloomed by the pond' },
  { id: 'oas-sun', type: 'recoloured', x: 520, y: 80, r: 34, hint: 'The sun changed colour' },
  { id: 'oas-rock', type: 'removed', x: 410, y: 374, r: 16, hint: 'A rock is missing from the sand' },
];

// ---- Scene 5: Moon Base ----
function drawMoon(ctx, v, W, H) {
  // space
  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);
  // stars (one REMOVED in right panel)
  const stars = [[60, 50], [140, 90], [220, 40], [330, 70], [430, 45], [560, 140], [90, 140], [380, 120], [480, 60], [260, 130]];
  for (const [sx, sy] of stars) { if (sx === 60 && sy === 50 && v) continue; star(ctx, sx, sy, 4, '#fff'); }
  // Earth
  circle(ctx, 520, 80, 32, '#3b82f6'); ellipse(ctx, 512, 72, 14, 8, '#2f9e4f'); ellipse(ctx, 528, 90, 10, 6, '#2f9e4f');
  circle(ctx, 520, 80, 32, null, 'rgba(255,255,255,0.5)', 2);
  // satellite ADDED in right panel
  if (v) {
    rect(ctx, 410, 84, 22, 12, '#c0c0c8'); rect(ctx, 396, 88, 12, 5, '#3b82f6'); rect(ctx, 434, 88, 12, 5, '#3b82f6');
    line(ctx, 421, 84, 421, 74, '#c0c0c8', 2); circle(ctx, 421, 72, 3, '#ff5a3c');
  }
  // moon surface
  ctx.fillStyle = '#c9c9c9'; ctx.beginPath(); ctx.moveTo(0, 290);
  ctx.bezierCurveTo(150, 275, 320, 298, 480, 282); ctx.bezierCurveTo(540, 276, 590, 288, W, 285);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  // craters (one RESIZED bigger in right panel)
  ellipse(ctx, 120, 340, 22, 8, '#a8a8a8');
  ellipse(ctx, 250, 352, v ? 34 : 20, v ? 12 : 8, '#a8a8a8');
  ellipse(ctx, 420, 345, 16, 7, '#a8a8a8'); ellipse(ctx, 520, 360, 18, 7, '#a8a8a8');
  // base dome
  ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(450, 285, 42, Math.PI, 0); ctx.closePath(); ctx.fill();
  rect(ctx, 408, 285, 84, 8, '#d9d9d9'); rect(ctx, 440, 300, 20, 14, '#3b82f6');
  circle(ctx, 432, 258, 6, '#7cc7e8'); circle(ctx, 462, 252, 5, '#7cc7e8');
  // solar panels (RECOLOURED purple in right panel)
  ctx.save(); ctx.translate(510, 300); ctx.rotate(-0.25);
  rect(ctx, -4, -22, 8, 30, '#8b8b8b');
  rect(ctx, -26, -34, 52, 16, v ? '#8b5cf6' : '#2563eb');
  line(ctx, -13, -34, -13, -18, '#1e40af', 2); line(ctx, 0, -34, 0, -18, '#1e40af', 2); line(ctx, 13, -34, 13, -18, '#1e40af', 2);
  ctx.restore();
  // flag (RECOLOURED green stripes in right panel)
  line(ctx, 150, 250, 150, 310, '#8b8b8b', 4);
  rect(ctx, 150, 250, 40, 24, v ? '#2f9e4f' : '#e74c3c');
  rect(ctx, 150, 250, 16, 12, '#3b82f6');
  if (!v) { line(ctx, 150, 258, 190, 258, '#fff', 2); line(ctx, 150, 266, 190, 266, '#fff', 2); }
  // astronaut (FLIPPED in right panel)
  ctx.save(); ctx.translate(200, 305); ctx.scale(v ? -1 : 1, 1);
  ellipse(ctx, 0, 0, 16, 20, '#f5f0e6');
  circle(ctx, 0, -26, 11, '#f5f0e6'); circle(ctx, 3, -27, 7, '#7cc7e8');
  rect(ctx, -12, -6, 8, 10, '#3b82f6'); // chest pack
  line(ctx, -10, 16, -14, 32, '#f5f0e6', 6); line(ctx, 8, 16, 12, 32, '#f5f0e6', 6);
  line(ctx, -14, -8, -24, 2, '#f5f0e6', 5); line(ctx, 14, -8, 24, -14, '#f5f0e6', 5);
  ctx.restore();
  // rover (MOVED right in right panel)
  const rx = v ? 385 : 350;
  ctx.save(); ctx.translate(rx, 325);
  rect(ctx, -26, -14, 52, 16, '#9a9a9a'); rect(ctx, -18, -26, 22, 12, '#7a7a7a');
  circle(ctx, -16, 6, 8, '#333'); circle(ctx, 14, 6, 8, '#333');
  line(ctx, 10, -26, 22, -38, '#c0c0c0', 3); circle(ctx, 22, -38, 4, '#ffd700');
  ctx.restore();
  // rocks (one REMOVED in right panel)
  ellipse(ctx, 300, 372, 14, 7, '#a8a8a8'); ellipse(ctx, 340, 378, 10, 5, '#a8a8a8');
  if (!v) ellipse(ctx, 180, 374, 12, 6, '#a8a8a8');
  // footprints
  for (let i = 0; i < 5; i++) ellipse(ctx, 230 + i * 12, 352 + (i % 2) * 5, 4, 2.5, '#a8a8a8');
}

const MOON_DIFFS = [
  { id: 'moo-star', type: 'removed', x: 60, y: 50, r: 14, hint: 'A star blinked out' },
  { id: 'moo-flag', type: 'recoloured', x: 170, y: 262, r: 22, hint: 'The flag changed colour' },
  { id: 'moo-rover', type: 'moved', x: 350, y: 325, r: 30, hint: 'The rover rolled sideways' },
  { id: 'moo-crater', type: 'resized', x: 250, y: 352, r: 28, hint: 'A crater grew wider' },
  { id: 'moo-astro', type: 'flipped', x: 200, y: 305, r: 28, hint: 'The astronaut turned around' },
  { id: 'moo-sat', type: 'added', x: 421, y: 88, r: 22, hint: 'A satellite appeared in the sky' },
  { id: 'moo-panel', type: 'recoloured', x: 510, y: 288, r: 26, hint: 'A solar panel changed colour' },
  { id: 'moo-rock', type: 'removed', x: 180, y: 374, r: 16, hint: 'A rock is missing from the dust' },
];

// ---- Scene 6: Botanical Greenhouse ----
function drawGreenhouse(ctx, v, W, H) {
  // sky through glass
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#bfe8ff'], [0.5, '#d8f3dc'], [1, '#e9f7ef']]);
  ctx.fillRect(0, 0, W, H);
  circle(ctx, 520, 70, 28, '#ffdf6b');
  // glass dome frame
  ctx.strokeStyle = '#5a7d5a'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(20, 340); ctx.quadraticCurveTo(310, 20, 600, 340); ctx.stroke();
  for (let i = 1; i < 5; i++) {
    const a = Math.PI * i / 5;
    const x = 310 - Math.cos(a) * 290, y = 340 - Math.sin(a) * 320;
    line(ctx, 310, 340, x, y, '#5a7d5a', 3);
  }
  line(ctx, 20, 340, 600, 340, '#5a7d5a', 5);
  // path
  ctx.fillStyle = '#d9c9a8'; ctx.beginPath(); ctx.moveTo(260, 400); ctx.lineTo(300, 340); ctx.lineTo(340, 340); ctx.lineTo(380, 400); ctx.closePath(); ctx.fill();
  // hanging vines
  for (const [vx, vl] of [[120, 70], [240, 95], [480, 80]]) {
    ctx.strokeStyle = '#2f7a33'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(vx, 60); ctx.quadraticCurveTo(vx + 8, 60 + vl * 0.5, vx - 4, 60 + vl); ctx.stroke();
    ellipse(ctx, vx + 2, 60 + vl * 0.6, 7, 4, '#3d9b4f');
  }
  // potted plants (one pot RESIZED bigger in right panel)
  const pot = (px, py, s, flowerC) => {
    ctx.save(); ctx.translate(px, py); ctx.scale(s, s);
    ctx.strokeStyle = '#2f7a33'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    line(ctx, 0, 0, -8, -26, '#2f7a33', 4); line(ctx, 0, 0, 8, -30, '#2f7a33', 4); line(ctx, 0, 0, 0, -34, '#2f7a33', 4);
    ellipse(ctx, -8, -28, 7, 4, '#3d9b4f'); ellipse(ctx, 8, -32, 7, 4, '#3d9b4f');
    if (flowerC) { circle(ctx, 0, -38, 6, flowerC); circle(ctx, 0, -38, 2.5, '#ffd700'); }
    poly(ctx, [[-14, 0], [14, 0], [10, 18], [-10, 18]], '#c96f3b');
    ctx.restore();
  };
  pot(100, 330, 1, '#ff6fa0');
  pot(200, 330, 1, v ? '#3b82f6' : '#e74c3c'); // flower RECOLOURED blue in right panel
  pot(300, 330, 1, '#ffd700');
  pot(400, 330, v ? 1.5 : 1, '#ff6fa0');
  pot(500, 330, 1, '#8b5cf6');
  // leaf (RECOLOURED yellow in right panel) on the middle plant
  ellipse(ctx, 300, 296, 12, 6, v ? '#ffd700' : '#2f9e4f');
  // watering can (MOVED right in right panel)
  const wx = v ? 185 : 150;
  ctx.save(); ctx.translate(wx, 325);
  rect(ctx, -14, -12, 26, 20, '#3d9b4f'); poly(ctx, [[12, -8], [24, -16], [24, -10], [12, -2]], '#2f7a33');
  ctx.beginPath(); ctx.arc(-16, -4, 8, Math.PI * 0.5, Math.PI * 1.5); ctx.strokeStyle = '#2f7a33'; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
  // bench (REMOVED in right panel)
  if (!v) {
    rect(ctx, 330, 340, 70, 8, '#8b5a2b'); rect(ctx, 336, 348, 6, 18, '#6b4a2a'); rect(ctx, 388, 348, 6, 18, '#6b4a2a');
    rect(ctx, 330, 322, 70, 6, '#8b5a2b');
  }
  // fountain
  ellipse(ctx, 310, 360, 34, 10, '#7cc7e8'); rect(ctx, 304, 330, 12, 26, '#9a9a9a');
  circle(ctx, 310, 326, 6, '#7cc7e8');
  // butterfly (REMOVED in right panel)
  if (!v) {
    ctx.save(); ctx.translate(250, 150);
    ellipse(ctx, -8, 0, 10, 7, '#ff8c42'); ellipse(ctx, 8, 0, 10, 7, '#ff8c42');
    ellipse(ctx, -8, 6, 7, 5, '#ffd700'); ellipse(ctx, 8, 6, 7, 5, '#ffd700');
    line(ctx, 0, -6, 0, 6, '#5a4632', 2);
    ctx.restore();
  }
  // bee (FLIPPED in right panel)
  ctx.save(); ctx.translate(450, 180); ctx.scale(v ? -1 : 1, 1);
  ellipse(ctx, 0, 0, 12, 8, '#ffd700');
  line(ctx, -3, -7, -3, 7, '#222', 2); line(ctx, 3, -7, 3, 7, '#222', 2);
  circle(ctx, 12, -2, 5, '#222'); circle(ctx, 13, -3, 1.5, '#fff');
  ellipse(ctx, -2, -10, 7, 4, 'rgba(255,255,255,0.8)');
  ctx.restore();
  // bird ADDED in right panel
  if (v) {
    ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(510, 120); ctx.quadraticCurveTo(516, 113, 522, 120);
    ctx.quadraticCurveTo(528, 113, 534, 120); ctx.stroke();
  }
}

const GREEN_DIFFS = [
  { id: 'gre-butterfly', type: 'removed', x: 250, y: 150, r: 20, hint: 'A butterfly flew away' },
  { id: 'gre-flower', type: 'recoloured', x: 200, y: 292, r: 14, hint: 'A flower changed colour' },
  { id: 'gre-can', type: 'moved', x: 150, y: 325, r: 24, hint: 'The watering can moved' },
  { id: 'gre-pot', type: 'resized', x: 400, y: 330, r: 26, hint: 'A pot grew bigger' },
  { id: 'gre-bee', type: 'flipped', x: 450, y: 180, r: 18, hint: 'The bee turned around' },
  { id: 'gre-bird', type: 'added', x: 522, y: 118, r: 16, hint: 'A bird appeared in the sky' },
  { id: 'gre-leaf', type: 'recoloured', x: 300, y: 296, r: 14, hint: 'A leaf turned yellow' },
  { id: 'gre-bench', type: 'removed', x: 365, y: 340, r: 30, hint: 'The bench is gone' },
];

// ---- catalogue ----
export const SCENES = [
  { id: 'reef', name: 'Coral Reef Dive', sub: 'Underwater · 8 differences', draw: drawReef, diffs: REEF_DIFFS },
  { id: 'village', name: 'Winter Village', sub: 'Snowy night · 8 differences', draw: drawVillage, diffs: VILLAGE_DIFFS },
  { id: 'temple', name: 'Jungle Temple', sub: 'Ancient ruins · 8 differences', draw: drawTemple, diffs: TEMPLE_DIFFS },
  { id: 'oasis', name: 'Desert Oasis', sub: 'Golden dunes · 8 differences', draw: drawOasis, diffs: OASIS_DIFFS },
  { id: 'moon', name: 'Moon Base', sub: 'Lunar surface · 8 differences', draw: drawMoon, diffs: MOON_DIFFS },
  { id: 'green', name: 'Botanical Greenhouse', sub: 'Glass dome · 8 differences', draw: drawGreenhouse, diffs: GREEN_DIFFS },
];
export const TOTAL_DIFFS = SCENES.reduce((n, s) => n + s.diffs.length, 0);
