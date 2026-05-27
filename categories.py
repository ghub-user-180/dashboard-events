"""Event-Kategorien. Single Source of Truth."""

from __future__ import annotations

CATEGORIES: list[dict[str, str]] = [
    {
        "id": "buehne-konzerte",
        "label": "Bühne & Konzerte",
        "description": "Theater, Chor, Impro & Konzertabende",
    },
    {
        "id": "tanz-bewegung",
        "label": "Tanz & Bewegung",
        "description": "Salsa, Forró, Ecstatic, Contact, Yoga, Qi Gong & Körperpraxis",
    },
    {
        "id": "kennenlernen",
        "label": "Kennenlernen",
        "description": "Speed-Dating, Barhopping, Dinner & Mixer",
    },
    {
        "id": "sport",
        "label": "Sport",
        "description": "Berg, Velo, Wassersport & Outdoor",
    },
    {
        "id": "konferenzen",
        "label": "Konferenzen",
        "description": "Bitcoin, FIRE, Nomad & Libertäres",
    },
    {
        "id": "festivals",
        "label": "Festivals",
        "description": "Mehrtages-Musik & -Kultur",
    },
    {
        "id": "retreats-austausch",
        "label": "Retreats & Austausch",
        "description": "Bewusstseinsarbeit, Workcamps & Sprachreisen",
    },
]

CATEGORY_IDS: set[str] = {c["id"] for c in CATEGORIES}
CATEGORY_LABELS: dict[str, str] = {c["id"]: c["label"] for c in CATEGORIES}
