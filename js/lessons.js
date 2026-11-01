/* Der Kurs: aufeinander aufbauende Lektionen für absolute Anfänger. */
'use strict';

const LESSONS = [
  {
    id: 'l1', title: 'Die Klaviatur kennenlernen', short: 'Wo ist das C?', bpm: 60, rf: false,
    intro: [
      '<p>Willkommen! Schau dir die Tasten an: Die <b>schwarzen Tasten</b> sind immer in Gruppen von <b>zwei</b> und <b>drei</b> angeordnet.</p><p>Dieses Muster wiederholt sich über die ganze Klaviatur – daran orientierst du dich.</p>',
      '<p>Das <b>C</b> ist die weiße Taste direkt <b>links neben den zwei schwarzen Tasten</b>.</p><p>Das C in der Mitte des Klaviers heißt <b>„eingestrichenes C“</b> oder <b>C4</b>. Es ist dein wichtigster Startpunkt.</p>',
      '<p>Gleich fallen Noten von oben herab. Wenn eine Note unten ankommt, <b>wartet die App</b>, bis du die leuchtende Taste drückst.</p><div class="tip">Kein Klavier zur Hand? Tippe einfach auf die Tasten am Bildschirm – oder nutze die Taste <kbd>A</kbd> auf deiner Computertastatur für das C.</div>',
    ],
    right: 'C4/2 C5/2 C4/2 C3/2 | C4/2 C5/2 C4/4',
  },
  {
    id: 'l2', title: 'C – D – E', short: 'Deine ersten drei Töne', bpm: 70,
    intro: [
      '<p>Lege deine <b>rechte Hand</b> auf die Tasten. Die Finger werden von <b>1 bis 5</b> gezählt: Daumen = 1, Zeigefinger = 2, Mittelfinger = 3, Ringfinger = 4, kleiner Finger = 5.</p>',
      '<p>Lege den <b>Daumen (1) auf C</b>, den <b>Zeigefinger (2) auf D</b> und den <b>Mittelfinger (3) auf E</b>.</p><p>Die Zahl auf der leuchtenden Taste zeigt dir immer, welchen Finger du nehmen sollst.</p>',
      '<div class="tip">Halte die Hand locker gewölbt, als würdest du einen kleinen Ball halten. Die Finger bleiben auf „ihren“ Tasten liegen.</div>',
    ],
    right: 'C4 D4 E4/2 | E4 D4 C4/2 | C4 E4 D4 C4 | C4 D4 E4/2 | E4 E4 D4 D4 | C4/4',
  },
  {
    id: 'l3', title: 'Die Fünf-Finger-Position', short: 'C D E F G mit allen Fingern', bpm: 70,
    intro: [
      '<p>Jetzt kommen <b>F</b> (Ringfinger, 4) und <b>G</b> (kleiner Finger, 5) dazu.</p><p>Jeder Finger hat jetzt genau eine Taste: <b>C D E F G</b>. Das nennt man die <b>C-Position</b>.</p>',
      '<div class="tip">Viele einfache Lieder kommen mit genau diesen fünf Tönen aus – deine Hand muss sich dabei gar nicht bewegen!</div>',
    ],
    right: 'C4 D4 E4 F4 | G4/4 | G4 F4 E4 D4 | C4/4 | C4 E4 G4/2 | G4 E4 C4/2 | C4 D4 E4 F4 | G4 F4 E4 D4 | C4/4',
  },
  {
    id: 'l4', title: 'Rhythmus: Viertel, Halbe, Ganze', short: 'Im Takt spielen', bpm: 70, mode: 'rhythm', metronome: true,
    intro: [
      '<p>Musik hat einen <b>Puls</b> – wie ein Herzschlag. Das Metronom klickt diesen Puls.</p><ul><li><b>Viertelnote</b> = 1 Schlag (kurzer Balken)</li><li><b>Halbe Note</b> = 2 Schläge</li><li><b>Ganze Note</b> = 4 Schläge (langer Balken)</li></ul>',
      '<p>In dieser Lektion läuft die Musik im <b>Rhythmus-Modus</b> weiter, auch wenn du nicht spielst. Drücke die Taste genau dann, wenn die Note die Linie unten berührt.</p><div class="tip">Zähle laut mit: „eins – zwei – drei – vier“. Vorher zählt die App einen Takt ein.</div>',
    ],
    right: 'C4 C4 C4 C4 | E4/2 E4/2 | G4 G4 G4 G4 | E4/4 | D4 D4 D4 D4 | F4/2 D4/2 | E4 D4 C4/2 | C4/4',
  },
  {
    id: 'l5', title: 'Erstes Lied: Hänschen klein', short: 'Ein ganzes Lied in C-Position', bpm: 90,
    intro: [
      '<p>Herzlichen Glückwunsch – du kannst jetzt schon dein <b>erstes richtiges Lied</b> spielen!</p><p><b>Hänschen klein</b> benutzt nur die Töne C D E F G. Deine Hand bleibt in der C-Position.</p>',
      '<div class="tip">Tipp: Tippe auf <b>„👂 Vorspielen“</b>, um das Lied erst einmal anzuhören.</div>',
    ],
    right: 'G4 E4 E4/2 | F4 D4 D4/2 | C4 D4 E4 F4 | G4 G4 G4/2 | G4 E4 E4/2 | F4 D4 D4/2 | C4 E4 G4 G4 | C4/4',
  },
  {
    id: 'l6', title: 'Die linke Hand', short: 'C-Position links', bpm: 70,
    intro: [
      '<p>Jetzt ist die <b>linke Hand</b> dran. Ihre Noten sind <b>blau</b>, die der rechten Hand <b>grün</b>.</p><p>Auch links zählen die Finger vom Daumen (1) bis zum kleinen Finger (5).</p>',
      '<p>Lege den <b>kleinen Finger (5) auf das tiefere C</b> (C3), eine Oktave links vom mittleren C. Dann liegt der Daumen (1) auf dem G.</p>',
    ],
    left: 'C3 D3 E3 F3 | G3/4 | G3 F3 E3 D3 | C3/4 | C3 E3 G3/2 | G3 E3 C3/2 | C3/4',
  },
  {
    id: 'l7', title: 'Schwarze Tasten: das Fis', short: 'Die erste schwarze Taste', bpm: 70, rBase: 'D4',
    intro: [
      '<p>Die schwarzen Tasten liegen zwischen den weißen. Die schwarze Taste <b>rechts neben dem F</b> heißt <b>Fis</b> (F + „is“ = einen halben Ton höher, geschrieben F♯).</p>',
      '<p>Lege den Daumen (1) auf <b>D</b>. Dann liegen E (2), <b>Fis (3)</b>, G (4) und A (5) unter deinen Fingern. Der Mittelfinger rutscht dafür ein kleines Stück nach vorn auf die schwarze Taste.</p>',
    ],
    right: 'D4 E4 F#4 G4 | A4/4 | A4 G4 F#4 E4 | D4/4 | D4 F#4 A4/2 | G4 F#4 E4/2 | F#4 E4 D4/2 | D4/4',
  },
  {
    id: 'l8', title: 'Beide Hände zusammen', short: 'Melodie + Basston', bpm: 66, lBase: 'G2',
    intro: [
      '<p>Jetzt wird es spannend: <b>beide Hände gleichzeitig</b>! Die linke Hand spielt lange, tiefe Basstöne, die rechte Hand die Melodie.</p>',
      '<div class="tip">Wenn es zu schwer ist: Wähle oben <b>„Nur rechte Hand“</b> – dann spielt die App die linke Hand für dich. Danach probierst du die linke allein und erst dann beide zusammen.</div>',
    ],
    right: 'C4 D4 E4 F4 | G4/2 E4/2 | F4 D4 G4/2 | C4/4 | E4 F4 G4/2 | F4 E4 D4/2 | E4 D4 C4 D4 | C4/4',
    left: 'C3/4 | C3/4 | G2/4 | C3/4 | C3/4 | G2/4 | G2/4 | C3/4',
  },
  {
    id: 'l9', title: 'Dein erster Akkord', short: 'Drei Töne gleichzeitig', bpm: 60,
    intro: [
      '<p>Ein <b>Akkord</b> sind mehrere Töne, die zusammen klingen. Der wichtigste ist <b>C-Dur</b>: <b>C + E + G</b> mit den Fingern <b>1 + 3 + 5</b>.</p>',
      '<p>Dazu kommen <b>F-Dur</b> (C + F + A, Finger 1 + 4 + 5) und <b>G-Dur</b> (H + D + G, Finger 1 + 2 + 5). Mit diesen drei Akkorden kannst du hunderte Lieder begleiten!</p>',
      '<div class="tip">Drücke alle Tasten möglichst gleichzeitig. Im Warte-Modus geht es weiter, sobald alle drei Töne gespielt wurden.</div>',
    ],
    right: 'C4+E4+G4/2 C4+E4+G4/2 | C4+F4+A4/2 C4+F4+A4/2 | B3+D4+G4/2 B3+D4+G4/2 | C4+E4+G4/4 |'
      + ' C4+F4+A4/2 C4+E4+G4/2 | B3+D4+G4/2 C4+E4+G4/2 | C4+E4+G4/4',
    rf: '1+3+5 1+3+5 | 1+4+5 1+4+5 | 1+2+5 1+2+5 | 1+3+5 | 1+4+5 1+3+5 | 1+2+5 1+3+5 | 1+3+5',
  },
  {
    id: 'l10', title: 'Abschluss: Ode an die Freude', short: 'Beethoven mit der rechten Hand', bpm: 90,
    intro: [
      '<p>Zum Abschluss des Grundkurses spielst du ein Stück von <b>Ludwig van Beethoven</b> – die berühmte <b>Ode an die Freude</b>.</p><p>Neu ist die <b>punktierte Note</b>: Sie ist anderthalbmal so lang wie normal. Danach folgt eine kurze Note.</p>',
      '<div class="tip">Nach diesem Kurs findest du unter <b>„Lieder“</b> weitere Stücke – auch mit beiden Händen.</div>',
    ],
    right: 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4/1.5 D4/0.5 D4/2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4/1.5 C4/0.5 C4/2',
  },
];
