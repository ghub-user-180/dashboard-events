"""Validation für Events, die ein Scraper liefert.

Ungültige Events werden verworfen (nicht in events.json geschrieben) und im
Quellen-Report gezählt. Ziel: Müll-Output eines Scrapers darf nie das Dashboard
kippen.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from categories import CATEGORY_IDS

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")
ISO_2_RE = re.compile(r"^[A-Z]{2}$")

REQUIRED_FIELDS = (
    "id", "source", "title", "start_date", "category",
    "country", "url",
)


def _is_iso_date(value: Any) -> bool:
    if not isinstance(value, str) or not DATE_RE.match(value):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def _is_iso_time(value: Any) -> bool:
    if not isinstance(value, str) or not TIME_RE.match(value):
        return False
    try:
        datetime.strptime(value, "%H:%M")
        return True
    except ValueError:
        return False


def validate_event(event: Any) -> list[str]:
    """Returns Liste von Fehlern; leere Liste = gültig."""
    if not isinstance(event, dict):
        return [f"kein dict: {type(event).__name__}"]

    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        value = event.get(field)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"fehlt oder leer: {field}")

    start_date = event.get("start_date")
    if isinstance(start_date, str) and not _is_iso_date(start_date):
        errors.append(f"start_date kein gültiges YYYY-MM-DD: {start_date!r}")

    end_date = event.get("end_date")
    if end_date is not None and not _is_iso_date(end_date):
        errors.append(f"end_date kein gültiges YYYY-MM-DD oder null: {end_date!r}")

    for time_field in ("start_time", "end_time"):
        value = event.get(time_field)
        if value is not None and not _is_iso_time(value):
            errors.append(f"{time_field} kein gültiges HH:MM oder null: {value!r}")

    category = event.get("category")
    if isinstance(category, str) and category and category not in CATEGORY_IDS:
        errors.append(f"category nicht im Katalog: {category!r}")

    country = event.get("country")
    if isinstance(country, str) and country and not ISO_2_RE.match(country):
        errors.append(f"country muss ISO-2 sein (z.B. CH): {country!r}")

    return errors
