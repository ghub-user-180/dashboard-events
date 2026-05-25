# Lastenheft — Event-Dashboard

**Stand:** 2026-05-25 · **Single-User-System** · **Live:** Vercel · **Quellen:** 17 aktiv (16 Scraper + 1 API)

## 1. Zweck & Vision

Persönliches Manager-View für aggregierte Anlässe (Bühne, Konzerte, Tanz, Begegnungen, Konferenzen, Festivals, Retreats, Sport) aus Web-Quellen — automatisch aktualisiert, ohne manuelle Pflege im laufenden Betrieb.

## 2. Akteure

- **A-1** Nutzer (Luc, Single-User): pflegt Quellen-Liste, browst Anlässe, plant Teilnahme.
- **A-2** Scraping-Pipeline (GitHub Action): lädt Quellen periodisch, committet `scraped-events.json`.

## 3. Funktionale Anforderungen

### 3.1 Datenerfassung

- **FA-1** Aggregation aus aktuell 17 Quellen (Scraper + API); Architektur skaliert auf weitere Quellen.
- **FA-2** Jede Quelle besitzt eine eindeutige `scraperId`, die pro Event in der Datenausgabe mitgeführt wird.
- **FA-3** Pipeline läuft automatisch alle 3 Tage (cron 05:00 UTC).
- **FA-4** Bei Fehlschlag oder leerem Resultat einer Quelle behält das System deren letzten erfolgreichen Stand.
- **FA-5** Pipeline ist manuell triggerbar (`gh workflow run scrape.yml`).

### 3.2 Datenmodell

- **FA-6** Pflichtfelder pro Anlass: `id`, `title`, `startDate` (YYYY-MM-DD), `location`, `city`, `country` (ISO-3166-1 alpha-2), `category`, `source` ∈ {`manual`, `scraper`}.
- **FA-7** Optionale Felder: `endDate`, `startTime`, `endTime`, `description`, `url`, `scraperId`, `datesApproximate`.
- **FA-8** Zentrales Zod-Schema (`EventSchema`); ungültige Einträge werden verworfen und im Server-Log gezählt.
- **FA-9** Städtenamen werden im Scraper sanitisiert (PLZ, Kantons-Suffixe, Firmenform-Suffixe, Adressen entfernt); ohne valide Stadt → Event verworfen.
- **FA-10** Ländernamen werden auf ISO-2 normalisiert (Englisch/Deutsch-Mapping, Sonderfälle wie UK→GB, U.S.→US).

### 3.3 Kategorisierung

- **FA-11** Festes Schema aus 8 Kategorien: `buehne-konzerte`, `tanz`, `singles-dating`, `begegnungen`, `sport`, `konferenzen`, `festivals`, `retreats-austausch`.
- **FA-12** Jede Quelle hat eine Default-Kategorie; pro Event übersteuerbar.

### 3.4 Anzeige (Dashboard `/`)

- **FA-13** Dichte Tabellen-Liste aller bevorstehenden Anlässe, chronologisch.
- **FA-14** Monatstrenner gliedern die Liste.
- **FA-15** Pro Zeile: Wochentag · Datum · Uhrzeit · Kategorie-Tag (Fixbreite, farbig) · Titel · Lokalität · Stadt.
- **FA-16** Anlässe innerhalb 7 Tagen sind farblich hervorgehoben.
- **FA-17** Klick öffnet die Event-URL in neuem Tab.
- **FA-18** Liste auf 300 Einträge gedeckelt; darüber Hinweis zur Filter-Eingrenzung.
- **FA-19** Sammelbegriff im UI: "Anlässe" (nicht "Event").

### 3.5 Filterung

- **FA-20** Filter-Dimensionen: Zeitraum (Woche / Monat / 3 Monate / alle), Dauer (Stunden-Anlass / Mehrtages / alle), Geo (Kontinent + Land + Stadt — je Multi-Select mit Counts), Kategorie (Multi-Select via Chips).
- **FA-21** Filter-Zustand wird in URL-Query persistiert (`continent`, `country`, `city`, `range`, `duration`, `cat`).
- **FA-22** Kategorie-Chips zeigen **immer alle 8 Kategorien**, auch bei Count 0 (gedimmt dargestellt, klickbar).
- **FA-23** Counts in Kategorie-Chips berücksichtigen die anderen Filter (Zeitraum/Dauer/Geo), nicht die Kategorie-Selektion selbst.
- **FA-24** Geo-Filter sind lose hierarchisch (Dimensionen frei kombinierbar als AND).
- **FA-25** "Filter zurücksetzen" löscht **alle** Filter inkl. Kategorie; zeigt Anzahl aktiver Filter.
- **FA-26** Filter-Auswahl bleibt beim Drilldown Dashboard ↔ Detail-Seite erhalten.
- **FA-27** Schnelle Klick-Sequenzen müssen alle erhalten bleiben (kein Verlust durch Race-Condition während pending Transition).

### 3.6 Detail-Seite pro Kategorie (`/<category-id>`)

- **FA-28** Pro Kategorie eigene Route; Karten-Ansicht pro Anlass mit Datum-Range, Lokalität, Beschreibung.
- **FA-29** ICS-Download-Button pro Event auf Detail-Seite.

### 3.7 Monitoring (`/monitoring`)

- **FA-30** Quellen-Liste mit Status (active/pending/draft/no-event-relevance), Typ (api/scraper/manual/none), Dashboard-Kategorie.
- **FA-31** Filter nach Status, Typ, Dashboard-Kategorie.

### 3.8 Authentifizierung

- **FA-32** Dashboard ist passwortgeschützt; Cookie-Auth über `DASHBOARD_PASSWORD` aus Env.
- **FA-33** Middleware leitet nicht-authentifizierte Zugriffe auf `/login`.

### 3.9 Drift-Schutz

- **FA-34** Manuell gepflegte Anlässe (`data/manual-events.json`) werden **nicht** im Dashboard angezeigt — Backup-Funktion, bis Scraper übernehmen.
- **FA-35** Manuell gepflegte Quellen haben `status=draft` in `sources.json`; Konsistenz-Test verhindert `type=manual` mit `status=active`.

## 4. Datenqualität & Konsistenz (Tests)

- **DA-1** EventSchema-Validation gegen reale Manual-Events (Snapshot-Test).
- **DA-2** Jeder aktive Scraper-Source-Eintrag in `sources.json` hat einen Scraper-Code mit identischer ID — und umgekehrt.
- **DA-3** Jeder Scraper liefert eine gültige Kategorie aus `CATEGORY_IDS`.
- **DA-4** Vergangenheits-Filter (`startDate < heute`) erfolgt im Frontend, nicht in der Pipeline — sonst gehen laufende Mehrtages-Anlässe verloren.

## 5. Nicht-funktionale Anforderungen

### 5.1 Performance & Hosting

- **NFA-1** Hosting: Vercel Free Tier.
- **NFA-2** Page-Revalidation: 86400 s (24 h).
- **NFA-3** Scrape-Frequenz: alle 3 Tage (statt täglich, um GitHub-Action-Minuten zu sparen).

### 5.2 Robustheit

- **NFA-4** Fehlschlagender Scraper bricht den Pipeline-Lauf nicht ab (try/catch pro Scraper).
- **NFA-5** Pipeline-Output: Logs pro Scraper mit ok / rejected / failed / stale Counts.

### 5.3 Sicherheit

- **NFA-6** Zugriff nur mit Passwort.
- **NFA-7** Kein User-Generated-Content; Single-User-Setup, keine Mandantentrennung.

### 5.4 Wartbarkeit

- **NFA-8** Datenquellen in `data/sources.json` zentral (aktuell 265 Bookmarks).
- **NFA-9** Quellen-Lifecycle: `pending` → `active` | `no-event-relevance` | `draft`.
- **NFA-10** Priorisierungs-Konvention beim Aktivieren einer Quelle: API > ICS/iCal > HTML-Scraper > manuell.

### 5.5 Internationalisierung

- **NFA-11** UI-Sprache: Deutsch, Schweizer Konvention (`ss` statt `ß`).

## 6. Schnittstellen

- **IF-1** GitHub Action `scrape.yml` mit `contents: write`-Permission.
- **IF-2** Vercel Auto-Deploy bei Push auf `main`.
- **IF-3** Luma Public API mit `LUMA_API_KEY` (Env / GitHub Secret).

## 7. Offene Anforderungen (Backlog-Auszug aus Doku)

- **OFF-1** ICS-Export für mehrere/alle Kategorien gemeinsam.
- **OFF-2** Headless-Browser-Scraping für SPA-Quellen (Phase 5c).
- **OFF-3** Triage der verbleibenden ~40 pending-Quellen.
- **OFF-4** Vercel-Projekt + lokaler Build-Pfad auf `dashboard-events` umbenennen (URL ändert sich).
