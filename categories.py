"""Event-Kategorien. Single Source of Truth."""

from __future__ import annotations

CATEGORIES: list[dict[str, str]] = [
    {"id": "buehne-konzerte",    "label": "Bühne & Konzerte",     "short": "Bühne",     "description": "Theater, Chor, Impro & Konzertabende"},
    {"id": "tanz-bewegung",      "label": "Tanz & Bewegung",      "short": "Tanz",      "description": "Salsa, Forró, Ecstatic, Contact, Yoga, Qi Gong & Körperpraxis"},
    {"id": "kennenlernen",       "label": "Kennenlernen",         "short": "Leute",     "description": "Speed-Dating, Barhopping, Dinner & Mixer"},
    {"id": "sport",              "label": "Sport",                "short": "Sport",     "description": "Berg, Velo, Wassersport & Outdoor"},
    {"id": "konferenzen",        "label": "Konferenzen",          "short": "Konferenz", "description": "Bitcoin, FIRE, Nomad & Libertäres"},
    {"id": "festivals",          "label": "Festivals",            "short": "Festival",  "description": "Mehrtages-Musik & -Kultur"},
    {"id": "retreats-austausch", "label": "Retreats & Austausch", "short": "Retreat",   "description": "Bewusstseinsarbeit, Workcamps & Sprachreisen"},
]

CATEGORY_IDS: set[str] = {c["id"] for c in CATEGORIES}
CATEGORY_LABELS: dict[str, str] = {c["id"]: c["label"] for c in CATEGORIES}
