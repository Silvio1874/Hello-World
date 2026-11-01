/* Fortschritt und Einstellungen – nur lokal im Browser (localStorage). */
'use strict';

const Store = (() => {
  const KEY = 'tastenfreund.v1';
  const defaults = () => ({
    results: {},          // id -> { best, stars, plays }
    streak: 0,
    lastDay: null,
    settings: { volume: 70, labels: 'all', keyHints: true, midiSound: false, micAuto: false, micSens: 2, tuning: 0 },
  });

  let data = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = Object.assign(defaults(), parsed);
      data.settings = Object.assign(defaults().settings, parsed.settings || {});
    }
  } catch (e) { /* privater Modus o. ä. – dann eben ohne Speichern */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignorieren */ }
  }

  const dayStr = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  function touchStreak() {
    const today = dayStr(new Date());
    if (data.lastDay === today) return;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    data.streak = data.lastDay === dayStr(y) ? data.streak + 1 : 1;
    data.lastDay = today;
  }

  function currentStreak() {
    if (!data.lastDay) return 0;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const ok = data.lastDay === dayStr(new Date()) || data.lastDay === dayStr(y);
    return ok ? data.streak : 0;
  }

  function record(id, score, stars) {
    const r = data.results[id] || { best: 0, stars: 0, plays: 0 };
    const isBest = score > r.best;
    r.best = Math.max(r.best, score);
    r.stars = Math.max(r.stars, stars);
    r.plays += 1;
    data.results[id] = r;
    touchStreak();
    save();
    return isBest;
  }

  return {
    get settings() { return data.settings; },
    setSetting(k, v) { data.settings[k] = v; save(); },
    result: (id) => data.results[id] || null,
    record,
    currentStreak,
    totalStars: () => Object.values(data.results).reduce((s, r) => s + (r.stars || 0), 0),
    reset() { const s = data.settings; data = defaults(); data.settings = s; save(); },
  };
})();
