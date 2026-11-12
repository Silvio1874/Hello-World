# 🎹 Tastenfreund – Klavier lernen ohne Abo

Eine kostenlose Web-App, mit der auch absolute Anfänger Klavier spielen lernen – mit fallenden Noten, einem Schritt-für-Schritt-Kurs und bekannten Liedern.
Kein Konto, kein Abo, keine Werbung. Der Fortschritt bleibt lokal auf deinem Gerät.

## Funktionen

- **Kurs mit 10 Lektionen**: von „Wo ist das C?“ über Fingersatz, Rhythmus, linke Hand und schwarze Tasten bis zu Akkorden und beiden Händen. Die nächste Lektion wird freigeschaltet, sobald du mindestens einen Stern hast.
- **Liederbibliothek** (nur gemeinfreie Stücke): Hänschen klein, Alle meine Entchen, Bruder Jakob, Morgen kommt der Weihnachtsmann, Ode an die Freude, Jingle Bells, When the Saints, Kanon in D (beide Hände), Für Elise (Anfang, beide Hände).
- **Fallende Noten** in Handfarben (rechts grün, links blau), mit Notennamen und Fingernummern direkt auf Noten und Tasten.
- **Warte-Modus**: Die Musik wartet, bis du die richtige Taste triffst – ideal zum Lernen.
- **Rhythmus-Modus**: Die Musik läuft weiter, Bewertung mit „Perfekt“/„Gut“, einstellbares Tempo (30–150 %) und Metronom.
- **Hände einzeln üben**: Die App spielt die andere Hand automatisch.
- **Vorspielen**: Das Stück zuerst anhören und zusehen.
- **Freies Spiel & Notenquiz**: Tasten finden üben, mit oder ohne schwarze Tasten.
- **Sterne, Bestwerte und Tage-Serie** als Motivation.
- **Offline-fähig und installierbar**: Auf dem Handy über „Zum Startbildschirm hinzufügen“ wie eine App nutzen.

## So spielst du

| Instrument | So geht's |
|---|---|
| **Echtes (akustisches) Klavier** | Im Spieler auf 🎤 tippen. Die App erkennt die gespielten Töne über das Mikrofon. |
| **Digitalpiano / MIDI-Keyboard** | Per USB oder Bluetooth anschließen, in Chrome oder Edge „MIDI verbinden“ antippen. |
| **Ohne Klavier** | Auf die Tasten am Bildschirm tippen (mehrere Finger gleichzeitig gehen) oder die Computertastatur nutzen: `A W S E D F T G Z H U J K …` = C Cis D Dis E F Fis G Gis A B H C …, mit den Pfeiltasten ← → wechselst du die Oktave. Die Leertaste startet oder pausiert. |

## Starten

Die App ist reines HTML/CSS/JavaScript ohne Build-Schritt und ohne Abhängigkeiten.

```bash
# im Projektordner
python3 -m http.server 8000
# dann im Browser öffnen: http://localhost:8000
```

Du kannst `index.html` auch direkt per Doppelklick öffnen. Mikrofon, MIDI und Offline-Modus funktionieren aber nur über `http://localhost` oder HTTPS.

**Kostenlos online stellen:** Im GitHub-Repository unter *Settings → Pages* den Branch auswählen. Danach ist die App unter `https://<benutzer>.github.io/<repo>/` erreichbar und lässt sich auf jedem Handy installieren.

## Eigene Lieder hinzufügen

Lieder stehen in [`js/songs.js`](js/songs.js) in einer einfachen Textnotation:

```js
{
  id: 'meinlied', title: 'Mein Lied', composer: 'Ich', level: 1, bpm: 90,
  right: 'C4 D4 E4 F4 | G4/2 G4/2 | C4+E4+G4/4',   // rechte Hand
  left:  'C3/4 | G2/4 | C3/4',                      // linke Hand (optional)
  rf: '1 2 3 4 | 5 5 | 1+3+5',                      // Fingersätze (optional, sonst automatisch)
}
```

- `C4` = Viertelnote (C4 ist das mittlere C), `/2` = Halbe, `/4` = Ganze, `/0.5` = Achtel, `/1.5` = punktierte Viertel
- `F#4` / `Bb4` = Vorzeichen, `C4+E4+G4` = Akkord, `R` = Pause, `|` = Taktstrich (nur zur Lesbarkeit)

## Projektstruktur

```
index.html          Oberfläche (alle Bildschirme)
css/style.css       Design
js/music.js         Notennamen, Parser, Fingersatz
js/synth.js         Klavierklang (Web Audio, ohne Samples)
js/keyboard.js      Bildschirm-Klaviatur (Touch/Maus)
js/input.js         Computertastatur, MIDI, Mikrofon-Tonerkennung
js/songs.js         Liederbibliothek
js/lessons.js       Kursinhalte
js/player.js        Übungs-Player (fallende Noten, Modi, Bewertung)
js/freeplay.js      Freies Spiel & Notenquiz
js/app.js           Navigation, Einstellungen
sw.js               Offline-Cache (Service Worker)
```

---

## 📈 Aktien-Dashboard (`aktien/`)

Eine eigene Seite unter `aktien/index.html`: Depot per CSV laden und aktuelle Kurse, Tagesänderung, Gewinn/Verlust und Nachrichten der letzten 7 Tage ansehen.

1. Kostenlosen API-Key auf [finnhub.io](https://finnhub.io) holen und oben eintragen.
2. CSV mit den Spalten `Symbol;Name;Anzahl;Kaufkurs` laden (Vorlage: `aktien/beispiel.csv`).
3. Auf eine Aktie klicken, um nur ihre Nachrichten zu sehen. Kurse aktualisieren sich jede Minute.

Key und Depot bleiben lokal im Browser.
