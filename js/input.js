/* Eingabequellen: Computertastatur, MIDI (Digitalpiano) und Mikrofon (echtes Klavier). */
'use strict';

const Input = (() => {
  // Physische Tastenpositionen (e.code) -> Halbtöne über der Basis-Oktave
  const CODE_MAP = {
    KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9,
    KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
  };
  const de = (navigator.language || '').toLowerCase().startsWith('de');
  const LABELS = {
    KeyA: 'A', KeyW: 'W', KeyS: 'S', KeyE: 'E', KeyD: 'D', KeyF: 'F', KeyT: 'T', KeyG: 'G',
    KeyY: de ? 'Z' : 'Y', KeyH: 'H', KeyU: 'U', KeyJ: 'J', KeyK: 'K', KeyO: 'O', KeyL: 'L', KeyP: 'P',
    Semicolon: de ? 'Ö' : ';', Quote: de ? 'Ä' : "'",
  };

  const listeners = new Set();
  const state = {
    handler: null,      // { noteOn(midi, src, vel), noteOff(midi, src) }
    base: 60,
    midiDevices: [],
    midiAccess: null,
    mic: null,
  };
  const downCodes = new Map();

  function emitStatus() { listeners.forEach((fn) => fn()); }

  function noteOn(m, src, vel) { if (state.handler) state.handler.noteOn(m, src, vel); }
  function noteOff(m, src) { if (state.handler) state.handler.noteOff(m, src); }

  // ---------- Computertastatur ----------
  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      if (tag === 'INPUT' || tag === 'SELECT') return;
      e.preventDefault();
      setBase(state.base + (e.code === 'ArrowLeft' ? -12 : 12));
      return;
    }
    if (!(e.code in CODE_MAP)) return;
    if (tag === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    e.preventDefault();
    if (e.repeat || downCodes.has(e.code)) return;
    const m = state.base + CODE_MAP[e.code];
    downCodes.set(e.code, m);
    noteOn(m, 'key', 0.8);
  }

  function onKeyUp(e) {
    if (!downCodes.has(e.code)) return;
    const m = downCodes.get(e.code);
    downCodes.delete(e.code);
    noteOff(m, 'key');
  }

  function setBase(b) {
    state.base = Math.max(24, Math.min(96, b));
    emitStatus();
  }

  function keyLabelFor(m) {
    const off = m - state.base;
    for (const code in CODE_MAP) if (CODE_MAP[code] === off) return LABELS[code];
    return null;
  }

  // ---------- MIDI ----------
  function onMidiMessage(ev) {
    const [st, d1, d2] = ev.data;
    const cmd = st & 0xf0;
    if (cmd === 0x90 && d2 > 0) noteOn(d1, 'midi', d2 / 127);
    else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) noteOff(d1, 'midi');
  }

  function attachMidi() {
    const acc = state.midiAccess;
    state.midiDevices = [];
    acc.inputs.forEach((inp) => {
      inp.onmidimessage = onMidiMessage;
      state.midiDevices.push(inp.name || 'MIDI-Gerät');
    });
    emitStatus();
  }

  async function connectMidi() {
    if (!navigator.requestMIDIAccess) throw new Error('Dieser Browser unterstützt kein Web-MIDI. Bitte Chrome oder Edge verwenden.');
    if (!state.midiAccess) {
      state.midiAccess = await navigator.requestMIDIAccess();
      state.midiAccess.onstatechange = attachMidi;
    }
    attachMidi();
    return state.midiDevices;
  }

  // Wenn die Berechtigung schon erteilt wurde, still verbinden.
  async function autoMidi() {
    try {
      if (!navigator.requestMIDIAccess || !navigator.permissions) return;
      const p = await navigator.permissions.query({ name: 'midi' });
      if (p.state === 'granted') await connectMidi();
    } catch (e) { /* nicht unterstützt */ }
  }

  // ---------- Mikrofon (Tonhöhenerkennung) ----------
  function autoCorrelate(buf, sr) {
    let size = buf.length;
    let r1 = 0;
    let r2 = size - 1;
    const thres = 0.2;
    for (let i = 0; i < size / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < size / 2; i++) if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
    const b = buf.subarray(r1, r2);
    size = b.length;
    if (size < 64) return -1;
    const c = new Float32Array(size);
    for (let lag = 0; lag < size; lag++) {
      let s = 0;
      for (let j = 0; j < size - lag; j++) s += b[j] * b[j + lag];
      c[lag] = s;
    }
    let d = 0;
    while (d < size - 1 && c[d] > c[d + 1]) d++;
    let maxv = -1;
    let maxp = -1;
    for (let i = d; i < size; i++) if (c[i] > maxv) { maxv = c[i]; maxp = i; }
    if (maxp <= 0 || maxv < c[0] * 0.3) return -1; // zu wenig periodisch
    let T0 = maxp;
    const x1 = c[T0 - 1] || 0;
    const x2 = c[T0];
    const x3 = c[T0 + 1] || 0;
    const a = (x1 + x3 - 2 * x2) / 2;
    const bb = (x3 - x1) / 2;
    if (a) T0 -= bb / (2 * a);
    return sr / T0;
  }

  async function startMic() {
    if (state.mic) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Mikrofon wird hier nicht unterstützt (HTTPS nötig).');
    }
    const ctx = Synth.ensure();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const mic = {
      stream, analyser, buf, current: null, cand: null, candCount: 0,
      lastRms: 0, lastTrigger: 0, level: 0, heard: null, freq: null, cents: 0,
    };
    mic.timer = setInterval(() => detect(mic, ctx.sampleRate), 30);
    state.mic = mic;
    emitStatus();
  }

  function stopMic() {
    const mic = state.mic;
    if (!mic) return;
    clearInterval(mic.timer);
    mic.stream.getTracks().forEach((t) => t.stop());
    if (mic.current !== null) noteOff(mic.current, 'mic');
    state.mic = null;
    emitStatus();
  }

  function detect(mic, sr) {
    mic.analyser.getFloatTimeDomainData(mic.buf);
    let rms = 0;
    for (let i = 0; i < mic.buf.length; i++) rms += mic.buf[i] * mic.buf[i];
    rms = Math.sqrt(rms / mic.buf.length);
    mic.level = Math.min(1, rms * 8);
    const now = performance.now();

    const gate = { 1: 0.025, 2: 0.012, 3: 0.006 }[Store.settings.micSens] || 0.012;
    if (rms < gate) {
      if (mic.current !== null) { noteOff(mic.current, 'mic'); mic.current = null; }
      mic.cand = null;
      mic.lastRms = rms;
      mic.heard = null;
      mic.freq = null;
      return;
    }
    const f = autoCorrelate(mic.buf, sr);
    const onset = rms > mic.lastRms * 1.7 && rms > gate * 2.5;
    mic.lastRms = rms * 0.3 + mic.lastRms * 0.7;
    if (f < 50 || f > 2200) return;
    // Stimmung des Klaviers ausgleichen (in Cent, siehe „Klavier einmessen“)
    const exact = 69 + 12 * Math.log2(f / 440) - (Store.settings.tuning || 0) / 100;
    const m = Math.round(exact);
    mic.heard = m;
    mic.freq = f;
    mic.cents = Math.round((exact - m) * 100);

    if (m === mic.cand) mic.candCount++;
    else { mic.cand = m; mic.candCount = 1; }

    const stable = mic.candCount >= 2;
    if (stable && m !== mic.current) {
      if (mic.current !== null) noteOff(mic.current, 'mic');
      mic.current = m;
      mic.lastTrigger = now;
      noteOn(m, 'mic', 0.8);
    } else if (onset && m === mic.current && now - mic.lastTrigger > 140) {
      // gleiche Note erneut angeschlagen
      noteOff(m, 'mic');
      mic.lastTrigger = now;
      noteOn(m, 'mic', 0.8);
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { downCodes.forEach((m) => noteOff(m, 'key')); downCodes.clear(); });

  return {
    setHandler(h) { state.handler = h; },
    setBase,
    get base() { return state.base; },
    keyLabelFor,
    connectMidi,
    autoMidi,
    get midiDevices() { return state.midiDevices; },
    startMic,
    stopMic,
    get micOn() { return !!state.mic; },
    get micInfo() { return state.mic; },
    onStatus(fn) { listeners.add(fn); },
  };
})();
