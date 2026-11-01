/* Bildschirm-Klaviatur (Maus + Touch, mehrstimmig, Glissando). */
'use strict';

class Keyboard {
  constructor(el, { onDown, onUp }) {
    this.el = el;
    this.onDown = onDown;
    this.onUp = onUp;
    this.keys = new Map();     // midi -> element
    this.layout = new Map();   // midi -> { x, w, black } (Anteile 0..1)
    this.pointers = new Map(); // pointerId -> midi
    this.timers = new Map();
    this.lo = 60;
    this.hi = 72;

    el.addEventListener('pointerdown', (e) => this._down(e));
    el.addEventListener('pointermove', (e) => this._move(e));
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => el.addEventListener(t, (e) => this._up(e)));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setRange(lo, hi) {
    while (Music.isBlack(lo)) lo--;
    while (Music.isBlack(hi)) hi++;
    this.lo = lo;
    this.hi = hi;
    this.el.innerHTML = '';
    this.keys.clear();
    this.layout.clear();

    let whites = 0;
    for (let m = lo; m <= hi; m++) if (!Music.isBlack(m)) whites++;
    const ww = 1 / whites;
    const bw = ww * 0.6;
    let wi = 0;
    for (let m = lo; m <= hi; m++) {
      const black = Music.isBlack(m);
      const x = black ? wi * ww - bw / 2 : wi * ww;
      const w = black ? bw : ww;
      if (!black) wi++;
      this.layout.set(m, { x, w, black });

      const k = document.createElement('div');
      k.className = 'key ' + (black ? 'black' : 'white');
      k.dataset.midi = m;
      k.style.left = (x * 100) + '%';
      k.style.width = (w * 100) + '%';
      k.innerHTML = '<span class="fing"></span><span class="khint"></span><span class="lbl"></span>';
      this.el.appendChild(k);
      this.keys.set(m, k);
    }
    this.refreshLabels();
  }

  refreshLabels() {
    const mode = Store.settings.labels;
    const hints = Store.settings.keyHints;
    this.keys.forEach((k, m) => {
      const lbl = k.querySelector('.lbl');
      let t = '';
      if (!Music.isBlack(m)) {
        if (mode === 'all') t = Music.name(m);
        else if (mode === 'c' && Music.pc(m) === 0) t = 'C' + Music.octave(m);
      }
      if (mode !== 'none' && Music.pc(m) === 0 && m === 60) t = 'C4';
      lbl.textContent = t;
      k.querySelector('.khint').textContent = hints ? (Input.keyLabelFor(m) || '') : '';
    });
  }

  midiAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const k = el && el.closest ? el.closest('.key') : null;
    return k && this.el.contains(k) ? +k.dataset.midi : null;
  }

  _down(e) {
    e.preventDefault();
    const m = this.midiAt(e.clientX, e.clientY);
    if (m === null) return;
    try { this.el.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
    this.pointers.set(e.pointerId, m);
    this.onDown(m, e.pointerType === 'touch' ? 0.75 : 0.8);
  }

  _move(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const m = this.midiAt(e.clientX, e.clientY);
    const prev = this.pointers.get(e.pointerId);
    if (m === prev) return;
    if (prev !== null) this.onUp(prev);
    this.pointers.set(e.pointerId, m);
    if (m !== null) this.onDown(m, 0.75);
  }

  _up(e) {
    if (!this.pointers.has(e.pointerId)) return;
    const m = this.pointers.get(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (m !== null) this.onUp(m);
  }

  setState(m, cls, on) {
    const k = this.keys.get(m);
    if (k) k.classList.toggle(cls, on);
  }

  flash(m, cls, ms = 250) {
    const k = this.keys.get(m);
    if (!k) return;
    const id = m + cls;
    clearTimeout(this.timers.get(id));
    k.classList.add(cls);
    this.timers.set(id, setTimeout(() => k.classList.remove(cls), ms));
  }

  /** Zielnote markieren (Hand-Farbe + Fingernummer) */
  setTarget(m, hand, finger) {
    const k = this.keys.get(m);
    if (!k) return;
    k.classList.add('target', hand);
    const f = k.querySelector('.fing');
    f.textContent = finger || '';
    f.classList.toggle('has', !!finger);
  }

  clearTarget(m) {
    const k = this.keys.get(m);
    if (k) k.classList.remove('target', 'R', 'L');
  }

  clearAll() {
    this.keys.forEach((k) => k.classList.remove('target', 'R', 'L', 'auto', 'pressed', 'good', 'wrong'));
  }
}
