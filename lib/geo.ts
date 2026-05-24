export type Continent =
  | 'Europa'
  | 'Asien'
  | 'Nordamerika'
  | 'Südamerika'
  | 'Afrika'
  | 'Ozeanien'
  | 'Antarktis'

const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  // Europa
  CH: 'Europa', DE: 'Europa', AT: 'Europa', LI: 'Europa',
  FR: 'Europa', IT: 'Europa', ES: 'Europa', PT: 'Europa', AD: 'Europa', MC: 'Europa', VA: 'Europa', SM: 'Europa',
  NL: 'Europa', BE: 'Europa', LU: 'Europa', IE: 'Europa', GB: 'Europa',
  DK: 'Europa', SE: 'Europa', NO: 'Europa', FI: 'Europa', IS: 'Europa',
  PL: 'Europa', CZ: 'Europa', SK: 'Europa', HU: 'Europa',
  RO: 'Europa', BG: 'Europa', MD: 'Europa',
  GR: 'Europa', AL: 'Europa', MK: 'Europa', RS: 'Europa', BA: 'Europa', HR: 'Europa', SI: 'Europa', ME: 'Europa', XK: 'Europa',
  EE: 'Europa', LV: 'Europa', LT: 'Europa', BY: 'Europa', UA: 'Europa', RU: 'Europa',
  TR: 'Europa',
  MT: 'Europa', CY: 'Europa',

  // Nordamerika (inkl. Mittelamerika + Karibik)
  US: 'Nordamerika', CA: 'Nordamerika', MX: 'Nordamerika',
  GT: 'Nordamerika', BZ: 'Nordamerika', SV: 'Nordamerika', HN: 'Nordamerika',
  NI: 'Nordamerika', CR: 'Nordamerika', PA: 'Nordamerika',
  CU: 'Nordamerika', DO: 'Nordamerika', JM: 'Nordamerika', PR: 'Nordamerika',
  BS: 'Nordamerika', BB: 'Nordamerika', TT: 'Nordamerika',

  // Südamerika
  BR: 'Südamerika', AR: 'Südamerika', CL: 'Südamerika', UY: 'Südamerika', PY: 'Südamerika',
  BO: 'Südamerika', PE: 'Südamerika', EC: 'Südamerika', CO: 'Südamerika',
  VE: 'Südamerika', GY: 'Südamerika', SR: 'Südamerika',

  // Asien
  IL: 'Asien', JO: 'Asien', LB: 'Asien', SY: 'Asien', SA: 'Asien', AE: 'Asien', QA: 'Asien', BH: 'Asien', KW: 'Asien', OM: 'Asien', YE: 'Asien', IR: 'Asien', IQ: 'Asien',
  GE: 'Asien', AM: 'Asien', AZ: 'Asien',
  KZ: 'Asien', UZ: 'Asien', TM: 'Asien', KG: 'Asien', TJ: 'Asien', AF: 'Asien', PK: 'Asien',
  IN: 'Asien', BD: 'Asien', LK: 'Asien', NP: 'Asien', BT: 'Asien', MV: 'Asien',
  CN: 'Asien', JP: 'Asien', KR: 'Asien', KP: 'Asien', MN: 'Asien', TW: 'Asien', HK: 'Asien', MO: 'Asien',
  TH: 'Asien', VN: 'Asien', LA: 'Asien', KH: 'Asien', MM: 'Asien',
  MY: 'Asien', SG: 'Asien', ID: 'Asien', PH: 'Asien', BN: 'Asien', TL: 'Asien',

  // Afrika
  MA: 'Afrika', DZ: 'Afrika', TN: 'Afrika', LY: 'Afrika', EG: 'Afrika', SD: 'Afrika',
  ZA: 'Afrika', NA: 'Afrika', BW: 'Afrika', ZW: 'Afrika', MZ: 'Afrika', ZM: 'Afrika', MW: 'Afrika',
  KE: 'Afrika', TZ: 'Afrika', UG: 'Afrika', RW: 'Afrika', ET: 'Afrika', SO: 'Afrika',
  NG: 'Afrika', GH: 'Afrika', SN: 'Afrika', CI: 'Afrika', CM: 'Afrika',
  BJ: 'Afrika', TG: 'Afrika', ML: 'Afrika', BF: 'Afrika',

  // Ozeanien
  AU: 'Ozeanien', NZ: 'Ozeanien', FJ: 'Ozeanien', PG: 'Ozeanien', NC: 'Ozeanien', WS: 'Ozeanien', TO: 'Ozeanien',

  // Antarktis
  AQ: 'Antarktis',
}

export function getContinent(country: string): Continent | null {
  return COUNTRY_TO_CONTINENT[country.toUpperCase()] ?? null
}

export function isKnownCountry(country: string): boolean {
  return country.toUpperCase() in COUNTRY_TO_CONTINENT
}

// Übliche Länder-Namen (englisch + deutsch) auf ISO-2. Nur Schreibweisen,
// die Scraper-Quellen tatsächlich liefern (insbesondere bitvocation JSON-LD).
// Weitere bei Bedarf ergänzen, wenn der Runner ein unbekanntes Land loggt.
const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  'switzerland': 'CH', 'schweiz': 'CH',
  'germany': 'DE', 'deutschland': 'DE',
  'austria': 'AT', 'österreich': 'AT',
  'liechtenstein': 'LI',
  'france': 'FR', 'frankreich': 'FR',
  'italy': 'IT', 'italien': 'IT',
  'spain': 'ES', 'spanien': 'ES',
  'portugal': 'PT',
  'netherlands': 'NL', 'niederlande': 'NL',
  'belgium': 'BE', 'belgien': 'BE',
  'luxembourg': 'LU', 'luxemburg': 'LU',
  'ireland': 'IE', 'irland': 'IE',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
  'denmark': 'DK', 'dänemark': 'DK',
  'sweden': 'SE', 'schweden': 'SE',
  'norway': 'NO', 'norwegen': 'NO',
  'finland': 'FI', 'finnland': 'FI',
  'iceland': 'IS', 'island': 'IS',
  'poland': 'PL', 'polen': 'PL',
  'czech republic': 'CZ', 'tschechien': 'CZ', 'czechia': 'CZ',
  'slovakia': 'SK', 'slowakei': 'SK',
  'hungary': 'HU', 'ungarn': 'HU',
  'romania': 'RO', 'rumänien': 'RO',
  'bulgaria': 'BG', 'bulgarien': 'BG',
  'greece': 'GR', 'griechenland': 'GR',
  'croatia': 'HR', 'kroatien': 'HR',
  'slovenia': 'SI', 'slowenien': 'SI',
  'serbia': 'RS', 'serbien': 'RS',
  'estonia': 'EE', 'estland': 'EE',
  'latvia': 'LV', 'lettland': 'LV',
  'lithuania': 'LT', 'litauen': 'LT',
  'ukraine': 'UA',
  'turkey': 'TR', 'türkei': 'TR',
  'malta': 'MT', 'cyprus': 'CY', 'zypern': 'CY',
  'united states': 'US', 'usa': 'US', 'united states of america': 'US',
  'canada': 'CA', 'kanada': 'CA',
  'mexico': 'MX', 'mexiko': 'MX',
  'costa rica': 'CR', 'panama': 'PA', 'el salvador': 'SV',
  'guatemala': 'GT', 'honduras': 'HN', 'nicaragua': 'NI', 'belize': 'BZ',
  'brazil': 'BR', 'brasilien': 'BR',
  'argentina': 'AR', 'argentinien': 'AR',
  'chile': 'CL', 'uruguay': 'UY', 'paraguay': 'PY',
  'colombia': 'CO', 'kolumbien': 'CO', 'peru': 'PE', 'ecuador': 'EC', 'bolivia': 'BO',
  'thailand': 'TH', 'vietnam': 'VN', 'indonesia': 'ID', 'indonesien': 'ID',
  'malaysia': 'MY', 'singapore': 'SG', 'singapur': 'SG',
  'philippines': 'PH', 'philippinen': 'PH',
  'japan': 'JP', 'south korea': 'KR', 'südkorea': 'KR', 'china': 'CN',
  'india': 'IN', 'indien': 'IN',
  'united arab emirates': 'AE', 'uae': 'AE',
  'israel': 'IL', 'georgia': 'GE', 'georgien': 'GE',
  'south africa': 'ZA', 'südafrika': 'ZA', 'morocco': 'MA', 'marokko': 'MA',
  'egypt': 'EG', 'ägypten': 'EG', 'kenya': 'KE', 'kenia': 'KE',
  'nigeria': 'NG', 'ghana': 'GH', 'senegal': 'SN', 'cameroon': 'CM', 'kamerun': 'CM',
  'benin': 'BJ', 'togo': 'TG', 'mali': 'ML', 'burkina faso': 'BF',
  'tanzania': 'TZ', 'tansania': 'TZ', 'uganda': 'UG', 'rwanda': 'RW', 'ruanda': 'RW',
  'ethiopia': 'ET', 'äthiopien': 'ET',
  'malawi': 'MW', 'zambia': 'ZM', 'sambia': 'ZM', 'zimbabwe': 'ZW', 'simbabwe': 'ZW',
  'mozambique': 'MZ', 'mosambik': 'MZ', 'botswana': 'BW', 'namibia': 'NA',
  'australia': 'AU', 'australien': 'AU', 'new zealand': 'NZ', 'neuseeland': 'NZ',
}

/**
 * Normalisiert ein country-Feld auf ISO-2 uppercase.
 * Akzeptiert bereits ISO-2-Codes (case-insensitive) oder englische/deutsche
 * Vollnamen aus der Mapping-Tabelle. Gibt null zurück bei unbekanntem Input.
 */
export function normalizeCountry(raw: string): string | null {
  // Punkte und mehrfache Whitespaces normalisieren ("U.S." → "US", "  U S  " → "U S")
  const cleaned = raw.trim().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  // Zweistellig: erst als ISO-Code probieren — bei Treffer in Continent-Map sofort raus.
  // Sonst (z.B. "UK") fallback auf Name-Lookup, weil manche Abkürzungen keine ISO-Codes sind.
  if (/^[A-Za-z]{2}$/.test(cleaned)) {
    const upper = cleaned.toUpperCase()
    if (upper in COUNTRY_TO_CONTINENT) return upper
  }
  return COUNTRY_NAME_TO_ISO2[cleaned.toLowerCase()] ?? null
}

// Deutsche Anzeige-Namen pro ISO-2 — für UI-Labels (Filter, Tooltips).
// Fällt zurück auf den ISO-Code, wenn ein Land nicht gemappt ist.
const COUNTRY_NAMES_DE: Record<string, string> = {
  CH: 'Schweiz', DE: 'Deutschland', AT: 'Österreich', LI: 'Liechtenstein',
  FR: 'Frankreich', IT: 'Italien', ES: 'Spanien', PT: 'Portugal',
  AD: 'Andorra', MC: 'Monaco', VA: 'Vatikan', SM: 'San Marino',
  NL: 'Niederlande', BE: 'Belgien', LU: 'Luxemburg', IE: 'Irland', GB: 'Vereinigtes Königreich',
  DK: 'Dänemark', SE: 'Schweden', NO: 'Norwegen', FI: 'Finnland', IS: 'Island',
  PL: 'Polen', CZ: 'Tschechien', SK: 'Slowakei', HU: 'Ungarn',
  RO: 'Rumänien', BG: 'Bulgarien', MD: 'Moldau',
  GR: 'Griechenland', AL: 'Albanien', MK: 'Nordmazedonien', RS: 'Serbien', BA: 'Bosnien & Herzegowina',
  HR: 'Kroatien', SI: 'Slowenien', ME: 'Montenegro', XK: 'Kosovo',
  EE: 'Estland', LV: 'Lettland', LT: 'Litauen', BY: 'Belarus', UA: 'Ukraine', RU: 'Russland',
  TR: 'Türkei', MT: 'Malta', CY: 'Zypern',
  US: 'USA', CA: 'Kanada', MX: 'Mexiko',
  GT: 'Guatemala', BZ: 'Belize', SV: 'El Salvador', HN: 'Honduras',
  NI: 'Nicaragua', CR: 'Costa Rica', PA: 'Panama',
  CU: 'Kuba', DO: 'Dominikanische Republik', JM: 'Jamaika', PR: 'Puerto Rico',
  BS: 'Bahamas', BB: 'Barbados', TT: 'Trinidad & Tobago',
  BR: 'Brasilien', AR: 'Argentinien', CL: 'Chile', UY: 'Uruguay', PY: 'Paraguay',
  BO: 'Bolivien', PE: 'Peru', EC: 'Ecuador', CO: 'Kolumbien',
  VE: 'Venezuela', GY: 'Guyana', SR: 'Suriname',
  IL: 'Israel', JO: 'Jordanien', LB: 'Libanon', SY: 'Syrien',
  SA: 'Saudi-Arabien', AE: 'Vereinigte Arabische Emirate', QA: 'Katar',
  BH: 'Bahrain', KW: 'Kuwait', OM: 'Oman', YE: 'Jemen', IR: 'Iran', IQ: 'Irak',
  GE: 'Georgien', AM: 'Armenien', AZ: 'Aserbaidschan',
  KZ: 'Kasachstan', UZ: 'Usbekistan', TM: 'Turkmenistan', KG: 'Kirgisistan',
  TJ: 'Tadschikistan', AF: 'Afghanistan', PK: 'Pakistan',
  IN: 'Indien', BD: 'Bangladesch', LK: 'Sri Lanka', NP: 'Nepal', BT: 'Bhutan', MV: 'Malediven',
  CN: 'China', JP: 'Japan', KR: 'Südkorea', KP: 'Nordkorea', MN: 'Mongolei',
  TW: 'Taiwan', HK: 'Hongkong', MO: 'Macau',
  TH: 'Thailand', VN: 'Vietnam', LA: 'Laos', KH: 'Kambodscha', MM: 'Myanmar',
  MY: 'Malaysia', SG: 'Singapur', ID: 'Indonesien', PH: 'Philippinen', BN: 'Brunei', TL: 'Osttimor',
  MA: 'Marokko', DZ: 'Algerien', TN: 'Tunesien', LY: 'Libyen', EG: 'Ägypten', SD: 'Sudan',
  ZA: 'Südafrika', NA: 'Namibia', BW: 'Botswana', ZW: 'Simbabwe',
  MZ: 'Mosambik', ZM: 'Sambia', MW: 'Malawi',
  KE: 'Kenia', TZ: 'Tansania', UG: 'Uganda', RW: 'Ruanda', ET: 'Äthiopien', SO: 'Somalia',
  NG: 'Nigeria', GH: 'Ghana', SN: 'Senegal', CI: 'Elfenbeinküste', CM: 'Kamerun',
  BJ: 'Benin', TG: 'Togo', ML: 'Mali', BF: 'Burkina Faso',
  AU: 'Australien', NZ: 'Neuseeland', FJ: 'Fidschi', PG: 'Papua-Neuguinea',
  NC: 'Neukaledonien', WS: 'Samoa', TO: 'Tonga',
  AQ: 'Antarktis',
}

export function getCountryName(country: string): string {
  return COUNTRY_NAMES_DE[country.toUpperCase()] ?? country
}
