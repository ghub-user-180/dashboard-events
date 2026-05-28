const STATUS = document.getElementById("status");
const REFRESH_BTN = document.getElementById("refresh");
const TBODY = document.getElementById("events-body");
const EMPTY = document.getElementById("empty");
const SOURCES_BLOCK = document.getElementById("sources");
const SOURCES_OVERVIEW = document.getElementById("sources-overview");
const SOURCES_LIST = document.getElementById("sources-list");
const HEALTH_BANNER = document.getElementById("health-banner");

const STALE_AFTER_MS = 60 * 60 * 1000;

let SHOW_IGNORED = false;
let SHOW_FAVORITES = false;
let STATES = {};
let CURRENT_PAYLOAD = null;
let SORT = { col: "start_date", dir: "asc" };
let PRESETS = [];
const FILTERS = { date: [], category: [], duration: [], source: [], city: [], country: [], continent: [] };
const PRESET_FILTER_KEYS = ["date", "category", "duration", "source", "city", "country", "continent"];

const DATE_OPTIONS = [
  { value: "all", label: "Alle" },
  { value: "today", label: "Heute" },
  { value: "tomorrow", label: "Morgen" },
  { value: "this-week", label: "Diese Woche" },
  { value: "next-week", label: "Nächste Woche" },
  { value: "next-7-days", label: "Nächste 7 Tage" },
  { value: "next-14-days", label: "Nächste 14 Tage" },
  { value: "next-3-months", label: "Nächste 3 Monate" },
  { value: "this-year", label: "Dieses Jahr" },
  { value: "next-year", label: "Nächstes Jahr" },
];

const DURATION_OPTIONS = [
  { value: "all", label: "Alle" },
  { value: "kurz", label: "Kurz (< 3.5h)" },
  { value: "eintaegig", label: "Eintägig" },
  { value: "mehrtaegig", label: "Mehrtägig" },
];

function dateRange(filter) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfWeek = (d) => { const x = new Date(d); const wd = x.getDay() || 7; x.setDate(x.getDate() - wd + 1); return x; };

  switch (filter) {
    case "today":          return [fmt(today), fmt(today)];
    case "tomorrow":       { const t = addDays(today, 1); return [fmt(t), fmt(t)]; }
    case "this-week":      { const s = startOfWeek(today); return [fmt(s), fmt(addDays(s, 6))]; }
    case "next-week":      { const s = addDays(startOfWeek(today), 7); return [fmt(s), fmt(addDays(s, 6))]; }
    case "next-7-days":    return [fmt(today), fmt(addDays(today, 7))];
    case "next-14-days":   return [fmt(today), fmt(addDays(today, 14))];
    case "next-3-months":  return [fmt(today), fmt(addDays(today, 90))];
    case "this-year":      return [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`];
    case "next-year":      return [`${today.getFullYear() + 1}-01-01`, `${today.getFullYear() + 1}-12-31`];
    default:               return null;
  }
}

function eventMatchesFilters(e, exclude) {
  const fieldFor = (k) => k === "duration" ? e.duration_type : e[k];
  for (const key of ["category", "duration", "source", "city", "country", "continent"]) {
    if (key === exclude || FILTERS[key].length === 0) continue;
    if (!FILTERS[key].includes(fieldFor(key))) return false;
  }
  if (exclude !== "date" && FILTERS.date.length > 0) {
    const es = e.start_date || "";
    const matchesAny = FILTERS.date.some((d) => {
      const range = dateRange(d);
      if (!range) return true;
      return es >= range[0] && es <= range[1];
    });
    if (!matchesAny) return false;
  }
  return true;
}

function eventInOption(e, key, value) {
  if (value === "all") return true;
  if (key === "category") return e.category === value;
  if (key === "duration") return e.duration_type === value;
  if (key === "source") return e.source === value;
  if (key === "city") return e.city === value;
  if (key === "country") return e.country === value;
  if (key === "continent") return e.continent === value;
  if (key === "date") {
    const range = dateRange(value);
    if (!range) return true;
    const es = e.start_date || "";
    return es >= range[0] && es <= range[1];
  }
  return false;
}

function countForOption(key, value) {
  let n = 0;
  for (const e of CURRENT_PAYLOAD?.events || []) {
    if (!eventMatchesFilters(e, key)) continue;
    if (eventInOption(e, key, value)) n++;
  }
  return n;
}

function currentFilterSignature() {
  const f = {};
  for (const k of PRESET_FILTER_KEYS) f[k] = FILTERS[k].slice().sort();
  return JSON.stringify({
    filters: f,
    toggles: { favorites: SHOW_FAVORITES, ignored: SHOW_IGNORED },
  });
}

function presetSignature(preset) {
  const f = {};
  for (const k of PRESET_FILTER_KEYS) f[k] = (preset.filters?.[k] || []).slice().sort();
  return JSON.stringify({
    filters: f,
    toggles: {
      favorites: !!preset.toggles?.favorites,
      ignored: !!preset.toggles?.ignored,
    },
  });
}

function anyFilterActive() {
  return Object.values(FILTERS).some((v) => v.length > 0) || SHOW_FAVORITES || SHOW_IGNORED;
}

function applyPreset(preset) {
  for (const k of PRESET_FILTER_KEYS) FILTERS[k] = (preset.filters?.[k] || []).slice();
  SHOW_FAVORITES = !!preset.toggles?.favorites;
  SHOW_IGNORED = !!preset.toggles?.ignored;
  if (CURRENT_PAYLOAD) render(CURRENT_PAYLOAD);
}

async function savePreset() {
  const name = (window.prompt("Name für dieses Filter-Set:") || "").trim();
  if (!name) return;
  if (name.length > 50) { alert("Name max. 50 Zeichen."); return; }
  const filters = {};
  for (const k of PRESET_FILTER_KEYS) filters[k] = FILTERS[k].slice();
  const body = {
    filters,
    toggles: { favorites: SHOW_FAVORITES, ignored: SHOW_IGNORED },
  };
  const res = await fetch(`/api/filter-presets/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { alert("Speichern fehlgeschlagen."); return; }
  const saved = await res.json();
  PRESETS = [...PRESETS.filter((p) => p.name !== saved.name), saved]
    .sort((a, b) => a.name.localeCompare(b.name));
  renderPresetBar();
}

async function deletePreset(name) {
  if (!window.confirm(`Preset «${name}» löschen?`)) return;
  const res = await fetch(`/api/filter-presets/${encodeURIComponent(name)}`, { method: "DELETE" });
  if (!res.ok) { alert("Löschen fehlgeschlagen."); return; }
  PRESETS = PRESETS.filter((p) => p.name !== name);
  renderPresetBar();
}

function renderPresetBar() {
  const bar = document.getElementById("preset-bar");
  if (!bar) return;
  const hasPresets = PRESETS.length > 0;
  const canSave = anyFilterActive();
  if (!hasPresets && !canSave) { bar.hidden = true; bar.innerHTML = ""; return; }
  bar.hidden = false;
  const activeSig = currentFilterSignature();
  const pills = PRESETS.map((p) => {
    const isActive = presetSignature(p) === activeSig;
    return `<button type="button" class="preset-pill${isActive ? " preset-pill-active" : ""}" data-preset="${escapeHtml(p.name)}">`
      + `<span class="preset-pill-label">${escapeHtml(p.name)}</span>`
      + `<span class="preset-pill-del" data-del="${escapeHtml(p.name)}" title="Preset löschen" aria-label="Preset löschen">✕</span>`
      + `</button>`;
  }).join("");
  const saveBtn = canSave
    ? `<button type="button" class="preset-save">+ Aktuelle Filter speichern…</button>`
    : "";
  bar.innerHTML = pills + saveBtn;
}

function renderFilterBar() {
  const bar = document.getElementById("filter-bar");
  if (!bar || !CURRENT_PAYLOAD) return;
  const cats = CURRENT_PAYLOAD.categories || [];
  const catOptions = [{ value: "all", label: "Alle" }, ...cats.map((c) => ({ value: c.id, label: c.label }))];

  const countries = new Map();
  const continents = new Set();
  const cities = new Set();
  for (const e of (CURRENT_PAYLOAD.events || [])) {
    if (e.city && eventMatchesFilters(e, "city")) cities.add(e.city);
    if (e.country && e.country_label && eventMatchesFilters(e, "country")) countries.set(e.country, e.country_label);
    if (e.continent && eventMatchesFilters(e, "continent")) continents.add(e.continent);
  }
  const cityOptions = [
    { value: "all", label: "Alle" },
    ...[...cities].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c })),
  ];
  const countryOptions = [
    { value: "all", label: "Alle" },
    ...[...countries.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([v, l]) => ({ value: v, label: l })),
  ];
  const continentOptions = [
    { value: "all", label: "Alle" },
    ...[...continents].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c })),
  ];

  const sourceReports = CURRENT_PAYLOAD.sources || [];
  const sourceOptions = [
    { value: "all", label: "Alle" },
    ...sourceReports.map((s) => ({ value: s.id, label: s.id })).sort((a, b) => a.label.localeCompare(b.label)),
  ];

  const chips = [
    { key: "date",      icon: "🗓",  label: "Datum",     options: DATE_OPTIONS },
    { key: "category",  icon: "🏷",  label: "Kategorie", options: catOptions },
    { key: "duration",  icon: "⏱",  label: "Dauer",     options: DURATION_OPTIONS },
    { key: "source",    icon: "📡", label: "Quelle",    options: sourceOptions, searchable: true },
    { key: "city",      icon: "📍", label: "Stadt",     options: cityOptions },
    { key: "country",   icon: "🌍", label: "Land",      options: countryOptions },
    { key: "continent", icon: "🌐", label: "Kontinent", options: continentOptions },
  ];

  const anyActive = Object.values(FILTERS).some((v) => v.length > 0);
  const renderChip = (c) => {
    const sel = FILTERS[c.key];
    const isActive = sel.length > 0;
    let chipText;
    if (sel.length === 0) chipText = "Alle";
    else if (sel.length === 1) {
      const opt = c.options.find((o) => o.value === sel[0]);
      chipText = opt ? opt.label : sel[0];
    } else chipText = `${sel.length} ausgewählt`;

    const menu = c.options.map((o) => {
      const n = countForOption(c.key, o.value);
      const isSelected = o.value === "all" ? sel.length === 0 : sel.includes(o.value);
      const cls = [];
      if (isSelected) cls.push("active");
      if (n === 0 && o.value !== "all") cls.push("empty");
      const clsAttr = cls.length ? ` class="${cls.join(" ")}"` : "";
      const onlyBtn = o.value === "all"
        ? ""
        : ` <button type="button" class="opt-only" data-key="${c.key}" data-value="${escapeHtml(o.value)}">nur</button>`;
      return `<li data-key="${c.key}" data-value="${escapeHtml(o.value)}"${clsAttr}><span class="opt-label">${escapeHtml(o.label)}</span><span class="opt-count">${n}</span>${onlyBtn}</li>`;
    }).join("");
    const searchInput = c.searchable
      ? `<li class="filter-search-item"><input type="text" class="filter-search-input" data-key="${c.key}" placeholder="suchen …"></li>`
      : "";
    return `<div class="filter-chip${isActive ? " filter-chip-active" : ""}" data-key="${c.key}">
      <button type="button" class="filter-chip-btn"><span class="chip-icon">${c.icon}</span> ${escapeHtml(c.label)}: <strong>${escapeHtml(chipText)}</strong> <span class="chip-caret">▾</span></button>
      <ul class="filter-menu" hidden>${searchInput}${menu}</ul>
    </div>`;
  };

  const chipByKey = Object.fromEntries(chips.map((c) => [c.key, c]));
  const renderGroup = (keys) => `<div class="filter-group">${keys.map((k) => renderChip(chipByKey[k])).join("")}</div>`;

  const primaryHtml = renderGroup(["date"]);
  const secondaryGroups = [
    renderGroup(["category"]),
    renderGroup(["duration"]),
    renderGroup(["city", "country", "continent"]),
    renderGroup(["source"]),
  ].join("");

  const toggles = `<div class="filter-group">
    <button type="button" class="filter-chip-toggle${SHOW_FAVORITES ? " filter-chip-active" : ""}" data-toggle="favorites"><span class="chip-icon">★</span> Nur Favoriten</button>
    <button type="button" class="filter-chip-toggle${SHOW_IGNORED ? " filter-chip-active" : ""}" data-toggle="ignored"><span class="chip-icon">✕</span> Ignorierte</button>
  </div>`;
  const anyToggle = SHOW_FAVORITES || SHOW_IGNORED;
  const resetBtn = (anyActive || anyToggle) ? '<button type="button" class="filter-reset">Filter zurücksetzen</button>' : "";

  const secondaryActiveCount =
    chips.slice(1).reduce((sum, c) => sum + (FILTERS[c.key].length > 0 ? 1 : 0), 0) +
    (SHOW_FAVORITES ? 1 : 0) + (SHOW_IGNORED ? 1 : 0);
  const moreBadge = secondaryActiveCount > 0 ? ` <span class="filter-more-badge">${secondaryActiveCount}</span>` : "";
  const moreBtn = `<button type="button" class="filter-more" aria-expanded="false">Mehr Filter${moreBadge} <span class="chip-caret">▾</span></button>`;

  bar.innerHTML = primaryHtml + moreBtn + `<div class="filter-secondary">${secondaryGroups}${toggles}${resetBtn}</div>`;

  bar.querySelectorAll(".filter-search-input").forEach((input) => {
    input.addEventListener("input", () => {
      const term = input.value.trim().toLowerCase();
      const menu = input.closest(".filter-menu");
      menu.querySelectorAll("li[data-value]").forEach((li) => {
        if (li.dataset.value === "all") return;
        const label = li.querySelector(".opt-label")?.textContent.toLowerCase() || "";
        li.hidden = term !== "" && !label.includes(term);
      });
    });
  });
}

document.addEventListener("click", (event) => {
  if (event.target.closest(".filter-search-item")) return;
  const delPill = event.target.closest(".preset-pill-del");
  if (delPill) { event.stopPropagation(); deletePreset(delPill.dataset.del); return; }
  const presetPill = event.target.closest(".preset-pill");
  if (presetPill) {
    const name = presetPill.dataset.preset;
    const preset = PRESETS.find((p) => p.name === name);
    if (preset) applyPreset(preset);
    return;
  }
  if (event.target.closest(".preset-save")) { savePreset(); return; }
  const more = event.target.closest(".filter-more");
  if (more) {
    const bar = document.getElementById("filter-bar");
    if (bar) {
      const expanded = bar.classList.toggle("expanded");
      more.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
    return;
  }
  const reset = event.target.closest(".filter-reset");
  if (reset) {
    Object.keys(FILTERS).forEach((k) => { FILTERS[k] = []; });
    SHOW_FAVORITES = false;
    SHOW_IGNORED = false;
    if (CURRENT_PAYLOAD) render(CURRENT_PAYLOAD);
    return;
  }
  const toggle = event.target.closest(".filter-chip-toggle");
  if (toggle) {
    if (toggle.dataset.toggle === "favorites") SHOW_FAVORITES = !SHOW_FAVORITES;
    else if (toggle.dataset.toggle === "ignored") SHOW_IGNORED = !SHOW_IGNORED;
    if (CURRENT_PAYLOAD) render(CURRENT_PAYLOAD);
    return;
  }
  const onlyOpt = event.target.closest(".opt-only");
  if (onlyOpt) {
    const key = onlyOpt.dataset.key;
    FILTERS[key] = [onlyOpt.dataset.value];
    if (CURRENT_PAYLOAD) render(CURRENT_PAYLOAD);
    const reopen = document.querySelector(`.filter-chip[data-key="${key}"] .filter-menu`);
    if (reopen) reopen.hidden = false;
    return;
  }
  const item = event.target.closest(".filter-menu li[data-value]");
  if (item) {
    const key = item.dataset.key;
    const value = item.dataset.value;
    if (value === "all") {
      FILTERS[key] = [];
    } else {
      const i = FILTERS[key].indexOf(value);
      if (i >= 0) FILTERS[key].splice(i, 1);
      else FILTERS[key].push(value);
    }
    if (CURRENT_PAYLOAD) render(CURRENT_PAYLOAD);
    const reopen = document.querySelector(`.filter-chip[data-key="${key}"] .filter-menu`);
    if (reopen) reopen.hidden = false;
    return;
  }
  const btn = event.target.closest(".filter-chip-btn");
  if (btn) {
    const menu = btn.parentElement.querySelector(".filter-menu");
    document.querySelectorAll(".filter-menu").forEach((m) => { if (m !== menu) m.hidden = true; });
    menu.hidden = !menu.hidden;
    return;
  }
  document.querySelectorAll(".filter-menu").forEach((m) => (m.hidden = true));
});

function sortValue(e, col) {
  if (col === "state") {
    const s = STATES[e.id] || "";
    if (s === "interessiert") return "1";
    if (!s) return "2";
    return "3";
  }
  const v = e[col];
  if (v === null || v === undefined) return "";
  return String(v).toLowerCase();
}

function compareEvents(a, b) {
  const av = sortValue(a, SORT.col);
  const bv = sortValue(b, SORT.col);
  if (av === bv) return 0;
  if (av === "" && bv !== "") return 1;
  if (bv === "" && av !== "") return -1;
  const cmp = av < bv ? -1 : 1;
  return SORT.dir === "asc" ? cmp : -cmp;
}

function updateSortIndicators() {
  document.querySelectorAll("thead th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.col === SORT.col) {
      th.classList.add(SORT.dir === "asc" ? "sort-asc" : "sort-desc");
    }
  });
}
function stateIcon(state) {
  if (state === "interessiert") return "★";
  if (state === "ignoriert") return "✕";
  return "—";
}

function nextState(state) {
  if (!state) return "interessiert";
  if (state === "interessiert") return "ignoriert";
  return null;
}

async function postState(id, state) {
  await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, state }),
  });
}

function renderHealth(warnings) {
  if (!HEALTH_BANNER) return;
  if (!warnings || warnings.length === 0) {
    HEALTH_BANNER.hidden = true;
    return;
  }
  HEALTH_BANNER.hidden = false;
  const items = warnings.map((w) => `${w.id} (${w.days}d)`).join(", ");
  const n = warnings.length;
  HEALTH_BANNER.textContent = `⚠ ${n} ${n === 1 ? "Quelle" : "Quellen"} seit > 7 Tagen ohne Erfolg: ${items}`;
}

function applyVisibility() {
  const eventsById = new Map();
  for (const e of CURRENT_PAYLOAD?.events || []) eventsById.set(e.id, e);

  TBODY.querySelectorAll("tr").forEach((tr) => {
    const id = tr.dataset.id;
    const e = eventsById.get(id);
    const state = tr.dataset.state;

    if (SHOW_FAVORITES && state !== "interessiert") { tr.hidden = true; return; }
    if (!SHOW_FAVORITES && state === "ignoriert" && !SHOW_IGNORED) { tr.hidden = true; return; }
    if (e && !eventMatchesFilters(e)) { tr.hidden = true; return; }
    tr.hidden = false;
  });
}

function emptyDash(value) {
  return value ? escapeHtml(value) : '<span class="dash">—</span>';
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function formatTime(start, end) {
  if (!start && !end) return "";
  if (start && end) return `${start}–${end}`;
  return start || "";
}

function formatScrapedAt(iso) {
  if (!iso) return "noch nie aktualisiert";
  const date = new Date(iso);
  return `Stand: ${date.toLocaleString("de-CH")}`;
}

function formatOverview(o) {
  if (!o) return "";
  return `${o.active} aktiv · ${o.pending} pending · ${o.draft} manuell · ${o.no_event_relevance} verworfen · ${o.total} total`;
}

function renderSources(reports, _categoryLabels, overview) {
  if (SOURCES_OVERVIEW) SOURCES_OVERVIEW.textContent = formatOverview(overview);
  if (!reports) reports = [];
  const problems = reports.filter((s) => s.stale || (s.rejected || 0) > 0);
  SOURCES_BLOCK.hidden = !(overview || problems.length);
  SOURCES_LIST.innerHTML = "";
  if (problems.length === 0) {
    const li = document.createElement("li");
    li.className = "src-allgood";
    li.textContent = "Alle aktiven Quellen liefern sauber.";
    SOURCES_LIST.appendChild(li);
    return;
  }
  for (const s of problems) {
    const li = document.createElement("li");
    if (s.stale) li.classList.add("stale");
    let status;
    if (s.stale) {
      const since = s.last_success ? ` · zuletzt ${new Date(s.last_success).toLocaleString("de-CH")}` : "";
      const err = s.error ? ` (${escapeHtml(s.error)})` : "";
      status = `<span class="warn">${s.count} stale${err}${since}</span>`;
    } else {
      status = `<span class="ok">${s.count}</span>`;
    }
    const rejected = (s.rejected || 0) > 0
      ? ` · <span class="err" title="${escapeHtml((s.rejection_samples || []).map((r) => r.id_or_title + ": " + r.errors.join("; ")).join("\n"))}">${s.rejected} verworfen</span>`
      : "";
    li.innerHTML = `<span class="src-id">${escapeHtml(s.id)}</span> · ${status}${rejected}`;
    SOURCES_LIST.appendChild(li);
  }
}

function render(payload) {
  CURRENT_PAYLOAD = payload;
  STATES = payload.states || {};
  const categoryLabels = Object.fromEntries(
    (payload.categories || []).map((c) => [c.id, c.label])
  );
  const categoryShorts = Object.fromEntries(
    (payload.categories || []).map((c) => [c.id, c.short || c.label])
  );
  const events = (payload.events || []).slice().sort(compareEvents);
  TBODY.innerHTML = "";
  EMPTY.hidden = events.length > 0;
  for (const e of events) {
    const tr = document.createElement("tr");
    const state = STATES[e.id] || "";
    tr.dataset.state = state;
    tr.dataset.source = e.source || "";
    tr.dataset.id = e.id || "";
    let hidden = false;
    if (SHOW_FAVORITES) hidden = state !== "interessiert";
    else if (state === "ignoriert" && !SHOW_IGNORED) hidden = true;
    if (!hidden && !eventMatchesFilters(e)) hidden = true;
    tr.hidden = hidden;
    const addressTitle = e.address ? ` title="${escapeHtml(e.address)}"` : "";
    const titleTooltip = e.description ? ` title="${escapeHtml(e.description)}"` : "";
    const descMarker = e.description ? ' <span class="desc-marker" aria-hidden="true">ⓘ</span>' : "";
    const icsLink = ` <a class="ics-link" href="/api/event/${encodeURIComponent(e.id)}.ics" title="In Kalender (.ics)" aria-label="Zum Kalender hinzufügen" download>`
      + `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`
      + `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>`
      + `<line x1="16" y1="2" x2="16" y2="6"/>`
      + `<line x1="8" y1="2" x2="8" y2="6"/>`
      + `<line x1="3" y1="10" x2="21" y2="10"/>`
      + `<line x1="12" y1="14" x2="12" y2="18"/>`
      + `<line x1="10" y1="16" x2="14" y2="16"/>`
      + `</svg></a>`;
    const timeStr = formatTime(e.start_time, e.end_time);
    const timeSub = timeStr ? `<div class="time-sub">${escapeHtml(timeStr)}</div>` : "";
    const catShort = e.category ? (categoryShorts[e.category] || e.category) : "";
    const catBadge = e.category
      ? `<span class="cat-badge" data-cat="${escapeHtml(e.category)}" title="${escapeHtml(categoryLabels[e.category] || e.category)}">${escapeHtml(catShort)}</span>`
      : '<span class="dash">—</span>';
    tr.innerHTML = `
      <td class="col-date">${formatDate(e.start_date)}${timeSub}</td>
      <td class="col-title"${titleTooltip}><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener">${escapeHtml(e.title)}</a>${descMarker}${icsLink}</td>
      <td class="col-category">${catBadge}</td>
      <td class="col-venue"${addressTitle}>${emptyDash(e.venue)}</td>
      <td class="col-city">${emptyDash(e.city)}</td>
      <td class="col-country">${emptyDash(e.country_label)}</td>
      <td class="col-state state-col"><button class="state-btn" type="button" data-id="${escapeHtml(e.id)}">${stateIcon(state || null)}</button></td>
    `;
    TBODY.appendChild(tr);
  }
  STATUS.textContent = formatScrapedAt(payload.scraped_at);
  renderHealth(payload.health_warnings);
  renderSources(payload.sources, categoryLabels, payload.sources_overview);
  renderFilterBar();
  renderPresetBar();
  updateSortIndicators();
}

const THEAD = document.querySelector("thead");
if (THEAD) {
  THEAD.addEventListener("click", (event) => {
    const th = event.target.closest("th[data-col]");
    if (!th) return;
    const col = th.dataset.col;
    if (SORT.col === col) {
      SORT.dir = SORT.dir === "asc" ? "desc" : "asc";
    } else {
      SORT.col = col;
      SORT.dir = "asc";
    }
    if (CURRENT_PAYLOAD) render(CURRENT_PAYLOAD);
  });
}

TBODY.addEventListener("click", async (event) => {
  const btn = event.target.closest(".state-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  const current = STATES[id] || null;
  const next = nextState(current);
  await postState(id, next);
  if (next) STATES[id] = next;
  else delete STATES[id];
  const tr = btn.closest("tr");
  tr.dataset.state = next || "";
  btn.textContent = stateIcon(next);
  tr.hidden = next === "ignoriert" && !SHOW_IGNORED;
});


const TO_TOP = document.getElementById("to-top");
if (TO_TOP) {
  TO_TOP.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

const TO_BOTTOM = document.getElementById("to-bottom");
if (TO_BOTTOM) {
  TO_BOTTOM.addEventListener("click", () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });
}

async function loadEvents() {
  const res = await fetch("/api/events");
  return res.json();
}

async function refresh() {
  REFRESH_BTN.disabled = true;
  REFRESH_BTN.classList.add("is-loading");
  STATUS.textContent = "Aktualisiere …";
  try {
    const res = await fetch("/api/refresh", { method: "POST" });
    const payload = await res.json();
    if (Array.isArray(payload.filter_presets)) PRESETS = payload.filter_presets;
    render(payload);
  } catch (err) {
    STATUS.textContent = `Fehler: ${err.message}`;
  } finally {
    REFRESH_BTN.disabled = false;
    REFRESH_BTN.classList.remove("is-loading");
  }
}

REFRESH_BTN.addEventListener("click", refresh);

(async () => {
  const payload = await loadEvents();
  if (Array.isArray(payload.filter_presets)) PRESETS = payload.filter_presets;
  render(payload);
  const last = payload.scraped_at ? Date.parse(payload.scraped_at) : 0;
  if (!last || Date.now() - last > STALE_AFTER_MS) {
    refresh();
  }
})();
