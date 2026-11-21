// Spot the Difference — input: mouse clicks on either panel, hover magnifier,
// and the full keyboard scheme (arrows / Enter / Tab / H / L / N / R / 1-6).
import { PANEL_W, PANEL_H, MAGNIFIER_SIZE } from './config.js';

// Convert a mouse event on a panel canvas to logical panel coordinates.
export function panelCoords(canvas, ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * PANEL_W,
    y: ((ev.clientY - r.top) / r.height) * PANEL_H,
  };
}

export class Input {
  constructor(game) {
    this.game = game;
    this.lensOn = true;
    this.cross = { panel: 0, x: PANEL_W / 2, y: PANEL_H / 2 };
    this._lens = null;
  }
  attach(leftCanvas, rightCanvas, lensCanvas) {
    this._lens = lensCanvas;
    lensCanvas.width = MAGNIFIER_SIZE;
    lensCanvas.height = MAGNIFIER_SIZE;
    const onMove = (panel, ev) => {
      const p = panelCoords(panel === 0 ? leftCanvas : rightCanvas, ev);
      this.game.onHover(panel, p.x, p.y, ev.clientX, ev.clientY);
    };
    leftCanvas.addEventListener('mousemove', (ev) => onMove(0, ev));
    rightCanvas.addEventListener('mousemove', (ev) => onMove(1, ev));
    const leave = () => this.game.onHover(-1, 0, 0, 0, 0);
    leftCanvas.addEventListener('mouseleave', leave);
    rightCanvas.addEventListener('mouseleave', leave);
    leftCanvas.addEventListener('click', (ev) => this.game.onGuess(0, panelCoords(leftCanvas, ev)));
    rightCanvas.addEventListener('click', (ev) => this.game.onGuess(1, panelCoords(rightCanvas, ev)));
    window.addEventListener('keydown', (ev) => this.onKey(ev));
  }
  onKey(ev) {
    const g = this.game;
    const tag = (ev.target && ev.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = ev.key;
    if (k === 'Tab') { ev.preventDefault(); this.cross.panel = 1 - this.cross.panel; g.onCrosshair(this.cross); return; }
    if (k === 'ArrowLeft') { this.cross.x = Math.max(12, this.cross.x - 18); g.onCrosshair(this.cross); ev.preventDefault(); return; }
    if (k === 'ArrowRight') { this.cross.x = Math.min(PANEL_W - 12, this.cross.x + 18); g.onCrosshair(this.cross); ev.preventDefault(); return; }
    if (k === 'ArrowUp') { this.cross.y = Math.max(12, this.cross.y - 18); g.onCrosshair(this.cross); ev.preventDefault(); return; }
    if (k === 'ArrowDown') { this.cross.y = Math.min(PANEL_H - 12, this.cross.y + 18); g.onCrosshair(this.cross); ev.preventDefault(); return; }
    if (k === 'Enter') { g.onGuess(this.cross.panel, { x: this.cross.x, y: this.cross.y }); ev.preventDefault(); return; }
    const lower = k.toLowerCase();
    if (lower === 'h') { g.useHint(); return; }
    if (lower === 'l') { this.lensOn = !this.lensOn; g.onLensToggle(this.lensOn); return; }
    if (lower === 'n') { g.nextScene(); return; }
    if (lower === 'r') { g.restartScene(); return; }
    if (lower === 'p' || k === ' ') { g.togglePause(); if (k === ' ') ev.preventDefault(); return; }
    if (/^[1-6]$/.test(k)) { g.selectScene(Number(k) - 1); return; }
  }
}
