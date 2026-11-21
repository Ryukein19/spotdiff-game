// Spot the Difference — game state and wiring. Owns the HUD, the scene flow,
// scoring, streaks, hints, pause, win/lose, and the ?shot= demo states used for
// screenshots. All art lives in scenes.js; all input in input.js.
import { SCENES, TOTAL_DIFFS } from './scenes.js';
import { sceneById, findDiff, remaining, nextHintDiff } from './differences.js';
import { Timer } from './timer.js';
import { sfx } from './audio.js';
import { Input } from './input.js';
import { drawPanel, drawHint, drawWrong, drawCrosshair, drawMagnifier } from './render.js';
import {
  PANEL_W as PW, PANEL_H as PH, TIME_PER_SCENE, HINTS_PER_SCENE, WRONG_PENALTY,
  SCORE_FIND, SCORE_STREAK_STEP, SCORE_TIME_BONUS, HINT_MS, WRONG_MARK_MS,
  FIND_ANIM_MS, MAGNIFIER_SIZE,
} from './config.js';

const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    this.sceneIndex = 0;
    this.found = new Set();
    this.anims = [];
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.hintsLeft = HINTS_PER_SCENE;
    this.hintMark = null;
    this.wrongMarks = [[], []];
    this.paused = false;
    this.over = false; // scene over (win or time out)
    this.cleared = 0; // scenes cleared this run
    this.hover = { panel: -1, x: 0, y: 0, cx: 0, cy: 0 };
    this.lastHintId = null;
    this.timer = new Timer(TIME_PER_SCENE, (l, t) => this.onTick(l, t), () => this.onTimeout());
    this.input = new Input(this);
    this._raf = null;
  }

  get scene() { return SCENES[this.sceneIndex]; }

  init() {
    this.leftCanvas = $('panel-left');
    this.rightCanvas = $('panel-right');
    this.leftCanvas.width = PW; this.leftCanvas.height = PH;
    this.rightCanvas.width = PW; this.rightCanvas.height = PH;
    this.lens = $('lens');
    this.input.attach(this.leftCanvas, this.rightCanvas, this.lens);
    $('btn-hint').addEventListener('click', () => this.useHint());
    $('btn-pause').addEventListener('click', () => this.togglePause());
    $('btn-restart').addEventListener('click', () => this.restartScene());
    $('btn-next').addEventListener('click', () => this.nextScene());
    $('btn-how').addEventListener('click', () => this.showHow(true));
    $('how-close').addEventListener('click', () => this.showHow(false));
    $('overlay-btn').addEventListener('click', () => this.overlayAction());
    document.querySelectorAll('.level-btn').forEach((b) => {
      b.addEventListener('click', () => this.selectScene(Number(b.dataset.scene)));
    });
    this.loadScene(0);
    this.applyShotParam();
    this.loop();
  }

  // ---- scene flow ----
  loadScene(i) {
    this.sceneIndex = i;
    this.found = new Set();
    this.anims = [];
    this.hintMark = null;
    this.wrongMarks = [[], []];
    this.hintsLeft = HINTS_PER_SCENE;
    this.streak = 0;
    this.paused = false;
    this.over = false;
    this.lastHintId = null;
    this.timer.reset(TIME_PER_SCENE);
    this.hideOverlay();
    this.renderAll();
    this.updateHUD();
    document.querySelectorAll('.level-btn').forEach((b, j) => {
      b.classList.toggle('active', j === i);
      b.classList.toggle('done', j < this.cleared);
    });
    $('scene-name').textContent = this.scene.name;
    $('scene-sub').textContent = this.scene.sub;
  }
  selectScene(i) { if (i === this.sceneIndex) return; sfx.click(); this.loadScene(i); }
  nextScene() {
    if (this.sceneIndex < SCENES.length - 1) { sfx.click(); this.loadScene(this.sceneIndex + 1); }
  }
  restartScene() { sfx.click(); this.loadScene(this.sceneIndex); }

  // ---- guessing ----
  onGuess(panel, p) {
    if (this.over || this.paused) return;
    const diff = findDiff(this.scene, p.x, p.y);
    if (diff && !this.found.has(diff.id)) {
      this.found.add(diff.id);
      this.anims.push({ id: diff.id, start: performance.now() });
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const pts = SCORE_FIND + SCORE_STREAK_STEP * (this.streak - 1);
      this.score += pts;
      sfx.find();
      this.showFloat(panel, p, '+' + pts);
      this.renderAll();
      this.updateHUD();
      if (this.found.size === this.scene.diffs.length) this.sceneCleared();
    } else {
      this.streak = 0;
      this.timer.penalty(WRONG_PENALTY);
      this.wrongMarks[panel].push({ x: p.x, y: p.y, start: performance.now(), ms: WRONG_MARK_MS });
      sfx.wrong();
      const el = panel === 0 ? this.leftCanvas : this.rightCanvas;
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      this.showFloat(panel, p, '-' + WRONG_PENALTY + 's');
      this.renderAll();
      this.updateHUD();
    }
  }
  useHint() {
    if (this.over || this.paused || this.hintsLeft <= 0) return;
    const d = nextHintDiff(this.scene, this.found, this.lastHintId);
    if (!d) return;
    this.hintsLeft -= 1;
    this.lastHintId = d.id;
    this.hintMark = { diff: d, start: performance.now() };
    sfx.hint();
    this.updateHUD();
  }
  togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    this.timer.setPaused(this.paused);
    $('btn-pause').textContent = this.paused ? '▶ Resume' : '⏸ Pause';
    $('pause-note').style.display = this.paused ? 'block' : 'none';
    sfx.click();
  }

  // ---- timer / end states ----
  onTick(left, total) {
    $('time-num').textContent = left + 's';
    const pct = (left / total) * 100;
    $('time-bar').style.width = pct + '%';
    $('time-bar').classList.toggle('low', left <= 15);
    if (left <= 10 && left > 0) sfx.tick();
  }
  onTimeout() {
    this.over = true;
    sfx.lose();
    this.showOverlay('Time\u2019s up!', 'The clock emptied with ' + remaining(this.scene, this.found).length +
      ' difference' + (remaining(this.scene, this.found).length === 1 ? '' : 's') + ' still hidden. ' +
      'Try again or move on — your score so far is ' + this.score + '.', '↻ Retry scene', 'retry');
  }
  sceneCleared() {
    this.over = true;
    this.timer.stop();
    const bonus = this.timer.left * SCORE_TIME_BONUS;
    this.score += bonus;
    this.cleared = Math.max(this.cleared, this.sceneIndex + 1);
    sfx.win();
    this.updateHUD();
    if (this.sceneIndex === SCENES.length - 1) {
      this.showOverlay('You found them all!', 'All 6 scenes cleared — ' + TOTAL_DIFFS + ' differences, ' +
        'time bonus +' + bonus + '. Final score: ' + this.score + ' · best streak x' + this.bestStreak + '.', '↻ Play again', 'again');
    } else {
      this.showOverlay('Scene cleared!', 'All ' + this.scene.diffs.length + ' differences found — time bonus +' + bonus +
        '. Next up: ' + SCENES[this.sceneIndex + 1].name + '.', '→ Next scene', 'next');
    }
  }
  overlayAction() {
    const mode = this._overlayMode;
    if (mode === 'next') this.nextScene();
    else if (mode === 'again') { this.score = 0; this.bestStreak = 0; this.cleared = 0; this.loadScene(0); }
    else this.restartScene();
  }
  showOverlay(title, body, btn, mode) {
    $('overlay-title').textContent = title;
    $('overlay-body').textContent = body;
    $('overlay-btn').textContent = btn;
    this._overlayMode = mode;
    $('overlay').style.display = 'flex';
  }
  hideOverlay() { $('overlay').style.display = 'none'; }
  showHow(show) { $('howto').style.display = show ? 'block' : 'none'; }

  // ---- hover / crosshair / lens ----
  onHover(panel, x, y, cx, cy) {
    this.hover = { panel, x, y, cx, cy };
    const show = this.input.lensOn && panel >= 0 && !this.over;
    this.lens.style.display = show ? 'block' : 'none';
    if (show) {
      const canvas = panel === 0 ? this.leftCanvas : this.rightCanvas;
      drawMagnifier(this.lens, canvas, x, y);
      this.lens.style.left = Math.min(window.innerWidth - MAGNIFIER_SIZE - 8, cx + 18) + 'px';
      this.lens.style.top = Math.max(8, cy - MAGNIFIER_SIZE - 14) + 'px';
    }
  }
  onCrosshair(cross) {
    this.renderAll();
    const canvas = cross.panel === 0 ? this.leftCanvas : this.rightCanvas;
    drawCrosshair(canvas, cross);
  }
  onLensToggle(on) {
    $('btn-lens').textContent = on ? '🔍 Lens on' : '🔍 Lens off';
    if (!on) this.lens.style.display = 'none';
  }

  // ---- HUD ----
  updateHUD() {
    const left = remaining(this.scene, this.found).length;
    $('remain-num').textContent = left;
    $('found-num').textContent = this.found.size + ' / ' + this.scene.diffs.length;
    $('score-num').textContent = this.score;
    $('streak-num').textContent = 'x' + this.streak;
    $('streak-num').classList.toggle('hot', this.streak >= 3);
    $('hint-num').textContent = this.hintsLeft;
    $('btn-hint').disabled = this.hintsLeft <= 0;
    const dots = $('dots');
    dots.innerHTML = '';
    for (const d of this.scene.diffs) {
      const dot = document.createElement('span');
      dot.className = 'dot' + (this.found.has(d.id) ? ' found' : '');
      dot.title = d.type;
      dots.appendChild(dot);
    }
  }
  showFloat(panel, p, txt) {
    const host = panel === 0 ? $('float-left') : $('float-right');
    const el = document.createElement('span');
    el.className = 'float-tag' + (txt.startsWith('-') ? ' bad' : ' good');
    el.textContent = txt;
    const wrap = host.parentElement.getBoundingClientRect();
    const panelEl = panel === 0 ? this.leftCanvas : this.rightCanvas;
    const r = panelEl.getBoundingClientRect();
    el.style.left = (r.left - wrap.left + (p.x / PW) * r.width) + 'px';
    el.style.top = (r.top - wrap.top + (p.y / PH) * r.height) + 'px';
    host.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // ---- render loop (only redraws when something animates) ----
  renderAll() {
    drawPanel(this.leftCanvas, this.scene, 0, this.found, this.anims);
    drawPanel(this.rightCanvas, this.scene, 1, this.found, this.anims);
    for (let p = 0; p < 2; p++) {
      const canvas = p === 0 ? this.leftCanvas : this.rightCanvas;
      this.wrongMarks[p] = this.wrongMarks[p].filter((m) => performance.now() - m.start < m.ms);
      for (const m of this.wrongMarks[p]) drawWrong(canvas, m);
    }
  }
  loop() {
    const step = () => {
      let dirty = false;
      if (this.anims.length) {
        this.anims = this.anims.filter((a) => performance.now() - a.start < FIND_ANIM_MS);
        dirty = true;
      }
      if (this.hintMark) {
        const alive = drawHint(
          this.leftCanvas.getContext('2d'), this.rightCanvas.getContext('2d'),
          this.hintMark.diff, this.hintMark.start, HINT_MS,
        );
        if (!alive) this.hintMark = null;
        dirty = true;
      }
      if (this.wrongMarks[0].length || this.wrongMarks[1].length) dirty = true;
      if (dirty) this.renderAll();
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  // ---- ?shot= demo states for screenshots (real renders of the game code) ----
  applyShotParam() {
    const q = new URLSearchParams(location.search);
    const shot = q.get('shot');
    if (!shot) return;
    this.timer.stop();
    if (shot === 'cover') {
      // Scene 1, 3 found, 5 to find, mid timer — the cover story.
      const ids = this.scene.diffs.slice(0, 3).map((d) => d.id);
      for (const id of ids) this.found.add(id);
      this.score = 360; this.streak = 3; this.bestStreak = 3;
      this.timer.left = 87; this.onTick(87, TIME_PER_SCENE);
      this.renderAll(); this.updateHUD();
    } else if (shot === 'scene4') {
      this.loadScene(3);
      this.timer.stop();
      for (const id of this.scene.diffs.slice(0, 2).map((d) => d.id)) this.found.add(id);
      this.score = 210; this.streak = 2;
      this.timer.left = 64; this.onTick(64, TIME_PER_SCENE);
      this.renderAll(); this.updateHUD();
    } else if (shot === 'win') {
      for (const d of this.scene.diffs) this.found.add(d.id);
      this.score = 940; this.streak = 8; this.bestStreak = 8;
      this.timer.left = 41; this.onTick(41, TIME_PER_SCENE);
      this.renderAll(); this.updateHUD();
      this.showOverlay('Scene cleared!', 'All 8 differences found — time bonus +205. Next up: Winter Village.', '→ Next scene', 'next');
    } else if (shot === 'howto') {
      this.showHow(true);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.__game = new Game();
  window.__game.init();
});
