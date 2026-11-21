// Spot the Difference — tiny WebAudio sounds. No audio files, everything is
// synthesised, so the game stays offline and self-contained.
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, dur, type, vol, when = 0) {
  try {
    const a = ac();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.12, a.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
    o.connect(g).connect(a.destination);
    o.start(a.currentTime + when);
    o.stop(a.currentTime + when + dur + 0.02);
  } catch (_) { /* audio is a garnish, never a blocker */ }
}
export const sfx = {
  find() { tone(880, 0.12, 'sine', 0.14); tone(1318, 0.18, 'sine', 0.12, 0.08); },
  wrong() { tone(160, 0.22, 'sawtooth', 0.08); },
  hint() { tone(660, 0.1, 'triangle', 0.1); tone(990, 0.14, 'triangle', 0.08, 0.07); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.13, i * 0.11)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.14)); },
  tick() { tone(1200, 0.05, 'square', 0.04); },
  click() { tone(500, 0.06, 'triangle', 0.06); },
};
