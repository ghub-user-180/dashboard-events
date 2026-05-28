"""Listet alle kiosk-Events aus der Craft-CMS-GraphQL-API: Datum, Titel, Slug, Artists."""

from __future__ import annotations

import sys

import requests

API = "https://cms.kioskiosk.ch/api"
# Bearer-Token ist im öffentlichen Client-Bundle (_app/.../nodes/2.*.js) eingebettet.
TOKEN = "lMBm64C3WW2pUmX03VLGyNdGxDkrGtqm"

QUERY = """
query Events($eventDate: [QueryArgument]) {
  eventsEntries(eventDate: $eventDate) {
    ... on events_default_Entry {
      id
      slug
      title
      eventDate
      eventPrice
      eventTicketLink
      eventDescription
      eventArtists {
        ... on eventArtists_artist_BlockType { artistName }
      }
    }
  }
}
"""


def main() -> int:
    resp = requests.post(
        API,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"},
        json={"query": QUERY, "variables": {"eventDate": ">= 1970-01-01"}},
        timeout=20,
    )
    resp.raise_for_status()
    entries = (resp.json().get("data") or {}).get("eventsEntries") or []
    print(f"Events gefunden: {len(entries)}\n")

    for i, e in enumerate(entries, 1):
        title = (e.get("title") or "?")[:50]
        date = (e.get("eventDate") or "")[:16]
        slug = e.get("slug") or ""
        artists = ", ".join(a.get("artistName", "") for a in (e.get("eventArtists") or []))[:40]
        price = e.get("eventPrice")
        ticket = "🎟" if e.get("eventTicketLink") else " "
        desc = "📝" if e.get("eventDescription") else " "
        print(f"  {i:3}. [{date}] {ticket}{desc} {title!r}")
        print(f"        slug={slug!r}  price={price!r}  artists={artists!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
