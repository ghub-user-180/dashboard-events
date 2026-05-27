from __future__ import annotations

import hashlib
from typing import Any

import requests
from bs4 import BeautifulSoup

URL = "https://www.jazzkantine.com/veranstaltungen"
SOURCE_ID = "jazzkantine"
SOURCE_NAME = "Jazzkantine Luzern"
CATEGORY = "buehne-konzerte"
VENUE = "Jazzkantine"
ADDRESS = "Grabenstrasse 8"
CITY = "Luzern"
COUNTRY = "CH"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


def _url_hash(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


def _clean_time(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    return value or None


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    events: list[dict[str, Any]] = []
    for box in soup.select(".eventlist-event--upcoming"):
        date_el = box.select_one("time.event-date")
        if not date_el:
            continue
        start_date = date_el.get("datetime") or None
        if not start_date:
            continue

        start_time_el = box.select_one("time.event-time-localized-start")
        end_time_el = box.select_one("time.event-time-localized-end")
        start_time = _clean_time(start_time_el.get_text(strip=True)) if start_time_el else None
        end_time = _clean_time(end_time_el.get_text(strip=True)) if end_time_el else None

        anchor = box.select_one("a.eventlist-title-link")
        if not anchor:
            continue
        title = anchor.get_text(strip=True)
        if not title:
            continue
        href = anchor.get("href", "") or ""
        url = href if href.startswith("http") else f"https://www.jazzkantine.com{href}"

        desc_el = box.select_one(".eventlist-description")
        description = None
        if desc_el:
            text = " ".join(desc_el.get_text(" ", strip=True).split())
            if len(text) > 200:
                text = text[:197] + "…"
            description = text or None

        addr_el = box.select_one(".eventlist-meta-address")
        venue = VENUE
        if addr_el:
            addr_text = addr_el.get_text(" ", strip=True)
            for noise in ("(Karte)", "(Map)"):
                addr_text = addr_text.replace(noise, "")
            addr_text = " ".join(addr_text.split())
            if addr_text:
                venue = addr_text

        events.append({
            "id": f"{SOURCE_ID}-{_url_hash(url)}",
            "source": SOURCE_ID,
            "title": title,
            "description": description,
            "start_date": start_date,
            "end_date": None,
            "start_time": start_time,
            "end_time": end_time,
            "category": CATEGORY,
            "venue": venue,
            "address": ADDRESS,
            "city": CITY,
            "country": COUNTRY,
            "url": url,
        })
    return events
