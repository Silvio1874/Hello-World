/*
 * Liedbibliothek – nur gemeinfreie Melodien (Volkslieder / Klassik).
 * Notation siehe Music.parseTrack: "C4" = Viertel, "/2" = Halbe, "R" = Pause, "C4+E4" = Akkord, "|" = Taktstrich.
 * Neue Lieder einfach hier ergänzen.
 */
'use strict';

const SONGS = [
  {
    id: 'haenschen', title: 'Hänschen klein', composer: 'Volkslied', level: 1, bpm: 100,
    info: 'Bleibt komplett in der Fünf-Finger-Position C–G.',
    right: 'G4 E4 E4/2 | F4 D4 D4/2 | C4 D4 E4 F4 | G4 G4 G4/2 |'
      + ' G4 E4 E4/2 | F4 D4 D4/2 | C4 E4 G4 G4 | C4/4 |'
      + ' D4 D4 D4 D4 | D4 E4 F4/2 | E4 E4 E4 E4 | E4 F4 G4/2 |'
      + ' G4 E4 E4/2 | F4 D4 D4/2 | C4 E4 G4 G4 | C4/4',
  },
  {
    id: 'entchen', title: 'Alle meine Entchen', composer: 'Volkslied', level: 1, bpm: 100,
    info: 'Fünf Finger plus ein kleiner Schritt zum A.',
    right: 'C4 D4 E4 F4 | G4/2 G4/2 | A4 A4 A4 A4 | G4/4 | A4 A4 A4 A4 | G4/4 |'
      + ' F4 F4 F4 F4 | E4/2 E4/2 | D4 D4 D4 D4 | C4/4',
    rf: '1 2 3 4 | 5 5 | 5 5 5 5 | 4 | 5 5 5 5 | 4 | 3 3 3 3 | 2 2 | 1 1 1 1 | 1',
  },
  {
    id: 'jakob', title: 'Bruder Jakob', composer: 'Volkslied', level: 1, bpm: 100,
    right: 'C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4/2 | E4 F4 G4/2 |'
      + ' G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4 | G4/0.5 A4/0.5 G4/0.5 F4/0.5 E4 C4 |'
      + ' C4 G3 C4/2 | C4 G3 C4/2',
  },
  {
    id: 'weihnachtsmann', title: 'Morgen kommt der Weihnachtsmann', composer: 'Volkslied (Ah vous dirai-je, maman)', level: 1, bpm: 100,
    right: 'C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2 |'
      + ' G4 G4 F4 F4 | E4 E4 D4/2 | G4 G4 F4 F4 | E4 E4 D4/2 |'
      + ' C4 C4 G4 G4 | A4 A4 G4/2 | F4 F4 E4 E4 | D4 D4 C4/2',
    rf: '1 1 4 4 | 5 5 4 | 3 3 2 2 | 1 1 1 | 4 4 3 3 | 2 2 1 | 4 4 3 3 | 2 2 1 | 1 1 4 4 | 5 5 4 | 3 3 2 2 | 1 1 1',
  },
  {
    id: 'ode', title: 'Ode an die Freude', composer: 'Ludwig van Beethoven', level: 2, bpm: 100,
    info: 'Achte auf die punktierten Noten am Ende jeder Zeile.',
    right: 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/0.5 D4/2 |'
      + ' E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2 |'
      + ' D4 D4 E4 C4 | D4 E4/0.5 F4/0.5 E4 C4 | D4 E4/0.5 F4/0.5 E4 D4 | C4 D4 G3/2 |'
      + ' E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2',
  },
  {
    id: 'jingle', title: 'Jingle Bells (Refrain)', composer: 'James Lord Pierpont', level: 2, bpm: 110,
    right: 'E4 E4 E4/2 | E4 E4 E4/2 | E4 G4 C4/1.5 D4/0.5 | E4/4 |'
      + ' F4 F4 F4/1.5 F4/0.5 | F4 E4 E4 E4/0.5 E4/0.5 | E4 D4 D4 E4 | D4/2 G4/2 |'
      + ' E4 E4 E4/2 | E4 E4 E4/2 | E4 G4 C4/1.5 D4/0.5 | E4/4 |'
      + ' F4 F4 F4 F4 | F4 E4 E4 E4/0.5 E4/0.5 | G4 G4 F4 D4 | C4/4',
  },
  {
    id: 'saints', title: 'When the Saints Go Marching In', composer: 'Spiritual', level: 2, bpm: 120,
    right: 'C4 E4 F4 | G4/4 | R C4 E4 F4 | G4/4 | R C4 E4 F4 | G4/2 E4/2 | C4/2 E4/2 | D4/4 |'
      + ' R E4 E4 D4 | C4/3 C4 | E4/2 G4/2 | G4 F4/3 | R E4 F4 G4 | E4/2 C4/2 | D4/2 D4/2 | C4/4',
  },
  {
    id: 'kanon', title: 'Kanon in D (vereinfacht)', composer: 'Johann Pachelbel', level: 3, bpm: 64,
    info: 'Links lange Basstöne, rechts eine ruhige Melodie – ideal für die ersten Versuche mit beiden Händen.',
    right: 'F#5/4 | E5/4 | D5/4 | C#5/4 | B4/4 | A4/4 | B4/4 | C#5/4 |'
      + ' D5 F#5 A5 F#5 | C#5 E5 A5 E5 | B4 D5 F#5 D5 | A4 C#5 F#5 C#5 |'
      + ' G4 B4 D5 B4 | F#4 A4 D5 A4 | G4 B4 D5 B4 | A4 C#5 E5 C#5 | D5+F#5+A5/4',
    rf: false,
    left: 'D3/4 | A2/4 | B2/4 | F#2/4 | G2/4 | D2/4 | G2/4 | A2/4 |'
      + ' D3/4 | A2/4 | B2/4 | F#2/4 | G2/4 | D2/4 | G2/4 | A2/4 | D2+D3/4',
    lf: '1 | 4 | 3 | 5 | 4 | 5 | 4 | 4 | 1 | 4 | 3 | 5 | 4 | 5 | 4 | 4 | 5+1',
  },
  {
    id: 'elise', title: 'Für Elise (Anfang)', composer: 'Ludwig van Beethoven', level: 3, bpm: 70,
    info: 'Die schnellen Noten sind Sechzehntel. Übe zuerst langsam im Warte-Modus.',
    right: 'E5/0.5 D#5/0.5 | E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 |'
      + ' A4 R/0.5 C4/0.5 E4/0.5 A4/0.5 | B4 R/0.5 E4/0.5 G#4/0.5 B4/0.5 |'
      + ' C5 R/0.5 E4/0.5 E5/0.5 D#5/0.5 | E5/0.5 D#5/0.5 E5/0.5 B4/0.5 D5/0.5 C5/0.5 |'
      + ' A4 R/0.5 C4/0.5 E4/0.5 A4/0.5 | B4 R/0.5 E4/0.5 C5/0.5 B4/0.5 | A4/2',
    rf: '5 4 | 5 4 5 2 4 3 | 1 - 1 2 3 | 4 - 1 3 4 | 5 - 1 5 4 | 5 4 5 2 4 3 | 1 - 1 2 3 | 4 - 1 3 2 | 1',
    left: 'R/4 | A2/0.5 E3/0.5 A3/0.5 R/1.5 | E2/0.5 E3/0.5 G#3/0.5 R/1.5 | A2/0.5 E3/0.5 A3/0.5 R/1.5 |'
      + ' R/3 | A2/0.5 E3/0.5 A3/0.5 R/1.5 | E2/0.5 E3/0.5 G#3/0.5 R/1.5 | A2/2',
    lf: '- | 5 2 1 - | 5 2 1 - | 5 2 1 - | - | 5 2 1 - | 5 2 1 - | 5',
  },
];

const LEVEL_NAMES = { 1: 'Leicht', 2: 'Mittel', 3: 'Beide Hände' };
