// Geteilte Helpers, die von mehreren Scraper-Files genutzt werden.

export const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
}

/**
 * Baut eine stabile, kebab-case Event-ID aus Quellen-Prefix, Titel und Datum.
 * Idempotent — gleiche Inputs ergeben immer dieselbe ID, sodass derselbe Event
 * über mehrere Scrape-Läufe identifizierbar bleibt.
 */
export function stableId(prefix: string, title: string, date: string): string {
  const raw = `${prefix}-${title}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return raw.slice(0, 80)
}

const WEEKDAYS_RE = /^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
const SWISS_CANTON_RE = /\s+(ZH|BE|LU|UR|SZ|OW|NW|GL|ZG|FR|SO|BS|BL|SH|AR|AI|SG|GR|AG|TG|TI|VD|VS|NE|GE|JU)$/
const COMPANY_SUFFIX_RE = /\s+(Sagl|Sàrl|Sarl|GmbH|AG|Ltd|LLC|Inc\.?|S\.A\.|SA|S\.r\.l\.|e\.V\.)$/i
const HAS_DIGIT_RE = /\d/
// Wenn eines dieser Wörter im String steht, ist's ein Venue-Name, kein Stadtname.
const VENUE_KEYWORDS_RE = /\b(saal|halle|haus|kirche|schule|bar|restaurant|centre|center|klub|club|theater|bühne|kulturhof|zentrum|casa|hotel|hostel|villa|residence|resort|stadium|arena|akademie|academy)\b/i

/**
 * Säubert einen rohen city-Wert auf einen reinen Stadtnamen.
 * Returns null wenn der Input nicht als saubere Stadt durchgehen kann —
 * der aufrufende Scraper soll dann den Event verwerfen.
 *
 * Behebt:
 * - PLZ vorne ("8400 Winterthur" → "Winterthur")
 * - Schweizer Kanton-Suffix ("Wohlen AG" → "Wohlen")
 * - US-State-Suffix ("Denver, CO" → "Denver")
 * - Komma-Ketten ("Stadt, Region, Land" → "Stadt")
 * - Wochentage am Anfang ("Freitag Sihl 3" → null)
 * - zu lange Strings, leere Strings, Strassen-artige (mit Hausnummer)
 */
export function sanitizeCity(raw: string): string | null {
  if (!raw) return null
  let s = raw.trim()
  if (!s) return null

  // Wenn ein Komma drin ist, nur den ersten Teil weiter behandeln
  if (s.includes(',')) s = s.split(',')[0].trim()

  // PLZ am Anfang abschneiden
  s = s.replace(/^\d{4,5}\s+/, '').trim()

  // Firmensuffix abschneiden ("Virtuality Sagl" → "Virtuality")
  s = s.replace(COMPANY_SUFFIX_RE, '').trim()

  // Schweizer Kanton-Suffix abschneiden
  s = s.replace(SWISS_CANTON_RE, '').trim()

  // Wochentage am Anfang → kein gültiger Stadtname
  if (WEEKDAYS_RE.test(s)) return null

  // Strassen-artig (enthält Ziffern) → reject
  if (HAS_DIGIT_RE.test(s)) return null

  // Venue-typische Wörter (Saal, Halle, Casa, Hotel, ...) → kein Stadtname
  if (VENUE_KEYWORDS_RE.test(s)) return null

  // Zu lange Werte → vermutlich Beschreibung, kein Stadtname
  if (s.length > 30) return null

  // Whitespace normalisieren
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length < 2) return null

  return s
}

/**
 * Versucht aus einem Komma-getrennten Standort-String den Stadtnamen zu finden.
 * Probiert alle Segmente durch und nimmt das erste, das sanitizeCity passiert.
 * Beispiel: "Virtuality Sagl, Lugano" → "Lugano" (erstes Segment ist Firmenname).
 */
export function extractCity(location: string): string | null {
  if (!location) return null
  const parts = location.split(/[,/]/).map((p) => p.trim()).filter(Boolean)
  for (const p of parts) {
    const candidate = sanitizeCity(p)
    if (candidate) return candidate
  }
  return null
}
