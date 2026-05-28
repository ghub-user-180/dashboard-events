"""Zeigt, was die sensualityfestival.com-Startseite an Event-Daten hergibt.

Jahres-Quelle: ein Festival/Jahr, Termin nur als Fliesstext, kein Event-Markup,
kein Stadtname (nur Land CZ). Listet den Datums-Treffer + Titel.
"""

from __future__ import annotations

import re
import sys

import requests
from bs4 import BeautifulSoup

URL = "https://www.sensualityfestival.com/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}
DATE_RE = re.compile(r"\d{1,2}\s*[-–—]\s*\d{1,2}(?:\s+[A-Za-z]+)?\s+[A-Za-z]+,?\s+\d{4}")


def main() -> int:
    resp = requests.get(URL, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(" ", strip=True)

    print("Titel:", soup.title.get_text(strip=True) if soup.title else "?")
    matches = DATE_RE.findall(text)
    print(f"Datums-Treffer ({len(matches)}):")
    for m in matches[:5]:
        print(f"  - {m!r}")
    if not matches:
        print("  (kein Termin im Text — evtl. zwischen den Ausgaben)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
