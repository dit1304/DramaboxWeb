/**
 * Cloudflare Worker - ZERO Dramabox Web Panel (Enhanced UI)
 * Deploy via GitHub Actions to Cloudflare Workers
 */

const API_BASE = "https://dramabos.asia/api/dramabox/api";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Optional token gate
    if (env.PANEL_TOKEN) {
      const token = url.searchParams.get("token") || "";
      if (token !== env.PANEL_TOKEN) {
        return new Response("Forbidden (missing/invalid token)", { status: 403 });
      }
    }

    // API proxy to bypass CORS
    if (url.pathname.startsWith("/api/")) {
      return proxyApi(request, url);
    }

    // Home page
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(htmlPage(), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function proxyApi(request, url) {
  const targetPath = url.pathname.replace(/^\/api/, "");
  const targetUrl = new URL(API_BASE + targetPath);

  for (const [k, v] of url.searchParams.entries()) targetUrl.searchParams.set(k, v);
  if (!targetUrl.searchParams.get("lang")) targetUrl.searchParams.set("lang", "in");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const init = {
    method: request.method,
    headers: new Headers(request.headers),
    body: request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer(),
  };

  init.headers.delete("host");
  init.headers.delete("cf-connecting-ip");
  init.headers.delete("x-forwarded-for");
  init.headers.delete("x-real-ip");

  const res = await fetch(targetUrl.toString(), {
    ...init,
    cf: { cacheEverything: true, cacheTtl: 10 },
  });

  const headers = new Headers(res.headers);
  const c = corsHeaders();
  c.forEach((v, k) => headers.set(k, v));
  headers.set("cache-control", "no-store");

  return new Response(res.body, { status: res.status, headers });
}

function corsHeaders() {
  return new Headers({
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
  });
}

function htmlPage() {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DramaBox Stream</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --bg-elevated: #18181b;
      --bg-card: #1c1c22;
      --border: rgba(255,255,255,0.08);
      --text: #fafafa;
      --text-muted: #a1a1aa;
      --primary: #a855f7;
      --primary-glow: rgba(168,85,247,0.25);
      --accent: #06b6d4;
      --gradient: linear-gradient(135deg, #a855f7 0%, #06b6d4 100%);
      --shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      --radius: 16px;
      --radius-sm: 10px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }

    /* Animated background */
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: 
        radial-gradient(ellipse 80% 50% at 20% -20%, var(--primary-glow), transparent),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(6,182,212,0.15), transparent);
      pointer-events: none;
      z-index: -1;
    }

    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      background: rgba(24,24,27,0.8);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 24px;
      position: sticky;
      top: 12px;
      z-index: 100;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 40px;
      height: 40px;
      background: var(--gradient);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 20px var(--primary-glow);
    }

    .logo-text {
      font-weight: 800;
      font-size: 20px;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .nav { display: flex; gap: 8px; flex-wrap: wrap; }

    .nav-btn {
      padding: 10px 18px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .nav-btn:hover, .nav-btn.active {
      background: var(--bg-card);
      color: var(--text);
      border-color: var(--primary);
    }

    .search-box {
      display: flex;
      gap: 8px;
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text);
      border-radius: var(--radius-sm);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus { border-color: var(--primary); }
    .search-input::placeholder { color: var(--text-muted); }

    .search-btn {
      padding: 10px 20px;
      background: var(--gradient);
      border: none;
      color: white;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      transition: transform 0.15s, box-shadow 0.2s;
    }

    .search-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 20px var(--primary-glow);
    }

    /* Grid */
    .grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(5, 1fr);
    }

    @media (max-width: 1200px) { .grid { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 900px) { .grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 400px) { .grid { grid-template-columns: 1fr; } }

    /* Card */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }

    .card:hover {
      transform: translateY(-6px);
      border-color: var(--primary);
      box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 30px var(--primary-glow);
    }

    .card-img {
      width: 100%;
      aspect-ratio: 2/3;
      object-fit: cover;
      background: var(--bg-elevated);
    }

    .card-body { padding: 14px; }

    .card-title {
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
    }

    .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .badge {
      padding: 4px 10px;
      background: rgba(168,85,247,0.15);
      color: var(--primary);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .play-icon {
      width: 32px;
      height: 32px;
      background: var(--gradient);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s;
    }

    .card:hover .play-icon {
      opacity: 1;
      transform: scale(1);
    }

    /* Player Modal */
    .player-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(10px);
      z-index: 1000;
      display: none;
      overflow-y: auto;
    }

    .player-overlay.active { display: block; }

    .player-container {
      max-width: 1100px;
      margin: 20px auto;
      padding: 0 20px;
    }

    .player-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .player-title { font-size: 22px; font-weight: 800; }
    .player-subtitle { color: var(--text-muted); margin-top: 4px; font-size: 14px; }

    .close-btn {
      width: 40px;
      height: 40px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: 10px;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
    }

    .video-wrapper {
      position: relative;
      background: #000;
      border-radius: var(--radius);
      overflow: hidden;
      margin-bottom: 16px;
    }

    video {
      width: 100%;
      max-height: 65vh;
      display: block;
    }

    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .control-btn {
      padding: 10px 18px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: var(--bg-elevated);
      border-color: var(--primary);
    }

    .control-btn.primary {
      background: var(--gradient);
      border: none;
    }

    .quality-select {
      padding: 10px 14px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      outline: none;
    }

    .status-text {
      margin-left: auto;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* Episodes */
    .episodes-section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }

    .episodes-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .episodes-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(10, 1fr);
    }

    @media (max-width: 900px) { .episodes-grid { grid-template-columns: repeat(8, 1fr); } }
    @media (max-width: 640px) { .episodes-grid { grid-template-columns: repeat(5, 1fr); } }
    @media (max-width: 400px) { .episodes-grid { grid-template-columns: repeat(4, 1fr); } }

    .ep-btn {
      padding: 12px 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      transition: all 0.2s;
    }

    .ep-btn:hover {
      border-color: var(--primary);
      color: var(--text);
    }

    .ep-btn.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 14px 24px;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 14px;
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s ease;
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty state */
    .empty {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .header { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; }
      .logo { justify-content: center; }
      .nav { justify-content: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">
        <div class="logo-icon">▶</div>
        <span class="logo-text">DramaBox</span>
      </div>
      <nav class="nav">
        <button class="nav-btn active" id="btnForyou">For You</button>
        <button class="nav-btn" id="btnNew">Terbaru</button>
        <button class="nav-btn" id="btnRank">Populer</button>
      </nav>
      <div class="search-box">
        <input type="text" class="search-input" id="searchInput" placeholder="Cari drama..." />
        <button class="search-btn" id="btnSearch">Cari</button>
      </div>
    </header>

    <main id="grid" class="grid"></main>
  </div>

  <div class="player-overlay" id="playerOverlay">
    <div class="player-container">
      <div class="player-header">
        <div>
          <h1 class="player-title" id="playerTitle">-</h1>
          <p class="player-subtitle" id="playerSubtitle">Episode 1</p>
        </div>
        <button class="close-btn" id="closePlayer">&times;</button>
      </div>
      <div class="video-wrapper">
        <video id="videoPlayer" controls playsinline></video>
      </div>
      <div class="controls">
        <button class="control-btn" id="prevEp">◀ Prev</button>
        <button class="control-btn primary" id="nextEp">Next ▶</button>
        <select class="quality-select" id="qualitySelect">
          <option value="">Auto</option>
        </select>
        <span class="status-text" id="statusText">Siap</span>
      </div>
      <div class="episodes-section">
        <h3 class="episodes-title">Daftar Episode</h3>
        <div class="episodes-grid" id="episodesGrid"></div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

<script>
const API = "/api";
const ITEMS_PER_PAGE = 15;

const state = {
  mode: "foryou",
  page: 1,
  query: "",
  list: [],
  currentBook: null,
  currentTitle: "",
  chapterIndexes: [],
  currentChapterIndex: 0,
  qualities: [],
  preferredQuality: null,
};

const $ = id => document.getElementById(id);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2500);
}

function esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

async function jget(path) {
  const res = await fetch(API + path, { headers: { accept: "application/json" }});
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

function pickCover(item) {
  return item?.cover || item?.bookCover || item?.bookPic || item?.poster || "";
}

function pickName(item) {
  return item?.bookName || item?.name || item?.title || "Untitled";
}

function getEpNumber(idx) { return Number(idx) + 1; }

function setStatus(text) {
  $("statusText").textContent = text;
}

function saveQuality(bookId, q) {
  try { localStorage.setItem("q:" + bookId, String(q)); } catch {}
}

function loadQuality(bookId) {
  try {
    const v = localStorage.getItem("q:" + bookId);
    return v ? parseInt(v, 10) : null;
  } catch { return null; }
}

function setActiveNav(mode) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (mode === "foryou") $("btnForyou").classList.add("active");
  if (mode === "new") $("btnNew").classList.add("active");
  if (mode === "rank") $("btnRank").classList.add("active");
}

function renderList() {
  const grid = $("grid");
  
  if (!state.list.length) {
    grid.innerHTML = '<div class="empty">Tidak ada data ditemukan.</div>';
    return;
  }

  grid.innerHTML = state.list.map(item => {
    const id = item.bookId ?? item.id ?? "";
    const name = pickName(item);
    const cover = pickCover(item);
    const eps = item.chapterCount ?? item.chapter_count ?? "-";
    return \`
      <div class="card" data-id="\${esc(id)}" data-name="\${esc(name)}" data-cover="\${esc(cover)}">
        <img class="card-img" src="\${esc(cover)}" alt="\${esc(name)}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22><rect fill=%22%231c1c22%22 width=%22100%22 height=%22150%22/><text x=%2250%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>No Image</text></svg>'" />
        <div class="card-body">
          <h3 class="card-title">\${esc(name)}</h3>
          <div class="card-meta">
            <span class="badge">\${eps} Eps</span>
            <div class="play-icon">▶</div>
          </div>
        </div>
      </div>
    \`;
  }).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.onclick = () => openBook(
      card.dataset.id,
      card.dataset.name,
      card.dataset.cover
    );
  });
}

async function loadList(mode, page = 1, query = "") {
  state.mode = mode;
  state.page = page;
  state.query = query;
  setActiveNav(mode);

  $("grid").innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';

  let path = "";
  if (mode === "foryou") path = "/foryou/" + page;
  if (mode === "new") path = "/new/" + page;
  if (mode === "rank") path = "/rank/" + page;
  if (mode === "search") path = "/search/" + encodeURIComponent(query) + "/" + page;

  try {
    const json = await jget(path);
    state.list = (json?.data?.list || []).slice(0, ITEMS_PER_PAGE);
    renderList();
  } catch (err) {
    $("grid").innerHTML = '<div class="empty">Error: ' + esc(err.message) + '</div>';
  }
}

async function openBook(bookId, title, cover) {
  state.currentBook = String(bookId);
  state.currentTitle = title || "Untitled";
  state.currentChapterIndex = 0;
  state.chapterIndexes = [];
  state.qualities = [];

  $("playerTitle").textContent = title;
  $("playerSubtitle").textContent = "Memuat...";
  $("playerOverlay").classList.add("active");
  document.body.style.overflow = "hidden";

  try {
    const json = await jget("/chapters/" + encodeURIComponent(bookId));
    const chapters = json?.data?.chapterList || [];
    
    state.chapterIndexes = chapters
      .map(x => Number(x?.chapterIndex))
      .filter(n => Number.isFinite(n))
      .sort((a, b) => a - b);

    if (state.chapterIndexes.length) {
      state.currentChapterIndex = state.chapterIndexes[0];
    }

    renderEpisodes();
    await loadAndPlay();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

function closePlayer() {
  $("playerOverlay").classList.remove("active");
  document.body.style.overflow = "";
  const video = $("videoPlayer");
  video.pause();
  video.src = "";
}

function renderEpisodes() {
  const grid = $("episodesGrid");
  const current = state.currentChapterIndex;

  if (!state.chapterIndexes.length) {
    grid.innerHTML = '<div style="color: var(--text-muted)">Tidak ada episode.</div>';
    return;
  }

  grid.innerHTML = state.chapterIndexes.map(idx => {
    const ep = getEpNumber(idx);
    const active = idx === current ? "active" : "";
    return \`<button class="ep-btn \${active}" data-idx="\${idx}">Ep \${ep}</button>\`;
  }).join("");

  grid.querySelectorAll(".ep-btn").forEach(btn => {
    btn.onclick = () => goToEpisode(Number(btn.dataset.idx));
  });

  $("playerSubtitle").textContent = "Episode " + getEpNumber(current) + " / " + state.chapterIndexes.length;
}

async function goToEpisode(idx) {
  if (!state.chapterIndexes.includes(idx)) return;
  state.currentChapterIndex = idx;
  renderEpisodes();
  await loadAndPlay();
}

function goRelative(step) {
  const pos = state.chapterIndexes.indexOf(state.currentChapterIndex);
  if (pos === -1) return;
  const next = pos + step;
  if (next < 0) { toast("Sudah episode pertama"); return; }
  if (next >= state.chapterIndexes.length) { toast("Sudah episode terakhir"); return; }
  goToEpisode(state.chapterIndexes[next]);
}

async function loadAndPlay() {
  if (!state.currentBook) return;
  
  const ep = getEpNumber(state.currentChapterIndex);
  setStatus("Memuat Ep " + ep + "...");

  try {
    const json = await jget(
      "/watch/player?bookId=" + encodeURIComponent(state.currentBook) +
      "&index=" + state.currentChapterIndex +
      "&lang=in"
    );

    if (!json?.success) throw new Error("API gagal");

    const data = json.data || {};
    state.qualities = Array.isArray(data.qualities) ? data.qualities : [];

    buildQualityDropdown();
    applyQuality();
    setStatus("Ep " + ep + " siap");
  } catch (err) {
    setStatus("Error: " + err.message);
  }
}

function buildQualityDropdown() {
  const sel = $("qualitySelect");
  sel.innerHTML = '<option value="">Auto</option>';

  if (!state.qualities.length) {
    sel.disabled = true;
    return;
  }

  sel.disabled = false;
  const sorted = [...state.qualities].sort((a, b) => (Number(b.quality) || 0) - (Number(a.quality) || 0));
  const pref = loadQuality(state.currentBook);

  sorted.forEach(q => {
    const opt = document.createElement("option");
    opt.value = String(q.quality);
    opt.textContent = q.quality + "p" + (q.isDefault === 1 ? " *" : "");
    sel.appendChild(opt);
  });

  if (pref && sorted.find(x => Number(x.quality) === pref)) {
    sel.value = String(pref);
  } else {
    const def = sorted.find(x => x.isDefault === 1);
    sel.value = def ? String(def.quality) : "";
  }

  sel.onchange = () => {
    const val = sel.value;
    if (val) saveQuality(state.currentBook, parseInt(val, 10));
    applyQuality();
  };
}

function applyQuality() {
  const video = $("videoPlayer");
  const sel = $("qualitySelect");
  const wantedQ = sel.value ? parseInt(sel.value, 10) : null;

  const sorted = [...state.qualities].sort((a, b) => (Number(b.quality) || 0) - (Number(a.quality) || 0));
  let pick = wantedQ ? sorted.find(x => Number(x.quality) === wantedQ) : null;
  if (!pick) pick = sorted.find(x => x.isDefault === 1) || sorted[0];

  let url = pick?.videoPath || pick?.videoUrl || "";
  if (typeof url === "string" && url.startsWith("//")) url = "https:" + url;

  if (!url) {
    setStatus("Link video kosong");
    return;
  }

  const prevTime = video.currentTime || 0;
  const wasPaused = video.paused;

  video.src = url;
  video.load();

  if (prevTime > 0) video.currentTime = prevTime;
  if (!wasPaused) video.play().catch(() => {});
}

// Events
$("btnForyou").onclick = () => loadList("foryou", 1);
$("btnNew").onclick = () => loadList("new", 1);
$("btnRank").onclick = () => loadList("rank", 1);

$("btnSearch").onclick = () => {
  const q = $("searchInput").value.trim();
  if (!q) return toast("Masukkan judul dulu");
  loadList("search", 1, q);
};

$("searchInput").onkeydown = e => {
  if (e.key === "Enter") $("btnSearch").click();
};

$("closePlayer").onclick = closePlayer;
$("prevEp").onclick = () => goRelative(-1);
$("nextEp").onclick = () => goRelative(1);

$("playerOverlay").onclick = e => {
  if (e.target === $("playerOverlay")) closePlayer();
};

// Init
loadList("foryou", 1);
</script>
</body>
</html>`;
}
