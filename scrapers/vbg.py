from __future__ import annotations

import re
from typing import Any

import requests
from bs4 import BeautifulSoup, NavigableString

from ._utils import HEADERS, extract_venue_and_city, url_hash

URL = "https://www.vbg.net/agenda"
SOURCE_ID = "vbg"
SOURCE_NAME = "VBG Agenda"
CATEGORY = "retreats-austausch"
COUNTRY = "CH"

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "mär": "03", "apr": "04",
    "mai": "05", "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "okt": "10", "oct": "10", "nov": "11", "dez": "12", "dec": "12",
}

ALLOWED_CAL_LABELS = ("Auszeiten", "Kurse", "Seminare", "Ferien")

# data-place enthält bei VBG die Lokalität, keine Stadt. Bekannte Häuser
# → manuell gemappte Stadt. Wenn data-place leer oder unbekannt ist, bleibt
# city = None (Schema erlaubt das jetzt).
VBG_VENUE_CITY = {
    "Casa Moscia": "Ascona",
    "Campo Rasa": "Onsernone",
}

_MONTH_KEY_RE = re.compile(r"[^a-zäöü]")


def _build_date(year: str, month_abbr: str, day: str) -> str | None:
    if not year or not month_abbr or not day:
        return None
    key = _MONTH_KEY_RE.sub("", month_abbr.lower())[:3]
    month = MONTH_MAP.get(key)
    if not month:
        return None
    day_clean = day.replace("-", "").strip().zfill(2)
    if not day_clean.isdigit():
        return None
    return f"{year}-{month}-{day_clean}"


def _direct_text(element) -> str:
    parts = []
    for child in element.children:
        if isinstance(child, NavigableString):
            t = str(child).strip()
            if t:
                parts.append(t)
    return " ".join(parts).strip()


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    events: list[dict[str, Any]] = []
    for box in soup.select(".kItem"):
        cal_label = box.get("data-cal-label", "") or ""
        if not any(label in cal_label for label in ALLOWED_CAL_LABELS):
            continue

        data_date = box.get("data-date", "") or ""
        data_date2 = box.get("data-date2", "") or ""
        year = data_date[:4]
        if not year:
            continue

        start_day_el = box.select_one(".startdate .day")
        start_month_el = box.select_one(".startdate .month")
        if not start_day_el or not start_month_el:
            continue
        start_month = start_month_el.get_text(strip=True)
        start_date = _build_date(year, start_month, start_day_el.get_text(strip=True))
        if not start_date:
            continue

        end_date = None
        end_day_el = box.select_one(".enddate .day")
        end_month_el = box.select_one(".enddate .month")
        if end_day_el:
            ed_day = end_day_el.get_text(strip=True)
            ed_month = end_month_el.get_text(strip=True) if end_month_el else ""
            end_year = data_date2[:4] or year
            candidate = _build_date(end_year, ed_month or start_month, ed_day)
            if candidate and candidate != start_date:
                end_date = candidate

        title_el = box.select_one(".title")
        if not title_el:
            continue
        title = _direct_text(title_el) or title_el.get_text(strip=True)
        if not title:
            continue

        anchor = box.select_one("a.goSingle")
        href = anchor.get("href", "") if anchor else ""
        url = f"https://www.vbg.net{href}" if href and not href.startswith("http") else (href or URL)

        location = (box.get("data-place", "") or "").strip()
        venue: str | None = None
        city: str | None = None
        if location:
            if location in VBG_VENUE_CITY:
                venue = location
                city = VBG_VENUE_CITY[location]
            else:
                venue, city = extract_venue_and_city(location)
                if not venue and not city:
                    venue = location  # nichts extrahierbar: roher String als Lokalität

        events.append({
            "id": f"{SOURCE_ID}-{url_hash(url)}",
            "source": SOURCE_ID,
            "title": title,
            "description": cal_label or None,
            "start_date": start_date,
            "end_date": end_date,
            "start_time": None,
            "end_time": None,
            "category": CATEGORY,
            "venue": venue,
            "address": None,
            "city": city,
            "country": COUNTRY,
            "url": url,
        })
    return events
