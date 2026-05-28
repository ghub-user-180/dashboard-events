"""ICS-Export pro Event (RFC 5545).

Single-Event VCALENDAR/VEVENT-Generator für `/api/event/<id>.ics`.
Times als Floating-Local (kein TZID) — passt für lokales Dashboard, in dem
die meisten Quellen Europe/Zurich liegen. Multi-Day-Events ohne Uhrzeit
werden als VALUE=DATE all-day mit exklusivem DTEND emittiert.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

PRODID = "-//Events Dashboard//DE"


def _escape_text(value: str) -> str:
    """Escape per RFC 5545 §3.3.11 (TEXT value type)."""
    return (
        value.replace("\\", "\\\\")
             .replace(";", "\\;")
             .replace(",", "\\,")
             .replace("\r\n", "\\n")
             .replace("\n", "\\n")
             .replace("\r", "\\n")
    )


def _fold(line: str) -> str:
    """RFC 5545 §3.1: Zeilen max 75 Octets, Fortsetzungszeilen mit führendem Space."""
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line
    chunks: list[bytes] = []
    while len(encoded) > 75:
        split = 75
        while split > 0 and (encoded[split] & 0xC0) == 0x80:
            split -= 1
        chunks.append(encoded[:split])
        encoded = encoded[split:]
    chunks.append(encoded)
    return "\r\n ".join(c.decode("utf-8") for c in chunks)


def _ymd(date_str: str) -> str:
    return date_str.replace("-", "")


def _ymd_hms(date_str: str, time_str: str) -> str:
    return f"{_ymd(date_str)}T{time_str.replace(':', '')}00"


def _slug(value: str, max_len: int = 60) -> str:
    s = re.sub(r"[^a-zA-Z0-9-]+", "-", value).strip("-").lower()
    return s[:max_len] or "event"


def build_vcalendar(event: dict[str, Any]) -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{event['id']}@events-dashboard.local",
        f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
    ]

    start_date = event["start_date"]
    end_date = event.get("end_date")
    start_time = event.get("start_time")
    end_time = event.get("end_time")

    if start_time:
        lines.append(f"DTSTART:{_ymd_hms(start_date, start_time)}")
        if end_time:
            end_d = end_date or start_date
            lines.append(f"DTEND:{_ymd_hms(end_d, end_time)}")
    else:
        lines.append(f"DTSTART;VALUE=DATE:{_ymd(start_date)}")
        last_day = end_date or start_date
        last_dt = datetime.strptime(last_day, "%Y-%m-%d") + timedelta(days=1)
        lines.append(f"DTEND;VALUE=DATE:{last_dt.strftime('%Y%m%d')}")

    lines.append(f"SUMMARY:{_escape_text(event['title'])}")

    desc_parts: list[str] = []
    if event.get("description"):
        desc_parts.append(event["description"])
    if event.get("source"):
        desc_parts.append(f"Quelle: {event['source']}")
    if desc_parts:
        lines.append(f"DESCRIPTION:{_escape_text(chr(10).join(desc_parts))}")

    location_parts = [
        p for p in (event.get("venue"), event.get("address"), event.get("city"))
        if isinstance(p, str) and p
    ]
    if location_parts:
        lines.append(f"LOCATION:{_escape_text(', '.join(location_parts))}")

    if event.get("url"):
        lines.append(f"URL:{event['url']}")

    lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")

    return "\r\n".join(_fold(line) for line in lines) + "\r\n"


def filename_for(event: dict[str, Any]) -> str:
    parts = [event.get("start_date", ""), _slug(event.get("title", ""))]
    return "-".join(p for p in parts if p) + ".ics"
