from __future__ import annotations

import html as html_lib
import json
import re
import sys
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geo import normalize_country  # noqa: E402

from ._utils import HEADERS, sanitize_city, url_hash

URL = "https://bitvocation.com/bitcoin-conferences-discounts"
SOURCE_ID = "bitvocation"
SOURCE_NAME = "Bitvocation"
CATEGORY = "konferenzen"

JSON_LD_RE = re.compile(
    r'<script[^>]+type="application/ld\+json"[^>]+children="({[\s\S]*?})"'
)


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    html_text = response.text

    match = JSON_LD_RE.search(html_text)
    if not match:
        return []

    try:
        data = json.loads(html_lib.unescape(match.group(1)))
    except json.JSONDecodeError:
        return []

    items = data.get("itemListElement") or []
    events: list[dict[str, Any]] = []

    for entry in items:
        if not isinstance(entry, dict):
            continue
        item = entry.get("item") or {}
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        start_date = item.get("startDate")
        url = item.get("url")
        if not isinstance(name, str) or not name:
            continue
        if not isinstance(start_date, str) or not start_date:
            continue

        location = item.get("location") or {}
        address = location.get("address") if isinstance(location, dict) else {}
        if not isinstance(address, dict):
            address = {}

        raw_country = address.get("addressCountry", "")
        country = normalize_country(raw_country if isinstance(raw_country, str) else None)
        if not country:
            continue

        raw_city = address.get("addressLocality", "")
        city = sanitize_city(raw_city if isinstance(raw_city, str) else None)

        # location.name ist bei Bitvocation fast immer "City, Country" — kein
        # echter Venue-Name. Wir lassen venue deshalb leer; falls die Quelle mal
        # einen echten Venue beifügt, würden wir die Erkennung hier verfeinern.
        venue = None

        description = None
        raw_desc = item.get("description")
        if isinstance(raw_desc, str):
            cleaned = " ".join(raw_desc.split())
            if cleaned:
                description = cleaned if len(cleaned) <= 200 else cleaned[:197] + "…"

        # startDate kann "2026-06-15T10:00:00Z" sein → Datum + Zeit splitten
        start_time = None
        if "T" in start_date:
            start_date_clean, time_part = start_date.split("T", 1)
            if len(time_part) >= 5 and time_part[:5].count(":") == 1:
                start_time = time_part[:5]
            start_date = start_date_clean

        event_url = url if isinstance(url, str) and url else URL

        events.append({
            "id": f"{SOURCE_ID}-{url_hash(event_url)}",
            "source": SOURCE_ID,
            "title": name,
            "description": description,
            "start_date": start_date,
            "end_date": None,
            "start_time": start_time,
            "end_time": None,
            "category": CATEGORY,
            "venue": venue,
            "address": None,
            "city": city,
            "country": country,
            "url": event_url,
        })
    return events
