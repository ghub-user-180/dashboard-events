"""Geteilte Helpers für Scraper."""

from __future__ import annotations

import hashlib
import re

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}

PLZ_RE = re.compile(r"^\d{4,5}\s+")
WEEKDAYS_RE = re.compile(
    r"^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|"
    r"monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    re.IGNORECASE,
)
SWISS_CANTON_RE = re.compile(
    r"\s+(ZH|BE|LU|UR|SZ|OW|NW|GL|ZG|FR|SO|BS|BL|SH|AR|AI|SG|GR|AG|TG|TI|VD|VS|NE|GE|JU)$"
)
COMPANY_SUFFIX_RE = re.compile(
    r"\s+(Sagl|Sàrl|Sarl|GmbH|AG|Ltd|LLC|Inc\.?|S\.A\.|SA|S\.r\.l\.|e\.V\.)$",
    re.IGNORECASE,
)
VENUE_KEYWORDS_RE = re.compile(
    r"(saal|halle|haus|kirche|schule|bar|restaurant|centre|center|klub|club|"
    r"theater|bühne|kulturhof|zentrum|casa|hotel|hostel|villa|residence|resort|"
    r"stadium|arena|akademie|academy|camp|lager|kloster|werk|hof)\b",
    re.IGNORECASE,
)


def url_hash(url: str, length: int = 12) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:length]


def sanitize_city(raw: str | None) -> str | None:
    """Bereinigt einen Segmentstring zu einem reinen Stadtnamen oder None."""
    if not isinstance(raw, str):
        return None
    s = raw.strip()
    if not s:
        return None
    if "," in s:
        s = s.split(",", 1)[0].strip()
    s = PLZ_RE.sub("", s).strip()
    s = COMPANY_SUFFIX_RE.sub("", s).strip()
    s = SWISS_CANTON_RE.sub("", s).strip()
    if WEEKDAYS_RE.search(s):
        return None
    if any(ch.isdigit() for ch in s):
        return None
    if VENUE_KEYWORDS_RE.search(s):
        return None
    if len(s) > 30:
        return None
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) < 2:
        return None
    return s


def extract_venue_and_city(location: str | None) -> tuple[str | None, str | None]:
    """Aus einem freien Ort-String venue + city extrahieren.

    Strategie: an Komma/Slash splitten. Erstes Segment, das sanitize_city
    passiert, ist die city. Die übrigen Segmente werden als venue zusammengefügt.
    """
    if not isinstance(location, str) or not location.strip():
        return None, None
    segments = [seg.strip() for seg in re.split(r"[,/]", location) if seg.strip()]
    city: str | None = None
    venue_parts: list[str] = []
    for seg in segments:
        sanitized = sanitize_city(seg)
        if sanitized and not city:
            city = sanitized
        else:
            venue_parts.append(seg)
    if not city:
        return None, None
    venue = ", ".join(venue_parts) if venue_parts else None
    return venue, city


def extract_city(location: str | None) -> str | None:
    """Convenience-Wrapper für Callsites, die nur die city brauchen."""
    return extract_venue_and_city(location)[1]
