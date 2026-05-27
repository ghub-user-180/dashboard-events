from __future__ import annotations

import json
import os
import threading
import webbrowser
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, render_template, request

import scrapers
from categories import CATEGORIES
from event_schema import validate_event
from geo import continent_for, country_name_for

ROOT = Path(__file__).parent
DATA_FILE = ROOT / "data" / "events.json"
SOURCES_FILE = ROOT / "data" / "sources.json"
STATES_FILE = ROOT / "data" / "event_states.json"
HOST = "127.0.0.1"
PORT = 5050

KURZ_MAX_HOURS = 3.5
SOURCE_HEALTH_WARN_DAYS = 7
VALID_STATES = {"interessiert", "ignoriert"}

app = Flask(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _today_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _duration_type(
    start_date: str | None,
    end_date: str | None,
    start_time: str | None,
    end_time: str | None,
) -> str | None:
    if not start_date:
        return None

    delta_hours: float | None = None
    if start_time and end_time:
        try:
            start_dt = datetime.fromisoformat(f"{start_date}T{start_time}:00")
            end_iso_date = end_date or start_date
            end_dt = datetime.fromisoformat(f"{end_iso_date}T{end_time}:00")
            delta_hours = (end_dt - start_dt).total_seconds() / 3600
            if delta_hours < 0:
                delta_hours += 24
        except ValueError:
            pass

    if end_date and end_date != start_date:
        if delta_hours is not None and delta_hours < 24:
            return _classify_single_day(start_time, delta_hours)
        return "mehrtaegig"

    return _classify_single_day(start_time, delta_hours)


def _classify_single_day(start_time: str | None, delta_hours: float | None) -> str:
    """Single-Day-Klassifikation: Abendveranstaltungen sind grundsätzlich «kurz»,
    egal wie viele Stunden — sie blockieren nur den Abend, nicht den Tag."""
    if not start_time:
        return "eintaegig"
    try:
        hour = int(start_time.split(":")[0])
    except (ValueError, IndexError):
        return "eintaegig"
    if hour >= 18 or hour < 6:
        return "kurz"
    if delta_hours is not None:
        return "kurz" if 0 < delta_hours <= KURZ_MAX_HOURS else "eintaegig"
    return "eintaegig"


def _annotate(event: dict[str, Any]) -> None:
    event["continent"] = continent_for(event.get("country"))
    event["country_label"] = country_name_for(event.get("country"))
    event["duration_type"] = _duration_type(
        event.get("start_date"),
        event.get("end_date"),
        event.get("start_time"),
        event.get("end_time"),
    )
    if event["duration_type"] == "mehrtaegig":
        event["start_time"] = None
        event["end_time"] = None


def _is_current_or_future(event: dict[str, Any], today: str) -> bool:
    end = event.get("end_date") or event.get("start_date")
    if not end:
        return True
    return end >= today


def _read_cache_raw() -> dict[str, Any]:
    if not DATA_FILE.exists():
        return {"events": [], "scraped_at": None, "sources": []}
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def _write_cache(payload: dict[str, Any]) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    DATA_FILE.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _read_states() -> dict[str, str]:
    if not STATES_FILE.exists():
        return {}
    return json.loads(STATES_FILE.read_text(encoding="utf-8"))


def _write_states(states: dict[str, str]) -> None:
    STATES_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATES_FILE.write_text(
        json.dumps(states, indent=2, ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )


def _health_warnings(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    warnings: list[dict[str, Any]] = []
    for src in sources:
        last_str = src.get("last_success")
        if not isinstance(last_str, str) or not last_str:
            continue
        try:
            last_dt = datetime.fromisoformat(last_str)
        except ValueError:
            continue
        delta_days = (now - last_dt).total_seconds() / 86400
        if delta_days > SOURCE_HEALTH_WARN_DAYS:
            warnings.append({
                "id": src.get("id"),
                "category": src.get("category"),
                "days": int(delta_days),
            })
    return warnings


def _sources_overview() -> dict[str, int]:
    if not SOURCES_FILE.exists():
        return {"active": 0, "pending": 0, "draft": 0, "no_event_relevance": 0, "total": 0}
    sources = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    counter = Counter(s.get("status") for s in sources)
    return {
        "active": counter.get("active", 0),
        "pending": counter.get("pending", 0),
        "draft": counter.get("draft", 0),
        "no_event_relevance": counter.get("no-event-relevance", 0),
        "total": len(sources),
    }


def _serve(payload: dict[str, Any]) -> dict[str, Any]:
    today = _today_iso()
    events = [e for e in payload.get("events", []) if _is_current_or_future(e, today)]
    return {
        "events": events,
        "scraped_at": payload.get("scraped_at"),
        "sources": payload.get("sources", []),
        "categories": CATEGORIES,
        "sources_overview": _sources_overview(),
        "states": _read_states(),
        "health_warnings": _health_warnings(payload.get("sources", [])),
    }


def _run_all_scrapers() -> dict[str, Any]:
    prev = _read_cache_raw()
    prev_events_by_source: dict[str, list] = {}
    for event in prev.get("events", []):
        prev_events_by_source.setdefault(event.get("source"), []).append(event)
    prev_sources_by_id: dict[str, dict] = {
        s["id"]: s for s in prev.get("sources", [])
    }

    all_events: list[dict[str, Any]] = []
    source_reports: list[dict[str, Any]] = []
    now = _now_iso()

    for module in scrapers.SCRAPERS:
        source_id = getattr(module, "SOURCE_ID", module.__name__)
        category = getattr(module, "CATEGORY", None)
        prev_source = prev_sources_by_id.get(source_id, {})

        try:
            raw_events = module.fetch_events()
        except Exception as exc:
            kept = prev_events_by_source.get(source_id, [])
            all_events.extend(kept)
            source_reports.append({
                "id": source_id,
                "category": category,
                "ok": False,
                "stale": True,
                "count": len(kept),
                "rejected": 0,
                "rejection_samples": [],
                "last_success": prev_source.get("last_success"),
                "error": f"{type(exc).__name__}: {exc}",
            })
            continue

        valid_events: list[dict[str, Any]] = []
        rejection_samples: list[dict[str, Any]] = []
        rejected = 0
        for event in raw_events:
            errors = validate_event(event)
            if errors:
                rejected += 1
                if len(rejection_samples) < 3:
                    rejection_samples.append({
                        "id_or_title": (event.get("id") if isinstance(event, dict) else None)
                            or (event.get("title")[:60] if isinstance(event, dict) and isinstance(event.get("title"), str) else "?"),
                        "errors": errors,
                    })
                continue
            valid_events.append(event)

        if not valid_events:
            kept = prev_events_by_source.get(source_id, [])
            all_events.extend(kept)
            source_reports.append({
                "id": source_id,
                "category": category,
                "ok": rejected == 0,
                "stale": True,
                "count": len(kept),
                "rejected": rejected,
                "rejection_samples": rejection_samples,
                "last_success": prev_source.get("last_success"),
                "error": (f"Alle {rejected} Events ungültig — letzten Stand behalten" if rejected else
                          ("Leeres Resultat — letzten Stand behalten" if kept else "Leeres Resultat")),
            })
            continue

        all_events.extend(valid_events)
        source_reports.append({
            "id": source_id,
            "category": category,
            "ok": True,
            "stale": False,
            "count": len(valid_events),
            "rejected": rejected,
            "rejection_samples": rejection_samples,
            "last_success": now,
            "error": None,
        })

    for event in all_events:
        _annotate(event)

    all_events.sort(key=lambda e: (e.get("start_date") or "9999", e.get("start_time") or ""))

    payload = {
        "events": all_events,
        "scraped_at": now,
        "sources": source_reports,
    }
    _write_cache(payload)
    return payload


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/events")
def api_events():
    return jsonify(_serve(_read_cache_raw()))


@app.post("/api/refresh")
def api_refresh():
    return jsonify(_serve(_run_all_scrapers()))


@app.post("/api/state")
def api_state():
    body = request.get_json(silent=True) or {}
    event_id = body.get("id")
    state = body.get("state")
    if not isinstance(event_id, str) or not event_id:
        return jsonify({"error": "id required"}), 400
    if state is not None and state not in VALID_STATES:
        return jsonify({"error": f"state must be one of {sorted(VALID_STATES)} or null"}), 400

    states = _read_states()
    if state is None:
        states.pop(event_id, None)
    else:
        states[event_id] = state
    _write_states(states)
    return jsonify({"id": event_id, "state": state})


def _open_browser() -> None:
    webbrowser.open(f"http://{HOST}:{PORT}")


if __name__ == "__main__":
    if not os.environ.get("WERKZEUG_RUN_MAIN"):
        threading.Timer(1.2, _open_browser).start()
    app.run(host=HOST, port=PORT, debug=True)
