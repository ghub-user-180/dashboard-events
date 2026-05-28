from __future__ import annotations

import os
import re
import sys
from typing import Any

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ._utils import HEADERS, sanitize_city, url_hash  # noqa: E402
from geo import normalize_country  # noqa: E402

URL = "https://scich.org/aktuelle-freiwilligeneinsaetze/"
SOURCE_ID = "scich"
SOURCE_NAME = "SCI – Freiwilligencamps Schweiz"
CATEGORY = "retreats-austausch"
COUNTRY = "CH"

# Die Schweiz-Camps stehen inline in Divi-Textblöcken: <h6> Titel, gefolgt von
# einem <p> mit 'Datum: … Ort: … Alter: …'. Internationale Camps der Seite
# nutzen dieses Inline-Format nicht, daher wird zusätzlich auf CH gefiltert.
PROJ_RE = re.compile(r"volunteer\.sci\.ngo/projects/\d+")
DATUM_ORT_RE = re.compile(r"Datum:\s*(.*?)\s*Ort:\s*(.*?)(?:\s*Alter:|$)", re.S)

MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "mär": "03", "apr": "04",
    "mai": "05", "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "okt": "10", "oct": "10", "nov": "11", "dez": "12", "dec": "12",
}

# Datum: '19. Juli bis 01. August 2026' / '20. bis 31. Juli 2026' /
#        '12 . bis 20. September 2026'. Startmonat ist optional (= Endmonat).
RANGE_RE = re.compile(
    r"(\d{1,2})\s*\.\s*(?:([A-Za-zäöüÄÖÜ]+)\s+)?bis\s+(\d{1,2})\s*\.\s*([A-Za-zäöüÄÖÜ]+)\s+(\d{4})"
)

# Schweizer Kantons-/Regionsnamen, die als Ort-Suffix auftreten und keine Stadt
# sind. Doppeldeutige (Zürich, Bern, Solothurn …) bewusst NICHT gelistet — sie
# stehen in dieser Quelle an der Stadt-Position.
REGION_NAMES = {
    "graubünden", "graubuenden", "waadt", "wallis", "tessin", "ticino",
    "aargau", "thurgau", "glarus", "uri", "schwyz", "obwalden", "nidwalden",
    "appenzell", "jura", "freiburg", "fribourg", "neuenburg", "neuchâtel",
    "genf", "genève", "graubünden ch",
}


def _month(abbr: str | None) -> str | None:
    if not abbr:
        return None
    key = re.sub(r"[^a-zäöü]", "", abbr.lower())[:3]
    return MONTH_MAP.get(key)


def _parse_range(raw: str) -> tuple[str | None, str | None]:
    """'19. Juli bis 01. August 2026' -> ('2026-07-19', '2026-08-01')."""
    s = raw.replace("\xa0", " ")
    m = RANGE_RE.search(s)
    if not m:
        return None, None
    start_day, start_month_word, end_day, end_month_word, year = m.groups()
    end_month = _month(end_month_word)
    start_month = _month(start_month_word) or end_month
    if not start_month or not end_month:
        return None, None
    start_date = f"{year}-{start_month}-{start_day.zfill(2)}"
    end_date = f"{year}-{end_month}-{end_day.zfill(2)}"
    if end_date == start_date:
        end_date = None
    return start_date, end_date


def _parse_location(raw: str) -> tuple[str | None, str | None]:
    """Ort-String -> (venue, city). Venue steht vor der Stadt, danach Region/Land."""
    s = raw.replace("\xa0", " ")
    s = re.sub(r"\(.*?\)", "", s)  # '(Wallis, CH)' u.ä. entfernen
    cleaned: list[str] = []
    for seg in s.split(","):
        seg = re.sub(r"\s+(CH|Schweiz)$", "", seg.strip(), flags=re.IGNORECASE).strip()
        if not seg or seg.lower() in ("ch", "schweiz"):
            continue
        cleaned.append(seg)
    while cleaned and cleaned[-1].lower() in REGION_NAMES:
        cleaned.pop()
    if not cleaned:
        return None, None
    city = sanitize_city(cleaned[-1])
    venue = ", ".join(cleaned[:-1]) or None
    return venue, city


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    events: list[dict[str, Any]] = []
    title: str | None = None
    seen_titles: set[str] = set()

    for el in soup.find_all(["h6", "p"]):
        if el.name == "h6":
            t = el.get_text(" ", strip=True)
            if t:
                title = t
            continue

        txt = el.get_text(" ", strip=True)
        m = DATUM_ORT_RE.search(txt)
        if not m or not title or title in seen_titles:
            continue

        start_date, end_date = _parse_range(m.group(1).strip())
        if not start_date:
            continue

        venue, city = _parse_location(m.group(2).strip())

        link_el = el.find("a", href=PROJ_RE)
        if not link_el:  # Detail-Link folgt manchmal im nächsten <p>
            sibling = el.find_next("a", href=PROJ_RE)
            link_el = sibling if sibling else None
        event_url = link_el["href"] if link_el else URL
        if event_url.startswith("//"):
            event_url = f"https:{event_url}"

        seen_titles.add(title)
        events.append({
            "id": f"{SOURCE_ID}-{url_hash(event_url if link_el else event_url + title)}",
            "source": SOURCE_ID,
            "title": title,
            "description": None,
            "start_date": start_date,
            "end_date": end_date,
            "start_time": None,
            "end_time": None,
            "category": CATEGORY,
            "venue": venue,
            "address": None,
            "city": city,
            "country": normalize_country(COUNTRY),
            "url": event_url,
        })
    return events
