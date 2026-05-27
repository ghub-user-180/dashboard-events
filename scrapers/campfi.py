from __future__ import annotations

import html as html_lib
import re
import sys
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geo import normalize_country  # noqa: E402

from ._utils import HEADERS, sanitize_city, url_hash

URL = "https://campfi.org/wp-json/tribe/events/v1/events?per_page=50"
SOURCE_ID = "campfi"
SOURCE_NAME = "CampFI"
CATEGORY = "retreats-austausch"

HTML_TAG_RE = re.compile(r"<[^>]+>")

_MONTH = (
    r"(?:January|February|March|April|May|June|July|"
    r"August|September|October|November|December)"
)
DATE_PREFIX_RE = re.compile(
    rf"^{_MONTH}\s+\d+"
    rf"(?:\s*[-–—]\s*(?:{_MONTH}\s+)?\d+)?"
    rf",?\s*\d{{4}}\s*(?:\([^)]+\))?\s*",
    re.IGNORECASE,
)


def _split_dt(value: str | None) -> tuple[str | None, str | None]:
    if not isinstance(value, str) or not value:
        return None, None
    parts = value.split(" ", 1)
    date_part = parts[0] if parts else None
    time_part = parts[1][:5] if len(parts) > 1 and len(parts[1]) >= 5 else None
    return date_part, time_part


def _clean_text(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    cleaned = html_lib.unescape(HTML_TAG_RE.sub("", raw))
    cleaned = " ".join(cleaned.split())
    return cleaned or None


def _extract_description(raw: Any) -> str | None:
    cleaned = _clean_text(raw)
    if not cleaned:
        return None
    cleaned = DATE_PREFIX_RE.sub("", cleaned).strip()
    if not cleaned:
        return None
    return cleaned if len(cleaned) <= 200 else cleaned[:197] + "…"


def _strip_year(title: str, start_date: str | None) -> str:
    if not start_date or len(start_date) < 4:
        return title
    year = start_date[:4]
    stripped = re.sub(rf"\s*\b{year}\b\s*", " ", title)
    return re.sub(r"\s+", " ", stripped).strip(" –-—,")


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    data = response.json()

    events: list[dict[str, Any]] = []
    for entry in data.get("events") or []:
        if not isinstance(entry, dict):
            continue
        title = entry.get("title")
        start_raw = entry.get("start_date")
        if not isinstance(title, str) or not title:
            continue
        if not isinstance(start_raw, str) or not start_raw:
            continue

        start_date, start_time = _split_dt(start_raw)
        end_date, end_time = _split_dt(entry.get("end_date"))
        if end_date == start_date:
            end_date = None
        else:
            # Mehrtages-Event: end_time ist Check-out, in der Zeit-Spalte irreführend
            end_time = None

        title = _clean_text(title) or title
        title = _strip_year(title, start_date)

        venue_obj = entry.get("venue") or {}
        if not isinstance(venue_obj, dict):
            venue_obj = {}

        raw_city = venue_obj.get("city", "")
        raw_country = venue_obj.get("country", "")
        city = sanitize_city(raw_city if isinstance(raw_city, str) else None)
        country = normalize_country(raw_country if isinstance(raw_country, str) else None)
        if not country:
            continue

        venue_name = venue_obj.get("venue")
        venue = venue_name.strip() if isinstance(venue_name, str) and venue_name.strip() else None

        description = _extract_description(entry.get("excerpt")) or _extract_description(entry.get("description"))

        url = entry.get("url") or "https://campfi.org/"

        events.append({
            "id": f"{SOURCE_ID}-{url_hash(url)}",
            "source": SOURCE_ID,
            "title": title,
            "description": description,
            "start_date": start_date,
            "end_date": end_date,
            "start_time": start_time,
            "end_time": end_time,
            "category": CATEGORY,
            "venue": venue,
            "address": None,
            "city": city,
            "country": country,
            "url": url,
        })
    return events
