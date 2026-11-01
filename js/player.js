/* Der Übungs-Player: fallende Noten, Warte- und Rhythmus-Modus, Bewertung. */
'use strict';

const HAND_COLORS = {
  R: { fill: '#3ddc97', dark: '#1a7a52', glow: 'rgba(61,220,151,' },
  L: { fill: '#6aa8ff', dark: '#2c5aa8', glow: 'rgba(106,168,255,' },
};
const EPS = 1e-6;

class Player {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      title: $('pl-title'), sub: $('pl-sub'), play: $('pl-play'), restart: $('pl-restart'),
      mode: $('pl-mode'), hands: $('pl-hands'), tempo: $('pl-tempo'), tempoVal: $('pl-tempo-val'),
      metro: $('pl-metro'), demo: $('pl-demo'), mic: $('pl-mic'), progress: $('pl-progress'),
      stage: $('pl-stage'), canvas: $('pl-canvas'), hint: $('pl-hint'), score: $('pl-score'),
      feedback: $('pl-feedback'), count: $('pl-count'), overlay: $('pl-overlay'), dialog: $('pl-dialog'),
      input: $('pl-input'),
    };
    this.ctx = this.el.canvas.getContext('2d');
    this.kb = new Keyboard(document.getElementById('pl-keyboard'), {
      onDown: (m, v) => App.userNoteOn(m, 'screen', v),
      onUp: (m) => App.userNoteOff(m, 'screen'),
    });
    this.tempo = 1;
    this.metronome = false;
    this.mode = 'wait';
    this.hands = 'both';
    this.running = false;
    this.demo = false;
    this.events = [];
    this.particles = [];
    this.autoTimers = [];
    this.autoSounding = new Map();
    this.targets = new Set();
    this.raf = null;
    this._bind();

    new ResizeObserver(() => this._resize()).observe(this.el.stage);
  }

  _bind() {
    const e = this.el;
    e.play.onclick = () => { this.toggle(); e.play.blur(); };
    e.restart.onclick = () => { this.reset(); this.start(); e.restart.blur(); };
    e.mode.onchange = () => { this.mode = e.mode.value; e.mode.blur(); this.reset(); this.showStart(); };
    e.hands.onchange = () => { this.hands = e.hands.value; e.hands.blur(); this.reset(); this.showStart(); };
    e.tempo.oninput = () => { this.tempo = e.tempo.value / 100; e.tempoVal.textContent = e.tempo.value + '%'; };
    e.metro.onclick = () => { this.metronome = !this.metronome; e.metro.setAttribute('aria-pressed', this.metronome); e.metro.blur(); };
    e.demo.onclick = () => { e.demo.blur(); this.startDemo(); };
    e.mic.onclick = () => { e.mic.blur(); App.toggleMic(); };
  }

  _resize() {
    const r = this.el.stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = r.width;
    this.H = r.height;
    this.el.canvas.width = Math.round(r.width * dpr);
    this.el.canvas.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  // ---------- Laden ----------
  load(item, kind) {
    this.item = item;
    this.kind = kind;
    this.events = Music.buildEvents(item);
    this.bpm = item.bpm || 90;
    this.beatsPerBar = item.beatsPerBar || 4;
    this.endBeat = Math.max(...this.events.map((ev) => ev.start + ev.dur));
    this.hasR = this.events.some((ev) => ev.hand === 'R');
    this.hasL = this.events.some((ev) => ev.hand === 'L');

    this.mode = item.mode || 'wait';
    this.el.mode.value = this.mode;
    this.hands = 'both';
    this.el.hands.value = 'both';
    this.el.hands.disabled = !(this.hasR && this.hasL);
    this.el.hands.style.display = this.hasR && this.hasL ? '' : 'none';
    this.metronome = !!item.metronome;
    this.el.metro.setAttribute('aria-pressed', this.metronome);
    this.tempo = 1;
    this.el.tempo.value = 100;
    this.el.tempoVal.textContent = '100%';

    this.el.title.textContent = item.title;
    this.el.sub.textContent = kind === 'lesson'
      ? 'Lektion ' + (LESSONS.indexOf(item) + 1) + ' · ' + item.short
      : (item.composer || '') + ' · ' + LEVEL_NAMES[item.level];

    // Tastaturbereich: ganze Oktaven um die verwendeten Töne (Handy: mind. 1, sonst 2 Oktaven)
    const notes = this.events.map((ev) => ev.midi);
    const minN = Math.min(...notes);
    const maxN = Math.max(...notes);
    let lo = Math.floor(minN / 12) * 12;
    let hi = maxN % 12 === 0 ? maxN : Math.floor(maxN / 12) * 12 + 12;
    const minSpan = this.el.stage.clientWidth < 600 ? 12 : 24;
    while (hi - lo < minSpan) { if (lo >= 60) lo -= 12; else hi += 12; }
    this.kb.setRange(lo, hi);

    // Computertastatur dorthin legen, wo die meisten Noten liegen
    let bestBase = 60;
    let bestCount = -1;
    for (let b = lo; b <= hi; b += 12) {
      const c = notes.filter((n) => n >= b && n <= b + 17).length;
      if (c > bestCount) { bestCount = c; bestBase = b; }
    }
    Input.setBase(bestBase);

    this.reset();
    if (kind === 'lesson' && item.intro) this.showIntro(0);
    else this.showStart();
  }

  practiced(ev) { return this.hands === 'both' || ev.hand === this.hands; }

  reset() {
    this.stop();
    this._clearAuto();
    Synth.allOff();
    this.events.forEach((ev) => { ev.state = 'pending'; ev.quality = null; });
    this.stats = { hits: 0, perfect: 0, good: 0, errors: 0, misses: 0, combo: 0, maxCombo: 0 };
    this.total = this.events.filter((ev) => this.practiced(ev)).length;
    this.playhead = this.mode === 'rhythm' || this.demo ? -this.beatsPerBar : -2;
    this.waiting = false;
    this.particles = [];
    this._setTargets([]);
    this.kb.clearAll();
    this.el.count.textContent = '';
    this.el.hint.textContent = '';
    this._updateHud();
    this.draw();
  }

  // ---------- Steuerung ----------
  start() {
    if (this.running) return;
    Synth.ensure();
    this.hideOverlay();
    this.running = true;
    this.last = null;
    this.el.play.textContent = '❚❚';
    this.raf = requestAnimationFrame((t) => this._loop(t));
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.el.play.textContent = '▶';
    this.el.count.textContent = '';
  }

  toggle() {
    if (this.running) this.stop();
    else if (this.playhead >= this.endBeat) { this.reset(); this.start(); } else this.start();
  }

  startDemo() {
    this.demo = true;
    this.el.demo.classList.add('on');
    this.reset();
    this.start();
  }

  endDemo() {
    this.demo = false;
    this.el.demo.classList.remove('on');
    this.reset();
    this.showStart();
  }

  leave() {
    this.stop();
    this._clearAuto();
    Synth.allOff();
    this.demo = false;
    this.el.demo.classList.remove('on');
  }

  // ---------- Hauptschleife ----------
  _loop(ts) {
    if (!this.running) return;
    const dt = this.last === null ? 0 : Math.min(0.1, (ts - this.last) / 1000);
    this.last = ts;
    this._update(dt);
    this.draw();
    if (this.running) this.raf = requestAnimationFrame((t) => this._loop(t));
  }

  get bps() { return (this.bpm * this.tempo) / 60; }

  currentGroupStart() {
    let g = null;
    for (const ev of this.events) {
      if (ev.state === 'pending' && this.practiced(ev)) { g = ev.start; break; }
    }
    return g;
  }

  _update(dt) {
    const prev = this.playhead;
    let next = prev + dt * this.bps;
    const scoring = !this.demo;

    if (scoring && this.mode === 'wait') {
      const g = this.currentGroupStart();
      if (g !== null && next >= g) { next = g; this.waiting = true; } else this.waiting = false;
    }

    // Metronom & Einzählen
    const countIn = prev < 0;
    if (this.metronome || (countIn && (this.mode === 'rhythm' || this.demo))) {
      for (let b = Math.floor(prev) + 1; b <= Math.floor(next + EPS); b++) {
        if (b > this.endBeat) break;
        if (this.metronome || b < 0) Synth.click(((b % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar === 0);
      }
    }
    if (next < 0 && (this.mode === 'rhythm' || this.demo)) {
      this.el.count.textContent = Math.floor(next) + this.beatsPerBar + 1;
    } else this.el.count.textContent = '';

    // Automatisch gespielte Noten (andere Hand oder Vorspielen)
    for (const ev of this.events) {
      if (ev.start >= next) break;
      if (ev.state !== 'pending' || ev.start < prev - EPS) continue;
      if (this.demo || !this.practiced(ev)) this._autoPlay(ev);
    }

    // Verpasste Noten im Rhythmus-Modus
    if (scoring && this.mode === 'rhythm') {
      const win = this._window();
      for (const ev of this.events) {
        if (ev.start > next) break;
        if (ev.state === 'pending' && this.practiced(ev) && next - ev.start > win) {
          ev.state = 'miss';
          this.stats.misses++;
          this.stats.combo = 0;
        }
      }
    }

    this.playhead = next;
    this._refreshTargets();
    this._updateHud();

    if (this.playhead >= this.endBeat + 0.5) {
      if (this.demo) this.endDemo();
      else this.finish();
    }
  }

  _window() { return 0.2 * this.bps; } // ±200 ms in Schlägen

  _isAutoSounding(midi) {
    const now = performance.now();
    for (const [m, until] of this.autoSounding) {
      if (until < now) this.autoSounding.delete(m);
      else if (Music.pc(m) === Music.pc(midi)) return true;
    }
    return false;
  }

  _autoPlay(ev) {
    ev.state = 'auto';
    const ms = (ev.dur / this.bps) * 1000 * 0.92;
    this.autoSounding.set(ev.midi, performance.now() + ms + 400);
    Synth.noteOn(ev.midi, 0.65);
    this.kb.setState(ev.midi, 'auto', true);
    const t = setTimeout(() => {
      Synth.noteOff(ev.midi);
      this.kb.setState(ev.midi, 'auto', false);
    }, ms);
    this.autoTimers.push(t);
  }

  _clearAuto() {
    this.autoTimers.forEach(clearTimeout);
    this.autoTimers = [];
    this.kb.keys.forEach((k) => k.classList.remove('auto'));
  }

  _refreshTargets() {
    const list = [];
    if (!this.demo) {
      if (this.mode === 'wait') {
        const g = this.currentGroupStart();
        if (g !== null && g - this.playhead <= 1.01) {
          for (const ev of this.events) {
            if (ev.start > g + EPS) break;
            if (Math.abs(ev.start - g) < EPS && ev.state === 'pending' && this.practiced(ev)) list.push(ev);
          }
        }
      } else {
        for (const ev of this.events) {
          if (ev.start > this.playhead + 0.35) break;
          if (ev.state === 'pending' && this.practiced(ev) && ev.start >= this.playhead - 0.3) list.push(ev);
        }
      }
    }
    this._setTargets(list);

    if (this.mode === 'wait' && this.waiting && list.length) {
      const names = list.map((ev) => Music.name(ev.midi) + (ev.finger ? ' (Finger ' + ev.finger + ')' : ''));
      const hand = list.every((ev) => ev.hand === 'L') ? 'links' : list.every((ev) => ev.hand === 'R') ? 'rechts' : 'beide Hände';
      this.el.hint.textContent = 'Spiele ' + names.join(' + ') + ' · ' + hand;
    } else this.el.hint.textContent = '';
  }

  _setTargets(list) {
    const key = list.map((ev) => ev.id).join(',');
    if (key === this._targetKey) return;
    this._targetKey = key;
    this.targets.forEach((m) => this.kb.clearTarget(m));
    this.targets = new Set(list.map((ev) => ev.midi));
    list.forEach((ev) => this.kb.setTarget(ev.midi, ev.hand, ev.finger));
  }

  // ---------- Eingabe ----------
  noteOn(midi, src) {
    this.kb.setState(midi, 'pressed', true);
    if (this.demo) return;
    if (!this.running) {
      if (!this.el.overlay.hidden) return;
      if (this.mode === 'wait' && this.playhead < this.endBeat) this.start();
      else return;
    }
    if (this.mode === 'rhythm' && this.playhead < -0.3) return; // Einzählen

    const loose = src === 'mic';
    const matches = (ev) => ev.midi === midi || (loose && Music.pc(ev.midi) === Music.pc(midi) && Math.abs(ev.midi - midi) <= 12);

    // Mikrofon hört auch die Lautsprecher: Töne, die die App gerade selbst spielt, ignorieren
    if (loose && this._isAutoSounding(midi)) return;

    if (this.mode === 'wait') {
      const g = this.currentGroupStart();
      if (g !== null) {
        const group = this.events.filter((ev) => Math.abs(ev.start - g) < EPS && ev.state === 'pending' && this.practiced(ev));
        const hit = group.find(matches);
        if (hit) {
          if (this.playhead < g) {
            // Früher gespielt: die anderen Hand-Noten bis dahin nachholen und vorspringen
            for (const ev of this.events) {
              if (ev.start >= g) break;
              if (ev.state === 'pending' && !this.practiced(ev)) ev.state = 'auto';
            }
            this.playhead = g;
          }
          // Mikrofon kann Akkorde nicht zuverlässig auflösen: ein Ton genügt
          (loose ? group : [hit]).forEach((ev) => this._hit(ev, 'good'));
          if (this.currentGroupStart() !== g) this.waiting = false;
          this._refreshTargets();
          return;
        }
      }
      this._wrong(midi);
    } else {
      const win = this._window();
      let best = null;
      for (const ev of this.events) {
        if (ev.start > this.playhead + win) break;
        if (ev.state !== 'pending' || !this.practiced(ev) || !matches(ev)) continue;
        const d = Math.abs(ev.start - this.playhead);
        if (d <= win && (!best || d < Math.abs(best.start - this.playhead))) best = ev;
      }
      if (best) {
        const sec = Math.abs(best.start - this.playhead) / this.bps;
        this._hit(best, sec < 0.08 ? 'perfect' : 'good');
      } else this._wrong(midi);
    }
  }

  noteOff(midi) {
    this.kb.setState(midi, 'pressed', false);
  }

  _hit(ev, quality) {
    ev.state = 'hit';
    ev.quality = quality;
    this.stats.hits++;
    this.stats[quality]++;
    this.stats.combo++;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
    this.kb.flash(ev.midi, 'good', 220);
    this._burst(ev);
    if (this.mode === 'rhythm') this._feedback(quality === 'perfect' ? 'Perfekt!' : 'Gut!', quality);
    else if (this.stats.combo > 0 && this.stats.combo % 10 === 0) this._feedback(this.stats.combo + ' in Folge!', 'perfect');
    this._updateHud();
  }

  _wrong(midi) {
    this.stats.errors++;
    this.stats.combo = 0;
    this.kb.flash(midi, 'wrong', 300);
    this._feedback('Daneben – ' + Music.name(midi), 'bad');
    this._updateHud();
  }

  _feedback(text, cls) {
    const f = this.el.feedback;
    f.textContent = text;
    f.className = 'feedback show ' + cls;
    clearTimeout(this._fbTimer);
    this._fbTimer = setTimeout(() => { f.className = 'feedback ' + cls; }, 650);
  }

  _burst(ev) {
    const l = this.kb.layout.get(ev.midi);
    if (!l) return;
    const x = (l.x + l.w / 2) * this.W;
    const col = HAND_COLORS[ev.hand].fill;
    for (let i = 0; i < 14; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      const s = 80 + Math.random() * 160;
      this.particles.push({ x, y: this.H - 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, col });
    }
    if (!this.running) this.draw();
  }

  // ---------- Bewertung ----------
  computeScore() {
    const s = this.stats;
    const total = Math.max(1, this.total);
    let score;
    if (this.mode === 'wait') {
      score = (100 * s.hits) / Math.max(1, s.hits + s.errors);
    } else {
      score = (100 * (s.perfect + 0.75 * s.good)) / total - Math.min(30, s.errors * 2);
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    const stars = score >= 90 ? 3 : score >= 75 ? 2 : score >= 50 ? 1 : 0;
    return { score, stars };
  }

  finish() {
    this.stop();
    this._setTargets([]);
    this.el.hint.textContent = '';
    const { score, stars } = this.computeScore();
    // Nur ganze Durchgänge mit beiden Händen (bzw. der einzigen Hand) zählen voll
    const fullRun = this.hands === 'both';
    const recId = this.item.id + (fullRun ? '' : '.' + this.hands);
    const isBest = Store.record(recId, score, stars);
    if (stars > 0) Synth.success();
    this.showResult(score, stars, isBest, fullRun);
    App.refreshHome();
  }

  // ---------- Overlays ----------
  hideOverlay() { this.el.overlay.hidden = true; }

  _dialog(html) {
    this.el.dialog.innerHTML = html;
    this.el.overlay.hidden = false;
  }

  _inputTip() {
    if (Input.micOn) return 'Das Mikrofon hört zu – spiele auf deinem Klavier.';
    if (Input.midiDevices.length) return 'Verbunden mit: ' + Input.midiDevices.join(', ');
    return 'Tippe auf die Tasten unten, nutze die Computertastatur (<kbd>A</kbd> = C, <kbd>W</kbd> = Cis, <kbd>S</kbd> = D …, Pfeiltasten ← → wechseln die Oktave) – oder schalte 🎤 für ein echtes Klavier ein.';
  }

  showStart() {
    const modeText = this.mode === 'wait'
      ? '<b>Warte-Modus:</b> Die Noten bleiben stehen, bis du die richtige Taste triffst. Perfekt zum Lernen.'
      : '<b>Rhythmus-Modus:</b> Die Musik läuft im Takt weiter. Triff die Noten genau, wenn sie unten ankommen.';
    const best = Store.result(this.item.id);
    this._dialog(`
      <h2>${this.item.title}</h2>
      ${this.item.info ? `<p class="muted">${this.item.info}</p>` : ''}
      <p>${modeText}</p>
      <p class="tip">${this._inputTip()}</p>
      ${best ? `<p class="muted">Bestwert: ${best.best}% ${starHtml(best.stars)}</p>` : ''}
      <div class="actions">
        <button class="btn-primary" data-act="start">▶ Los geht's</button>
        <button class="btn-secondary" data-act="demo">👂 Erst anhören</button>
      </div>`);
    this._wire({ start: () => this.start(), demo: () => this.startDemo() });
  }

  showIntro(i) {
    const steps = this.item.intro;
    this._highlightLessonKeys(true);
    const dots = steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    const last = i === steps.length - 1;
    this._dialog(`
      <h2>${this.item.title}</h2>
      ${steps[i]}
      <div class="step-dots">${dots}</div>
      <div class="actions">
        ${i > 0 ? '<button class="btn-secondary" data-act="back">Zurück</button>' : ''}
        <button class="btn-primary" data-act="next">${last ? 'Weiter zur Übung' : 'Weiter'}</button>
      </div>`);
    this._wire({
      back: () => this.showIntro(i - 1),
      next: () => {
        if (last) { this._highlightLessonKeys(false); this.showStart(); } else this.showIntro(i + 1);
      },
    });
  }

  _highlightLessonKeys(on) {
    const seen = new Map();
    this.events.forEach((ev) => { if (!seen.has(ev.midi)) seen.set(ev.midi, ev); });
    seen.forEach((ev) => {
      if (on) this.kb.setTarget(ev.midi, ev.hand, null);
      else this.kb.clearTarget(ev.midi);
    });
    this._targetKey = null;
    this.targets = new Set();
  }

  showResult(score, stars, isBest, fullRun) {
    const s = this.stats;
    const msgs = ['Weiter üben – das wird!', 'Gut gemacht!', 'Sehr gut!', 'Fantastisch!'];
    const lessonIdx = this.kind === 'lesson' ? LESSONS.indexOf(this.item) : -1;
    const nextLesson = lessonIdx >= 0 && stars > 0 && LESSONS[lessonIdx + 1];
    let tip = '';
    if (stars < 2 && this.mode === 'rhythm') tip = 'Tipp: Stelle das Tempo niedriger oder übe erst im Warte-Modus.';
    else if (stars < 2) tip = 'Tipp: Hör dir das Stück mit „👂 Vorspielen“ an und achte auf die leuchtenden Tasten.';
    else if (this.mode === 'wait' && this.kind === 'song') tip = 'Bereit für mehr? Probiere den Rhythmus-Modus!';
    if (!fullRun) tip = 'Übung mit einer Hand gespeichert. Für die volle Wertung spiele mit beiden Händen.';

    const third = this.mode === 'wait'
      ? `<div><b>${s.maxCombo}</b><span>Beste Serie</span></div>`
      : `<div><b>${s.perfect}</b><span>Perfekt</span></div>`;
    this._dialog(`
      <h2 style="text-align:center">${msgs[stars]}</h2>
      <div class="result-stars">${starHtml(stars)}</div>
      <div class="result-score">${score}%</div>
      ${isBest ? '<p style="text-align:center;color:var(--gold)">Neuer Bestwert!</p>' : ''}
      <div class="result-grid">
        <div><b>${s.hits}/${this.total}</b><span>Getroffen</span></div>
        <div><b>${s.errors + s.misses}</b><span>Fehler</span></div>
        ${third}
      </div>
      ${tip ? `<p class="tip" style="margin-top:14px">${tip}</p>` : ''}
      <div class="actions">
        ${nextLesson ? '<button class="btn-primary" data-act="next">Nächste Lektion →</button>' : ''}
        <button class="${nextLesson ? 'btn-secondary' : 'btn-primary'}" data-act="again">⟲ Nochmal</button>
        <button class="btn-secondary" data-act="back">Zur Übersicht</button>
      </div>`);
    this._wire({
      next: () => App.openLesson(nextLesson.id),
      again: () => { this.reset(); this.start(); },
      back: () => App.back(),
    });
  }

  _wire(actions) {
    this.el.dialog.querySelectorAll('[data-act]').forEach((b) => {
      b.onclick = () => actions[b.dataset.act]();
    });
    const primary = this.el.dialog.querySelector('.btn-primary');
    if (primary) primary.focus({ preventScroll: true });
  }

  // ---------- HUD ----------
  _updateHud() {
    const p = Math.max(0, Math.min(1, this.playhead / this.endBeat));
    this.el.progress.style.width = (p * 100).toFixed(1) + '%';
    if (this.demo) { this.el.score.innerHTML = '<b>Vorspielen</b><br>Hör gut zu'; return; }
    const s = this.stats;
    this.el.score.innerHTML = `<b>${s.hits}</b> / ${this.total}<br>${s.combo > 2 ? 'Serie ' + s.combo : '&nbsp;'}`;
  }

  // ---------- Zeichnen ----------
  draw() {
    const { ctx, W, H } = this;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);

    const ppb = Math.max(70, Math.min(160, H / 3.2)); // Pixel pro Schlag
    const hitY = H - 2;
    const ph = this.playhead;

    // Spuren der schwarzen Tasten etwas dunkler
    this.kb.layout.forEach((l, m) => {
      if (l.black) {
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        ctx.fillRect(l.x * W, 0, l.w * W, H);
      } else if (Music.pc(m) === 0 || Music.pc(m) === 5) {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(l.x * W, 0, 1, H);
      }
    });

    // Taktstriche
    const firstBeat = Math.ceil(ph);
    const lastBeat = Math.floor(ph + hitY / ppb);
    for (let b = Math.max(0, firstBeat); b <= Math.min(lastBeat, Math.ceil(this.endBeat)); b++) {
      const y = hitY - (b - ph) * ppb;
      const bar = b % this.beatsPerBar === 0;
      ctx.fillStyle = bar ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, y, W, bar ? 1.5 : 1);
    }

    // Noten
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const ev of this.events) {
      const yBottom = hitY - (ev.start - ph) * ppb;
      const yTop = hitY - (ev.start + ev.dur - ph) * ppb;
      if (yTop > H) continue;
      if (yBottom < -10) break;
      const l = this.kb.layout.get(ev.midi);
      if (!l) continue;
      const pad = l.black ? 1 : 2.5;
      const x = l.x * W + pad;
      const w = l.w * W - pad * 2;
      const h = Math.max(6, yBottom - yTop - 3);
      const y = yBottom - h;
      const c = HAND_COLORS[ev.hand];
      const active = this.demo || this.practiced(ev);

      ctx.globalAlpha = active ? 1 : 0.35;
      let fill = l.black ? c.dark : c.fill;
      if (ev.state === 'hit') fill = ev.quality === 'perfect' ? '#ffd25e' : '#c8ffe6';
      else if (ev.state === 'miss') fill = '#6b2a33';

      if (this.targets.has(ev.midi) && ev.state === 'pending' && active) {
        ctx.shadowColor = c.glow + '0.9)';
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = fill;
      roundRect(ctx, x, y, w, h, Math.min(7, w / 3));
      ctx.fill();
      ctx.shadowBlur = 0;
      if (l.black && ev.state === 'pending') {
        ctx.strokeStyle = c.fill;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Beschriftung
      if (w >= 14 && h >= 16) {
        ctx.fillStyle = ev.state === 'pending' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)';
        if (l.black && ev.state === 'pending') ctx.fillStyle = '#fff';
        const fs = Math.max(9, Math.min(14, w * 0.42));
        ctx.font = `700 ${fs}px system-ui, sans-serif`;
        const visH = Math.min(yBottom, hitY) - y;
        if (visH >= 16) {
          const ly = Math.min(yBottom, hitY) - Math.min(visH, 34) / 2 - 1;
          ctx.fillText(Music.name(ev.midi), x + w / 2, ly);
          if (ev.finger && visH >= 40) {
            ctx.font = `600 ${fs - 2}px system-ui, sans-serif`;
            ctx.fillText(ev.finger, x + w / 2, ly - fs - 1);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Trefferlinie
    const grad = ctx.createLinearGradient(0, hitY - 18, 0, hitY);
    grad.addColorStop(0, 'rgba(255,181,71,0)');
    grad.addColorStop(1, this.waiting ? 'rgba(255,181,71,0.5)' : 'rgba(255,181,71,0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, hitY - 18, W, 18);
    ctx.fillStyle = '#ffb547';
    ctx.fillRect(0, hitY - 1, W, 2);

    // Partikel
    const dt = 1 / 60;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt * 1.8;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    if (!this.running && this.particles.length) requestAnimationFrame(() => this.draw());
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starHtml(n) {
  return '<span class="stars">' + [1, 2, 3].map((i) => (i <= n ? '★' : '<span class="off">★</span>')).join('') + '</span>';
}
