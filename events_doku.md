---
schema: 1
status: In Arbeit
repo: dashboard-events
owner: Luc
---

# Events

Persönliches lokales Manager-View für aggregierte Anlässe (Bühne, Tanz, Kennenlernen, Konferenzen, Retreats, Sport, Festivals). Python + Flask, scrapt Web-Quellen, läuft auf `localhost:5050`. Seit 2026-05-27 in v2-Neuaufbau nach dem v1-Vercel-Versuch (siehe `_archiv/v1-vercel/`).

## Übersicht

v1 (Next.js/Vercel) wurde am 25.5.2026 als unzuverlässig verworfen. v2 startet auf einer schlankeren Basis: Python-Scripts statt Next.js, Flask-Server statt Vercel, lokal statt online — Pfad nach oben offen (Scraper-Funktionen sind plattform-neutral, HTML kann später statisch deployen).

Aktuell **8 aktive Scraper** über 5 von 7 Kategorien. Web-UI mit 6 Filter-Pills (Datum, Kategorie, Dauer, Stadt, Land, Kontinent) als Multi-Select mit dynamischen Counts, sortierbaren Spalten, Quellen-Toggles und «Interessiert»-Markierung pro Event. Schema-Validation verhindert Müll-Output, Stale-Schutz behält letzten erfolgreichen Stand bei Scraper-Ausfall, Source-Health-Warnung wenn eine Quelle > 7 Tage stumm bleibt.

## Links

- [Lastenheft v1 (Snapshot 25.5.2026)](lastenheft.md)
- [v1-Code-Archiv](_archiv/v1-vercel/)

## Architektur

```
Events/
├── app.py                  # Flask-Server (127.0.0.1:5050)
├── categories.py           # 7 Kategorien (single source of truth)
├── geo.py                  # ISO-2 → Kontinent + deutscher Name + normalize
├── event_schema.py         # Manuelle Validation gegen Scraper-Output
├── scrapers/
│   ├── __init__.py         # SCRAPERS Registry
│   ├── _utils.py           # HEADERS, url_hash, sanitize_city, extract_venue_and_city
│   ├── schuur.py
│   ├── jazzkantine.py
│   ├── kulturhof.py
│   ├── vbg.py
│   ├── ecstaticdancebern.py
│   ├── bitvocation.py
│   ├── barhopping.py
│   └── campfi.py
├── templates/index.html
├── static/{app.js, style.css}
├── data/
│   ├── sources.json        # 265 Quellen mit Status-Lifecycle
│   ├── events.json         # Cache, von _run_all_scrapers geschrieben
│   └── event_states.json   # Interessiert/Ignoriert pro Event-ID (server-seitig)
├── scripts/inspect_*.py    # Diagnose-Scripts pro Quelle, manuell auf Mac ausführbar
├── start.command           # Doppelklick: venv + Server + Browser
└── requirements.txt        # flask, requests, beautifulsoup4
```

## Kategorien (Stand 2026-05-27)

| ID | Label |
|---|---|
| `buehne-konzerte` | Bühne & Konzerte |
| `tanz-bewegung` | Tanz & Bewegung |
| `kennenlernen` | Kennenlernen |
| `sport` | Sport |
| `konferenzen` | Konferenzen |
| `festivals` | Festivals |
| `retreats-austausch` | Retreats & Austausch |

7 statt 8 wie in v1 — `tanz` zu `tanz-bewegung` erweitert (deckt jetzt auch Yoga/Körperarbeit), `singles-dating` + `begegnungen` zu `kennenlernen` zusammengeführt.

## Aktive Scraper (Stand 2026-05-27)

| ID | Kategorie | Mechanismus |
|---|---|---|
| schuur | buehne-konzerte | HTML, native `viz-event-NNNN` ID |
| jazzkantine | buehne-konzerte | HTML Squarespace, URL-Hash ID |
| kulturhof | buehne-konzerte | HTML WordPress, URL-Hash ID |
| vbg | retreats-austausch | HTML kItem-attrs, manueller Venue-Map |
| ecstaticdancebern | tanz-bewegung | Google Calendar ICS-Feed, UID-basierte ID |
| bitvocation | konferenzen | JSON-LD in HTML, international |
| barhopping | kennenlernen | schema.org Microdata |
| campfi | retreats-austausch | Tribe Events REST-API, US |

Sources.json-Status nach Migration: **8 active · 49 pending · 8 manuell · 200 verworfen · 265 total**.

## Aus Lastenheft übernommen

- **FA-2** Eindeutige Source-ID pro Quelle, mitgeführt pro Event
- **FA-4** Stale-Schutz: bei Fehlschlag/leerem Resultat letzten Stand behalten
- **FA-8** Schema-Validation: ungültige Events verworfen + gezählt (`event_schema.py`)
- **FA-9** Stadt-Sanitisierung mit Venue-Keyword-Reject (`_utils.py:sanitize_city`)
- **FA-10** Country-Normalisierung English/German → ISO-2 (`geo.py:normalize_country`)
- **FA-11** Festes Kategorien-Schema (7 statt 8)
- **FA-13** Dichte Tabellen-Liste
- **FA-17** Klick öffnet Event-URL im neuen Tab
- **FA-19** Sammelbegriff «Anlässe» im UI
- **FA-20** Filter-Dimensionen (Datum, Kategorie, Dauer, Stadt, Land, Kontinent)
- **FA-22** Optionen immer alle gerendert, leere gedimmt + klickbar
- **FA-23** Counts pro Option respektieren andere aktive Filter
- **FA-25** «Filter zurücksetzen»-Button
- **FA-34** Drift-Schutz: sources.json mit `pending`/`active`/`draft`/`no-event-relevance`-Lifecycle
- **DA-3** Schema validiert Kategorie gegen CATEGORY_IDS
- **DA-4** Vergangenheits-Filter im Server (`_is_current_or_future`), nicht im Scraper
- **NFA-4** try/catch pro Scraper, Pipeline läuft trotz Einzel-Fehler
- **NFA-5** Per-Scraper-Logs (Quellen-Block im Footer)
- **NFA-8** sources.json zentral
- **NFA-9** Quellen-Lifecycle
- **NFA-11** Deutsch, Schweizer Konvention (ss)

## Bewusst nicht übernommen

- **FA-3 / IF-1** GitHub-Action-Cron — lokal-first, Refresh per Knopf
- **FA-32/33** Auth — lokal, single-user
- **FA-28** Detail-Seite pro Kategorie — kein eigener Use-Case
- **FA-30/31** Monitoring-Tab — Quellen-Block im Footer ersetzt
- **NFA-2** Page-Revalidation — kein Build-System

## Erweiterungen über Lastenheft hinaus

- **«Interessiert» / «Ignoriert»-Markierung** pro Event mit server-seitigem Storage in `event_states.json`. Click-Cycle —/★/✕ pro Zeile.
- **Filter-Pill-Reihe** (7 Pills) für alle Filter-Dimensionen: Datum, Kategorie, Dauer, Quelle, Stadt, Land, Kontinent. Plus zwei Toggle-Pills «Nur Favoriten» / «Ignorierte» und «Filter zurücksetzen»-Button. Konsistente Bedienung, kein Mix verschiedener Control-Stile.
- **Multi-Select** für alle Filter-Pills. Mehrere Werte parallel selektierbar, Counts respektieren andere aktive Filter.
- **«nur»-Button** pro Filter-Option (Single-Select Shortcut, setzt diese Option als einzige aktive).
- **Quelle als Filter-Pill** statt Footer-Toggle-Liste — skaliert für viele Quellen mit Such-Input im Dropdown.
- **Diagnose-Block** im Footer zeigt nur noch Quellen mit Problemen (stale, verworfen). Bei allem ok: «Alle aktiven Quellen liefern sauber.» Übersicht-Counts (`X aktiv · Y pending · …`) bleiben.
- **Source-Health-Warnung** als gelber Banner wenn eine Quelle > 7 Tage stumm.
- **Inline-Kategorie-Badge** vor jedem Eventtitel (farbig, kurzer Label «Bühne», «Tanz», «Leute», «Sport», «Konferenz», «Festival», «Retreat»). Hover zeigt vollen Label.
- **Datums-Filter** präzise Zeiträume: Heute, Morgen, Diese Woche, Nächste Woche, Nächste 7 Tage, Nächste 3 Monate, Dieses Jahr, Nächstes Jahr.
- **Dauer-Klassifikation** mit Abend-Heuristik: Events ab 18:00 sind «kurz» unabhängig von Total-Dauer (Konzerte 20:00–02:00 sind keine «eintaegig»-Anlässe).
- **Sortierbare Spaltenköpfe** (asc/desc, Pfeil-Indikator).
- **Quick-Scroll** «↑ Nach oben» (unten) und «↓ Nach unten» (oben).
- **Beschreibungs-Spalte** mit Hover-Tooltip für lange Texte.
- **Datum-Spalte** integriert die Uhrzeit als kleine Subtext-Zeile darunter.

## Workflow: neue Quelle aktivieren

Pro Quelle, eine nach der anderen:

1. v1-TS-Scraper im Archiv anschauen (`_archiv/v1-vercel/scrapers/`)
2. Inspect-Script auf Mac laufen lassen (z.B. `scripts/inspect_NEUE.py`), HTML-Struktur prüfen
3. `scrapers/NEUE.py` schreiben — Pflichtfelder gemäss `event_schema.py:REQUIRED_FIELDS` (id, source, title, start_date, category, country, url)
4. `scrapers/__init__.py`: Import + zur `SCRAPERS`-Liste hinzufügen
5. `data/sources.json`: Eintrag von `status: pending` auf `status: active` flippen
6. Browser «Aktualisieren» klicken
7. Stichprobe verifizieren: Count plausibel, 3 Events auf Originalseite vergleichen, keine «N verworfen» im Quellen-Footer
8. Diese Doku updaten (Aktive-Scraper-Tabelle)

Bei kaputten Quellen: zurück auf `pending`, später nochmal angehen.

## Offene Pendenzen

- [ ] 2026-05-27: **Restliche v1-active Scraper portieren.** Pending: zegg (DE Retreat schema.org), luma (kennenlernen API mit Key), roseway, planlos, latinpromotion, tanzevents, muevete, danceapp. Pro Quelle: inspect → Python-Port → sources.json flippen → verifizieren.
- [ ] 2026-05-27: **Sport-Quellen aktivieren.** Aktuell 0 Sport-Quellen aktiv. v1-pending enthält sac-zug, sac-cas, foilingcamps — Triage notwendig welche tatsächlich sauber scrapebar sind.
- [ ] 2026-05-27: **Festivals-Quellen aktivieren.** Aktuell 0 Festivals-Quellen aktiv. Kandidaten in v1-sources.json überprüfen.
- [ ] 2026-05-27: **Forroaare reaktivieren.** 403 in v1 — Workaround finden (User-Agent variieren, andere Quelle).
- [ ] 2026-05-27: **VBG-Venue-Map erweitern.** Aktuell nur «Casa Moscia» → Ascona und «Campo Rasa» → Onsernone. Weitere VBG-Häuser bei Auftreten ergänzen in `scrapers/vbg.py:VBG_VENUE_CITY`.
- [ ] 2026-05-27: **Parallele Scraper-Ausführung.** Aktuell sequenziell — bei 8 Quellen noch ok, ab ~12+ lohnt `concurrent.futures.ThreadPoolExecutor`.
- [ ] 2026-05-27: **Cross-Source-Duplikate.** Falls ein Festival auf zwei aktiven Quellen gelistet wird, taucht es 2× auf. Aktuell akzeptiert; wenn nervt: Fuzzy-Match auf Titel+Datum+Stadt.
- [ ] 2026-05-27: **ICS-Export pro Event.** v1-Backlog OFF-1, «zur Kalender hinzufügen».
- [ ] 2026-05-27: **Pattern-Ignorieren.** Aktuell nur Per-Event-Ignorieren. Falls Klick-Müdigkeit aufkommt: Regel-System mit Title-Substring etc.
- [ ] 2026-05-27: **Quellen-Dropdown-Suche debuggen.** Such-Input im Quellen-Pill-Dropdown reagiert beim Tippen nicht — typing in das `<input class="filter-search-input">` löst keine sichtbare Filterung der `<li data-value>` aus. Listener ist direkt aufs Element gebunden (`bar.querySelectorAll(".filter-search-input").forEach(input => input.addEventListener("input", …))`); Ursache offen. Erste Schritte: Browser-Konsole auf JS-Fehler prüfen, dann ob `document.querySelectorAll('.filter-search-input').length` 1 zurückgibt und der `input`-Event-Listener feuert.
- [ ] 2026-05-27: **Online-Stellung.** Path nach oben offen — Scraper auf Cron/CI laufen lassen, HTML deployen, Auth dazu. Nicht jetzt, aber im Auge behalten.

## Historie

- 2026-05-27 (UI-Schliff nach v2-Push): Inline-Kategorie-Badge vor jedem Titel (farbiges Pill mit Kurz-Label). «Nur Favoriten» / «Ignorierte» aus den Header-Checkboxen in Toggle-Pills neben den Filter-Pills überführt. Quellen-Toggle-Liste im Footer aufgelöst und als 7. Filter-Pill «Quelle» mit Such-Input integriert; Diagnose-Block unten schrumpft auf «nur Probleme»-Anzeige. v1 GitHub-Repo aufgeräumt: alter CI-Commit per force-push ersetzt (e8e86dc → e420603), v1-`package-lock.json` aus dem Archiv entfernt um Dependabot-Lärm zu stoppen.
- 2026-05-27: v2-Neuaufbau gestartet. v1-Code in `_archiv/v1-vercel/` verschoben, Lastenheft als `lastenheft.md` aus Git extrahiert. Neuer Stack: Python 3 + Flask + statisches HTML/JS, lokal auf `127.0.0.1:5050`. 8 Scraper portiert (schuur, jazzkantine, kulturhof, vbg, ecstaticdancebern, bitvocation, barhopping, campfi) über 5 Kategorien (buehne-konzerte 3×, tanz-bewegung 1×, kennenlernen 1×, konferenzen 1×, retreats-austausch 2×). 7-Kategorien-Schema (`tanz-bewegung`, `kennenlernen` als Merges aus v1-8er-Schema). Filter-UI mit Pills (Datum, Kategorie, Dauer, Stadt, Land, Kontinent) inkl. Multi-Select, dynamischer Counts, «nur»-Shortcut, Reset-Button. Per-Event-«Interessiert»/«Ignoriert»-Markierung mit Server-Storage. Stale-Schutz + Schema-Validation + Source-Health greifen ab Start. Dauer-Klassifikation mit Abend-Heuristik (Start ≥ 18:00 → kurz, unabhängig von Total-Dauer). Datums-Filter mit präzisen Range-Berechnungen, lokale (nicht UTC) Datums-Strings. Land-Spalte zeigt deutschen Ländernamen statt ISO-Code. v1-Doku-Inhalt durch v2-Doku ersetzt; Verwerfungs-Blockquote entfernt.

## Verwandte Dokumentation

- `lastenheft.md` — v1-Anforderungs-Snapshot vom 25.5.2026
- `../../../DOKU_KONVENTION.md` — Doku-Konvention
- `_archiv/v1-vercel/` — alter Next.js/Vercel-Code als Material
