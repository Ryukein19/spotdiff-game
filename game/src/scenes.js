// Spot the Difference v2 — scene art. Every scene is drawn procedurally (canvas 2D,
// no images, no WebGL). The art now has DEPTH: each scene is built back-to-front in
// three planes (background / midground / foreground), figures further away are drawn
// smaller, every person and object casts a soft ground shadow, and foreground figures
// overlap the midground — so the picture reads as a place with space, not a flat card.
// PEOPLE are the subject now: every scene is full of original flat-vector figures
// (head, body, limbs, clothing, a distinguishing hat / bag / uniform), and at least
// half of each scene's differences are about a person (hat, bag, pose, position,
// clothing, gesture). A scene's draw(ctx, variant, W, H) draws the whole picture;
// variant 0 is the LEFT (original) panel, variant 1 the RIGHT (changed) panel.
// Each difference is one small conditional inside draw() plus one entry in the
// scene's diffs list (id, type, hit x/y/radius). Fair differences only: removed,
// recoloured, moved, resized, flipped, added.

// ---- tiny drawing helpers ----
function circle(ctx, x, y, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill, stroke, lw) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function rect(ctx, x, y, w, h, fill, stroke, lw) {
  if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.strokeRect(x, y, w, h); }
}
function poly(ctx, pts, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
}
function line(ctx, x1, y1, x2, y2, color, w) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = w || 2; ctx.stroke();
}
function star(ctx, x, y, r, fill, points) {
  const n = points || 5; ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / n - Math.PI / 2;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function text(ctx, s, x, y, size, color, align, weight) {
  ctx.font = (weight || '700') + ' ' + size + 'px system-ui, sans-serif';
  ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

// ---- depth helpers ----
// A soft ground shadow under a person or object: the single strongest depth cue.
// rx grows with the figure's scale, so near figures cast wide shadows.
function shadow(ctx, x, y, rx, ry) {
  ellipse(ctx, x, y, rx, ry || rx * 0.32, 'rgba(0,0,0,0.20)');
}
// A ground plane with a vertical gradient: lighter far away, darker close to the
// viewer. Call with the ground's top edge (horizon) and fill to the panel bottom.
function ground(ctx, y0, W, H, cFar, cNear) {
  ctx.fillStyle = grad(ctx, 0, y0, 0, H, [[0, cFar], [1, cNear]]);
  ctx.fillRect(0, y0, W, H - y0);
}

// ---- people ----
// An original person figure, drawn in code. o: {x, y (feet), s (scale), skin,
// shirt, pants, hair, hat, dress, bag, pose, dir}.
// Poses: stand, walk, wave, point, carry, sit. Scale s IS the depth cue:
// background figures are small (0.6), midground ~1.0, foreground ~1.2.
// Draw order inside the figure is back-to-front: shadow, legs, torso, arms,
// head, hair/hat, bag — so limbs never cover the face.
function person(ctx, o) {
  const s = o.s || 1, dir = o.dir || 1;
  const skin = o.skin || '#f2c89b', shirt = o.shirt || '#e74c3c', pants = o.pants || '#2e4a6b';
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s, s);
  shadow(ctx, 0, 2, 20, 6);
  // legs, or a dress with small legs under it
  if (o.dress) {
    poly(ctx, [[-11, -52], [11, -52], [16, -8], [-16, -8]], o.dress);
    line(ctx, -6, -10, -7, 0, skin, 6); line(ctx, 6, -10, 7, 0, skin, 6);
  } else if (o.pose === 'sit') {
    line(ctx, -4, -26, -15, -10, pants, 7); line(ctx, 4, -26, 15, -10, pants, 7);
    line(ctx, -15, -10, -15, 0, pants, 6); line(ctx, 15, -10, 15, 0, pants, 6);
  } else if (o.pose === 'walk') {
    line(ctx, -3, -26, -13, 0, pants, 7); line(ctx, 3, -26, 13, -3, pants, 7);
  } else {
    line(ctx, -4, -26, -7, 0, pants, 7); line(ctx, 4, -26, 7, 0, pants, 7);
  }
  // torso
  ellipse(ctx, 0, -38, 12, 15, shirt);
  // arms by pose
  if (o.pose === 'wave') {
    line(ctx, -10, -48, -16, -28, shirt, 6);
    line(ctx, 10, -48, 22, -68, shirt, 6);
    circle(ctx, 23, -69, 4, skin);
  } else if (o.pose === 'point') {
    line(ctx, -10, -48, -15, -28, shirt, 6);
    line(ctx, 10, -48, dir * 30, -48, shirt, 6);
    circle(ctx, dir * 31, -48, 3.5, skin);
  } else if (o.pose === 'carry') {
    line(ctx, -10, -48, dir * 14, -34, shirt, 6);
    line(ctx, 10, -48, dir * 16, -34, shirt, 6);
  } else if (o.pose === 'sit') {
    line(ctx, -10, -48, -14, -30, shirt, 6);
    line(ctx, 10, -48, 14, -30, shirt, 6);
  } else if (o.pose === 'walk') {
    line(ctx, -10, -48, -16, -30, shirt, 6);
    line(ctx, 10, -48, 16, -34, shirt, 6);
  } else {
    line(ctx, -10, -48, -14, -28, shirt, 6);
    line(ctx, 10, -48, 14, -28, shirt, 6);
  }
  // head + face (eyes look toward dir)
  circle(ctx, 0, -62, 10, skin);
  circle(ctx, dir * 3, -63, 1.6, '#222'); circle(ctx, dir * 7, -63, 1.6, '#222');
  // hair: a cap of colour over the top of the head
  if (o.hair) {
    ctx.fillStyle = o.hair;
    ctx.beginPath(); ctx.arc(0, -64, 10, Math.PI, 0); ctx.closePath(); ctx.fill();
  }
  // hat: brim + dome
  if (o.hat) {
    ellipse(ctx, 0, -70, 13, 4, o.hat);
    ctx.fillStyle = o.hat;
    ctx.beginPath(); ctx.arc(0, -71, 8, Math.PI, 0); ctx.closePath(); ctx.fill();
  }
  // shoulder bag
  if (o.bag) {
    rect(ctx, dir * 12, -32, 10, 14, o.bag);
    line(ctx, dir * 12, -32, dir * 8, -48, '#7a4a21', 2);
  }
  ctx.restore();
}

// A small cat sitting: body, head, ears, tail. Used as an "added" difference.
function cat(ctx, x, y, s, c) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  shadow(ctx, 0, 2, 12, 4);
  ellipse(ctx, 0, -8, 12, 9, c);
  circle(ctx, 8, -18, 7, c);
  poly(ctx, [[3, -23], [5, -30], [8, -23]], c); poly(ctx, [[10, -23], [12, -30], [14, -23]], c);
  ctx.beginPath(); ctx.moveTo(-12, -4); ctx.quadraticCurveTo(-22, -6, -20, -18);
  ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
}

// ---- Scene 1: Street Market ----
function drawMarket(ctx, v, W, H) {
  // morning sky
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#ffe3a1'], [0.5, '#ffd98a'], [1, '#f7c978']]);
  ctx.fillRect(0, 0, W, H);
  circle(ctx, 545, 62, 26, '#fff3b0');
  // a few clouds and a bird to fill the morning sky
  ellipse(ctx, 120, 70, 34, 12, '#fff'); ellipse(ctx, 150, 76, 26, 10, '#fff');
  ellipse(ctx, 330, 48, 28, 10, '#fff');
  ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(420, 90); ctx.quadraticCurveTo(426, 83, 432, 90);
  ctx.quadraticCurveTo(438, 83, 444, 90); ctx.stroke();
  // BACKGROUND: shop fronts (small, far)
  rect(ctx, 30, 130, 150, 130, '#c97b4a'); poly(ctx, [[22, 132], [105, 100], [188, 132]], '#8e44ad');
  rect(ctx, 55, 165, 34, 40, '#7cc7e8'); rect(ctx, 120, 165, 34, 40, '#7cc7e8');
  rect(ctx, 92, 205, 26, 55, '#6b3a1f');
  rect(ctx, 400, 120, 170, 140, '#5a8a6b'); poly(ctx, [[392, 122], [485, 90], [578, 122]], '#e74c3c');
  rect(ctx, 425, 160, 36, 42, '#7cc7e8'); rect(ctx, 505, 160, 36, 42, '#7cc7e8');
  // shop sign (arrow FLIPS in the right panel)
  rect(ctx, 420, 132, 130, 20, '#f5f0e6');
  if (v) { poly(ctx, [[430, 142], [448, 134], [448, 150]], '#e74c3c'); }
  else { poly(ctx, [[540, 142], [522, 134], [522, 150]], '#e74c3c'); }
  text(ctx, 'MARKET', 485, 142, 12, '#2b2b26');
  // cobble ground (gradient = depth)
  ground(ctx, 260, W, H, '#d9b98a', '#b98f5f');
  // background shoppers (small, far away)
  person(ctx, { x: 430, y: 268, s: 0.6, skin: '#e8b88a', shirt: v ? '#facc15' : '#3b82f6', pants: '#3a3a3a', hair: '#222', pose: 'walk', dir: -1 });
  person(ctx, { x: 500, y: 262, s: 0.58, skin: '#f2c89b', shirt: '#2fae5f', pants: '#5a4632', hair: '#7a4a21', pose: 'walk', dir: 1 });
  // MIDGROUND: fruit stall (left-centre)
  rect(ctx, 120, 288, 130, 12, '#8b5a2b'); // stall counter
  rect(ctx, 128, 300, 8, 40, '#6b4a2a'); rect(ctx, 234, 300, 8, 40, '#6b4a2a');
  // awning (RESIZED longer in the right panel)
  const awW = v ? 150 : 130;
  poly(ctx, [[115, 250], [135 + (awW - 130) / 2, 222], [245, 222], [255, 250]], '#e74c3c');
  for (let i = 0; i < 5; i++) rect(ctx, 118 + i * 26, 222, 12, 28, i % 2 ? '#f5f0e6' : '#e74c3c');
  // fruit piles on the stall
  circle(ctx, 150, 280, 8, '#ff5a3c'); circle(ctx, 165, 280, 8, '#ff5a3c'); circle(ctx, 157, 270, 8, '#ff5a3c');
  circle(ctx, 210, 280, 8, '#facc15'); circle(ctx, 225, 280, 8, '#facc15');
  // an extra basket of fruit ADDED in the right panel
  if (v) { rect(ctx, 185, 276, 22, 12, '#8b5a2b'); circle(ctx, 192, 274, 5, '#8b5cf6'); circle(ctx, 200, 274, 5, '#8b5cf6'); }
  // vendor behind the stall (midground)
  person(ctx, { x: 185, y: 296, s: 1.0, skin: '#e8b88a', shirt: '#2fae5f', pants: '#3a3a3a', hair: '#222', hat: v ? '#e74c3c' : '#e8c87a', pose: 'stand', dir: 1 });
  // flower stall (right, midground)
  rect(ctx, 380, 300, 110, 10, '#8b5a2b');
  rect(ctx, 388, 310, 8, 34, '#6b4a2a'); rect(ctx, 474, 310, 8, 34, '#6b4a2a');
  poly(ctx, [[375, 268], [395, 246], [475, 246], [495, 268]], '#8b5cf6');
  circle(ctx, 400, 292, 7, '#ff6fa0'); circle(ctx, 420, 290, 7, '#ffd700'); circle(ctx, 440, 292, 7, '#ff6fa0');
  circle(ctx, 460, 290, 7, '#e74c3c'); circle(ctx, 478, 292, 7, '#ffd700');
  // shopper woman (midground, centre) — her red bag is REMOVED in the right panel
  person(ctx, { x: 330, y: 332, s: 1.05, skin: '#f2c89b', shirt: '#3b82f6', dress: '#3b82f6', hair: '#5a3a21', bag: v ? null : '#e74c3c', pose: 'walk', dir: 1 });
  // FOREGROUND: kid pointing at the fruit (big, close) — MOVED right in the right panel
  const kx = v ? 120 : 95;
  person(ctx, { x: kx, y: 358, s: 1.15, skin: '#f2c89b', shirt: '#e74c3c', pants: '#2e4a6b', hair: '#222', pose: 'point', dir: 1 });
  // FOREGROUND: old man with a cane (big, close) — cane FLIPS side in the right panel
  person(ctx, { x: 520, y: 352, s: 1.1, skin: '#e8b88a', shirt: '#7a6a8a', pants: '#3a3a3a', hair: '#d9d9d9', hat: '#5a4632', pose: 'stand', dir: -1 });
  line(ctx, v ? 505 : 535, 320, v ? 500 : 540, 350, '#8b5a2b', 4); // cane
  circle(ctx, v ? 505 : 535, 318, 3, '#ffd700');
  // cat ADDED in the right panel, sitting by the stall
  if (v) cat(ctx, 262, 352, 1, '#e8a33d');
  // foreground shadows under the big figures
  shadow(ctx, 95, 360, 26, 8); shadow(ctx, 520, 354, 26, 8);
}

const MARKET_DIFFS = [
  { id: 'mar-hat', type: 'recoloured', x: 185, y: 228, r: 20, hint: 'The vendor\u2019s hat changed colour' },
  { id: 'mar-bag', type: 'removed', x: 344, y: 312, r: 18, hint: 'The shopper\u2019s bag is gone' },
  { id: 'mar-kid', type: 'moved', x: 95, y: 322, r: 32, hint: 'The pointing boy shuffled sideways' },
  { id: 'mar-cane', type: 'flipped', x: 520, y: 334, r: 26, hint: 'The old man\u2019s cane swapped sides' },
  { id: 'mar-bgshirt', type: 'recoloured', x: 430, y: 238, r: 18, hint: 'A far shopper\u2019s shirt changed colour' },
  { id: 'mar-awning', type: 'resized', x: 185, y: 236, r: 28, hint: 'The stall awning grew wider' },
  { id: 'mar-fruit', type: 'added', x: 196, y: 280, r: 20, hint: 'A new basket of fruit appeared' },
  { id: 'mar-sign', type: 'flipped', x: 485, y: 142, r: 22, hint: 'The shop sign\u2019s arrow points the other way' },
];

// ---- Scene 2: Beach Day ----
function drawBeach(ctx, v, W, H) {
  // sky + sun
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#7cc7e8'], [0.4, '#a8dcf0'], [1, '#e8f7ff']]);
  ctx.fillRect(0, 0, W, H);
  circle(ctx, 520, 60, 28, '#ffdf6b');
  ellipse(ctx, 120, 70, 34, 12, '#fff'); ellipse(ctx, 150, 76, 26, 10, '#fff');
  ellipse(ctx, 340, 50, 28, 10, '#fff');
  // sea (background plane)
  ctx.fillStyle = grad(ctx, 0, 150, 0, 285, [[0, '#2f9fd8'], [1, '#4db2e8']]);
  ctx.fillRect(0, 150, W, 135);
  // waves
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [wx, wy] of [[80, 200], [200, 230], [320, 195], [450, 235], [540, 200]]) {
    ctx.beginPath(); ctx.moveTo(wx - 22, wy); ctx.quadraticCurveTo(wx, wy - 8, wx + 22, wy); ctx.stroke();
  }
  // swimmer in the sea (REMOVED in the right panel)
  if (!v) {
    circle(ctx, 380, 212, 9, '#f2c89b');
    line(ctx, 370, 218, 358, 200, '#f2c89b', 5); line(ctx, 390, 218, 402, 200, '#f2c89b', 5);
    circle(ctx, 358, 198, 4, '#fff'); circle(ctx, 402, 198, 4, '#fff');
  }
  // sand (foreground plane, darker = closer)
  ground(ctx, 285, W, H, '#f2d8a0', '#e0bd7a');
  // lifeguard tower (midground) + lifeguard on top
  line(ctx, 70, 300, 80, 208, '#8b5a2b', 6); line(ctx, 110, 300, 100, 208, '#8b5a2b', 6);
  line(ctx, 72, 260, 108, 260, '#8b5a2b', 4);
  rect(ctx, 68, 200, 44, 10, '#e74c3c');
  person(ctx, { x: 90, y: 202, s: 0.9, skin: '#e8b88a', shirt: '#f5f0e6', pants: '#e74c3c', hair: '#222', hat: v ? '#3b82f6' : '#e74c3c', pose: 'sit', dir: 1 });
  // umbrella (midground) — canopy RECOLOURED in the right panel
  line(ctx, 480, 340, 480, 268, '#8b5a2b', 5);
  ctx.fillStyle = v ? '#2bb3a3' : '#e74c3c';
  ctx.beginPath(); ctx.arc(480, 268, 46, Math.PI, 0); ctx.closePath(); ctx.fill();
  poly(ctx, [[448, 268], [462, 268], [470, 232]], '#f5f0e6');
  poly(ctx, [[480, 268], [494, 268], [486, 228]], '#f5f0e6');
  // sandcastle (midground) — flag ADDED in the right panel
  rect(ctx, 275, 322, 52, 28, '#e8cf9a');
  rect(ctx, 280, 306, 14, 18, '#e8cf9a'); rect(ctx, 308, 306, 14, 18, '#e8cf9a');
  circle(ctx, 287, 304, 7, '#e8cf9a'); circle(ctx, 315, 304, 7, '#e8cf9a');
  if (v) { line(ctx, 301, 300, 301, 276, '#8b5a2b', 3); poly(ctx, [[301, 276], [322, 282], [301, 288]], '#ff5a3c'); }
  // kid building the castle (midground, sitting) — bucket MOVED in the right panel
  person(ctx, { x: 280, y: 348, s: 0.9, skin: '#f2c89b', shirt: '#facc15', pants: '#2e6db4', hair: '#5a3a21', pose: 'sit', dir: -1 });
  const bkx = v ? 288 : 262;
  rect(ctx, bkx - 8, 342, 16, 14, '#e74c3c'); rect(ctx, bkx - 8, 342, 16, 4, '#c0392b');
  // sunbather lying on a towel (foreground) — towel RESIZED longer in the right panel
  const towelW = v ? 95 : 70;
  rect(ctx, 140, 352, towelW, 16, '#ff6fa0');
  shadow(ctx, 185, 370, 45, 7);
  ellipse(ctx, 178, 348, 26, 9, '#f2c89b'); // torso
  ellipse(ctx, 178, 348, 12, 8, '#3b82f6'); // swimsuit
  circle(ctx, 150, 346, 8, '#f2c89b'); // head
  ctx.fillStyle = '#5a3a21'; ctx.beginPath(); ctx.arc(150, 344, 8, Math.PI, 0); ctx.closePath(); ctx.fill();
  line(ctx, 200, 348, 228, 344, '#f2c89b', 7); line(ctx, 200, 350, 228, 354, '#f2c89b', 7); // legs
  // dad with a beach ball (foreground, big) — ball RECOLOURED in the right panel
  person(ctx, { x: 540, y: 352, s: 1.15, skin: '#e8b88a', shirt: '#2fae5f', pants: '#2e4a6b', hair: '#222', pose: 'carry', dir: -1 });
  circle(ctx, 522, 308, 14, v ? '#3b82f6' : '#e74c3c');
  ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.arc(522, 308, 14, Math.PI * 1.15, Math.PI * 1.6); ctx.closePath(); ctx.fill();
  // crab (REMOVED in the right panel)
  if (!v) {
    ellipse(ctx, 430, 376, 10, 7, '#ff5a3c');
    circle(ctx, 424, 372, 2, '#222'); circle(ctx, 434, 372, 2, '#222');
    line(ctx, 420, 378, 412, 382, '#ff5a3c', 3); line(ctx, 440, 378, 448, 382, '#ff5a3c', 3);
  }
}

const BEACH_DIFFS = [
  { id: 'bea-cap', type: 'recoloured', x: 90, y: 137, r: 18, hint: 'The lifeguard\u2019s cap changed colour' },
  { id: 'bea-swimmer', type: 'removed', x: 380, y: 210, r: 22, hint: 'The swimmer is gone from the sea' },
  { id: 'bea-bucket', type: 'moved', x: 262, y: 350, r: 28, hint: 'The kid\u2019s bucket moved to the other side' },
  { id: 'bea-ball', type: 'recoloured', x: 522, y: 308, r: 20, hint: 'The beach ball changed colour' },
  { id: 'bea-towel', type: 'resized', x: 175, y: 360, r: 24, hint: 'The sunbather\u2019s towel grew longer' },
  { id: 'bea-umbrella', type: 'recoloured', x: 480, y: 255, r: 30, hint: 'The beach umbrella changed colour' },
  { id: 'bea-flag', type: 'added', x: 300, y: 288, r: 16, hint: 'A flag appeared on the sandcastle' },
  { id: 'bea-crab', type: 'removed', x: 430, y: 376, r: 16, hint: 'The crab scuttled away' },
];

// ---- Scene 3: City Park ----
function drawPark(ctx, v, W, H) {
  // sky
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#8fd0f0'], [0.5, '#c8ecf7'], [1, '#e8f7e8']]);
  ctx.fillRect(0, 0, W, H);
  circle(ctx, 90, 60, 26, '#ffdf6b');
  ellipse(ctx, 300, 60, 30, 10, '#fff'); ellipse(ctx, 480, 90, 26, 9, '#fff');
  // BACKGROUND: big trees (far, smaller) — right tree RECOLOURED autumn in the right panel
  const tree = (tx, ty, s, leaf) => {
    ctx.save(); ctx.translate(tx, ty); ctx.scale(s, s);
    rect(ctx, -6, 0, 12, 40, '#7a4a21');
    circle(ctx, 0, -30, 28, leaf); circle(ctx, -22, -12, 20, leaf); circle(ctx, 22, -12, 20, leaf);
    ctx.restore();
  };
  tree(60, 250, 1.1, '#2f9e4f');
  tree(560, 245, 1.15, v ? '#e8862a' : '#2f9e4f');
  tree(150, 240, 0.8, '#3d9b4f'); tree(470, 238, 0.8, '#3d9b4f');
  // lawn (foreground plane)
  ground(ctx, 240, W, H, '#7cc76a', '#4e9b47');
  // path (diagonal, leads the eye into the scene = depth)
  poly(ctx, [[0, 400], [120, 400], [300, 250], [260, 250]], '#d9c9a8');
  // pond (right)
  ellipse(ctx, 500, 342, 62, 18, '#4db2e8'); ellipse(ctx, 500, 340, 44, 12, '#7cc7e8');
  // duck ADDED in the right panel
  if (v) {
    ellipse(ctx, 500, 336, 12, 8, '#f5f0e6');
    circle(ctx, 510, 330, 6, '#f5f0e6'); poly(ctx, [[515, 330], [521, 332], [515, 334]], '#ff9f1c');
  }
  // bench + old man reading (midground) — newspaper FLIPPED in the right panel
  rect(ctx, 428, 292, 74, 8, '#8b5a2b'); rect(ctx, 434, 300, 6, 20, '#6b4a2a'); rect(ctx, 490, 300, 6, 20, '#6b4a2a');
  rect(ctx, 428, 268, 74, 6, '#8b5a2b');
  person(ctx, { x: 465, y: 294, s: 0.85, skin: '#e8b88a', shirt: '#5a6a8a', pants: '#3a3a3a', hair: '#d9d9d9', pose: 'sit', dir: -1 });
  ctx.save(); ctx.translate(452, 252); ctx.rotate(v ? 0.35 : -0.35);
  rect(ctx, -14, -12, 28, 24, '#f5f0e6'); line(ctx, 0, -12, 0, 12, '#b8b8b8', 2); ctx.restore();
  // picnic blanket (midground) + mom + kid + basket
  rect(ctx, 128, 336, 92, 12, '#e74c3c');
  rect(ctx, 150, 336, 12, 12, '#f5f0e6'); rect(ctx, 186, 336, 12, 12, '#f5f0e6');
  person(ctx, { x: 158, y: 336, s: 0.95, skin: '#f2c89b', shirt: '#ff8fb3', dress: '#ff8fb3', hair: '#5a3a21', pose: 'sit', dir: 1 });
  person(ctx, { x: 208, y: 340, s: 0.75, skin: '#f2c89b', shirt: '#3b82f6', pants: '#2e4a6b', hair: '#222', pose: 'stand', dir: -1 });
  // basket (RESIZED bigger in the right panel)
  const bkS = v ? 1.35 : 1;
  ctx.save(); ctx.translate(185, 352); ctx.scale(bkS, bkS);
  rect(ctx, -12, -10, 24, 14, '#a06a35'); rect(ctx, -12, -10, 24, 4, '#8b5a2b');
  ctx.beginPath(); ctx.arc(0, -10, 8, Math.PI, 0); ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  // swing set (midground) — the swing MOVES sideways in the right panel
  line(ctx, 280, 180, 268, 322, '#5a5a5a', 5); line(ctx, 340, 180, 352, 322, '#5a5a5a', 5);
  line(ctx, 272, 180, 348, 180, '#5a5a5a', 5);
  const swX = v ? 345 : 320;
  line(ctx, swX - 12, 180, swX - 12, 296, '#3a3a3a', 3); line(ctx, swX + 12, 180, swX + 12, 296, '#3a3a3a', 3);
  rect(ctx, swX - 16, 296, 32, 6, '#8b5a2b');
  person(ctx, { x: swX, y: 298, s: 0.9, skin: '#e8b88a', shirt: '#facc15', pants: '#e74c3c', hair: '#222', pose: 'sit', dir: 1 });
  // jogger (foreground, big, close)
  person(ctx, { x: 450, y: 356, s: 1.2, skin: '#e8b88a', shirt: v ? '#2fae5f' : '#e74c3c', pants: '#2e4a6b', hair: '#222', pose: 'walk', dir: 1 });
  // dog walker (foreground left) — hat REMOVED in the right panel
  person(ctx, { x: 80, y: 352, s: 1.1, skin: '#f2c89b', shirt: '#8b5cf6', pants: '#3a3a3a', hair: '#7a4a21', hat: v ? null : '#3b82f6', pose: 'walk', dir: 1 });
  // the walker's dog
  ellipse(ctx, 116, 356, 14, 9, '#c08a4b');
  circle(ctx, 128, 350, 7, '#c08a4b'); poly(ctx, [[126, 344], [128, 338], [131, 344]], '#c08a4b');
  line(ctx, 104, 352, 96, 344, '#c08a4b', 4);
  line(ctx, 108, 364, 108, 372, '#c08a4b', 4); line(ctx, 122, 364, 122, 372, '#c08a4b', 4);
  // flower bed (REMOVED in the right panel)
  if (!v) {
    for (const [fx, fy, fc] of [[330, 372, '#ff6fa0'], [344, 376, '#ffd700'], [358, 372, '#e74c3c']]) {
      circle(ctx, fx, fy, 5, fc); circle(ctx, fx, fy, 2, '#ffd700');
    }
  }
}

const PARK_DIFFS = [
  { id: 'par-shirt', type: 'recoloured', x: 450, y: 310, r: 28, hint: 'The jogger\u2019s shirt changed colour' },
  { id: 'par-hat', type: 'removed', x: 80, y: 273, r: 18, hint: 'The dog walker\u2019s hat is gone' },
  { id: 'par-swing', type: 'moved', x: 320, y: 270, r: 30, hint: 'The swing kid swung to the other side' },
  { id: 'par-basket', type: 'resized', x: 185, y: 350, r: 22, hint: 'The picnic basket grew bigger' },
  { id: 'par-paper', type: 'flipped', x: 452, y: 252, r: 20, hint: 'The old man\u2019s newspaper flipped over' },
  { id: 'par-tree', type: 'recoloured', x: 560, y: 205, r: 30, hint: 'A tree turned autumn orange' },
  { id: 'par-duck', type: 'added', x: 500, y: 335, r: 16, hint: 'A duck appeared on the pond' },
  { id: 'par-flowers', type: 'removed', x: 344, y: 374, r: 20, hint: 'The flower bed is gone' },
];

// ---- Scene 4: Train Station ----
function drawStation(ctx, v, W, H) {
  // covered platform: wall + roof beams
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#e8dcc8'], [0.5, '#d9c9a8'], [1, '#c9b48a']]);
  ctx.fillRect(0, 0, W, H);
  rect(ctx, 0, 0, W, 26, '#5a4a3a');
  for (let bx = 40; bx < 620; bx += 120) rect(ctx, bx, 26, 14, 60, '#5a4a3a');
  // big station clock (RESIZED bigger in the right panel)
  const clkR = v ? 32 : 24;
  circle(ctx, 450, 112, clkR, '#f5f0e6', '#2b2b26', 4);
  line(ctx, 450, 112, 450, 112 - clkR * 0.6, '#2b2b26', 3);
  line(ctx, 450, 112, 450 + clkR * 0.45, 112, '#2b2b26', 3);
  // train (background, left) — door RECOLOURED in the right panel
  rect(ctx, 40, 190, 260, 95, '#3b82f6');
  rect(ctx, 40, 190, 260, 18, '#2563eb');
  for (let wx = 60; wx < 280; wx += 44) rect(ctx, wx, 215, 30, 30, '#bfe8ff', '#1e40af', 2);
  rect(ctx, 245, 215, 30, 70, v ? '#facc15' : '#2563eb', '#1e40af', 2);
  circle(ctx, 80, 292, 12, '#222'); circle(ctx, 140, 292, 12, '#222'); circle(ctx, 260, 292, 12, '#222');
  // ticket window (background, right) + queue
  rect(ctx, 500, 190, 90, 80, '#8b5a2b'); rect(ctx, 515, 205, 60, 40, '#7cc7e8', '#5a3a21', 3);
  text(ctx, 'TICKETS', 545, 258, 11, '#f5f0e6');
  person(ctx, { x: 505, y: 278, s: 0.6, skin: '#f2c89b', shirt: '#e74c3c', pants: '#2e4a6b', hair: '#222', pose: 'stand', dir: -1 });
  // one queue person REMOVED in the right panel
  if (!v) person(ctx, { x: 535, y: 282, s: 0.6, skin: '#e8b88a', shirt: '#2fae5f', pants: '#3a3a3a', hair: '#7a4a21', pose: 'stand', dir: -1 });
  // platform floor (foreground plane)
  ground(ctx, 300, W, H, '#c9b48a', '#a8895f');
  line(ctx, 0, 302, W, 302, '#f5f0e6', 4); // platform edge line
  // conductor (midground) — flag RECOLOURED in the right panel
  person(ctx, { x: 330, y: 300, s: 1.0, skin: '#e8b88a', shirt: '#2e4a6b', pants: '#2e4a6b', hair: '#222', hat: '#2e4a6b', pose: 'wave', dir: 1 });
  line(ctx, 352, 232, 352, 208, '#8b5a2b', 3);
  poly(ctx, [[352, 208], [374, 214], [352, 220]], v ? '#2fae5f' : '#e74c3c');
  // woman waving goodbye (midground) — gesture FLIPS to pointing in the right panel
  person(ctx, { x: 430, y: 300, s: 1.0, skin: '#f2c89b', shirt: '#ff8fb3', dress: '#ff8fb3', hair: '#5a3a21', pose: v ? 'point' : 'wave', dir: -1 });
  // traveler with a suitcase (foreground, big) — suitcase REMOVED in the right panel
  person(ctx, { x: 180, y: 352, s: 1.15, skin: '#f2c89b', shirt: '#facc15', pants: '#2e4a6b', hair: '#222', pose: 'walk', dir: 1 });
  if (!v) {
    rect(ctx, 206, 330, 22, 26, '#8b5cf6'); rect(ctx, 206, 330, 22, 6, '#6d28d9');
    line(ctx, 212, 330, 212, 322, '#8b5a2b', 3);
    circle(ctx, 210, 358, 3, '#222'); circle(ctx, 224, 358, 3, '#222');
  }
  // kid with a backpack (foreground) — backpack MOVED to the front in the right panel
  person(ctx, { x: 540, y: 346, s: 0.95, skin: '#e8b88a', shirt: '#3b82f6', pants: '#e74c3c', hair: '#222', pose: 'stand', dir: -1 });
  const pkx = v ? 528 : 552;
  rect(ctx, pkx - 8, 296, 16, 20, '#2fae5f'); rect(ctx, pkx - 8, 296, 16, 5, '#1f7a33');
  // pigeon ADDED in the right panel
  if (v) {
    ellipse(ctx, 250, 370, 10, 7, '#8a8a8a');
    circle(ctx, 259, 365, 5, '#8a8a8a'); poly(ctx, [[263, 365], [268, 367], [263, 368]], '#ff9f1c');
    line(ctx, 246, 376, 244, 382, '#5a5a5a', 2); line(ctx, 252, 376, 252, 382, '#5a5a5a', 2);
  }
}

const STATION_DIFFS = [
  { id: 'sta-flag', type: 'recoloured', x: 360, y: 214, r: 18, hint: 'The conductor\u2019s flag changed colour' },
  { id: 'sta-case', type: 'removed', x: 217, y: 344, r: 20, hint: 'The traveler\u2019s suitcase is gone' },
  { id: 'sta-wave', type: 'flipped', x: 430, y: 260, r: 28, hint: 'The waving woman is pointing now' },
  { id: 'sta-pack', type: 'moved', x: 552, y: 306, r: 26, hint: 'The kid\u2019s backpack moved to his front' },
  { id: 'sta-queue', type: 'removed', x: 535, y: 245, r: 18, hint: 'Someone left the ticket queue' },
  { id: 'sta-clock', type: 'resized', x: 450, y: 112, r: 30, hint: 'The station clock grew bigger' },
  { id: 'sta-door', type: 'recoloured', x: 260, y: 250, r: 24, hint: 'The train door changed colour' },
  { id: 'sta-pigeon', type: 'added', x: 250, y: 370, r: 14, hint: 'A pigeon landed on the platform' },
];

// ---- Scene 5: Night Festival ----
function drawFestival(ctx, v, W, H) {
  // night sky
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#141433'], [0.55, '#2a2a5e'], [1, '#4a2a6e']]);
  ctx.fillRect(0, 0, W, H);
  for (const [sx, sy] of [[60, 50], [140, 90], [220, 40], [330, 70], [430, 45], [560, 140], [90, 140], [380, 120], [480, 60], [260, 130], [40, 200], [590, 90]]) {
    star(ctx, sx, sy, 4, '#fff');
  }
  circle(ctx, 90, 60, 24, '#fdf6d8');
  // firework ADDED in the right panel
  if (v) {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      line(ctx, 150, 80, 150 + Math.cos(a) * 26, 80 + Math.sin(a) * 26, i % 2 ? '#ffd700' : '#ff6fa0', 3);
    }
    circle(ctx, 150, 80, 5, '#fff');
  }
  // lantern strings (background)
  line(ctx, 0, 100, W, 80, '#3a3a3a', 2);
  for (let lx = 60; lx < 620; lx += 90) {
    ellipse(ctx, lx, 112, 10, 13, lx % 180 === 60 ? '#ff5a3c' : '#ffd700');
    line(ctx, lx, 100, lx, 100, '#3a3a3a', 1);
  }
  // big lantern (RESIZED bigger in the right panel)
  const blR = v ? 24 : 16;
  ellipse(ctx, 480, 130, blR, blR * 1.25, '#ff5a3c');
  ellipse(ctx, 480, 130, blR * 0.55, blR * 0.8, '#ffd700');
  line(ctx, 480, 108, 480, 96, '#3a3a3a', 2);
  // ground
  ground(ctx, 300, W, H, '#3a2a5e', '#241a3e');
  // stage (midground, left) — banner RECOLOURED in the right panel
  rect(ctx, 80, 280, 170, 12, '#8b5a2b'); rect(ctx, 88, 292, 8, 40, '#6b4a2a'); rect(ctx, 234, 292, 8, 40, '#6b4a2a');
  rect(ctx, 100, 222, 120, 22, v ? '#8b5cf6' : '#e74c3c');
  text(ctx, 'FESTIVAL', 160, 233, 13, '#f5f0e6');
  // musician with a drum on the stage — drum REMOVED in the right panel
  person(ctx, { x: 160, y: 280, s: 0.95, skin: '#e8b88a', shirt: '#facc15', pants: '#2e4a6b', hair: '#222', pose: 'stand', dir: 1 });
  if (!v) {
    ellipse(ctx, 188, 288, 14, 10, '#c0392b'); ellipse(ctx, 188, 280, 14, 5, '#f5f0e6');
    line(ctx, 172, 278, 164, 266, '#8b5a2b', 3); line(ctx, 204, 278, 212, 266, '#8b5a2b', 3);
  }
  // food stall (midground, right) + vendor — apron RECOLOURED in the right panel
  rect(ctx, 420, 300, 140, 10, '#8b5a2b'); rect(ctx, 428, 310, 8, 34, '#6b4a2a'); rect(ctx, 544, 310, 8, 34, '#6b4a2a');
  poly(ctx, [[415, 272], [435, 248], [545, 248], [565, 272]], '#e74c3c');
  circle(ctx, 445, 292, 7, '#ff6fa0'); circle(ctx, 465, 290, 7, '#ffd700'); circle(ctx, 485, 292, 7, '#ff6fa0');
  person(ctx, { x: 490, y: 300, s: 1.0, skin: '#f2c89b', shirt: v ? '#3b82f6' : '#e74c3c', pants: '#3a3a3a', hair: '#222', hat: '#f5f0e6', pose: 'stand', dir: -1 });
  // crowd dancing (background, small) — one dancer REMOVED in the right panel
  person(ctx, { x: 250, y: 292, s: 0.6, skin: '#f2c89b', shirt: '#ff8fb3', pants: '#2e4a6b', hair: '#5a3a21', pose: 'wave', dir: 1 });
  if (!v) person(ctx, { x: 380, y: 288, s: 0.65, skin: '#e8b88a', shirt: '#2fae5f', pants: '#3a3a3a', hair: '#222', pose: 'wave', dir: -1 });
  person(ctx, { x: 420, y: 292, s: 0.6, skin: '#f2c89b', shirt: '#8b5cf6', pants: '#2e4a6b', hair: '#222', pose: 'wave', dir: 1 });
  // dancer with a fan (midground, centre) — fan RECOLOURED in the right panel
  person(ctx, { x: 310, y: 302, s: 1.05, skin: '#f2c89b', shirt: '#e74c3c', dress: '#e74c3c', hair: '#222', pose: 'wave', dir: 1 });
  ctx.fillStyle = v ? '#ffd700' : '#ff6fa0';
  ctx.beginPath(); ctx.arc(335, 226, 12, Math.PI, 0); ctx.closePath(); ctx.fill();
  line(ctx, 335, 226, 335, 240, '#8b5a2b', 2);
  // kid with a lantern (foreground, big) — lantern MOVED in the right panel
  person(ctx, { x: 90, y: 356, s: 1.1, skin: '#f2c89b', shirt: '#2fae5f', pants: '#2e4a6b', hair: '#222', pose: 'carry', dir: 1 });
  const lkx = v ? 128 : 105;
  ellipse(ctx, lkx, 312, 9, 12, '#ff5a3c');
  ellipse(ctx, lkx, 312, 5, 8, '#ffd700');
  line(ctx, lkx, 300, lkx, 296, '#3a3a3a', 2);
}

const FESTIVAL_DIFFS = [
  { id: 'fes-fan', type: 'recoloured', x: 335, y: 226, r: 18, hint: 'The dancer\u2019s fan changed colour' },
  { id: 'fes-drum', type: 'removed', x: 188, y: 284, r: 20, hint: 'The musician\u2019s drum is gone' },
  { id: 'fes-lantern', type: 'moved', x: 105, y: 312, r: 24, hint: 'The kid\u2019s lantern moved to the other hand' },
  { id: 'fes-apron', type: 'recoloured', x: 490, y: 262, r: 22, hint: 'The food vendor\u2019s apron changed colour' },
  { id: 'fes-crowd', type: 'removed', x: 380, y: 252, r: 20, hint: 'A dancer left the crowd' },
  { id: 'fes-biglantern', type: 'resized', x: 480, y: 130, r: 26, hint: 'The big lantern grew bigger' },
  { id: 'fes-banner', type: 'recoloured', x: 160, y: 233, r: 24, hint: 'The stage banner changed colour' },
  { id: 'fes-firework', type: 'added', x: 150, y: 80, r: 20, hint: 'A firework burst in the sky' },
];

// ---- Scene 6: Cozy Café ----
function drawCafe(ctx, v, W, H) {
  // warm interior wall
  ctx.fillStyle = grad(ctx, 0, 0, 0, H, [[0, '#f7e3c0'], [0.6, '#eecfa0'], [1, '#dfb57e']]);
  ctx.fillRect(0, 0, W, H);
  // window (background, left) with a street view — curtain RECOLOURED in the right panel
  rect(ctx, 60, 80, 160, 150, '#bfe8ff', '#8b5a2b', 5);
  rect(ctx, 80, 200, 50, 30, '#c97b4a'); rect(ctx, 150, 190, 60, 40, '#5a8a6b');
  circle(ctx, 200, 110, 16, '#ffdf6b');
  rect(ctx, 56, 76, 16, 158, v ? '#2bb3a3' : '#e74c3c'); // curtain
  rect(ctx, 208, 76, 16, 158, v ? '#2bb3a3' : '#e74c3c');
  // wall clock (REMOVED in the right panel)
  if (!v) {
    circle(ctx, 520, 110, 20, '#f5f0e6', '#2b2b26', 3);
    line(ctx, 520, 110, 520, 96, '#2b2b26', 2); line(ctx, 520, 110, 530, 114, '#2b2b26', 2);
  }
  // plant ADDED in the right panel, by the window
  if (v) {
    ctx.strokeStyle = '#2f7a33'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    line(ctx, 250, 230, 242, 200, '#2f7a33', 4); line(ctx, 250, 230, 250, 196, '#2f7a33', 4); line(ctx, 250, 230, 258, 202, '#2f7a33', 4);
    ellipse(ctx, 242, 198, 8, 5, '#3d9b4f'); ellipse(ctx, 250, 194, 8, 5, '#3d9b4f'); ellipse(ctx, 258, 200, 8, 5, '#3d9b4f');
    poly(ctx, [[240, 230], [260, 230], [256, 246], [244, 246]], '#c96f3b');
  }
  // wooden floor (foreground plane)
  ground(ctx, 300, W, H, '#d9b98a', '#b98f5f');
  // counter (midground, right) + barista — apron RECOLOURED in the right panel
  rect(ctx, 400, 280, 200, 60, '#8b5a2b'); rect(ctx, 400, 280, 200, 10, '#a06a35');
  rect(ctx, 420, 300, 30, 24, '#f5f0e6'); rect(ctx, 470, 300, 30, 24, '#f5f0e6'); rect(ctx, 520, 300, 30, 24, '#f5f0e6');
  person(ctx, { x: 500, y: 282, s: 1.0, skin: '#e8b88a', shirt: v ? '#2fae5f' : '#8b5a2b', pants: '#3a3a3a', hair: '#222', hat: '#f5f0e6', pose: 'stand', dir: -1 });
  // window table + man with coffee (midground) — cup MOVED in the right panel
  ellipse(ctx, 220, 296, 46, 8, '#6b4a2a');
  rect(ctx, 214, 304, 6, 30, '#6b4a2a'); rect(ctx, 226, 304, 6, 30, '#6b4a2a');
  person(ctx, { x: 185, y: 300, s: 0.85, skin: '#f2c89b', shirt: '#5a6a8a', pants: '#3a3a3a', hair: '#d9d9d9', pose: 'sit', dir: 1 });
  const cupx = v ? 215 : 240;
  rect(ctx, cupx - 6, 282, 12, 12, '#f5f0e6'); rect(ctx, cupx + 6, 286, 5, 6, '#f5f0e6');
  // reading table (midground, left) + woman — book FLIPPED in the right panel
  ellipse(ctx, 120, 316, 52, 9, '#6b4a2a');
  rect(ctx, 112, 324, 6, 34, '#6b4a2a'); rect(ctx, 128, 324, 6, 34, '#6b4a2a');
  person(ctx, { x: 150, y: 318, s: 0.95, skin: '#f2c89b', shirt: '#8b5cf6', dress: '#8b5cf6', hair: '#5a3a21', pose: 'sit', dir: -1 });
  ctx.save(); ctx.translate(132, 272); ctx.rotate(v ? 0.3 : -0.3);
  rect(ctx, -13, -11, 26, 22, '#3b82f6'); line(ctx, 0, -11, 0, 11, '#f5f0e6', 2); ctx.restore();
  // waiter with a tray (foreground, big) — tray REMOVED in the right panel
  person(ctx, { x: 300, y: 352, s: 1.15, skin: '#e8b88a', shirt: '#2e4a6b', pants: '#2e4a6b', hair: '#222', pose: 'carry', dir: 1 });
  if (!v) {
    ellipse(ctx, 318, 312, 20, 6, '#c0c0c8');
    rect(ctx, 310, 304, 8, 8, '#f5f0e6'); rect(ctx, 322, 304, 8, 8, '#e74c3c');
  }
  // kid with a cake (foreground, right) — cake RESIZED bigger in the right panel
  person(ctx, { x: 450, y: 356, s: 0.9, skin: '#f2c89b', shirt: '#facc15', pants: '#e74c3c', hair: '#222', pose: 'sit', dir: -1 });
  const ckR = v ? 13 : 8;
  ellipse(ctx, 470, 342, ckR, ckR * 0.8, '#ff8fb3');
  rect(ctx, 470 - ckR, 342, ckR * 2, 8, '#e74c3c');
  circle(ctx, 470, 334, 3, '#ffd700');
}

const CAFE_DIFFS = [
  { id: 'caf-apron', type: 'recoloured', x: 500, y: 244, r: 22, hint: 'The barista\u2019s apron changed colour' },
  { id: 'caf-tray', type: 'removed', x: 318, y: 310, r: 20, hint: 'The waiter\u2019s tray is gone' },
  { id: 'caf-book', type: 'flipped', x: 132, y: 272, r: 18, hint: 'The reader\u2019s book flipped over' },
  { id: 'caf-cup', type: 'moved', x: 240, y: 288, r: 26, hint: 'The coffee cup moved across the table' },
  { id: 'caf-cake', type: 'resized', x: 470, y: 340, r: 20, hint: 'The kid\u2019s cake grew bigger' },
  { id: 'caf-curtain', type: 'recoloured', x: 64, y: 150, r: 24, hint: 'The window curtain changed colour' },
  { id: 'caf-clock', type: 'removed', x: 520, y: 110, r: 20, hint: 'The wall clock is gone' },
  { id: 'caf-plant', type: 'added', x: 250, y: 210, r: 18, hint: 'A plant appeared by the window' },
];

// ---- catalogue ----
export const SCENES = [
  { id: 'market', name: 'Street Market', sub: 'Busy stalls · 8 differences', draw: drawMarket, diffs: MARKET_DIFFS },
  { id: 'beach', name: 'Beach Day', sub: 'Sunny shore · 8 differences', draw: drawBeach, diffs: BEACH_DIFFS },
  { id: 'park', name: 'City Park', sub: 'Green afternoon · 8 differences', draw: drawPark, diffs: PARK_DIFFS },
  { id: 'station', name: 'Train Station', sub: 'Platform rush · 8 differences', draw: drawStation, diffs: STATION_DIFFS },
  { id: 'festival', name: 'Night Festival', sub: 'Lanterns & music · 8 differences', draw: drawFestival, diffs: FESTIVAL_DIFFS },
  { id: 'cafe', name: 'Cozy Café', sub: 'Warm morning · 8 differences', draw: drawCafe, diffs: CAFE_DIFFS },
];
export const TOTAL_DIFFS = SCENES.reduce((n, s) => n + s.diffs.length, 0);
