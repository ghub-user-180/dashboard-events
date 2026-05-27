"""Listet alle VBG-Events: cal-label, data-place, Titel."""

from __future__ import annotations

import sys

import requests
from bs4 import BeautifulSoup

URL = "https://www.vbg.net/agenda"
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
    boxes = soup.select(".kItem")
    print(f"Boxes gefunden: {len(boxes)}\n")

    for i, box in enumerate(boxes, 1):
        label = box.get("data-cal-label", "") or ""
        place = box.get("data-place", "") or ""
        title_el = box.select_one(".title")
        title = title_el.get_text(" ", strip=True)[:60] if title_el else "?"
        print(f"  {i:3}. [{label[:20]:20}] place={place!r:50} title={title!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
