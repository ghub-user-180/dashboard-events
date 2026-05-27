"""ISO-2 Ländercode → Kontinent. Wächst mit neuen Quellen."""

from __future__ import annotations

CONTINENT_BY_COUNTRY: dict[str, str] = {
    # Europa
    "CH": "Europa", "DE": "Europa", "AT": "Europa", "FR": "Europa",
    "IT": "Europa", "ES": "Europa", "PT": "Europa", "GB": "Europa",
    "IE": "Europa", "NL": "Europa", "BE": "Europa", "LU": "Europa",
    "DK": "Europa", "SE": "Europa", "NO": "Europa", "FI": "Europa",
    "IS": "Europa", "PL": "Europa", "CZ": "Europa", "SK": "Europa",
    "HU": "Europa", "SI": "Europa", "HR": "Europa", "RS": "Europa",
    "BA": "Europa", "AL": "Europa", "MK": "Europa", "ME": "Europa",
    "EE": "Europa", "LV": "Europa", "LT": "Europa", "GR": "Europa",
    "BG": "Europa", "RO": "Europa", "MT": "Europa", "CY": "Europa",
    "UA": "Europa", "MD": "Europa",
    # Nordamerika
    "US": "Nordamerika", "CA": "Nordamerika", "MX": "Nordamerika",
    "SV": "Nordamerika", "CR": "Nordamerika", "PA": "Nordamerika",
    "GT": "Nordamerika", "HN": "Nordamerika", "NI": "Nordamerika",
    "DO": "Nordamerika",
    # Südamerika
    "BR": "Südamerika", "AR": "Südamerika", "CL": "Südamerika",
    "CO": "Südamerika", "PE": "Südamerika", "UY": "Südamerika",
    "EC": "Südamerika", "BO": "Südamerika", "PY": "Südamerika",
    "VE": "Südamerika",
    # Asien
    "JP": "Asien", "KR": "Asien", "CN": "Asien", "TW": "Asien",
    "HK": "Asien", "SG": "Asien", "MY": "Asien", "TH": "Asien",
    "VN": "Asien", "ID": "Asien", "PH": "Asien", "IN": "Asien",
    "AE": "Asien", "IL": "Asien", "TR": "Asien",
    # Afrika
    "ZA": "Afrika", "MA": "Afrika", "EG": "Afrika", "KE": "Afrika",
    "TZ": "Afrika", "GH": "Afrika",
    # Ozeanien
    "AU": "Ozeanien", "NZ": "Ozeanien",
}


def continent_for(country_code: str | None) -> str | None:
    if not country_code:
        return None
    return CONTINENT_BY_COUNTRY.get(country_code.upper())


COUNTRY_NORMALIZE: dict[str, str] = {
    # Englisch
    "united states": "US", "united states of america": "US", "usa": "US",
    "us": "US", "u.s.": "US", "u.s.a": "US",
    "united kingdom": "GB", "uk": "GB", "great britain": "GB", "england": "GB",
    "switzerland": "CH", "germany": "DE", "france": "FR", "italy": "IT",
    "spain": "ES", "portugal": "PT", "netherlands": "NL", "belgium": "BE",
    "austria": "AT", "ireland": "IE", "czech republic": "CZ", "czechia": "CZ",
    "poland": "PL", "greece": "GR", "sweden": "SE", "norway": "NO",
    "denmark": "DK", "finland": "FI", "canada": "CA", "mexico": "MX",
    "brazil": "BR", "argentina": "AR", "japan": "JP", "thailand": "TH",
    "south korea": "KR", "korea": "KR", "indonesia": "ID", "vietnam": "VN",
    "australia": "AU", "new zealand": "NZ", "south africa": "ZA",
    "el salvador": "SV", "costa rica": "CR", "uruguay": "UY",
    # Deutsch
    "schweiz": "CH", "deutschland": "DE", "frankreich": "FR",
    "italien": "IT", "spanien": "ES", "österreich": "AT",
    "vereinigte staaten": "US", "vereinigtes königreich": "GB",
    "niederlande": "NL", "belgien": "BE", "tschechien": "CZ",
    "polen": "PL", "griechenland": "GR", "schweden": "SE",
    "norwegen": "NO", "dänemark": "DK", "finnland": "FI",
    "kanada": "CA", "mexiko": "MX", "brasilien": "BR",
    "argentinien": "AR", "japan": "JP", "südafrika": "ZA",
}


COUNTRY_NAME_DE: dict[str, str] = {
    "CH": "Schweiz", "DE": "Deutschland", "AT": "Österreich",
    "FR": "Frankreich", "IT": "Italien", "ES": "Spanien", "PT": "Portugal",
    "GB": "Grossbritannien", "IE": "Irland", "NL": "Niederlande",
    "BE": "Belgien", "LU": "Luxemburg", "DK": "Dänemark", "SE": "Schweden",
    "NO": "Norwegen", "FI": "Finnland", "IS": "Island", "PL": "Polen",
    "CZ": "Tschechien", "SK": "Slowakei", "HU": "Ungarn", "SI": "Slowenien",
    "HR": "Kroatien", "RS": "Serbien", "BA": "Bosnien-Herzegowina",
    "AL": "Albanien", "MK": "Nordmazedonien", "ME": "Montenegro",
    "EE": "Estland", "LV": "Lettland", "LT": "Litauen",
    "GR": "Griechenland", "BG": "Bulgarien", "RO": "Rumänien",
    "MT": "Malta", "CY": "Zypern", "UA": "Ukraine", "MD": "Moldau",
    "US": "USA", "CA": "Kanada", "MX": "Mexiko",
    "BR": "Brasilien", "AR": "Argentinien", "CL": "Chile",
    "CO": "Kolumbien", "PE": "Peru", "UY": "Uruguay",
    "SV": "El Salvador", "CR": "Costa Rica", "PA": "Panama",
    "GT": "Guatemala", "HN": "Honduras", "NI": "Nicaragua",
    "EC": "Ecuador", "BO": "Bolivien", "PY": "Paraguay",
    "VE": "Venezuela", "DO": "Dominikanische Republik",
    "JP": "Japan", "KR": "Südkorea", "CN": "China", "TW": "Taiwan",
    "HK": "Hongkong", "SG": "Singapur", "MY": "Malaysia",
    "TH": "Thailand", "VN": "Vietnam", "ID": "Indonesien",
    "PH": "Philippinen", "IN": "Indien", "AE": "VAE", "IL": "Israel",
    "TR": "Türkei", "ZA": "Südafrika", "MA": "Marokko", "EG": "Ägypten",
    "KE": "Kenia", "TZ": "Tansania", "GH": "Ghana",
    "AU": "Australien", "NZ": "Neuseeland",
}


def country_name_for(code: str | None) -> str | None:
    if not code:
        return None
    return COUNTRY_NAME_DE.get(code.upper(), code.upper())


def normalize_country(value: str | None) -> str | None:
    """English/German country name → ISO-2 (oder durchreichen wenn schon ISO-2)."""
    if not isinstance(value, str):
        return None
    s = value.strip()
    if not s:
        return None
    upper = s.upper()
    if len(upper) == 2 and upper.isalpha():
        return upper
    key = s.lower().rstrip(".")
    return COUNTRY_NORMALIZE.get(key)
