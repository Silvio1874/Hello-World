/* Kleiner Klavier-Synthesizer auf Basis der Web Audio API (keine Samples nötig). */
'use strict';

const Synth = (() => {
  let ctx = null;
  let master = null;
  let volume = 0.7;
  const voices = new Map();

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
  }

  function noteOn(midi, velocity = 0.8) {
    if (!ensure()) return;
    stopVoice(midi, 0.02);
    const t = ctx.currentTime;
    const f = Music.freq(midi);
    const amp = 0.28 * velocity;
    // tiefe Töne klingen länger nach
    const decay = Math.max(0.6, Math.min(3.2, 2.2 * Math.pow(261.6 / f, 0.5)));

    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(amp, t + 0.004);
    out.gain.setTargetAtTime(amp * 0.35, t + 0.004, 0.12);
    out.gain.setTargetAtTime(0.0001, t + 0.25, decay);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(Math.min(f * 10, 14000), t);
    filter.frequency.setTargetAtTime(Math.max(f * 2.5, 600), t + 0.01, 0.35);
    filter.connect(out);
    out.connect(master);

    const partials = [
      { type: 'triangle', mul: 1, gain: 1 },
      { type: 'sine', mul: 2, gain: 0.35 },
      { type: 'sine', mul: 3, gain: 0.12 },
      { type: 'sawtooth', mul: 1.003, gain: 0.06 },
    ];
    const oscs = partials.map((p) => {
      const o = ctx.createOscillator();
      o.type = p.type;
      o.frequency.value = f * p.mul;
      const g = ctx.createGain();
      g.gain.value = p.gain;
      o.connect(g);
      g.connect(filter);
      o.start(t);
      o.stop(t + decay * 6 + 0.5);
      return o;
    });
    voices.set(midi, { out, oscs });
  }

  function stopVoice(midi, release) {
    const v = voices.get(midi);
    if (!v) return;
    voices.delete(midi);
    const t = ctx.currentTime;
    v.out.gain.cancelScheduledValues(t);
    v.out.gain.setValueAtTime(v.out.gain.value, t);
    v.out.gain.setTargetAtTime(0, t, release);
    v.oscs.forEach((o) => { try { o.stop(t + release * 8 + 0.05); } catch (e) { /* bereits gestoppt */ } });
  }

  function noteOff(midi) {
    if (ctx) stopVoice(midi, 0.12);
  }

  function allOff() {
    if (!ctx) return;
    [...voices.keys()].forEach((m) => stopVoice(m, 0.05));
  }

  /** Metronom-Klick */
  function click(accent) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = accent ? 1600 : 1000;
    g.gain.setValueAtTime(accent ? 0.18 : 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.06);
  }

  /** Kurzer Erfolgs-Jingle */
  function success() {
    [72, 76, 79, 84].forEach((m, i) => setTimeout(() => { noteOn(m, 0.5); setTimeout(() => noteOff(m), 300); }, i * 110));
  }

  return { ensure, noteOn, noteOff, allOff, click, success, setVolume, get context() { return ctx; } };
})();
