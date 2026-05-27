"""Einmal-Diagnose: zeigt den rohen HTML-Inhalt einer Schüür-Event-Box."""

from __future__ import annotations

import sys

import requests
from bs4 import BeautifulSoup

URL = "https://www.schuur.ch/programm"
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
    boxes = soup.select(".viz-event-list-box")
    print(f"Boxes gefunden: {len(boxes)}")
    if not boxes:
        return 1

    box = boxes[0]
    raw = str(box)
    print("\n--- erste Box, rohes HTML (gekürzt auf 3000 Zeichen):")
    print(raw[:3000])

    print("\n--- erste Box, Text-Inhalt (Whitespace zusammengezogen):")
    text = " ".join(box.get_text(" ", strip=True).split())
    print(text)

    print("\n--- alle direkten Kind-Elemente der Box:")
    for child in box.find_all(recursive=False):
        snippet = " ".join(child.get_text(" ", strip=True).split())[:120]
        print(f"  <{child.name} class={child.get('class')}> -> {snippet!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
