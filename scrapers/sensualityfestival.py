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

# Jahres-Quelle (sources.json: annual=true): ein einziges Festival pro Jahr,
# Termin nur als Marketing-Fliesstext («15-22 August, 2026»), kein Event-Markup,
# kein konkreter Stadtname — nur Land (Tschechien). Zwischen den Ausgaben liefert
# die Seite evtl. keinen Termin → dann [] (der Server behandelt das als ok).
URL = "https://www.sensualityfestival.com/"
SOURCE_ID = "sensualityfestival"
SOURCE_NAME = "Festival of Sensuality"
CATEGORY = "festivals"
COUNTRY = "CZ"

MONTH_EN = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}

# '15-22 August, 2026' (eine Monatsangabe) — Start- und Endtag teilen Monat+Jahr.
SINGLE_MONTH_RE = re.compile(
    r"(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})"
)
# '30 August - 5 September, 2026' (zwei Monate) — Reservefall für andere Ausgaben.
CROSS_MONTH_RE = re.compile(
    r"(\d{1,2})\s+([A-Za-z]+)\s*[-–—]\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})"
)


def _month(name: str) -> str | None:
    return MONTH_EN.get(name.strip().lower())


def _parse_dates(text: str) -> tuple[str | None, str | None]:
    cross = CROSS_MONTH_RE.search(text)
    if cross:
        sd, sm, ed, em, year = cross.groups()
        sm_n, em_n = _month(sm), _month(em)
        if sm_n and em_n:
            return f"{year}-{sm_n}-{sd.zfill(2)}", f"{year}-{em_n}-{ed.zfill(2)}"
    single = SINGLE_MONTH_RE.search(text)
    if single:
        sd, ed, month, year = single.groups()
        m = _month(month)
        if m:
            return f"{year}-{m}-{sd.zfill(2)}", f"{year}-{m}-{ed.zfill(2)}"
    return None, None


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    text = soup.get_text(" ", strip=True)

    start_date, end_date = _parse_dates(text)
    if not start_date:  # zwischen den Ausgaben kein Termin gelistet
        return []
    if end_date == start_date:
        end_date = None

    title = soup.title.get_text(strip=True) if soup.title else SOURCE_NAME

    return [{
        "id": f"{SOURCE_ID}-{start_date[:4]}",
        "source": SOURCE_ID,
        "title": title or SOURCE_NAME,
        "description": None,
        "start_date": start_date,
        "end_date": end_date,
        "start_time": None,
        "end_time": None,
        "category": CATEGORY,
        "venue": None,
        "address": None,
        "city": None,  # Quelle nennt keinen Ort, nur Land
        "country": normalize_country(COUNTRY),
        "url": URL,
    }]
