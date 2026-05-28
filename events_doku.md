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

Aktuell **14 aktive Scraper** über 6 von 7 Kategorien. Web-UI mit 6 Filter-Pills (Datum, Kategorie, Dauer, Stadt, Land, Kontinent) als Multi-Select mit dynamischen Counts, sortierbaren Spalten, Quellen-Toggles und «Interessiert»-Markierung pro Event. Schema-Validation verhindert Müll-Output, Stale-Schutz behält letzten erfolgreichen Stand bei Scraper-Ausfall, Source-Health-Warnung wenn eine Quelle > 7 Tage stumm bleibt.

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
├── ics.py                  # RFC-5545 VCALENDAR/VEVENT-Builder (Export pro Event)
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
│   ├── event_states.json   # Interessiert/Ignoriert pro Event-ID (server-seitig)
│   └── filter_presets.json # Benannte Filter-Kombinationen (server-seitig)
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

## Aktive Scraper (Stand 2026-05-28)

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
| zegg | retreats-austausch | HTML schema.org-Microdata aus SeminarDesk-Plugin, URL-Hash ID |
| kioskiosk | buehne-konzerte | Craft-CMS-GraphQL-API hinter SvelteKit-Frontend, slug-ID |
| scich | retreats-austausch | HTML Divi-Inline (Custom), dt. Datums-Range, scoped auf CH-Camps |
| larpcal | festivals | REST-API (Render) hinter React/Vite-SPA, Origin-Header, native ID, international |
| sensualityfestival | festivals | HTML (Custom), Jahres-Quelle (`annual`), Datum aus Fliesstext, nur Land |
| afuerafest | festivals | HTML (Custom), Jahres-Quelle (`annual`), dt. Datums-Range, feste Location (Könnern DE) |

Sources.json-Status: **14 active · 43 pending · 8 manuell · 200 verworfen · 265 total**.

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
- **Jahres-Quellen** (`annual: true` in `sources.json`): Quellen mit ~1 Event/Jahr (z.B. einzelne Festivals). Leeres Resultat zwischen den Ausgaben gilt als normal — keine Stale-Warnung, kein Diagnose-Problem (solange nichts verworfen wird). Health-Check und Quellen-Report (`app.py:_annual_source_ids`) überspringen sie entsprechend.
- **Inline-Kategorie-Badge** vor jedem Eventtitel (farbig, kurzer Label «Bühne», «Tanz», «Leute», «Sport», «Konferenz», «Festival», «Retreat»). Hover zeigt vollen Label.
- **Datums-Filter** präzise Zeiträume: Heute, Morgen, Diese Woche, Nächste Woche, Nächste 7 Tage, Nächste 3 Monate, Dieses Jahr, Nächstes Jahr.
- **Dauer-Klassifikation** mit Abend-Heuristik: Events ab 18:00 sind «kurz» unabhängig von Total-Dauer (Konzerte 20:00–02:00 sind keine «eintaegig»-Anlässe).
- **Sortierbare Spaltenköpfe** (asc/desc, Pfeil-Indikator).
- **Quick-Scroll** «↑ Nach oben» (unten) und «↓ Nach unten» (oben).
- **Beschreibungs-Spalte** mit Hover-Tooltip für lange Texte.
- **Datum-Spalte** integriert die Uhrzeit als kleine Subtext-Zeile darunter.
- **ICS-Export pro Event** — Lucide-Calendar-Plus-Icon neben dem Titel öffnet `.ics`-Download (Endpoint `/api/event/<id>.ics`, RFC-5545 in `ics.py`). Single-Day mit Floating-Local-Time, Multi-Day als VALUE=DATE all-day.
- **Filter-Presets** — gespeicherte Filter-Kombinationen («Schweiz/Luzern/14d», «Berlin/Konzerte» …) als dezente Chip-Reihe über der Filterleiste. Server-seitiger Storage in `data/filter_presets.json`, Endpoints `GET/PUT/DELETE /api/filter-presets[/<name>]`. Klick auf Pill aktiviert Filter + Toggles, `✕` löscht. Aktuell aktiver Preset wird invertiert hervorgehoben. Sortierung bleibt orthogonal (nicht im Preset).

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

- [ ] 2026-05-27: **Restliche v1-active Scraper portieren.** Pending: luma (kennenlernen API mit Key), roseway, planlos, latinpromotion, tanzevents, muevete, danceapp. Pro Quelle: inspect → Python-Port → sources.json flippen → verifizieren.
- [ ] 2026-05-27: **Sport-Quellen aktivieren.** Aktuell 0 Sport-Quellen aktiv. v1-pending enthält sac-zug, sac-cas, foilingcamps — Triage notwendig welche tatsächlich sauber scrapebar sind.
- [ ] 2026-05-27: **Festivals-Quellen aktivieren.** Seit 2026-05-28 erste aktive Quelle (larpcal, international). Weitere Kandidaten in v1-sources.json überprüfen.
- [ ] 2026-05-27: **Forroaare reaktivieren.** 403 in v1 — Workaround finden (User-Agent variieren, andere Quelle).
- [ ] 2026-05-27: **VBG-Venue-Map erweitern.** Aktuell nur «Casa Moscia» → Ascona und «Campo Rasa» → Onsernone. Weitere VBG-Häuser bei Auftreten ergänzen in `scrapers/vbg.py:VBG_VENUE_CITY`.
- [ ] 2026-05-27: **Parallele Scraper-Ausführung.** Aktuell sequenziell — bei 8 Quellen noch ok, ab ~12+ lohnt `concurrent.futures.ThreadPoolExecutor`.
- [ ] 2026-05-27: **Cross-Source-Duplikate.** Falls ein Festival auf zwei aktiven Quellen gelistet wird, taucht es 2× auf. Aktuell akzeptiert; wenn nervt: Fuzzy-Match auf Titel+Datum+Stadt.
- [ ] 2026-05-27: **Pattern-Ignorieren.** Aktuell nur Per-Event-Ignorieren. Falls Klick-Müdigkeit aufkommt: Regel-System mit Title-Substring etc.
- [ ] 2026-05-27: **Quellen-Dropdown-Suche debuggen.** Such-Input im Quellen-Pill-Dropdown reagiert beim Tippen nicht — typing in das `<input class="filter-search-input">` löst keine sichtbare Filterung der `<li data-value>` aus. Listener ist direkt aufs Element gebunden (`bar.querySelectorAll(".filter-search-input").forEach(input => input.addEventListener("input", …))`); Ursache offen. Erste Schritte: Browser-Konsole auf JS-Fehler prüfen, dann ob `document.querySelectorAll('.filter-search-input').length` 1 zurückgibt und der `input`-Event-Listener feuert.
- [ ] 2026-05-27: **Online-Stellung.** Path nach oben offen — Scraper auf Cron/CI laufen lassen, HTML deployen, Auth dazu. Nicht jetzt, aber im Auge behalten.

## Historie

- 2026-05-28: afuerafest als zweite Jahres-Quelle angebunden (`scrapers/afuerafest.py`, `scripts/inspect_afuerafest.py`). Klasse 10 (Custom HTML), `annual: true`. 1 Festival/Jahr auf festem Gelände (Gerlebogk/Könnern, Sachsen-Anhalt DE) — Location hartkodiert (über Jahre stabil), nur der Termin wird aus dt. Fliesstext geparst (`24. bis 26. Juli 2026`, Parser wie scich). ID `afuerafest-<jahr>`, Kategorie `konferenzen` → `festivals`. Aktive Scraper 13 → 14, festivals 2 → 3. Verbleibende Jahres-Kandidaten pending: vrairepaire, libertycon, marchedescepages, danses-darc.
- 2026-05-28: Filter-Presets. Gespeicherte Filter-Kombinationen mit Server-Storage (`data/filter_presets.json`), Endpoints `GET /api/filter-presets`, `PUT /api/filter-presets/<name>` (Upsert), `DELETE /api/filter-presets/<name>`. UI: dezente Chip-Reihe (`#preset-bar` über der Filterleiste), jede Pill = ein Preset, Klick aktiviert alle Filter + Toggles (Favoriten/Ignorierte) auf einen Schlag, `✕` löscht (mit `confirm`). Aktiver Preset wird invertiert (schwarz/cremig) hervorgehoben — Signatur-Match über sortierte Filter+Toggle-Werte. «+ Aktuelle Filter speichern…»-Button rechts (nur wenn aktive Filter vorhanden), Name via `prompt`, Max 50 Zeichen. Bei null Presets und null aktiven Filtern ist die Reihe komplett unsichtbar. Sortierung bleibt orthogonal (nicht im Preset gespeichert). Stichprobe gegen die Endpoints (Upsert, Update mit gleichem Namen, Validation, Delete, 404 auf Missing) bestätigt.
- 2026-05-28: Jahres-Quellen-Unterstützung + sensualityfestival angebunden (`scrapers/sensualityfestival.py`, `scripts/inspect_sensualityfestival.py`). Neues `annual: true`-Flag in `sources.json` für Quellen mit ~1 Event/Jahr: `app.py:_annual_source_ids()` schliesst sie aus der Stale-/Health-Warnung aus und behandelt ein leeres Resultat (zwischen den Ausgaben) als ok statt als Diagnose-Problem (`stale: rejected > 0 or not is_annual`, Report-Feld `annual`). Erster Nutzer: sensualityfestival (Klasse 10, WordPress) — 1 Festival/Jahr, Termin nur als Fliesstext (`15-22 August, 2026`, dt./engl. Range-Parser mit Cross-Month-Reserve), kein konkreter Ort (nur Land CZ, Stadt None). ID `sensualityfestival-<jahr>`. Kategorie `konferenzen` → `festivals`. Kein Frontend-Change nötig (Diagnose-Filter `stale || rejected>0` greift weiterhin). Aktive Scraper 12 → 13, festivals 1 → 2. Weitere Jahres-Kandidaten pending: afuerafest, vrairepaire, libertycon, marchedescepages, danses-darc.
- 2026-05-28: ICS-Export pro Event (Pendenz v1-Backlog OFF-1 erledigt). Neuer Endpoint `GET /api/event/<id>.ics` liefert RFC-5545-VCALENDAR mit einem VEVENT (`Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: attachment` mit `<date>-<title-slug>.ics`-Dateiname). `ics.py` macht das Generieren: TEXT-Escaping für SUMMARY/DESCRIPTION/LOCATION (Backslash/Komma/Semikolon/Newline), 75-Octet-Line-Folding mit UTF-8-sicherem Split, DTSTART/DTEND als Floating-Local-Time mit Zeiten, sonst `VALUE=DATE` all-day mit exklusivem DTEND (letzter Tag + 1). DESCRIPTION kombiniert Event-Beschreibung + Quellen-Hinweis, LOCATION konkateniert Venue/Address/City, URL unangetastet. In der UI ein Lucide-Calendar-Plus-Icon (14px) als zweiter Glyph neben dem Titel, rechts vom `ⓘ`-Desc-Marker — dezent grau (#c4c4c0), Hover dunkel. `<a download>` triggert Direkt-Download; öffnet im Default-Kalender (Calendar.app, Outlook, GCal-Import via Datei). Stichprobe gegen Single-Day (DJ Robb 07:30–09:30) und Multi-Day (LarpCal Welcome 2024-12-09 bis 2024-12-31, all-day DTEND:20250101) bestätigt.
- 2026-05-28: larpcal-Quelle angebunden (`scrapers/larpcal.py`, `scripts/inspect_larpcal.py`). Klasse 2 (öffentliche REST-API): larpcal.com ist eine React/Vite-SPA, Daten kommen aus `larpcal-tki9.onrender.com/events` (verlangt `Origin`-Header, CORS). 204 published Events international (Europa + Nordamerika), native `id`. API-Zeiten sind Platzhalter → `start_time`/`end_time` weggelassen; `city: "N/A"` → None; leere `eventUrl` → Detailseite `larpcal.com/events/<id>`; `UK` → `GB` (sonst keine Kontinent-Zuordnung). Kategorie bei Anbindung von `konferenzen` auf `festivals` korrigiert (LARP = Mehrtages-Events). Erste aktive Festivals-Quelle. Aktive Scraper 11 → 12, aktive Kategorien 5 → 6 (festivals 0 → 1).
- 2026-05-28: SCI-Quelle angebunden (`scrapers/scich.py`, `scripts/inspect_scich.py`). Klasse 10 (Custom HTML): Schweizer Workcamps stehen inline in Divi-Textblöcken (`<h6>` Titel + `<p>` mit `Datum: … Ort: … Alter: …`), internationale Camps nutzen das Inline-Format nicht und liegen auf der externen `volunteer.sci.ngo`-DB — daher **scoped auf die 7 CH-Camps** (per Ort-Land CH gefiltert). Parser für dt. Datums-Range (`19. Juli bis 01. August 2026`, Startmonat optional, `\xa0`/Tippfehler toleriert) und Ort→Venue/Stadt-Trennung mit Kantons-/Land-Suffix-Drop. URL = Projekt-Link (`volunteer.sci.ngo/projects/NNNN`) bzw. Seiten-URL als Fallback. Source flipped pending → active. Aktive Scraper 10 → 11, retreats-austausch 3 → 4.
- 2026-05-28: kiosk-Quelle angebunden (`scrapers/kioskiosk.py`, `scripts/inspect_kioskiosk.py`). Klasse 2 (öffentliche JSON/GraphQL-API): SvelteKit-Frontend mit leerem HTML, Events kommen aus Craft-CMS-GraphQL-API (`cms.kioskiosk.ch/api`, Bearer-Token im Client-Bundle). API-seitiger `eventDate >= heute`-Filter (kiosk-Events eintägig → deckungsgleich mit Server-Past-Filter). Keine Detailseiten im Frontend → `url` = externer Ticket-Link wenn vorhanden, sonst Startseite; native `slug` als ID statt URL-Hash. Aktive Scraper 9 → 10, buehne-konzerte 3 → 4.
- 2026-05-28: ZEGG-Scraper portiert (`scrapers/zegg.py`, `scripts/inspect_zegg.py`). Parsed schema.org-Microdata aus `.sd-event[data-start-date]` mit `time[itemprop=startDate/endDate]`, `h4[itemprop=name]`, `[itemprop=addressLocality/addressCountry]`, optional `.sd-event-location [itemprop=name]` als Venue. Country-Default `DE` falls Microdata leer. URL-Hash-ID. Source flipped pending → active. Aktive Scraper 8 → 9, retreats-austausch 2 → 3.
- 2026-05-27 (UI-Schliff nach v2-Push): Inline-Kategorie-Badge vor jedem Titel (farbiges Pill mit Kurz-Label). «Nur Favoriten» / «Ignorierte» aus den Header-Checkboxen in Toggle-Pills neben den Filter-Pills überführt. Quellen-Toggle-Liste im Footer aufgelöst und als 7. Filter-Pill «Quelle» mit Such-Input integriert; Diagnose-Block unten schrumpft auf «nur Probleme»-Anzeige. v1 GitHub-Repo aufgeräumt: alter CI-Commit per force-push ersetzt (e8e86dc → e420603), v1-`package-lock.json` aus dem Archiv entfernt um Dependabot-Lärm zu stoppen.
- 2026-05-27: v2-Neuaufbau gestartet. v1-Code in `_archiv/v1-vercel/` verschoben, Lastenheft als `lastenheft.md` aus Git extrahiert. Neuer Stack: Python 3 + Flask + statisches HTML/JS, lokal auf `127.0.0.1:5050`. 8 Scraper portiert (schuur, jazzkantine, kulturhof, vbg, ecstaticdancebern, bitvocation, barhopping, campfi) über 5 Kategorien (buehne-konzerte 3×, tanz-bewegung 1×, kennenlernen 1×, konferenzen 1×, retreats-austausch 2×). 7-Kategorien-Schema (`tanz-bewegung`, `kennenlernen` als Merges aus v1-8er-Schema). Filter-UI mit Pills (Datum, Kategorie, Dauer, Stadt, Land, Kontinent) inkl. Multi-Select, dynamischer Counts, «nur»-Shortcut, Reset-Button. Per-Event-«Interessiert»/«Ignoriert»-Markierung mit Server-Storage. Stale-Schutz + Schema-Validation + Source-Health greifen ab Start. Dauer-Klassifikation mit Abend-Heuristik (Start ≥ 18:00 → kurz, unabhängig von Total-Dauer). Datums-Filter mit präzisen Range-Berechnungen, lokale (nicht UTC) Datums-Strings. Land-Spalte zeigt deutschen Ländernamen statt ISO-Code. v1-Doku-Inhalt durch v2-Doku ersetzt; Verwerfungs-Blockquote entfernt.

## Verwandte Dokumentation

- `lastenheft.md` — v1-Anforderungs-Snapshot vom 25.5.2026
- `../../../DOKU_KONVENTION.md` — Doku-Konvention
- `_archiv/v1-vercel/` — alter Next.js/Vercel-Code als Material
