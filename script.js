const LOCATION = {
  latitude: 14.2117,
  longitude: 121.1653,
  timezone: "Asia/Manila",
};

const STORAGE_KEYS = {
  notes: "lennon_notes",
  todos: "lennon_todos",
  links: "lennon_links",
  walk: "lennon_walk",
  pomodoro: "lennon_pomodoro",
  quoteCache: "lennon_quote_cache",
  gptKeys: "lennon_llm_api_keys",
};

const REFRESH_MS = 10 * 60 * 1000;
const QUOTE_REFRESH_MS = 6 * 60 * 60 * 1000;

const FALLBACK_QUOTES = [
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Do not take life too seriously. You will never get out of it alive.", author: "Elbert Hubbard" },
  { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "I can resist everything except temptation.", author: "Oscar Wilde" },
];

const weatherCodes = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  80: "Rain showers",
  81: "Heavy showers",
  95: "Thunderstorm",
};

const refs = {
  clock: document.getElementById("clock"),
  date: document.getElementById("date"),
  quoteText: document.getElementById("quote-text"),
  quoteAuthor: document.getElementById("quote-author"),
  notifStatus: document.getElementById("notif-status"),
  gmailBell: document.getElementById("gmail-bell"),
  gmailCount: document.getElementById("gmail-count"),
  fbBell: document.getElementById("fb-bell"),
  fbCount: document.getElementById("fb-count"),
  temp: document.getElementById("temp"),
  condition: document.getElementById("condition"),
  weatherExtra: document.getElementById("weather-extra"),
  reliveSync: document.getElementById("relive-sync"),
  reliveMap: document.getElementById("relive-map"),
  walkDuration: document.getElementById("walk-duration"),
  walkDistance: document.getElementById("walk-distance"),
  walkElevation: document.getElementById("walk-elevation"),
  walkReset: document.getElementById("walk-reset"),
  pomoTime: document.getElementById("pomo-time"),
  pomoProgress: document.getElementById("pomo-progress"),
  pomoStatus: document.getElementById("pomo-status"),
  pomoStart: document.getElementById("pomo-start"),
  pomoReset: document.getElementById("pomo-reset"),
  pomoMinus: document.getElementById("pomo-minus"),
  pomoPlus: document.getElementById("pomo-plus"),
  pomoAlarm: document.getElementById("pomo-alarm"),
  pomoTest: document.getElementById("pomo-test"),
  nbaStatus: document.getElementById("nba-status"),
  nbaLiveList: document.getElementById("nba-live-list"),
  eastStandings: document.getElementById("east-standings"),
  westStandings: document.getElementById("west-standings"),
  localNews: document.getElementById("local-news"),
  worldNews: document.getElementById("world-news"),
  aiNews: document.getElementById("ai-news"),
  gptLog: document.getElementById("gpt-log"),
  gptForm: document.getElementById("gpt-form"),
  gptInput: document.getElementById("gpt-input"),
  gptProvider: document.getElementById("gpt-provider"),
  gptKey: document.getElementById("gpt-key"),
  gptSaveKey: document.getElementById("gpt-save-key"),
  gptStatus: document.getElementById("gpt-status"),
  gptClear: document.getElementById("gpt-clear"),
  notes: document.getElementById("notes"),
  notesStatus: document.getElementById("notes-status"),
  todoForm: document.getElementById("todo-form"),
  todoInput: document.getElementById("todo-input"),
  todoList: document.getElementById("todo-list"),
  linkForm: document.getElementById("link-form"),
  linkLabel: document.getElementById("link-label"),
  linkUrl: document.getElementById("link-url"),
  customLinks: document.getElementById("custom-links"),
  statOnline: document.getElementById("stat-online"),
  statPlatform: document.getElementById("stat-platform"),
  statLanguage: document.getElementById("stat-language"),
  statCores: document.getElementById("stat-cores"),
  statMemory: document.getElementById("stat-memory"),
  statViewport: document.getElementById("stat-viewport"),
};

let todos = loadJSON(STORAGE_KEYS.todos, []);
let links = loadJSON(STORAGE_KEYS.links, []);
let walk = loadJSON(STORAGE_KEYS.walk, {
  active: false,
  startedAt: null,
  elapsedMs: 0,
  durationLabel: "00:00:00",
  distanceKm: 0,
  distanceLabel: "0.00 km",
  elevationM: 0,
  elevationLabel: "0 m",
  lastPoint: null,
  route: [],
});

let reliveMapInstance = null;
let reliveRoute = null;
let reliveMarker = null;
const POMODORO_DEFAULT_SEC = 25 * 60;
const POMODORO_RING_CIRC = 2 * Math.PI * 52;
const POMODORO_STEP_SEC = 60;
let pomodoro = loadJSON(STORAGE_KEYS.pomodoro, {
  totalSec: POMODORO_DEFAULT_SEC,
  remainingSec: POMODORO_DEFAULT_SEC,
  running: false,
  lastTickMs: null,
  alarmTone: "beep",
});
let pomodoroAudioCtx = null;

function updateDateTime() {
  const now = new Date();
  refs.clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  refs.date.textContent = now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setFallbackQuote() {
  const idx = Math.floor(Date.now() / 86400000) % FALLBACK_QUOTES.length;
  const quote = FALLBACK_QUOTES[idx];
  refs.quoteText.textContent = `"${quote.text}"`;
  refs.quoteAuthor.textContent = `- ${quote.author}`;
}

function setQuote(text, author) {
  refs.quoteText.textContent = `"${text}"`;
  refs.quoteAuthor.textContent = `- ${author}`;
}

async function updateQuote() {
  const today = new Date().toISOString().slice(0, 10);
  const cached = loadJSON(STORAGE_KEYS.quoteCache, null);

  if (cached && cached.date === today && cached.text && cached.author) {
    setQuote(cached.text, cached.author);
    return;
  }

  try {
    const r1 = await fetch("https://api.quotable.io/random?maxLength=140");
    const j1 = await r1.json();
    if (j1?.content && j1?.author) {
      setQuote(j1.content, j1.author);
      saveJSON(STORAGE_KEYS.quoteCache, { date: today, text: j1.content, author: j1.author });
      return;
    }
    throw new Error("Primary quote response invalid");
  } catch {
    try {
      const r2 = await fetch("https://zenquotes.io/api/random");
      const j2 = await r2.json();
      const q = Array.isArray(j2) ? j2[0] : null;
      if (q?.q && q?.a) {
        setQuote(q.q, q.a);
        saveJSON(STORAGE_KEYS.quoteCache, { date: today, text: q.q, author: q.a });
        return;
      }
      throw new Error("Backup quote response invalid");
    } catch {
      setFallbackQuote();
    }
  }
}

function setListLoading(el, text) {
  el.innerHTML = `<li class="feed-item"><span class="feed-meta">${text}</span></li>`;
}

function bindAppButtons() {
  document.querySelectorAll(".app-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const { url } = button.dataset;
      if (!url) return;
      if (url.startsWith("http://") || url.startsWith("https://")) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = url;
      }
    });
  });
}

function setBell(bellEl, countEl, count) {
  if (Number.isFinite(count) && count > 0) {
    bellEl.classList.add("active");
    countEl.classList.add("active");
    countEl.textContent = count > 99 ? "99+" : String(count);
  } else {
    bellEl.classList.remove("active");
    countEl.classList.remove("active");
    countEl.textContent = "0";
  }
}

async function fetchGmailUnread() {
  try {
    const response = await fetch("https://mail.google.com/mail/feed/atom", { credentials: "include" });
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const count = Number(doc.querySelector("fullcount")?.textContent || "0");
    return Number.isFinite(count) ? count : 0;
  } catch {
    return null;
  }
}

async function fetchFacebookUnread() {
  try {
    const response = await fetch("https://www.facebook.com/", { credentials: "include" });
    const html = await response.text();
    const patterns = [/"badge_count":(\d+)/i, /"notifications_unseen_count":(\d+)/i, /"unseen_count":(\d+)/i];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return Number(match[1]);
    }

    return 0;
  } catch {
    return null;
  }
}

async function updateAppNotifications() {
  refs.notifStatus.textContent = "Syncing bells...";
  const [gmail, facebook] = await Promise.all([fetchGmailUnread(), fetchFacebookUnread()]);

  if (gmail === null) {
    refs.gmailBell.classList.remove("active");
    refs.gmailCount.classList.remove("active");
  } else {
    setBell(refs.gmailBell, refs.gmailCount, gmail);
  }

  if (facebook === null) {
    refs.fbBell.classList.remove("active");
    refs.fbCount.classList.remove("active");
  } else {
    setBell(refs.fbBell, refs.fbCount, facebook);
  }

  refs.notifStatus.textContent = gmail !== null || facebook !== null ? "Bells updated" : "Bell access limited";
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function currentWalkElapsed() {
  if (!walk.active || !walk.startedAt) return walk.elapsedMs;
  return walk.elapsedMs + (Date.now() - walk.startedAt);
}

function renderWalk() {
  const elapsed = currentWalkElapsed();
  const durationText = walk.durationLabel || formatDuration(elapsed);
  const distanceText = walk.distanceLabel || `${walk.distanceKm.toFixed(2)} km`;
  const elevationText = walk.elevationLabel || `${Math.round(walk.elevationM || 0)} m`;

  refs.walkDuration.textContent = durationText;
  refs.walkDistance.textContent = distanceText;
  refs.walkElevation.textContent = elevationText;
}

function initReliveMap() {
  if (!refs.reliveMap || typeof L === "undefined" || reliveMapInstance) return;

  reliveMapInstance = L.map(refs.reliveMap, { zoomControl: false }).setView([LOCATION.latitude, LOCATION.longitude], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(reliveMapInstance);

  reliveRoute = L.polyline([], {
    color: "#00d7c3",
    weight: 3,
    opacity: 0.9,
  }).addTo(reliveMapInstance);

  if (Array.isArray(walk.route) && walk.route.length) {
    reliveRoute.setLatLngs(walk.route.map((p) => [p.lat, p.lon]));
    const last = walk.route[walk.route.length - 1];
    reliveMarker = L.circleMarker([last.lat, last.lon], {
      radius: 4,
      color: "#ff7a00",
      fillColor: "#ff7a00",
      fillOpacity: 1,
      weight: 1,
    }).addTo(reliveMapInstance);
    reliveMapInstance.fitBounds(reliveRoute.getBounds(), { padding: [20, 20] });
  }
}

function setReliveRoute(routePoints) {
  if (!reliveMapInstance || !reliveRoute) return;
  if (!Array.isArray(routePoints) || !routePoints.length) {
    reliveRoute.setLatLngs([]);
    if (reliveMarker) {
      reliveMapInstance.removeLayer(reliveMarker);
      reliveMarker = null;
    }
    return;
  }

  reliveRoute.setLatLngs(routePoints.map((point) => [point.lat, point.lon]));
  const last = routePoints[routePoints.length - 1];

  if (!reliveMarker) {
    reliveMarker = L.circleMarker([last.lat, last.lon], {
      radius: 4,
      color: "#ff7a00",
      fillColor: "#ff7a00",
      fillOpacity: 1,
      weight: 1,
    }).addTo(reliveMapInstance);
  } else {
    reliveMarker.setLatLng([last.lat, last.lon]);
  }
  reliveMapInstance.fitBounds(reliveRoute.getBounds(), { padding: [20, 20] });
}

function getDurationFromRelive(payload) {
  if (typeof payload?.durationText === "string" && payload.durationText.trim()) {
    return payload.durationText.trim();
  }
  const durationMs = Number(payload?.durationMs);
  if (Number.isFinite(durationMs) && durationMs >= 0) return formatDuration(durationMs);

  const durationSec = Number(payload?.durationSec);
  if (Number.isFinite(durationSec) && durationSec >= 0) return formatDuration(durationSec * 1000);
  return "00:00:00";
}

function getDistanceFromRelive(payload) {
  if (typeof payload?.distanceText === "string" && payload.distanceText.trim()) {
    return { km: Number(payload?.distanceKm) || 0, label: payload.distanceText.trim() };
  }

  const distanceKm = Number(payload?.distanceKm);
  if (Number.isFinite(distanceKm) && distanceKm >= 0) {
    return { km: distanceKm, label: `${distanceKm.toFixed(2)} km` };
  }

  const distanceM = Number(payload?.distanceM);
  if (Number.isFinite(distanceM) && distanceM >= 0) {
    const km = distanceM / 1000;
    return { km, label: `${km.toFixed(2)} km` };
  }

  return { km: 0, label: "0.00 km" };
}

function getElevationFromRelive(payload) {
  if (typeof payload?.elevationText === "string" && payload.elevationText.trim()) {
    return { m: Number(payload?.elevationM) || 0, label: payload.elevationText.trim() };
  }

  const elevationM = Number(payload?.elevationM ?? payload?.elevationGainM);
  if (Number.isFinite(elevationM)) {
    return { m: elevationM, label: `${Math.round(elevationM)} m` };
  }

  return { m: 0, label: "0 m" };
}

function syncReliveFromApp(payload) {
  if (!payload || typeof payload !== "object") return;

  const durationLabel = getDurationFromRelive(payload);
  const distance = getDistanceFromRelive(payload);
  const elevation = getElevationFromRelive(payload);
  const route = Array.isArray(payload.route)
    ? payload.route
        .map((point) => ({
          lat: Number(point?.lat),
          lon: Number(point?.lon),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon))
    : [];

  walk.active = Boolean(payload.active);
  walk.startedAt = null;
  walk.elapsedMs = 0;
  walk.durationLabel = durationLabel;
  walk.distanceKm = distance.km;
  walk.distanceLabel = distance.label;
  walk.elevationM = elevation.m;
  walk.elevationLabel = elevation.label;
  walk.route = route;
  walk.lastPoint = route.length ? route[route.length - 1] : null;

  refs.reliveSync.textContent = `Synced from Relive app (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })})`;
  setReliveRoute(route);
  saveJSON(STORAGE_KEYS.walk, walk);
  renderWalk();
}

function formatPomodoro(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = String(Math.floor(safe / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function normalizePomodoroState() {
  const total = Number(pomodoro?.totalSec);
  const remaining = Number(pomodoro?.remainingSec);
  const tone = typeof pomodoro?.alarmTone === "string" ? pomodoro.alarmTone : "beep";

  pomodoro.totalSec = Number.isFinite(total) && total > 0 ? Math.floor(total) : POMODORO_DEFAULT_SEC;
  pomodoro.remainingSec = Number.isFinite(remaining) ? Math.min(Math.max(0, Math.floor(remaining)), pomodoro.totalSec) : pomodoro.totalSec;
  pomodoro.running = Boolean(pomodoro?.running) && pomodoro.remainingSec > 0;
  pomodoro.lastTickMs = Number.isFinite(Number(pomodoro?.lastTickMs)) ? Number(pomodoro.lastTickMs) : null;
  pomodoro.alarmTone = ["beep", "bell", "digital"].includes(tone) ? tone : "beep";
}

function renderPomodoro() {
  if (!refs.pomoTime || !refs.pomoProgress || !refs.pomoStatus || !refs.pomoStart) return;
  normalizePomodoroState();

  const done = pomodoro.remainingSec <= 0;
  const progress = (pomodoro.totalSec - pomodoro.remainingSec) / pomodoro.totalSec;
  const dashOffset = POMODORO_RING_CIRC * (1 - Math.min(1, Math.max(0, progress)));

  refs.pomoTime.textContent = formatPomodoro(pomodoro.remainingSec);
  refs.pomoProgress.style.strokeDasharray = `${POMODORO_RING_CIRC}`;
  refs.pomoProgress.style.strokeDashoffset = `${dashOffset}`;
  refs.pomoStatus.textContent = done ? "Done" : pomodoro.running ? "Focus" : "Paused";
  refs.pomoStart.textContent = pomodoro.running ? "Pause" : "Start";
  if (refs.pomoAlarm) refs.pomoAlarm.value = pomodoro.alarmTone;
}

function getPomodoroAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!pomodoroAudioCtx) pomodoroAudioCtx = new AudioCtx();
  return pomodoroAudioCtx;
}

function playTone(audioCtx, frequency, durationMs, type = "sine", gainValue = 0.13, delayMs = 0) {
  const startAt = audioCtx.currentTime + delayMs / 1000;
  const endAt = startAt + durationMs / 1000;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt);
}

async function playPomodoroAlarm() {
  const audioCtx = getPomodoroAudioContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") await audioCtx.resume();

  if (pomodoro.alarmTone === "bell") {
    [0, 180, 360].forEach((delay) => {
      playTone(audioCtx, 880, 220, "triangle", 0.14, delay);
      playTone(audioCtx, 1320, 200, "sine", 0.08, delay + 40);
    });
    return;
  }

  if (pomodoro.alarmTone === "digital") {
    [0, 130, 260, 390].forEach((delay, index) => {
      const freq = index % 2 ? 1200 : 900;
      playTone(audioCtx, freq, 80, "square", 0.11, delay);
    });
    return;
  }

  [0, 220].forEach((delay) => {
    playTone(audioCtx, 980, 160, "sine", 0.15, delay);
  });
}

function adjustPomodoroTotal(deltaSec) {
  normalizePomodoroState();
  const nextTotal = Math.min(120 * 60, Math.max(60, pomodoro.totalSec + deltaSec));
  if (nextTotal === pomodoro.totalSec) return;

  const nextRemaining = Math.min(nextTotal, Math.max(0, pomodoro.remainingSec + deltaSec));
  pomodoro.totalSec = nextTotal;
  pomodoro.remainingSec = nextRemaining;
  if (pomodoro.running) pomodoro.lastTickMs = Date.now();
  saveJSON(STORAGE_KEYS.pomodoro, pomodoro);
  renderPomodoro();
}

function setupPomodoro() {
  if (!refs.pomoStart || !refs.pomoReset) return;
  normalizePomodoroState();
  renderPomodoro();

  refs.pomoStart.addEventListener("click", () => {
    if (pomodoro.running) {
      pomodoro.running = false;
      pomodoro.lastTickMs = null;
    } else {
      if (pomodoro.remainingSec <= 0) {
        pomodoro.remainingSec = pomodoro.totalSec;
      }
      pomodoro.running = true;
      pomodoro.lastTickMs = Date.now();
    }
    saveJSON(STORAGE_KEYS.pomodoro, pomodoro);
    renderPomodoro();
  });

  refs.pomoReset.addEventListener("click", () => {
    pomodoro.running = false;
    pomodoro.lastTickMs = null;
    pomodoro.remainingSec = pomodoro.totalSec;
    saveJSON(STORAGE_KEYS.pomodoro, pomodoro);
    renderPomodoro();
  });

  if (refs.pomoMinus) {
    refs.pomoMinus.addEventListener("click", () => adjustPomodoroTotal(-POMODORO_STEP_SEC));
  }

  if (refs.pomoPlus) {
    refs.pomoPlus.addEventListener("click", () => adjustPomodoroTotal(POMODORO_STEP_SEC));
  }

  if (refs.pomoAlarm) {
    refs.pomoAlarm.addEventListener("change", () => {
      pomodoro.alarmTone = refs.pomoAlarm.value;
      saveJSON(STORAGE_KEYS.pomodoro, pomodoro);
      renderPomodoro();
    });
  }

  if (refs.pomoTest) {
    refs.pomoTest.addEventListener("click", () => {
      playPomodoroAlarm();
    });
  }

  setInterval(() => {
    if (!pomodoro.running) return;
    const now = Date.now();
    const last = pomodoro.lastTickMs || now;
    const elapsedSec = Math.floor((now - last) / 1000);
    if (elapsedSec < 1) return;

    pomodoro.remainingSec = Math.max(0, pomodoro.remainingSec - elapsedSec);
    pomodoro.lastTickMs = last + elapsedSec * 1000;
    if (pomodoro.remainingSec <= 0) {
      pomodoro.running = false;
      pomodoro.lastTickMs = null;
      void playPomodoroAlarm();
    }

    saveJSON(STORAGE_KEYS.pomodoro, pomodoro);
    renderPomodoro();
  }, 250);
}

function setupWalkTracker() {
  refs.walkReset.addEventListener("click", () => {
    walk.elapsedMs = 0;
    if (walk.active) {
      walk.elapsedMs = currentWalkElapsed();
    }
    walk.active = false;
    walk.startedAt = null;
    walk.distanceKm = 0;
    walk.distanceLabel = "0.00 km";
    walk.elevationM = 0;
    walk.elevationLabel = "0 m";
    walk.durationLabel = "00:00:00";
    walk.lastPoint = null;
    walk.route = [];
    setReliveRoute([]);
    refs.reliveSync.textContent = "Route reset. Waiting for Relive app sync.";
    saveJSON(STORAGE_KEYS.walk, walk);
    renderWalk();
  });

  initReliveMap();
  setReliveRoute(Array.isArray(walk.route) ? walk.route : []);
  window.updateReliveFromApp = syncReliveFromApp;
  refs.reliveSync.textContent = "Waiting for Relive app sync.";
  renderWalk();

  setInterval(() => {
    if (walk.active) renderWalk();
  }, 1000);

  setInterval(() => {
    if (walk.active || walk.route.length) {
      walk.elapsedMs = currentWalkElapsed();
      saveJSON(STORAGE_KEYS.walk, walk);
    }
  }, 15000);
}

function setupNotes() {
  refs.notes.value = localStorage.getItem(STORAGE_KEYS.notes) || "";
  refs.notesStatus.classList.add("saved");

  refs.notes.addEventListener("input", () => {
    refs.notesStatus.textContent = "Saving...";
    refs.notesStatus.classList.remove("saved");
    localStorage.setItem(STORAGE_KEYS.notes, refs.notes.value);

    clearTimeout(setupNotes.timer);
    setupNotes.timer = setTimeout(() => {
      refs.notesStatus.textContent = "Saved";
      refs.notesStatus.classList.add("saved");
    }, 180);
  });
}

function renderTodos() {
  refs.todoList.innerHTML = "";
  if (!todos.length) {
    refs.todoList.innerHTML = `<li class="todo-item"><span>No tasks yet.</span></li>`;
    return;
  }

  todos.forEach((item) => {
    const li = document.createElement("li");
    li.className = `todo-item${item.done ? " done" : ""}`;

    const text = document.createElement("span");
    text.textContent = item.text;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const done = document.createElement("button");
    done.type = "button";
    done.textContent = item.done ? "Undo" : "Done";
    done.addEventListener("click", () => {
      item.done = !item.done;
      saveJSON(STORAGE_KEYS.todos, todos);
      renderTodos();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      todos = todos.filter((t) => t.id !== item.id);
      saveJSON(STORAGE_KEYS.todos, todos);
      renderTodos();
    });

    actions.append(done, del);
    li.append(text, actions);
    refs.todoList.appendChild(li);
  });
}

function setupTodos() {
  renderTodos();
  refs.todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = refs.todoInput.value.trim();
    if (!text) return;

    todos.unshift({ id: Date.now(), text, done: false });
    saveJSON(STORAGE_KEYS.todos, todos);
    refs.todoInput.value = "";
    renderTodos();
  });
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function renderLinks() {
  refs.customLinks.innerHTML = "";

  if (!links.length) {
    refs.customLinks.innerHTML = `<div class="feed-meta">No custom links yet.</div>`;
    return;
  }

  links.forEach((item) => {
    const row = document.createElement("div");
    row.className = "link-chip";

    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = item.label;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-link";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      links = links.filter((x) => x.id !== item.id);
      saveJSON(STORAGE_KEYS.links, links);
      renderLinks();
    });

    row.append(a, remove);
    refs.customLinks.appendChild(row);
  });
}

function setupLinks() {
  renderLinks();
  refs.linkForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const label = refs.linkLabel.value.trim();
    const url = sanitizeUrl(refs.linkUrl.value.trim());
    if (!label || !url) return;

    links.unshift({ id: Date.now(), label, url });
    saveJSON(STORAGE_KEYS.links, links);
    refs.linkLabel.value = "";
    refs.linkUrl.value = "";
    renderLinks();
  });
}

function updateStats() {
  refs.statOnline.textContent = navigator.onLine ? "Yes" : "No";
  refs.statPlatform.textContent = navigator.platform || "Unknown";
  refs.statLanguage.textContent = navigator.language || "Unknown";
  refs.statCores.textContent = navigator.hardwareConcurrency || "Unknown";
  refs.statMemory.textContent = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "N/A";
  refs.statViewport.textContent = `${window.innerWidth} x ${window.innerHeight}`;
}

async function updateWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.latitude}&longitude=${LOCATION.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=${encodeURIComponent(LOCATION.timezone)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.current) throw new Error("Missing weather data");

    const temp = Math.round(data.current.temperature_2m);
    const humidity = data.current.relative_humidity_2m;
    const wind = Math.round(data.current.wind_speed_10m);
    const code = data.current.weather_code;

    refs.temp.textContent = `${temp}°C`;
    refs.condition.textContent = weatherCodes[code] || "Unknown";
    refs.weatherExtra.textContent = `Humidity ${humidity}% | Wind ${wind} km/h | Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    refs.temp.textContent = "--°C";
    refs.condition.textContent = "Unavailable";
    refs.weatherExtra.textContent = "Weather feed unreachable. Reload after checking internet.";
  }
}

function renderLiveNBA(items) {
  refs.nbaLiveList.innerHTML = "";
  if (!items.length) {
    refs.nbaLiveList.innerHTML = `<li class="feed-item"><span class="feed-meta">No games on the board right now.</span></li>`;
    return;
  }

  const displayGames = [...items];
  while (displayGames.length < 4) {
    displayGames.push({
      away: "--",
      awayScore: "-",
      home: "--",
      homeScore: "-",
      status: "No additional game",
      playerOfGame: "TBD",
    });
  }

  displayGames.forEach((game) => {
    const li = document.createElement("li");
    li.className = "feed-item";
    li.innerHTML = `<div>${game.away} ${game.awayScore} - ${game.home} ${game.homeScore}</div><div class="feed-meta">${game.status}</div><div class="live-potg">POTG: ${game.playerOfGame}</div>`;
    refs.nbaLiveList.appendChild(li);
  });
}

function findConferenceEntries(payload, keyword) {
  const queue = [payload];

  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;

    const name = typeof node.name === "string" ? node.name.toLowerCase() : "";
    if (name.includes(keyword) && node.standings?.entries) {
      return node.standings.entries;
    }

    Object.values(node).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }

  return [];
}

function parseRecord(entry) {
  const stats = Array.isArray(entry.stats) ? entry.stats : [];
  const wins = Number(stats.find((s) => s.name === "wins")?.value ?? 0);
  const losses = Number(stats.find((s) => s.name === "losses")?.value ?? 0);
  const winPct = Number(stats.find((s) => s.name === "winPercent")?.value ?? 0);
  const gamesBack = stats.find((s) => s.name === "gamesBehind")?.displayValue ?? "0";
  const seed = Number(stats.find((s) => s.name === "playoffseed")?.displayValue ?? Number.POSITIVE_INFINITY);

  return {
    team: entry.team?.abbreviation || entry.team?.displayName || "TEAM",
    record: `${wins}-${losses}`,
    gb: gamesBack,
    seed,
    winPct,
    wins,
  };
}

function renderStandings(el, entries) {
  el.innerHTML = "";
  if (!entries.length) {
    el.innerHTML = `<li class="standing-item"><span class="feed-meta">Standings unavailable.</span></li>`;
    return;
  }

  const sorted = entries
    .map(parseRecord)
    .sort((a, b) => {
      if (Number.isFinite(a.seed) && Number.isFinite(b.seed)) return a.seed - b.seed;
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      return b.wins - a.wins;
    });

  sorted.forEach((row, idx) => {
    const li = document.createElement("li");
    li.className = "standing-item";
    const rank = Number.isFinite(row.seed) ? row.seed : idx + 1;
    li.innerHTML = `<div class="standing-row"><span class="standing-team"><span class="standing-seed">#${rank}</span>${row.team}</span><span class="standing-rec">${row.record} | GB ${row.gb}</span></div>`;
    el.appendChild(li);
  });
}

function appendGptMessage(text, role = "system") {
  const item = document.createElement("div");
  item.className = `gpt-msg ${role}`;
  item.textContent = text;
  refs.gptLog.appendChild(item);
  refs.gptLog.scrollTop = refs.gptLog.scrollHeight;
}

function getProviderLabel(provider) {
  const labels = {
    chatgpt: "ChatGPT",
    gemini: "Gemini",
    grok: "Grok",
    claude: "Claude",
  };
  return labels[provider] || "AI";
}

function extractProviderText(provider, data) {
  if (provider === "chatgpt") {
    if (typeof data?.output_text === "string" && data.output_text.trim()) {
      return data.output_text.trim();
    }

    const chunks = [];
    const output = Array.isArray(data?.output) ? data.output : [];
    output.forEach((entry) => {
      const content = Array.isArray(entry?.content) ? entry.content : [];
      content.forEach((part) => {
        if (typeof part?.text === "string") chunks.push(part.text);
      });
    });

    return chunks.join("\n").trim();
  }

  if (provider === "gemini") {
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n").trim() || "";
  }

  if (provider === "grok") {
    return data?.choices?.[0]?.message?.content?.trim?.() || "";
  }

  if (provider === "claude") {
    return (Array.isArray(data?.content) ? data.content : [])
      .map((x) => x?.text)
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

async function callProvider(provider, key, prompt) {
  if (provider === "chatgpt") {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: prompt,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "OpenAI request failed.");
    return extractProviderText(provider, data);
  }

  if (provider === "gemini") {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed.");
    return extractProviderText(provider, data);
  }

  if (provider === "grok") {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "grok-2-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Grok request failed.");
    return extractProviderText(provider, data);
  }

  if (provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || "Claude request failed.");
    return extractProviderText(provider, data);
  }

  throw new Error("Unknown provider.");
}

function setupGptBox() {
  const providerKeys = loadJSON(STORAGE_KEYS.gptKeys, {});

  const loadKeyForProvider = () => {
    const provider = refs.gptProvider.value;
    refs.gptKey.value = providerKeys[provider] || "";
    refs.gptStatus.textContent = refs.gptKey.value ? `${getProviderLabel(provider)} key loaded` : `No ${getProviderLabel(provider)} key`;
  };

  refs.gptProvider.addEventListener("change", loadKeyForProvider);
  loadKeyForProvider();

  refs.gptSaveKey.addEventListener("click", () => {
    const key = refs.gptKey.value.trim();
    const provider = refs.gptProvider.value;

    if (!key) {
      delete providerKeys[provider];
      localStorage.setItem(STORAGE_KEYS.gptKeys, JSON.stringify(providerKeys));
      refs.gptStatus.textContent = `No ${getProviderLabel(provider)} key`;
      appendGptMessage(`${getProviderLabel(provider)} API key cleared.`, "system");
      return;
    }

    providerKeys[provider] = key;
    localStorage.setItem(STORAGE_KEYS.gptKeys, JSON.stringify(providerKeys));
    refs.gptStatus.textContent = `${getProviderLabel(provider)} key saved`;
    appendGptMessage(`${getProviderLabel(provider)} API key saved locally in this browser profile.`, "system");
  });

  refs.gptForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = refs.gptInput.value.trim();
    if (!prompt) return;

    appendGptMessage(`You: ${prompt}`, "user");
    refs.gptStatus.textContent = "Thinking...";

    const provider = refs.gptProvider.value;
    const key = (refs.gptKey.value.trim() || providerKeys[provider] || "").trim();
    if (!key) {
      refs.gptStatus.textContent = `No ${getProviderLabel(provider)} key`;
      appendGptMessage(`Add your ${getProviderLabel(provider)} API key to get inline answers.`, "system");
      refs.gptInput.value = "";
      return;
    }

    try {
      const text = await callProvider(provider, key, prompt);
      if (!text) throw new Error("No response text returned.");

      appendGptMessage(`${getProviderLabel(provider)}: ${text}`, "assistant");
      refs.gptStatus.textContent = "Answered";
    } catch (error) {
      appendGptMessage(`${getProviderLabel(provider)} error: ${error.message}`, "system");
      refs.gptStatus.textContent = "Error";
    } finally {
      refs.gptInput.value = "";
    }
  });

  refs.gptClear.addEventListener("click", () => {
    refs.gptLog.innerHTML = `<div class="gpt-msg system">Choose an LLM, save its API key once, then ask. Answers appear here.</div>`;
    refs.gptInput.value = "";
  });
}

async function updateNBA() {
  refs.nbaStatus.textContent = "Updating...";

  try {
    const [scoreRes, standingRes] = await Promise.all([
      fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"),
      fetch("https://site.api.espn.com/apis/v2/sports/basketball/nba/standings"),
    ]);

    const scoreData = await scoreRes.json();
    const standingData = await standingRes.json();

    const events = Array.isArray(scoreData.events) ? scoreData.events : [];
    const live = events.map((event) => {
      const comp = event.competitions?.[0];
      const teams = comp?.competitors || [];
      const home = teams.find((t) => t.homeAway === "home") || {};
      const away = teams.find((t) => t.homeAway === "away") || {};
      const status = event.status?.type?.detail || event.status?.type?.description || "Scheduled";
      const pointLeaders = (Array.isArray(comp?.leaders) ? comp.leaders : [])
        .filter((leader) => String(leader?.name || "").toLowerCase().includes("point"))
        .map((leader) => {
          const top = Array.isArray(leader?.leaders) ? leader.leaders[0] : null;
          return {
            name: top?.athlete?.shortName || top?.athlete?.displayName || "",
            value: Number(top?.value ?? 0),
          };
        })
        .filter((leader) => leader.name);
      const bestLeader = pointLeaders.sort((a, b) => b.value - a.value)[0];
      const playerOfGame = bestLeader ? `${bestLeader.name} (${bestLeader.value} PTS)` : "TBD";

      return {
        home: home.team?.abbreviation || "HOME",
        away: away.team?.abbreviation || "AWAY",
        homeScore: home.score ?? "0",
        awayScore: away.score ?? "0",
        status,
        playerOfGame,
      };
    });

    const east = findConferenceEntries(standingData, "eastern");
    const west = findConferenceEntries(standingData, "western");

    renderLiveNBA(live);
    renderStandings(refs.eastStandings, east);
    renderStandings(refs.westStandings, west);

    refs.nbaStatus.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    refs.nbaStatus.textContent = "Unavailable";
    refs.nbaLiveList.innerHTML = `<li class="feed-item"><span class="feed-meta">NBA feed not reachable right now.</span></li>`;
    refs.eastStandings.innerHTML = `<li class="standing-item"><span class="feed-meta">Standings unavailable.</span></li>`;
    refs.westStandings.innerHTML = `<li class="standing-item"><span class="feed-meta">Standings unavailable.</span></li>`;
  }
}

async function fetchRssItems(feedUrl, limit = 5) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(proxyUrl);
  const xmlText = await response.text();
  const xml = new DOMParser().parseFromString(xmlText, "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Invalid RSS response");

  return [...xml.querySelectorAll("item")].slice(0, limit).map((item) => ({
    title: item.querySelector("title")?.textContent?.trim() || "Untitled",
    link: item.querySelector("link")?.textContent?.trim() || "#",
    pubDate: item.querySelector("pubDate")?.textContent?.trim() || "",
  }));
}

function renderNews(listEl, items, fallbackText) {
  listEl.innerHTML = "";

  if (!items.length) {
    listEl.innerHTML = `<li class="feed-item"><span class="feed-meta">${fallbackText}</span></li>`;
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "feed-item";

    const a = document.createElement("a");
    a.href = item.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = item.title;

    const meta = document.createElement("div");
    meta.className = "feed-meta";
    meta.textContent = item.pubDate ? new Date(item.pubDate).toLocaleString() : "Latest";

    li.append(a, meta);
    listEl.appendChild(li);
  });
}

async function updateNews() {
  setListLoading(refs.localNews, "Loading local headlines...");
  setListLoading(refs.worldNews, "Loading international headlines...");
  setListLoading(refs.aiNews, "Loading AI updates...");

  try {
    const [local, world, ai] = await Promise.all([
      fetchRssItems("https://www.gmanetwork.com/news/rss/news/nation/feed.xml"),
      fetchRssItems("https://feeds.bbci.co.uk/news/world/rss.xml"),
      fetchRssItems("https://venturebeat.com/category/ai/feed/"),
    ]);

    renderNews(refs.localNews, local, "No local headlines available.");
    renderNews(refs.worldNews, world, "No international headlines available.");
    renderNews(refs.aiNews, ai, "No AI updates available.");
  } catch {
    renderNews(refs.localNews, [], "Could not load local headlines.");
    renderNews(refs.worldNews, [], "Could not load international headlines.");
    renderNews(refs.aiNews, [], "Could not load AI updates.");
  }
}

async function refreshFeeds() {
  await Promise.all([updateWeather(), updateNBA(), updateNews(), updateAppNotifications()]);
}

updateDateTime();
updateQuote();
setInterval(updateDateTime, 1000);
setInterval(updateQuote, QUOTE_REFRESH_MS);

bindAppButtons();
setupPomodoro();
setupWalkTracker();
setupGptBox();
setupNotes();
setupTodos();
setupLinks();
updateStats();
refreshFeeds();
setInterval(refreshFeeds, REFRESH_MS);

window.addEventListener("resize", updateStats);
window.addEventListener("online", () => {
  updateStats();
  updateQuote();
  refreshFeeds();
});
window.addEventListener("offline", updateStats);
