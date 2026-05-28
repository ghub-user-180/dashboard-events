"""Listet die larpcal.com-Events aus der JSON-API.

larpcal.com ist eine React/Vite-SPA; die Daten kommen aus einer öffentlichen
REST-API auf Render (`/events`), die einen `Origin`-Header verlangt (CORS).
Response: {"larps": [{id, title, start, end, city, country, eventUrl, …}]}.
"""

from __future__ import annotations

import sys

import requests

API = "https://larpcal-tki9.onrender.com/events"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Origin": "https://larpcal.com",
    "Referer": "https://larpcal.com/",
}


def main() -> int:
    resp = requests.get(API, headers=HEADERS, timeout=40)
    resp.raise_for_status()
    larps = resp.json().get("larps") or []
    pub = [l for l in larps if l.get("isPublished")]
    print(f"larps total: {len(larps)} | published: {len(pub)}\n")

    for l in pub[:60]:
        start = (l.get("start") or "")[:10]
        end = (l.get("end") or "")[:10]
        print(
            f"  [{l.get('id')}] {start}→{end} | "
            f"city={l.get('city')!r} country={l.get('country')!r} "
            f"allDay={l.get('allDay')} eventUrl={l.get('eventUrl')!r}"
        )
        print(f"      {(l.get('title') or '')[:65]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
