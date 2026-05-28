# design.md — Events-Dashboard

Marken-DNA dieses Projekts. Wird mit jeder Iteration im Systemize-Schritt schaerfer. Lebt beim Projekt, nicht im Atelier.

## Kontext

- **Genre:** [`stille-uebersicht`](../../Tools/Design-Atelier/genres/stille-uebersicht.md)
- **Zielgruppe:** ich selbst (Single-User), kuenftig potenziell als Showcase-Vorlage fuer andere persoenliche Werkzeuge nutzbar.
- **Ziel der Seite:** Anlaesse aggregiert sichten und damit soziale Begegnungen, unterhaltsame Abende, Wochenenden und laengere Anlaesse planen.
- **Stop-Bedingung:** Filter-Leiste fuehlt sich leise an; Tabellen-Zeile ist auf einen Blick scannbar (Datum / Kategorie / Titel / Ort dominant, Rest gedaempft); Interesse-Marker klar lesbar ohne dass sie Aufmerksamkeit zieht; eine 3-5-Min-Sitzung auf dem Default-Filter genuegt fuer eine Wochen-Auswahl.
- **Marken-Constraints:** keine — privates Werkzeug. Aber: keine externen Marken im UI inszenieren (Quellen-Namen sachlich, keine Logos).

## Typografie

- **Schrift-Familien:**
  - Heading: <System-Sans als Default — z.B. -apple-system, Inter, Segoe UI; Serif-Variante im Loop pruefen>
  - Body: <gleiche Familie wie Heading, fuer Konsistenz im Werkzeug-Charakter>
  - Mono: <SF Mono / JetBrains Mono fuer Datum/Zeit/Counts, falls tabular-nums nicht reichen>
- **Skala:** <noch zu setzen — Default-Vorschlag: 12 / 13 / 14 / 16 / 20 / 28>
- **Body in Tabelle:** <13-14px, Line-Height 1.4, Tracking 0>
- **Heading (Seitentitel "Events"):** <20-28px, Line-Height 1.2>
- **Numeralen:** tabular fuer Datum/Zeit/Counts (font-variant-numeric: tabular-nums)

## Farb-Tokens

Aus erstem Loop verbindlich gemacht. CSS-Custom-Properties sind noch nicht refaktoriert — die Werte liegen aktuell hardcoded in `static/style.css`, hier ist die Soll-Quelle.

- `--color-bg`: `#fafaf8` (warmes Off-White, Seiten-Hintergrund)
- `--color-bg-hover`: `#efece7` (Ghost-Button-Surface, dezenter Hover-Hintergrund)
- `--color-bg-hover-strong`: `#e5e1da` (eine Stufe dunkler fuer Doppel-Hover-Layer)
- `--color-fg`: `#1c1c1c` (Anthrazit, Hauptschrift)
- `--color-fg-muted`: `#777` (gedaempfte Mittellage — Stand-Zeile, Nav-Links, Beifang-Text)
- `--color-fg-quiet`: `#888` (Icon-Default, eine Spur leiser als muted)
- `--color-rule`: `#e5e5e0` (Tabellen-Trennlinien)
- `--color-pill-border`: `#d8d6d0` (Filter-Pills im Ruhe-Zustand)
- `--color-pill-active`: `#1c1c1c` (Filter-Pill-Aktiv-Fuellung = Anthrazit, NICHT Akzent — Filter sind neutral)
- `--color-marker-favorite-fg`: `#166534` (Gruen — Stern, Tabellenzeile-Akzent, Toggle-Aktiv-Text)
- `--color-marker-favorite-bg`: `#ecfdf5` (sanfter Gruen-Tint fuer aktive Favoriten-Toggle und favorisierte Tabellenzeile)
- `--color-marker-ignored-fg`: `#b91c1c` (Rot — Streich-Icon, Toggle-Aktiv-Text)
- `--color-marker-ignored-bg`: `#fef2f2` (sanfter Rot-Tint fuer aktive Ignoriert-Toggle)
- Kategorie-Badge-Farben: bewusst gedaempft, je Kategorie eigenes Paar (siehe `.cat-badge[data-cat="..."]` in `style.css`). Saettigung bewusst niedrig — Tabellen-Spalte soll Hintergrund-Raster sein, nicht Plakat-Wand.

## Spacing-System

- **Einheit:** 4px-Step (0.25rem).
- **Container-Breiten:** Tabelle volle Breite (max 1400px), Filter-Leiste ueber gleicher Breite.
- **Tabellen-Zeile:** Hoehe 40-48px, Padding vertikal 8-12px, horizontal 12-20px.
- **Filter-Leiste:** vertikales Padding grosszuegiger (16-24px), Abstand zur Tabelle 24-32px — die Zone darf atmen, die Tabelle nicht.
- **Hero/Header-Block:** knapp, eine Zeile "Events" plus Status-Zeile rechts (Stand, Aktualisieren), keine grosse Hero-Section.

## Animation und Bewegung

- **Default-Easing:** cubic-bezier(0.2, 0, 0, 1).
- **Default-Dauer:** 120ms (Werkzeug, nicht Landing — schnell, nicht inszeniert).
- **Erlaubte Bewegung:** Hover-Farb-Wechsel, Filter-Dropdown-Aufklappen. Keine Y-Translates, keine Scales, kein Bounce.
- **prefers-reduced-motion:** statisches Fallback ohne Transition.

## Tonalitaet

- **Anrede:** keine. Imperativ-Form fuer Aktionen ("Aktualisieren", "Filter zuruecksetzen").
- **Stimme:** nuechtern, technisch OK ("8 aktiv · 49 pending · 200 verworfen" ohne Erklaerung).
- **Keine Begruessung, keine "Schoen dich zu sehen"-Saetze.**
- **Fehler/Status konkret:** "Quelle Forroaare stumm seit 9 Tagen" statt "Etwas ist schiefgegangen".

## Don'ts

(aus Genre uebernommen und projekt-spezifisch ergaenzt — Loop hat einige bestaetigt und neue ergaenzt)

- Keine KPI-Kacheln, keine Charts. Counts als Inline-Text reichen.
- Kein Begruessungs-Hero, keine Onboarding-Touren.
- Keine Wow-Animation, kein Hover-Lift, kein Schatten-Bounce.
- Kein Sales-Vokabular.
- Keine kuenstliche Editorial-Anmutung in der Tabelle (Drop-Caps, Pullquotes, Serif-Body).
- Keine sticky Filter-Banner. Wenn du scrollst, scrollt die Leiste mit oben weg — Tabelle gewinnt.
- Keine zwei dominanten Spalten gleichzeitig: Datum + Titel dominant, Rest gedaempft.
- Keine externen Marken-Logos in der Quellen-Liste.
- Aktualisieren-Aktion **nicht** als gerahmter Button in eine separate Aktions-Zone, sondern als gedaempftes Icon direkt neben dem Titel («Events ⟳»). Aktion gehoert ans Ding.
- Status/Stand **nicht** in der Aktions-Zeile, sondern als Subtitel direkt unter dem H1 — gehoert semantisch zum Inhalt, nicht zur Aktion.
- Filter-Pills und Persoenliche-Marker-Toggles **nicht** im selben visuellen Stil. Pills sind gerahmt (Metadaten-Filter), Toggles sind randlos mit semantischer Farbe (eigene Klasse).
- Aktions-Elemente, die kein Filter sind (Reset, Nav-Jumps wie «Nach oben/unten»), **nicht** als Pill stylen — Text-Link reicht und ist ehrlicher.

## Skills im Einsatz

Aus `Projekte/Tools/Design-Atelier/skills/`:

- [`serene-whitespace`](../../Tools/Design-Atelier/skills/serene-whitespace.md) — fuer Hero und Filter-Zone.
- [`scannable-density`](../../Tools/Design-Atelier/skills/scannable-density.md) — fuer Tabellen-Zeile.
- [`quiet-controls`](../../Tools/Design-Atelier/skills/quiet-controls.md) — fuer Pills, Toggles, Sekundaer-Aktionen (Loop hat das Pattern bestaetigt und an dieser Stelle ins Atelier zurueckgespielt).

Kandidaten, die der Loop noch bestaetigen oder verwerfen muss:

- `editorial-typography` (Heading-Hierarchie, dosiert) — aktuell nicht angewendet, Default System-Sans reicht; Wiedervorlage bei Header-Iteration.
- `state-as-affordance` (eigener Skill fuer Favoriten-/Ignoriert-Marker) — Pattern teilweise in `quiet-controls` aufgegangen (Toggle-Pill-Stil); eigener Skill nur wenn ein zweites Werkzeug das Marker-Verhalten braucht.

## Referenz-Set

Drei Vorlagen, eine davon ausserhalb der Branche (Niche-Regel des Ateliers).

- **Linear** (Issues-Ansicht) — leise dichte App-Tabelle, Filter als Pills, Selektion ueber Akzent statt Fuelle. Daraus haben wollen: Spalten-Hierarchie, Hover-Verhalten, Pill-Reduktion.
- **Luma Discover** — Event-Listing der Branche. Daraus haben wollen: Filter-Pill-Stil und -Reihenfolge. **Aber:** nicht 1:1, sonst riecht es nach Branche. Gegenpol-Referenz.
- **NZZ-Veranstaltungskalender** (oder ein gutes Schauspielhaus-Spielzeitheft) — chronologische Liste mit Monatstrennern, typografische Hierarchie ohne UI-Chrome. Branchen-fremde Pflicht-Referenz, soll Verflachung verhindern.

## Notizen aus dem Loop

Hier wandern Inspect-Notizen rein, bevor sie in die Sektionen oben einsortiert sind.

- *(Iteration 2026-05-28 systematisiert in die Sektionen oben einsortiert: Farb-Tokens, Don'ts, Skills. Notizen-Buffer wieder leer.)*
