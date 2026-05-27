from __future__ import annotations

import re
from typing import Any

import requests
from bs4 import BeautifulSoup

from ._utils import HEADERS, url_hash

URL = "https://barhopping.ch/"
SOURCE_ID = "barhopping"
SOURCE_NAME = "Barhopping"
CATEGORY = "kennenlernen"
COUNTRY = "CH"

CITY_RE = re.compile(r"^[A-ZÄÖÜ][a-zäöü]{2,12}$")


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    events: list[dict[str, Any]] = []
    seen: set[str] = set()

    for box in soup.select('[itemtype="https://schema.org/Event"]'):
        start_meta = box.select_one('meta[itemprop="startDate"]')
        if not start_meta or not start_meta.get("content"):
            continue
        start_attr = start_meta["content"]
        start_date, _, time_part = start_attr.partition("T")
        start_time = time_part[:5] if time_part and len(time_part) >= 5 else None
        if not start_date:
            continue

        city: str | None = None
        for div in box.select("div.text-left"):
            text = div.get_text(strip=True)
            if CITY_RE.match(text):
                city = text
                break
        if not city:
            continue

        desc_meta = box.select_one('meta[itemprop="description"]')
        description: str | None = None
        if desc_meta and desc_meta.get("content"):
            cleaned = " ".join(str(desc_meta["content"]).split())
            description = cleaned if len(cleaned) <= 200 else cleaned[:197] + "…"

        age_el = box.select_one(".bg-secondary.text-primary.rounded.grow .p-2")
        age_group = age_el.get_text(strip=True) if age_el else None

        title = f"Barhopping {city} — {age_group}" if age_group else f"Barhopping {city}"

        anchor = box.select_one("a")
        href = anchor.get("href", "") if anchor else ""
        if href.startswith("http"):
            url = href
        elif href:
            url = f"https://barhopping.ch{href}"
        else:
            url = URL

        native = f"{city}-{start_date}-{age_group or 'all'}"
        event_id = f"{SOURCE_ID}-{url_hash(native)}"
        if event_id in seen:
            continue
        seen.add(event_id)

        events.append({
            "id": event_id,
            "source": SOURCE_ID,
            "title": title,
            "description": description,
            "start_date": start_date,
            "end_date": None,
            "start_time": start_time,
            "end_time": None,
            "category": CATEGORY,
            "venue": "Barhopping",
            "address": None,
            "city": city,
            "country": COUNTRY,
            "url": url,
        })
    return events
