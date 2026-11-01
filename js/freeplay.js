/* Freies Spiel und Notenquiz („Finde die Taste“). */
'use strict';

class FreePlay {
  constructor() {
    this.kb = new Keyboard(document.getElementById('fr-keyboard'), {
      onDown: (m, v) => App.userNoteOn(m, 'screen', v),
      onUp: (m) => App.userNoteOff(m, 'screen'),
    });
    this.noteEl = document.getElementById('fr-note');
    this.subEl = document.getElementById('fr-sub');
    this.quizBar = document.getElementById('fr-quizbar');
    this.quizBtn = document.getElementById('fr-quiz');
    this.quiz = null;
    this.quizBtn.onclick = () => { this.quizBtn.blur(); this.quiz ? this.stopQuiz() : this.startQuiz(); };
  }

  enter() {
    const narrow = window.innerWidth < 640;
    this.kb.setRange(narrow ? 60 : 48, narrow ? 83 : 84);
    Input.setBase(60);
    this.kb.refreshLabels();
    if (!this.quiz) this._idle();
  }

  leave() {
    this.stopQuiz();
    this.kb.clearAll();
  }

  _idle() {
    this.noteEl.textContent = '♪';
    this.subEl.textContent = 'Drücke eine Taste – oder starte das Notenquiz';
  }

  noteOn(m) {
    this.kb.setState(m, 'pressed', true);
    if (this.quiz) { this._answer(m); return; }
    this.noteEl.textContent = Music.name(m);
    this.subEl.textContent = Music.isBlack(m)
      ? 'schwarze Taste · ' + Music.fullName(m)
      : (m === 60 ? 'das mittlere C · C4' : Music.fullName(m));
  }

  noteOff(m) { this.kb.setState(m, 'pressed', false); }

  // ---------- Quiz ----------
  startQuiz(level = 1) {
    const pools = {
      1: [60, 62, 64, 65, 67, 69, 71],
      2: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],
    };
    this.quiz = { pool: pools[level], level, round: 0, rounds: 10, correct: 0, tries: 0, target: null };
    this.quizBtn.setAttribute('aria-pressed', 'true');
    this.quizBtn.textContent = '✕ Quiz beenden';
    this.quizBar.hidden = false;
    this._next();
  }

  stopQuiz() {
    if (!this.quiz) return;
    if (this.quiz.target !== null) this.kb.clearTarget(this.quiz.target);
    this.quiz = null;
    this.quizBtn.setAttribute('aria-pressed', 'false');
    this.quizBtn.textContent = '🎯 Notenquiz';
    this.quizBar.hidden = true;
    this._idle();
  }

  _next() {
    const q = this.quiz;
    if (q.target !== null) this.kb.clearTarget(q.target);
    if (q.round >= q.rounds) { this._done(); return; }
    let t;
    do { t = q.pool[Math.floor(Math.random() * q.pool.length)]; } while (t === q.target && q.pool.length > 1);
    q.target = t;
    q.tries = 0;
    q.round++;
    this.noteEl.textContent = Music.name(t);
    this.subEl.textContent = `Finde diese Taste (beliebige Oktave) · ${q.round}/${q.rounds}`;
    this._bar();
  }

  _bar() {
    const q = this.quiz;
    this.quizBar.innerHTML = `<span class="muted">Richtig: ${q.correct}</span>`
      + '<button data-h>💡 Hinweis</button>'
      + `<button data-l>${q.level === 1 ? 'Mit schwarzen Tasten' : 'Nur weiße Tasten'}</button>`;
    this.quizBar.querySelector('[data-h]').onclick = () => {
      this.kb.keys.forEach((_, m) => { if (Music.pc(m) === Music.pc(q.target)) this.kb.flash(m, 'good', 1200); });
      q.tries = 99;
    };
    this.quizBar.querySelector('[data-l]').onclick = () => this.startQuiz(q.level === 1 ? 2 : 1);
  }

  _answer(m) {
    const q = this.quiz;
    if (q.target === null) return;
    if (Music.pc(m) === Music.pc(q.target)) {
      if (q.tries === 0) q.correct++;
      this.kb.flash(m, 'good', 400);
      this.subEl.textContent = 'Richtig! 🎉';
      const target = q.target;
      q.target = null;
      this.kb.clearTarget(target);
      setTimeout(() => { if (this.quiz === q) this._next(); }, 650);
    } else {
      q.tries++;
      this.kb.flash(m, 'wrong', 350);
      this.subEl.textContent = 'Das war ' + Music.name(m) + ' – versuch es nochmal';
      if (q.tries >= 2) this.subEl.textContent += ' (Tipp: 💡 Hinweis)';
    }
  }

  _done() {
    const q = this.quiz;
    const stars = q.correct >= 9 ? 3 : q.correct >= 7 ? 2 : q.correct >= 5 ? 1 : 0;
    Store.record('quiz' + q.level, q.correct * 10, stars);
    App.refreshHome();
    if (stars) Synth.success();
    this.noteEl.innerHTML = starHtml(stars);
    this.subEl.textContent = `${q.correct} von ${q.rounds} auf Anhieb richtig!`;
    this.quizBar.innerHTML = '<button data-a>Nochmal</button>';
    this.quizBar.querySelector('[data-a]').onclick = () => this.startQuiz(q.level);
    q.target = null;
    q.round = q.rounds;
  }
}
