from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geo import normalize_country  # noqa: E402

from ._utils import HEADERS, sanitize_city, url_hash

URL = "https://www.zegg.de/de/veranstaltungen/programm"
SOURCE_ID = "zegg"
SOURCE_NAME = "ZEGG Bildungszentrum"
CATEGORY = "retreats-austausch"
DEFAULT_COUNTRY = "DE"


def _split_dt(value: str) -> tuple[str | None, str | None]:
    if not value:
        return None, None
    date_part, _, time_part = value.partition("T")
    if not date_part:
        return None, None
    time = time_part[:5] if len(time_part) >= 5 and time_part[2:3] == ":" else None
    return date_part, time


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    events: list[dict[str, Any]] = []
    seen: set[str] = set()

    for box in soup.select(".sd-event[data-start-date]"):
        start_el = box.select_one('time[itemprop="startDate"]')
        if not start_el or not start_el.get("datetime"):
            continue
        start_date, start_time = _split_dt(start_el["datetime"])
        if not start_date:
            continue

        end_el = box.select_one('time[itemprop="endDate"]')
        end_attr = end_el.get("datetime", "") if end_el else ""
        end_date, end_time = _split_dt(end_attr)
        if end_date == start_date:
            end_date = None

        title_el = box.select_one('h4[itemprop="name"]')
        title = title_el.get_text(" ", strip=True) if title_el else ""
        if not title:
            continue

        city_el = box.select_one('[itemprop="addressLocality"]')
        city = sanitize_city(city_el.get_text(strip=True) if city_el else None)
        if not city:
            continue

        country_el = box.select_one('[itemprop="addressCountry"]')
        country = normalize_country(country_el.get_text(strip=True) if country_el else None)
        if not country:
            country = DEFAULT_COUNTRY

        venue_el = box.select_one('.sd-event-location [itemprop="name"]')
        venue = venue_el.get_text(strip=True) if venue_el else None

        link_el = box.select_one('a[itemprop="url"]') or box.select_one("a[href]")
        href = link_el.get("href", "") if link_el else ""
        if href.startswith("http"):
            event_url = href
        elif href:
            event_url = f"https://www.zegg.de{href}"
        else:
            event_url = URL

        event_id = f"{SOURCE_ID}-{url_hash(event_url)}"
        if event_id in seen:
            continue
        seen.add(event_id)

        events.append({
            "id": event_id,
            "source": SOURCE_ID,
            "title": title,
            "description": None,
            "start_date": start_date,
            "end_date": end_date,
            "start_time": start_time,
            "end_time": end_time,
            "category": CATEGORY,
            "venue": venue,
            "address": None,
            "city": city,
            "country": country,
            "url": event_url,
        })

    return events
