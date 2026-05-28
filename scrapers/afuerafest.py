from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geo import normalize_country  # noqa: E402

from ._utils import HEADERS

# Jahres-Quelle (sources.json: annual=true): ein Festival/Jahr auf festem Gelände
# in Gerlebogk/Könnern (Sachsen-Anhalt). Kein Event-Markup — der Termin steht nur
# als dt. Fliesstext («24. bis 26. Juli 2026»). Location ist über die Jahre fix und
# wird daher hartkodiert; nur das Datum wird aus der Seite geparst. Findet sich kein
# Termin (zwischen den Ausgaben), liefert der Scraper [] (Server behandelt das als ok).
URL = "https://afuerafest.de/"
SOURCE_ID = "afuerafest"
SOURCE_NAME = "AfueraFest"
CATEGORY = "festivals"
COUNTRY = "DE"
CITY = "Könnern"
VENUE = "Gerlebogk"

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "mär": "03", "apr": "04",
    "mai": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "okt": "10", "nov": "11", "dez": "12",
}
# '24. bis 26. Juli 2026' — Startmonat optional (= Endmonat), Jahr am Ende.
RANGE_RE = re.compile(
    r"(\d{1,2})\s*\.\s*(?:([A-Za-zäöüÄÖÜ]+)\s+)?bis\s+(\d{1,2})\s*\.\s*([A-Za-zäöüÄÖÜ]+)\s+(\d{4})"
)


def _month(abbr: str | None) -> str | None:
    if not abbr:
        return None
    return MONTH_MAP.get(re.sub(r"[^a-zäöü]", "", abbr.lower())[:3])


def _parse_range(text: str) -> tuple[str | None, str | None]:
    m = RANGE_RE.search(text)
    if not m:
        return None, None
    start_day, start_month_word, end_day, end_month_word, year = m.groups()
    end_month = _month(end_month_word)
    start_month = _month(start_month_word) or end_month
    if not start_month or not end_month:
        return None, None
    start_date = f"{year}-{start_month}-{start_day.zfill(2)}"
    end_date = f"{year}-{end_month}-{end_day.zfill(2)}"
    return start_date, (None if end_date == start_date else end_date)


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    text = soup.get_text(" ", strip=True)

    start_date, end_date = _parse_range(text)
    if not start_date:  # kein Termin gelistet (z.B. zwischen den Ausgaben)
        return []

    title = soup.title.get_text(strip=True) if soup.title else SOURCE_NAME

    return [{
        "id": f"{SOURCE_ID}-{start_date[:4]}",
        "source": SOURCE_ID,
        "title": title or SOURCE_NAME,
        "description": None,
        "start_date": start_date,
        "end_date": end_date,
        "start_time": None,  # mehrtägig → Zeit wird vom Server ohnehin verworfen
        "end_time": None,
        "category": CATEGORY,
        "venue": VENUE,
        "address": None,
        "city": CITY,
        "country": normalize_country(COUNTRY),
        "url": URL,
    }]
