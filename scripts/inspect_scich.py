"""Listet die Schweizer SCI-Workcamps: Titel, Datum-Range, Ort, Projekt-Link.

Die Schweiz-Camps stehen inline in Divi-Textblöcken: <h6> Titel, gefolgt von
einem <p> mit 'Datum: … Ort: … Alter: …' und einem <p> mit dem Projekt-Link.
Internationale Camps nutzen dieses Inline-Format nicht — daher sind alle
'Datum:'-Einträge der Seite Schweizer Camps.
"""

from __future__ import annotations

import re
import sys

import requests
from bs4 import BeautifulSoup

URL = "https://scich.org/aktuelle-freiwilligeneinsaetze/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}
PROJ_RE = re.compile(r"volunteer\.sci\.ngo/projects/\d+")
DATUM_ORT_RE = re.compile(r"Datum:\s*(.*?)\s*Ort:\s*(.*?)(?:\s*Alter:|$)", re.S)


def main() -> int:
    resp = requests.get(URL, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    records = []
    cur = None
    for el in soup.find_all(["h6", "p"]):
        if el.name == "h6":
            t = el.get_text(" ", strip=True)
            if t:
                cur = {"title": t, "datum": None, "ort": None, "url": None}
                records.append(cur)
        else:  # p
            if cur is None:
                continue
            txt = el.get_text(" ", strip=True)
            m = DATUM_ORT_RE.search(txt)
            if m and cur["datum"] is None:
                cur["datum"] = m.group(1).strip()
                cur["ort"] = m.group(2).strip()
            a = el.find("a", href=PROJ_RE)
            if a and not cur["url"]:
                cur["url"] = a["href"]

    entries = [r for r in records if r["datum"]]
    print(f"Einträge mit Datum: {len(entries)}\n")
    for i, r in enumerate(entries, 1):
        print(f"  {i}. {r['title']}")
        print(f"     Datum: {r['datum']!r}")
        print(f"     Ort:   {r['ort']!r}")
        print(f"     Link:  {r['url']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
