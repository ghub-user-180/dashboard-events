from __future__ import annotations

import html as html_lib
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from geo import normalize_country  # noqa: E402

from ._utils import url_hash

# kiosk (SvelteKit-Frontend) bezieht die Events aus einer Craft-CMS-GraphQL-API.
# Der Bearer-Token ist im öffentlichen Client-Bundle eingebettet (kein Secret).
API = "https://cms.kioskiosk.ch/api"
TOKEN = "lMBm64C3WW2pUmX03VLGyNdGxDkrGtqm"
# Das Frontend hat keine Event-Detailseiten — alle Events stehen auf der Startseite.
HOME = "https://www.kioskiosk.ch/"

SOURCE_ID = "kioskiosk"
SOURCE_NAME = "kiosk – Programm Luzern"
CATEGORY = "buehne-konzerte"

# kiosk ist ein fester Club in Luzern — Venue/Stadt/Land sind konstant.
VENUE = "Kiosk Klub"
CITY = "Luzern"

QUERY = """
query Events($eventDate: [QueryArgument]) {
  eventsEntries(eventDate: $eventDate) {
    ... on events_default_Entry {
      slug
      title
      eventDate
      eventTicketLink
      eventDescription
      eventArtists {
        ... on eventArtists_artist_BlockType { artistName }
      }
    }
  }
}
"""

HTML_TAG_RE = re.compile(r"<[^>]+>")


def _clean_text(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    cleaned = html_lib.unescape(HTML_TAG_RE.sub(" ", raw))
    cleaned = cleaned.replace("\xa0", " ")
    cleaned = " ".join(cleaned.split())
    return cleaned or None


def _description(entry: dict[str, Any]) -> str | None:
    desc = _clean_text(entry.get("eventDescription"))
    if not desc:
        artists = [
            a.get("artistName")
            for a in (entry.get("eventArtists") or [])
            if isinstance(a, dict) and isinstance(a.get("artistName"), str)
        ]
        artists = [a for a in artists if a and a.lower() != "tba"]
        desc = ", ".join(artists) if artists else None
    if not desc:
        return None
    return desc if len(desc) <= 200 else desc[:197] + "…"


def fetch_events() -> list[dict[str, Any]]:
    # API-seitiger Upcoming-Filter (wie das Frontend selbst): kiosk-Events sind
    # eintägig (kein end_date), daher deckungsgleich mit dem Server-Past-Filter.
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    response = requests.post(
        API,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"},
        json={"query": QUERY, "variables": {"eventDate": f">= {today}"}},
        timeout=20,
    )
    response.raise_for_status()
    entries = (response.json().get("data") or {}).get("eventsEntries") or []

    events: list[dict[str, Any]] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        title = _clean_text(entry.get("title"))
        date_raw = entry.get("eventDate")
        slug = entry.get("slug")
        if not title or not isinstance(date_raw, str) or len(date_raw) < 10:
            continue

        start_date = date_raw[:10]
        start_time = date_raw[11:16] if len(date_raw) >= 16 and date_raw[11:16] != "00:00" else None

        # url: externer Ticket-Link wenn vorhanden, sonst die Startseite (listet alle Events).
        ticket = entry.get("eventTicketLink")
        url = ticket if isinstance(ticket, str) and ticket.startswith("http") else HOME

        # slug ist eine stabile native ID — eindeutig auch wenn mehrere Events auf HOME zeigen.
        native = slug if isinstance(slug, str) and slug else url_hash(f"{title}-{start_date}")

        events.append({
            "id": f"{SOURCE_ID}-{native}",
            "source": SOURCE_ID,
            "title": title,
            "description": _description(entry),
            "start_date": start_date,
            "end_date": None,
            "start_time": start_time,
            "end_time": None,
            "category": CATEGORY,
            "venue": VENUE,
            "address": None,
            "city": CITY,
            "country": normalize_country("CH"),
            "url": url,
        })
    return events
