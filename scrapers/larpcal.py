from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geo import normalize_country  # noqa: E402

from ._utils import HEADERS, sanitize_city

# larpcal.com ist eine React/Vite-SPA; die Daten kommen aus einer öffentlichen
# REST-API auf Render. Die API verlangt einen passenden Origin-Header (CORS).
API = "https://larpcal-tki9.onrender.com/events"
SOURCE_ID = "larpcal"
SOURCE_NAME = "LARP Calendar"
CATEGORY = "festivals"
# Detail-Seite der SPA; eventUrl im JSON ist durchgehend leer.
DETAIL_URL = "https://larpcal.com/events/{id}"

REQUEST_HEADERS = {
    **HEADERS,
    "Origin": "https://larpcal.com",
    "Referer": "https://larpcal.com/",
}


def _clean_description(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    cleaned = " ".join(raw.split())
    if not cleaned:
        return None
    return cleaned if len(cleaned) <= 200 else cleaned[:197] + "…"


def fetch_events() -> list[dict[str, Any]]:
    # Render-Free-Tier kann kalt starten → grosszügiger Timeout.
    response = requests.get(API, headers=REQUEST_HEADERS, timeout=45)
    response.raise_for_status()
    larps = response.json().get("larps") or []

    events: list[dict[str, Any]] = []
    for entry in larps:
        if not isinstance(entry, dict) or not entry.get("isPublished"):
            continue

        title = entry.get("title")
        start_raw = entry.get("start")
        if not isinstance(title, str) or not title.strip():
            continue
        if not isinstance(start_raw, str) or len(start_raw) < 10:
            continue

        start_date = start_raw[:10]
        end_raw = entry.get("end")
        end_date = end_raw[:10] if isinstance(end_raw, str) and len(end_raw) >= 10 else None
        if end_date == start_date:
            end_date = None

        # Zeiten in der API sind Platzhalter (zufällige Sekunden/ms), keine
        # echten Startzeiten — bewusst weggelassen.
        country = normalize_country(entry.get("country") if isinstance(entry.get("country"), str) else None)
        if country == "UK":  # normalize_country liefert "UK", ISO-2 ist GB
            country = "GB"
        if not country:
            continue

        raw_city = entry.get("city")
        city = None if raw_city == "N/A" else sanitize_city(raw_city if isinstance(raw_city, str) else None)

        event_url = entry.get("eventUrl")
        if not (isinstance(event_url, str) and event_url.strip()):
            event_url = DETAIL_URL.format(id=entry.get("id"))

        events.append({
            "id": f"{SOURCE_ID}-{entry.get('id')}",
            "source": SOURCE_ID,
            "title": title.strip(),
            "description": _clean_description(entry.get("description")),
            "start_date": start_date,
            "end_date": end_date,
            "start_time": None,
            "end_time": None,
            "category": CATEGORY,
            "venue": None,
            "address": None,
            "city": city,
            "country": country,
            "url": event_url,
        })
    return events
