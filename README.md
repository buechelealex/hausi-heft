# Hausaufgabenheft

Ein Hausaufgabenheft für den Browser: eintragen, abhaken, wiederfinden. Alle
Einträge liegen im `localStorage` des Geräts — sie überstehen das Schliessen des
Tabs und einen Neustart des Browsers und verlassen das Gerät nie. Kein Server,
kein Konto, keine Anmeldung.

Reines HTML, CSS und JavaScript ohne Abhängigkeiten. Die Seite läuft so, wie sie
im Ordner liegt — auf GitHub Pages genauso wie in einem Unterordner oder lokal
über einen kleinen Webserver.

## Aktivitäten

Jede Aktivität ist eine eigene Seite mit eigener `scripts.js` und `style.css` in
ihrem Ordner. Die Hauptaktivität ist das Heft und liegt deshalb im Wurzel-
verzeichnis.

| Ordner       | Aktivität                                                        |
|--------------|------------------------------------------------------------------|
| `/`          | **Heft** — offene Hausaufgaben nach Termin gruppiert, zum Abhaken |
| `/eintragen` | **Eintragen** — neue Aufgabe anlegen oder eine bestehende ändern  |
| `/faecher`   | **Fächer** — Fächer anlegen, umbenennen, einfärben, löschen       |
| `/archiv`    | **Archiv** — Erledigtes, zurückholen oder endgültig löschen       |

```
index.html        Heft (Startseite)
scripts.js        dazu die Logik
style.css         dazu, was nur das Heft braucht
shared/base.css   Gestaltung, die alle Aktivitäten teilen
shared/core.js    Zustand, Speicher, Datum, Navigation
eintragen/  faecher/  archiv/     je index.html, scripts.js, style.css
manifest.json  sw.js  icon-*.png  Installation als App und Offlinebetrieb
```

## Bedienung

* **Eintragen** — Aufgabe, Fach, Termin, Notiz. Der Termin lässt sich über
  „Heute / Morgen / Übermorgen / Nächste Woche" setzen oder im Datumsfeld frei
  wählen; „Kein Termin" ist erlaubt.
* **Abhaken** — ein Tipp auf das Kästchen. Die Aufgabe wandert ins Archiv und
  lässt sich dort mit demselben Kästchen zurückholen.
* **Öffnen** — ein Tipp auf den Text bearbeitet die Aufgabe.
* **Filtern** — die Marken über der Liste zeigen nur ein Fach, sobald in
  mehreren Fächern etwas offen ist.

Das Heft gruppiert nach Termin: Überfällig, Heute, Morgen, Diese Woche, Später,
Ohne Termin.

## Speicher

Alles steht unter dem Schlüssel `hausi-heft-v1` im `localStorage`:

```json
{
  "version": 1,
  "faecher":  [ { "id": "…", "name": "Mathematik", "farbe": "blau" } ],
  "aufgaben": [ { "id": "…", "titel": "Buch S. 42", "fach": "…",
                  "faellig": "2026-09-22", "notiz": "",
                  "erledigt": false, "erledigtAm": null, "erstellt": "…" } ]
}
```

Beim Laden wird jeder Eintrag geprüft, damit eine beschädigte Zeile nicht das
ganze Heft leert. Wer die Website-Daten des Browsers löscht oder ein privates
Fenster benutzt, verliert die Einträge — im privaten Fenster weist das Heft oben
darauf hin.

## Entwickeln

```bash
python -m http.server 8770
```

Danach http://localhost:8770 öffnen. Über `file://` funktioniert der Service
Worker nicht; die App selbst läuft trotzdem.

Beim Ändern von CSS oder JavaScript die `?v=`-Marken in den vier HTML-Dateien
und `VERSION` in `sw.js` gemeinsam hochzählen — sonst liefert der Cache die alte
Fassung aus.

Die Symbole entstehen aus Formeln, ohne Bildbearbeitung:

```bash
python generate-icons.py
```
