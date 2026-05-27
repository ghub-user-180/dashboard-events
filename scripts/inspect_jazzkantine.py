"""Einmal-Diagnose: zeigt rohen HTML-Inhalt einer Jazzkantine-Event-Box."""

from __future__ import annotations

import sys

import requests
from bs4 import BeautifulSoup

URL = "https://www.jazzkantine.com/veranstaltungen"
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
    boxes = soup.select(".eventlist-event--upcoming")
    print(f"Boxes gefunden: {len(boxes)}")
    if not boxes:
        return 1

    box = boxes[0]
    raw = str(box)
    print("\n--- erste Box, rohes HTML (gekürzt auf 4000 Zeichen):")
    print(raw[:4000])

    print("\n--- erste Box, Text-Inhalt (Whitespace zusammengezogen):")
    text = " ".join(box.get_text(" ", strip=True).split())
    print(text[:600])

    print("\n--- alle Elemente mit class, die 'event' oder 'excerpt' oder 'desc' enthält:")
    for el in box.find_all(class_=True):
        classes = el.get("class") or []
        if any("event" in c.lower() or "excerpt" in c.lower() or "desc" in c.lower() for c in classes):
            snippet = " ".join(el.get_text(" ", strip=True).split())[:120]
            print(f"  <{el.name} class={classes}> -> {snippet!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
