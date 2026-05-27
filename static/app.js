const STATUS = document.getElementById("status");
const REFRESH_BTN = document.getElementById("refresh");
const TBODY = document.getElementById("events-body");
const EMPTY = document.getElementById("empty");
const SOURCES_BLOCK = document.getElementById("sources");
const SOURCES_OVERVIEW = document.getElementById("sources-overview");
const SOURCES_LIST = document.getElementById("sources-list");
const SHOW_IGNORED_CHK = document.getElementById("show-ignored");
const SHOW_FAVORITES_CHK = document.getElementById("show-favorites");
const HEALTH_BANNER = document.getElementById("health-banner");

const STALE_AFTER_MS = 60 * 60 * 1000;

let SHOW_IGNORED = false;
let SHOW_FAVORITES = false;
let STATES = {};
let CURRENT_PAYLOAD = null;
let SORT = { col: "start_date", dir: "asc" };
const FILTERS = { date: [], category: [], duration: [], city: [], country: [], continent: [] };

const DATE_OPTIONS = [
  { value: "all", label: "Alle" },
  { value: "today", label: "Heute" },
  { value: "tomorrow", label: "Morgen" },
  { value: "this-week", label: "Diese Woche" },
  { value: "next-week", label: "Nächste Woche" },
  { value: "next-7-days", label: "Nächste 7 Tage" },
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
    case "next-3-months":  return [fmt(today), fmt(addDays(today, 90))];
    case "this-year":      return [`${today.getFullYear()}-01-01`, `${today.getFullYear()}-12-31`];
    case "next-year":      return [`${today.getFullYear() + 1}-01-01`, `${today.getFullYear() + 1}-12-31`];
    default:               return null;
  }
}

function eventMatchesFilters(e, exclude) {
  const fieldFor = (k) => k === "duration" ? e.duration_type : e[k];
  for (const key of ["category", "duration", "city", "country", "continent"]) {
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

  const chips = [
    { key: "date",      icon: "🗓",  label: "Datum",     options: DATE_OPTIONS },
    { key: "category",  icon: "🏷",  label: "Kategorie", options: catOptions },
    { key: "duration",  icon: "⏱",  label: "Dauer",     options: DURATION_OPTIONS },
    { key: "city",      icon: "📍", label: "Stadt",     options: cityOptions },
    { key: "country",   icon: "🌍", label: "Land",      options: countryOptions },
    { key: "continent", icon: "🌐", label: "Kontinent", options: continentOptions },
  ];

  const anyActive = Object.values(FILTERS).some((v) => v.length > 0);
  bar.innerHTML = chips.map((c) => {
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
    return `<div class="filter-chip${isActive ? " filter-chip-active" : ""}" data-key="${c.key}">
      <button type="button" class="filter-chip-btn"><span class="chip-icon">${c.icon}</span> ${escapeHtml(c.label)}: <strong>${escapeHtml(chipText)}</strong> <span class="chip-caret">▾</span></button>
      <ul class="filter-menu" hidden>${menu}</ul>
    </div>`;
  }).join("") + (anyActive ? '<button type="button" class="filter-reset">Filter zurücksetzen</button>' : "");
}

document.addEventListener("click", (event) => {
  const reset = event.target.closest(".filter-reset");
  if (reset) {
    Object.keys(FILTERS).forEach((k) => { FILTERS[k] = []; });
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
  const item = event.target.closest(".filter-menu li");
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
let HIDDEN_SOURCES = new Set(JSON.parse(localStorage.getItem("hidden_sources") || "[]"));

function saveHiddenSources() {
  localStorage.setItem("hidden_sources", JSON.stringify([...HIDDEN_SOURCES]));
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

    if (HIDDEN_SOURCES.has(tr.dataset.source)) { tr.hidden = true; return; }
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

function renderSources(reports, categoryLabels, overview) {
  if (SOURCES_OVERVIEW) SOURCES_OVERVIEW.textContent = formatOverview(overview);
  if (!reports || reports.length === 0) {
    if (SOURCES_BLOCK) SOURCES_BLOCK.hidden = !overview;
    if (SOURCES_LIST) SOURCES_LIST.innerHTML = "";
    return;
  }
  SOURCES_BLOCK.hidden = false;
  SOURCES_LIST.innerHTML = "";
  for (const s of reports) {
    const li = document.createElement("li");
    if (s.stale) li.classList.add("stale");
    const catLabel = s.category ? (categoryLabels[s.category] || s.category) : "";
    const cat = catLabel ? ` <span class="cat">${escapeHtml(catLabel)}</span>` : "";
    let status;
    if (s.stale) {
      const since = s.last_success ? ` · zuletzt ${new Date(s.last_success).toLocaleString("de-CH")}` : "";
      const err = s.error ? ` (${escapeHtml(s.error)})` : "";
      status = `<span class="warn">${s.count} stale${err}${since}</span>`;
    } else {
      status = `<span class="ok">${s.count}</span>`;
    }
    const rejected = s.rejected > 0
      ? ` · <span class="err" title="${escapeHtml((s.rejection_samples || []).map((r) => r.id_or_title + ': ' + r.errors.join('; ')).join('\n'))}">${s.rejected} verworfen</span>`
      : "";
    const checked = HIDDEN_SOURCES.has(s.id) ? "" : "checked";
    const onlyBtn = ` <button type="button" class="src-only" data-source="${escapeHtml(s.id)}" title="nur diese Quelle anzeigen">nur</button>`;
    li.innerHTML = `<label><input type="checkbox" class="src-toggle" data-source="${escapeHtml(s.id)}" ${checked}> <span class="src-id">${escapeHtml(s.id)}</span>${cat} · ${status}${rejected}</label>${onlyBtn}`;
    SOURCES_LIST.appendChild(li);
  }
}

function syncCheckboxesToHidden() {
  document.querySelectorAll(".src-toggle").forEach((cb) => {
    cb.checked = !HIDDEN_SOURCES.has(cb.dataset.source);
  });
}

document.addEventListener("click", (event) => {
  const ctrl = event.target.closest(".src-control");
  const only = event.target.closest(".src-only");
  const trigger = ctrl || only;
  if (!trigger) return;

  const rectBefore = trigger.getBoundingClientRect();

  if (ctrl) {
    if (ctrl.dataset.action === "all") {
      HIDDEN_SOURCES.clear();
    } else if (ctrl.dataset.action === "none") {
      document.querySelectorAll(".src-toggle").forEach((cb) => {
        HIDDEN_SOURCES.add(cb.dataset.source);
      });
    }
  } else {
    const target = only.dataset.source;
    HIDDEN_SOURCES = new Set();
    document.querySelectorAll(".src-toggle").forEach((cb) => {
      if (cb.dataset.source !== target) {
        HIDDEN_SOURCES.add(cb.dataset.source);
      }
    });
  }

  saveHiddenSources();
  syncCheckboxesToHidden();
  applyVisibility();

  const rectAfter = trigger.getBoundingClientRect();
  window.scrollBy(0, rectAfter.top - rectBefore.top);
});

SOURCES_LIST.addEventListener("change", (event) => {
  const cb = event.target.closest(".src-toggle");
  if (!cb) return;
  const source = cb.dataset.source;
  if (cb.checked) {
    HIDDEN_SOURCES.delete(source);
  } else {
    HIDDEN_SOURCES.add(source);
  }
  saveHiddenSources();
  applyVisibility();
});

function render(payload) {
  CURRENT_PAYLOAD = payload;
  STATES = payload.states || {};
  const categoryLabels = Object.fromEntries(
    (payload.categories || []).map((c) => [c.id, c.label])
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
    let hidden = HIDDEN_SOURCES.has(e.source);
    if (!hidden) {
      if (SHOW_FAVORITES) hidden = state !== "interessiert";
      else if (state === "ignoriert" && !SHOW_IGNORED) hidden = true;
    }
    if (!hidden && !eventMatchesFilters(e)) hidden = true;
    tr.hidden = hidden;
    const addressTitle = e.address ? ` title="${escapeHtml(e.address)}"` : "";
    const descTitle = e.description ? ` title="${escapeHtml(e.description)}"` : "";
    const timeStr = formatTime(e.start_time, e.end_time);
    const timeSub = timeStr ? `<div class="time-sub">${escapeHtml(timeStr)}</div>` : "";
    tr.innerHTML = `
      <td>${formatDate(e.start_date)}${timeSub}</td>
      <td><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener">${escapeHtml(e.title)}</a></td>
      <td class="desc-cell"${descTitle}>${emptyDash(e.description)}</td>
      <td${addressTitle}>${emptyDash(e.venue)}</td>
      <td>${emptyDash(e.city)}</td>
      <td>${emptyDash(e.country_label)}</td>
      <td class="state-col"><button class="state-btn" type="button" data-id="${escapeHtml(e.id)}">${stateIcon(state || null)}</button></td>
    `;
    TBODY.appendChild(tr);
  }
  STATUS.textContent = formatScrapedAt(payload.scraped_at);
  renderHealth(payload.health_warnings);
  renderSources(payload.sources, categoryLabels, payload.sources_overview);
  renderFilterBar();
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

SHOW_IGNORED_CHK.addEventListener("change", (e) => {
  SHOW_IGNORED = e.target.checked;
  applyVisibility();
});

if (SHOW_FAVORITES_CHK) {
  SHOW_FAVORITES_CHK.addEventListener("change", (e) => {
    SHOW_FAVORITES = e.target.checked;
    applyVisibility();
  });
}

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
  STATUS.textContent = "Aktualisiere …";
  try {
    const res = await fetch("/api/refresh", { method: "POST" });
    const payload = await res.json();
    render(payload);
  } catch (err) {
    STATUS.textContent = `Fehler: ${err.message}`;
  } finally {
    REFRESH_BTN.disabled = false;
  }
}

REFRESH_BTN.addEventListener("click", refresh);

(async () => {
  const payload = await loadEvents();
  render(payload);
  const last = payload.scraped_at ? Date.parse(payload.scraped_at) : 0;
  if (!last || Date.now() - last > STALE_AFTER_MS) {
    refresh();
  }
})();
