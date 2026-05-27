from __future__ import annotations

import re
from typing import Any

import requests

from ._utils import HEADERS, extract_venue_and_city, url_hash

ICS_URL = (
    "https://calendar.google.com/calendar/ical/"
    "fcc2odqjubobo9ejbaasi841t0%40group.calendar.google.com/public/basic.ics"
)
SOURCE_ID = "ecstaticdancebern"
SOURCE_NAME = "Ecstatic Dance Bern"
CATEGORY = "tanz-bewegung"
DEFAULT_VENUE = "Dance Complex"
DEFAULT_CITY = "Liebefeld"
COUNTRY = "CH"


def _parse_ics_datetime(value: str) -> tuple[str | None, str | None]:
    """ICS DTSTART/DTEND-Wert → (YYYY-MM-DD, HH:MM | None)."""
    if not value:
        return None, None
    date_part = value[:8]
    if len(date_part) < 8 or not date_part.isdigit():
        return None, None
    iso_date = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}"
    time_str = None
    if "T" in value:
        tail = value.split("T", 1)[1]
        time_part = tail[:4]
        if len(time_part) == 4 and time_part.isdigit():
            time_str = f"{time_part[:2]}:{time_part[2:]}"
    return iso_date, time_str


def _unfold_ics(text: str) -> str:
    """ICS-Zeilenfaltung auflösen: Newline + Space/Tab = Fortsetzung der Vorzeile."""
    return re.sub(r"\r?\n[ \t]", "", text)


def _get_field(block: str, key: str) -> str:
    match = re.search(rf"^{key}[^:]*:(.+)$", block, re.MULTILINE)
    if not match:
        return ""
    return (
        match.group(1)
        .replace("\\n", " ")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .strip()
    )


def fetch_events() -> list[dict[str, Any]]:
    response = requests.get(ICS_URL, headers=HEADERS, timeout=20)
    response.raise_for_status()
    ics = _unfold_ics(response.text)

    events: list[dict[str, Any]] = []
    for block in ics.split("BEGIN:VEVENT")[1:]:
        dtstart = _get_field(block, "DTSTART")
        summary = _get_field(block, "SUMMARY")
        if not dtstart or not summary:
            continue

        start_date, start_time = _parse_ics_datetime(dtstart)
        if not start_date:
            continue

        end_time = None
        dtend = _get_field(block, "DTEND")
        if dtend:
            _, end_time = _parse_ics_datetime(dtend)

        uid = _get_field(block, "UID")
        url = _get_field(block, "URL") or "https://www.ecstaticdancebern.ch"
        description = _get_field(block, "DESCRIPTION") or None
        if description and len(description) > 200:
            description = description[:197] + "…"

        location_str = _get_field(block, "LOCATION")
        if location_str:
            venue, extracted_city = extract_venue_and_city(location_str)
            if extracted_city:
                city = extracted_city
                venue = venue or location_str
            else:
                venue = location_str
                city = DEFAULT_CITY
        else:
            venue = DEFAULT_VENUE
            city = DEFAULT_CITY

        if uid:
            native = uid.split("@", 1)[0]
            event_id = f"{SOURCE_ID}-{native}"
        else:
            event_id = f"{SOURCE_ID}-{url_hash(url + start_date)}"

        events.append({
            "id": event_id,
            "source": SOURCE_ID,
            "title": summary,
            "description": description,
            "start_date": start_date,
            "end_date": None,
            "start_time": start_time,
            "end_time": end_time,
            "category": CATEGORY,
            "venue": venue,
            "address": None,
            "city": city,
            "country": COUNTRY,
            "url": url,
        })
    return events
