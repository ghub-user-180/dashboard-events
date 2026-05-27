from __future__ import annotations

import re
from typing import Any

import requests
from bs4 import BeautifulSoup

from ._utils import HEADERS, url_hash

URL = "https://www.kulturhof.ch/"
SOURCE_ID = "kulturhof"
SOURCE_NAME = "Kulturhof Köniz"
CATEGORY = "buehne-konzerte"
VENUE = "Kulturhof"
CITY = "Köniz"
COUNTRY = "CH"

DATE_RE = re.compile(r"(\d{2})/(\d{2})/(\d{2})")


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    events: list[dict[str, Any]] = []
    for box in soup.select(".event-block.event"):
        title_el = box.select_one(".event-block-title a")
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title or title.startswith("ABGESAGT"):
            continue

        date_el = box.select_one(".event-date")
        if not date_el:
            continue
        match = DATE_RE.search(date_el.get_text(strip=True))
        if not match:
            continue
        day, month, yy = match.groups()
        year = 2000 + int(yy) if int(yy) < 50 else 1900 + int(yy)
        start_date = f"{year}-{month}-{day}"

        time_el = box.select_one(".event-time")
        start_time = time_el.get_text(strip=True) if time_el else None
        if start_time and ":" not in start_time:
            start_time = None

        href = title_el.get("href", "") or ""
        if href.startswith("http"):
            url = href
        else:
            url = f"https://www.kulturhof.ch/{href.lstrip('/')}" if href else URL

        parts: list[str] = []
        genre_el = box.select_one(".event-block-genre")
        if genre_el:
            genre = genre_el.get_text(" ", strip=True)
            if genre:
                parts.append(genre)
        body = box.select_one(".event-block-body")
        if body:
            for child in body.find_all("div", recursive=False):
                if child.get("class"):
                    continue
                text = " ".join(child.get_text(" ", strip=True).split())
                if text:
                    parts.append(text)
                    break
        description = " · ".join(parts) if parts else None

        events.append({
            "id": f"{SOURCE_ID}-{url_hash(url)}",
            "source": SOURCE_ID,
            "title": title,
            "description": description,
            "start_date": start_date,
            "end_date": None,
            "start_time": start_time,
            "end_time": None,
            "category": CATEGORY,
            "venue": VENUE,
            "address": None,
            "city": CITY,
            "country": COUNTRY,
            "url": url,
        })
    return events
