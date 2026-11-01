/* App-Steuerung: Navigation, Listen, Einstellungen, Eingabe-Routing. */
'use strict';

const App = (() => {
  const $ = (id) => document.getElementById(id);
  let player;
  let free;
  let target = null;       // aktueller Empfänger der Noten (Player / FreePlay)
  let returnTo = 'home';
  let songLevel = 0;

  // ---------- Noten-Routing ----------
  function userNoteOn(m, src, vel = 0.8) {
    const sound = src === 'screen' || src === 'key' || (src === 'midi' && Store.settings.midiSound);
    if (sound) Synth.noteOn(m, vel);
    if (target) target.noteOn(m, src, vel);
  }

  function userNoteOff(m, src) {
    if (src !== 'mic') Synth.noteOff(m);
    if (target) target.noteOff(m, src);
  }

  Input.setHandler({ noteOn: userNoteOn, noteOff: userNoteOff });

  // ---------- Navigation ----------
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    if (name !== 'player' && player) player.leave();
    if (name !== 'free' && free) free.leave();
    target = null;
    if (name === 'home') refreshHome();
    if (name === 'lessons') renderLessons();
    if (name === 'songs') renderSongs();
    if (name === 'settings') renderSettings();
    if (name === 'free') { target = free; free.enter(); autoMic(); }
    if (name === 'player') target = player;
    renderInputStatus();
    window.scrollTo(0, 0);
  }

  function route() {
    const h = location.hash.replace('#', '') || 'home';
    if (h === 'player' && !player.item) { location.replace('#home'); return; }
    if (!['home', 'lessons', 'songs', 'settings', 'free', 'player'].includes(h)) { location.replace('#home'); return; }
    show(h);
  }

  function openPlayer(item, kind) {
    returnTo = kind === 'lesson' ? 'lessons' : 'songs';
    show('player');
    autoMic();
    player.load(item, kind);
    renderInputStatus();
    if (location.hash !== '#player') location.hash = 'player';
  }

  function openLesson(id) { openPlayer(LESSONS.find((l) => l.id === id), 'lesson'); }
  function openSong(id) { openPlayer(SONGS.find((s) => s.id === id), 'song'); }
  function back() { location.hash = returnTo; }

  // ---------- Startseite ----------
  function lessonUnlocked(i) { return i === 0 || ((Store.result(LESSONS[i - 1].id) || {}).stars || 0) > 0; }
  function lessonsDone() { return LESSONS.filter((l) => ((Store.result(l.id) || {}).stars || 0) > 0).length; }

  function refreshHome() {
    const done = lessonsDone();
    const streak = Store.currentStreak();
    $('home-stats').innerHTML = `
      <div class="stat"><b>🔥 ${streak}</b><span>${streak === 1 ? 'Tag' : 'Tage'} in Folge</span></div>
      <div class="stat"><b>${done}/${LESSONS.length}</b><span>Lektionen</span></div>
      <div class="stat"><b>⭐ ${Store.totalStars()}</b><span>Sterne</span></div>`;
    const cta = $('home-continue');
    const next = LESSONS.find((l, i) => lessonUnlocked(i) && !((Store.result(l.id) || {}).stars > 0));
    if (next) {
      const n = LESSONS.indexOf(next) + 1;
      cta.innerHTML = `<span><small>${done === 0 ? 'Jetzt starten' : 'Weiter lernen'}</small>Lektion ${n}: ${next.title}</span><span>▶</span>`;
      cta.onclick = () => openLesson(next.id);
    } else {
      cta.innerHTML = '<span><small>Kurs abgeschlossen 🎉</small>Weiter mit den Liedern</span><span>▶</span>';
      cta.onclick = () => { location.hash = 'songs'; };
    }
  }

  // ---------- Listen ----------
  function renderLessons() {
    const ol = $('lesson-list');
    ol.innerHTML = '';
    LESSONS.forEach((l, i) => {
      const r = Store.result(l.id);
      const open = lessonUnlocked(i);
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="item ${open ? '' : 'locked'} ${r && r.stars ? 'done' : ''}" ${open ? '' : 'aria-disabled="true"'}>
          <span class="num">${open ? (r && r.stars ? '✓' : i + 1) : '🔒'}</span>
          <span class="body"><strong>${l.title}</strong><span>${l.short}</span></span>
          ${r ? starHtml(r.stars) : ''}
        </button>`;
      li.firstElementChild.onclick = () => {
        if (open) openLesson(l.id);
        else toast('Schließe zuerst Lektion ' + i + ' mit mindestens einem Stern ab.');
      };
      ol.appendChild(li);
    });
  }

  function renderSongs() {
    document.querySelectorAll('#song-filter .chip').forEach((c) => {
      c.classList.toggle('active', +c.dataset.level === songLevel);
      c.onclick = () => { songLevel = +c.dataset.level; renderSongs(); };
    });
    const ul = $('song-list');
    ul.innerHTML = '';
    SONGS.filter((s) => !songLevel || s.level === songLevel).forEach((s) => {
      const r = Store.result(s.id);
      const li = document.createElement('li');
      li.innerHTML = `
        <button class="item">
          <span class="num">${'♪'.repeat(s.level)}</span>
          <span class="body"><strong>${s.title}<span class="badge">${LEVEL_NAMES[s.level]}</span></strong><span>${s.composer}</span></span>
          ${r ? starHtml(r.stars) : ''}
        </button>`;
      li.firstElementChild.onclick = () => openSong(s.id);
      ul.appendChild(li);
    });
  }

  // ---------- Einstellungen ----------
  let micMeterTimer = null;

  function renderSettings() {
    const s = Store.settings;
    const vol = $('st-volume');
    vol.value = s.volume;
    vol.oninput = () => { Store.setSetting('volume', +vol.value); Synth.setVolume(vol.value / 100); };
    vol.onchange = () => { Synth.noteOn(60, 0.7); setTimeout(() => Synth.noteOff(60), 300); };

    const lbl = $('st-labels');
    lbl.value = s.labels;
    lbl.onchange = () => { Store.setSetting('labels', lbl.value); refreshKeyboards(); };

    const kh = $('st-keyhints');
    kh.checked = s.keyHints;
    kh.onchange = () => { Store.setSetting('keyHints', kh.checked); refreshKeyboards(); };

    const ms = $('st-midisound');
    ms.checked = s.midiSound;
    ms.onchange = () => Store.setSetting('midiSound', ms.checked);

    $('st-midi').onclick = async () => {
      try {
        const devs = await Input.connectMidi();
        toast(devs.length ? 'Verbunden: ' + devs.join(', ') : 'Kein MIDI-Gerät gefunden. Ist das Keyboard eingeschaltet und angeschlossen?');
      } catch (e) { toast(e.message || 'MIDI konnte nicht verbunden werden.'); }
      renderInputStatus();
    };

    $('st-mic').onclick = () => toggleMic();

    const sens = $('st-micsens');
    sens.value = s.micSens;
    sens.onchange = () => Store.setSetting('micSens', +sens.value);
    const ma = $('st-micauto');
    ma.checked = s.micAuto;
    ma.onchange = () => Store.setSetting('micAuto', ma.checked);
    $('st-tune').onclick = () => calibrate();
    renderTuning();
    $('st-reset').onclick = () => {
      if (confirm('Wirklich den gesamten Fortschritt löschen?')) { Store.reset(); toast('Fortschritt zurückgesetzt.'); }
    };
    renderInputStatus();
  }

  function refreshKeyboards() {
    if (player) player.kb.refreshLabels();
    if (free) free.kb.refreshLabels();
  }

  function renderTuning() {
    const c = Store.settings.tuning || 0;
    $('st-tune-status').textContent = Math.abs(c) < 5
      ? 'Spiele das A über dem mittleren C, falls dein Klavier verstimmt ist (aktuell: keine Korrektur)'
      : `Ausgeglichen: dein Klavier ist ${Math.abs(c)} Cent zu ${c < 0 ? 'tief' : 'hoch'} gestimmt`;
  }

  /** Klavier einmessen: ~3 Sekunden das A4 hören und die Abweichung von 440 Hz speichern. */
  async function calibrate() {
    try { if (!Input.micOn) await Input.startMic(); } catch (e) { toast('Mikrofon nicht verfügbar.'); return; }
    renderInputStatus();
    const btn = $('st-tune');
    btn.disabled = true;
    toast('Spiele jetzt mehrmals das A über dem mittleren C (die weiße Taste rechts neben G) …');
    const samples = [];
    const t0 = performance.now();
    await new Promise((resolve) => {
      const iv = setInterval(() => {
        const f = Input.micInfo && Input.micInfo.freq;
        if (f) {
          let c = 1200 * Math.log2(f / 440);
          c = ((c + 600) % 1200 + 1200) % 1200 - 600; // Oktave egal
          if (Math.abs(c) <= 100) samples.push(c);
        }
        btn.textContent = 'Höre zu … ' + Math.ceil((5000 - (performance.now() - t0)) / 1000);
        if (performance.now() - t0 > 5000) { clearInterval(iv); resolve(); }
      }, 40);
    });
    btn.disabled = false;
    btn.textContent = 'Einmessen';
    if (samples.length < 8) { toast('Kein deutliches A gehört. Bitte nochmal versuchen und etwas kräftiger spielen.'); return; }
    samples.sort((a, b) => a - b);
    const med = Math.round(samples[Math.floor(samples.length / 2)]);
    Store.setSetting('tuning', Math.abs(med) < 5 ? 0 : med);
    renderTuning();
    toast(Math.abs(med) < 5 ? 'Dein Klavier ist gut gestimmt 👍' : 'Fertig! Abweichung von ' + med + ' Cent wird ausgeglichen.');
  }

  function autoMic() {
    if (Store.settings.micAuto && !Input.micOn) Input.startMic().then(renderInputStatus).catch(() => {});
  }

  async function toggleMic() {
    try {
      if (Input.micOn) { Input.stopMic(); Store.setSetting('micAuto', false); }
      else {
        await Input.startMic();
        Store.setSetting('micAuto', true);
        toast('🎤 Mikrofon aktiv – spiele auf deinem Klavier. Spiele einzelne Töne deutlich an.');
      }
    } catch (e) {
      toast(e && e.name === 'NotAllowedError' ? 'Zugriff auf das Mikrofon wurde verweigert.' : (e.message || 'Mikrofon nicht verfügbar.'));
    }
    renderInputStatus();
  }

  function renderInputStatus() {
    const mic = Input.micOn;
    const midi = Input.midiDevices;
    const base = Input.base;
    const keyRange = Music.fullName(base) + '–' + Music.fullName(base + 17);
    const html = `
      <span class="${midi.length ? 'on' : ''}">🎹 ${midi.length ? midi.join(', ') : '<button data-midi>MIDI verbinden</button>'}</span>
      <span class="${mic ? 'on' : ''}">🎤 ${mic ? 'Mikrofon an' : 'Mikrofon aus'}</span>
      <span>⌨️ Tastatur ${keyRange} (← →)</span>`;
    ['pl-input', 'fr-input'].forEach((id) => {
      const el = $(id);
      el.innerHTML = html;
      const b = el.querySelector('[data-midi]');
      if (b) b.onclick = async () => {
        try {
          const d = await Input.connectMidi();
          if (!d.length) toast('Kein MIDI-Gerät gefunden.');
        } catch (e) { toast(e.message); }
        renderInputStatus();
      };
    });
    const pm = $('pl-mic');
    pm.setAttribute('aria-pressed', mic);
    $('st-mic').textContent = mic ? 'Mikrofon stoppen' : 'Mikrofon starten';
    $('st-midi-status').textContent = midi.length ? 'Verbunden: ' + midi.join(', ') : (navigator.requestMIDIAccess ? 'Nicht verbunden' : 'Browser unterstützt kein MIDI (Chrome/Edge verwenden)');

    clearInterval(micMeterTimer);
    if (mic && $('screen-settings').classList.contains('active')) {
      micMeterTimer = setInterval(() => {
        const info = Input.micInfo;
        if (!info) return;
        $('st-mic-level').style.width = Math.round(info.level * 100) + '%';
        $('st-mic-note').textContent = info.heard ? Music.fullName(info.heard) : '–';
      }, 60);
    }
    refreshKeyboards();
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }

  // ---------- Start ----------
  function init() {
    Synth.setVolume(Store.settings.volume / 100);
    player = new Player();
    free = new FreePlay();
    $('pl-back').onclick = () => back();
    Input.onStatus(renderInputStatus);
    Input.autoMidi();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && target === player && document.activeElement.tagName !== 'BUTTON') {
        e.preventDefault();
        if (player.el.overlay.hidden) player.toggle();
      }
      if (e.code === 'Escape' && target === player && player.running) player.stop();
    });
    window.addEventListener('hashchange', route);
    document.addEventListener('visibilitychange', () => { if (document.hidden && player.running) player.stop(); });
    route();

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { init, userNoteOn, userNoteOff, openLesson, openSong, back, refreshHome, toggleMic, toast };
})();

App.init();
