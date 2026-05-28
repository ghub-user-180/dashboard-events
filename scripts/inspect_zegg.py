"""Listet alle ZEGG-Events: Datum, Stadt, Land, Titel."""

from __future__ import annotations

import sys

import requests
from bs4 import BeautifulSoup

URL = "https://www.zegg.de/de/veranstaltungen/programm"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


def main() -> int:
    resp = requests.get(URL, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    boxes = soup.select(".sd-event[data-start-date]")
    print(f"Boxes gefunden: {len(boxes)}\n")

    for i, box in enumerate(boxes, 1):
        start_el = box.select_one('time[itemprop="startDate"]')
        end_el = box.select_one('time[itemprop="endDate"]')
        start = start_el.get("datetime", "") if start_el else ""
        end = end_el.get("datetime", "") if end_el else ""
        title_el = box.select_one('h4[itemprop="name"]')
        title = title_el.get_text(" ", strip=True)[:50] if title_el else "?"
        city_el = box.select_one('[itemprop="addressLocality"]')
        country_el = box.select_one('[itemprop="addressCountry"]')
        city = city_el.get_text(strip=True) if city_el else ""
        country = country_el.get_text(strip=True) if country_el else ""
        venue_el = box.select_one('.sd-event-location [itemprop="name"]')
        venue = venue_el.get_text(strip=True) if venue_el else ""
        print(f"  {i:3}. [{start[:10]}→{end[:10]}] {city!r:18}/{country!r:6} {title!r}")
        if venue:
            print(f"        venue={venue!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
