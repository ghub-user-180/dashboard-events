from __future__ import annotations

from typing import Any

import requests
from bs4 import BeautifulSoup

URL = "https://www.schuur.ch/programm"
SOURCE_ID = "schuur"
SOURCE_NAME = "Konzerthaus Schüür"
CATEGORY = "buehne-konzerte"
VENUE = "Konzerthaus Schüür"
ADDRESS = "Tribschenstrasse 1"
CITY = "Luzern"
COUNTRY = "CH"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


def _split_iso(value: str) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    if "T" in value:
        date_part, time_part = value.split("T", 1)
        return date_part, time_part[:5]
    return value, None


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    events: list[dict[str, Any]] = []
    for box in soup.select(".viz-event-list-box"):
        section_id = box.get("id", "") or ""
        if not section_id.startswith("viz-event-"):
            continue
        native_id = section_id[len("viz-event-"):]
        if not native_id:
            continue

        start_meta = box.select_one('meta[itemprop="startDate"]')
        if not start_meta or not start_meta.get("content"):
            continue
        start_date, start_time = _split_iso(start_meta["content"])

        end_date, end_time = None, None
        end_meta = box.select_one('meta[itemprop="endDate"]')
        if end_meta and end_meta.get("content"):
            end_date, end_time = _split_iso(end_meta["content"])
            if end_date == start_date:
                end_date = None

        anchor = box.select_one("h3 a") or box.select_one("h2 a")
        if not anchor:
            continue
        title = anchor.get_text(strip=True)
        if not title:
            continue
        href = anchor.get("href", "") or ""
        url = href if href.startswith("http") else f"https://www.schuur.ch{href}"

        parts: list[str] = []
        genre_el = box.select_one(".viz-event-genre")
        if genre_el:
            genre = genre_el.get_text(strip=True)
            if genre:
                parts.append(genre)
        headline_el = box.select_one(".viz-event-headline")
        if headline_el:
            headline = headline_el.get_text(strip=True)
            if headline:
                parts.append(headline)
        description = " · ".join(parts) if parts else None

        events.append({
            "id": f"{SOURCE_ID}-{native_id}",
            "source": SOURCE_ID,
            "title": title,
            "description": description,
            "start_date": start_date,
            "end_date": end_date,
            "start_time": start_time,
            "end_time": end_time,
            "category": CATEGORY,
            "venue": VENUE,
            "address": ADDRESS,
            "city": CITY,
            "country": COUNTRY,
            "url": url,
        })
    return events
