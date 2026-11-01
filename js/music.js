/* Musik-Hilfsfunktionen: Notennamen, Parser für die Lied-Notation, Fingersatz. */
'use strict';

const Music = (() => {
  const BLACK = new Set([1, 3, 6, 8, 10]);
  // Deutsche Notennamen (H statt B, B = Hes/Ais)
  const NAMES_DE = ['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'B', 'H'];
  const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };
  // Position einer Taste in "weißen Tasten" (schwarze liegen dazwischen)
  const WHITE_POS = [0, 0.5, 1, 1.5, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6];

  const pc = (m) => ((m % 12) + 12) % 12;
  const isBlack = (m) => BLACK.has(pc(m));
  const octave = (m) => Math.floor(m / 12) - 1;
  const name = (m) => NAMES_DE[pc(m)];
  const fullName = (m) => name(m) + octave(m);
  const whitePos = (m) => Math.floor(m / 12) * 7 + WHITE_POS[pc(m)];
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /** "C4", "F#3", "Bb4" -> MIDI-Nummer (C4 = 60). Englische Buchstaben, B = H. */
  function toMidi(str) {
    const m = /^([A-H])(#|b)?(-?\d)$/.exec(str);
    if (!m) throw new Error('Unbekannte Note: ' + str);
    let v = LETTER[m[1]] + 12 * (parseInt(m[3], 10) + 1);
    if (m[2] === '#') v += 1;
    if (m[2] === 'b') v -= 1;
    return v;
  }

  /** Einfacher Fingersatz für eine Fünf-Finger-Position ab `base`. */
  function autoFinger(midi, hand, base) {
    const d = Math.round(whitePos(midi) - whitePos(base));
    const f = hand === 'L' ? 5 - d : d + 1;
    return f >= 1 && f <= 5 ? f : null;
  }

  /**
   * Parst eine Spur. Notation: Tokens durch Leerzeichen getrennt.
   *   C4        Viertelnote (1 Schlag)
   *   G4/2      Halbe Note (2 Schläge), /0.5 Achtel, /4 Ganze …
   *   C4+E4+G4/2  Akkord
   *   R/1       Pause
   *   |         Taktstrich (wird ignoriert, nur zur Lesbarkeit)
   * fingers: gleiche Token-Struktur ("1 2 3+5 -"), false = keine Fingersätze,
   *          undefined = automatisch ab `base`.
   */
  function parseTrack(str, hand, fingers, base) {
    const toks = str.split(/\s+/).filter((t) => t && t !== '|');
    const ftoks = typeof fingers === 'string' ? fingers.split(/\s+/).filter((t) => t && t !== '|') : null;
    const baseMidi = toMidi(base || (hand === 'L' ? 'C3' : 'C4'));
    const out = [];
    let t = 0;
    toks.forEach((tok, i) => {
      const [p, d] = tok.split('/');
      const dur = d ? parseFloat(d) : 1;
      if (p !== 'R') {
        const fs = ftoks && ftoks[i] ? ftoks[i].split('+') : [];
        p.split('+').forEach((n, k) => {
          const midi = toMidi(n);
          let finger = null;
          if (fs[k] && fs[k] !== '-') finger = parseInt(fs[k], 10);
          else if (fingers !== false && !ftoks) finger = autoFinger(midi, hand, baseMidi);
          out.push({ midi, start: t, dur, hand, finger });
        });
      }
      t += dur;
    });
    return out;
  }

  /** Alle Ereignisse (beide Hände) eines Lieds / einer Lektion. */
  function buildEvents(item) {
    let ev = [];
    if (item.right) ev = ev.concat(parseTrack(item.right, 'R', item.rf, item.rBase));
    if (item.left) ev = ev.concat(parseTrack(item.left, 'L', item.lf, item.lBase));
    ev.sort((a, b) => a.start - b.start || a.midi - b.midi);
    ev.forEach((e, i) => { e.id = i; });
    return ev;
  }

  return { isBlack, name, fullName, octave, whitePos, freq, toMidi, parseTrack, buildEvents, pc };
})();
