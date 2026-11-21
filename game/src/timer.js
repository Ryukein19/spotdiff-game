// Spot the Difference — countdown timer. Ticks once a second, drives the progress
// bar, and calls onTimeout when the clock empties. Pause freezes it.
export class Timer {
  constructor(seconds, onTick, onTimeout) {
    this.total = seconds;
    this.left = seconds;
    this.onTick = onTick;
    this.onTimeout = onTimeout;
    this.paused = false;
    this.over = false;
    this._id = null;
  }
  start() {
    this.stop();
    this._id = setInterval(() => {
      if (this.paused || this.over) return;
      this.left -= 1;
      this.onTick(this.left, this.total);
      if (this.left <= 0) { this.over = true; this.stop(); this.onTimeout(); }
    }, 1000);
  }
  stop() { if (this._id !== null) { clearInterval(this._id); this._id = null; } }
  add(seconds) {
    this.left = Math.max(0, Math.min(this.total, this.left + seconds));
    this.onTick(this.left, this.total);
  }
  penalty(seconds) { this.add(-seconds); }
  reset(seconds) { this.total = seconds; this.left = seconds; this.over = false; this.start(); }
  setPaused(p) { this.paused = p; }
}
