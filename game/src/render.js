// Spot the Difference — rendering: the two panels, found markers, crosshair,
// wrong-guess marks, hint pulses, find animations and the hover magnifier.
import { PANEL_W, PANEL_H, MAGNIFIER_SIZE, MAGNIFIER_ZOOM, FIND_ANIM_MS } from './config.js';

// Draw one panel: the scene (variant 0 left / 1 right) plus the found markers.
export function drawPanel(canvas, scene, variant, found, anims) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, PANEL_W, PANEL_H);
  scene.draw(ctx, variant, PANEL_W, PANEL_H);
  for (const d of scene.diffs) {
    if (!found.has(d.id)) continue;
    const anim = anims.find((a) => a.id === d.id);
    const t = anim ? Math.min(1, (performance.now() - anim.start) / FIND_ANIM_MS) : 1;
    const r = d.r * (0.6 + 0.4 * t);
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * t;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(d.x, d.y, r + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // checkmark at the circle's top-right
    ctx.save();
    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(d.x + r * 0.45, d.y - r * 0.75);
    ctx.lineTo(d.x + r * 0.7, d.y - r * 0.5);
    ctx.lineTo(d.x + r * 1.05, d.y - r * 0.95);
    ctx.stroke();
    ctx.restore();
  }
}

// A pulsing hint ring on both panels for one unfound difference.
export function drawHint(ctxL, ctxR, diff, startedAt, duration) {
  const t = (performance.now() - startedAt) / duration;
  if (t >= 1) return false;
  const pulse = 1 + 0.25 * Math.sin(t * Math.PI * 6);
  for (const ctx of [ctxL, ctxR]) {
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - t * 0.4);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.arc(diff.x, diff.y, diff.r * pulse + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  return true;
}

// A red X where a wrong guess landed (fades out).
export function drawWrong(canvas, mark) {
  if (!mark) return;
  const ctx = canvas.getContext('2d');
  const age = performance.now() - mark.start;
  const alpha = Math.max(0, 1 - age / mark.ms);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(mark.x - r, mark.y - r); ctx.lineTo(mark.x + r, mark.y + r);
  ctx.moveTo(mark.x + r, mark.y - r); ctx.lineTo(mark.x - r, mark.y + r);
  ctx.stroke();
  ctx.restore();
}

// The keyboard crosshair on the active panel.
export function drawCrosshair(canvas, pos) {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.beginPath(); ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pos.x - 20, pos.y); ctx.lineTo(pos.x - 8, pos.y);
  ctx.moveTo(pos.x + 8, pos.y); ctx.lineTo(pos.x + 20, pos.y);
  ctx.moveTo(pos.x, pos.y - 20); ctx.lineTo(pos.x, pos.y - 8);
  ctx.moveTo(pos.x, pos.y + 8); ctx.lineTo(pos.x, pos.y + 20);
  ctx.stroke();
  ctx.restore();
}

// Hover magnifier: a circular 2x zoom of the panel under the cursor, drawn into
// the small lens canvas positioned near the mouse.
export function drawMagnifier(lensCanvas, panelCanvas, mx, my) {
  const lctx = lensCanvas.getContext('2d');
  const S = lensCanvas.width;
  const srcR = S / MAGNIFIER_ZOOM / 2;
  const scaleX = panelCanvas.width / panelCanvas.getBoundingClientRect().width;
  const scaleY = panelCanvas.height / panelCanvas.getBoundingClientRect().height;
  const sx = (mx - srcR / scaleX) * scaleX;
  const sy = (my - srcR / scaleY) * scaleY;
  lctx.clearRect(0, 0, S, S);
  lctx.save();
  lctx.beginPath(); lctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); lctx.clip();
  lctx.drawImage(panelCanvas, sx, sy, srcR * 2 * scaleX, srcR * 2 * scaleY, 0, 0, S, S);
  lctx.restore();
  lctx.strokeStyle = '#ffd700'; lctx.lineWidth = 4;
  lctx.beginPath(); lctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); lctx.stroke();
  lctx.strokeStyle = 'rgba(255,255,255,0.9)'; lctx.lineWidth = 1.5;
  lctx.beginPath(); lctx.moveTo(S / 2 - 8, S / 2); lctx.lineTo(S / 2 + 8, S / 2);
  lctx.moveTo(S / 2, S / 2 - 8); lctx.lineTo(S / 2, S / 2 + 8); lctx.stroke();
}
