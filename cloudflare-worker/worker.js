/**
 * Cloudflare Worker - Multi-Source Streaming Panel
 * Supports: MELOLO, Dramabox, Tensei (Anime), DramaId, MovieBox
 * Features: Pagination, Genre Filter (Tensei)
 * Deploy via GitHub Actions to Cloudflare Workers
 */

const API_BASE = "https://dramabos.asia/api";

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
  <title>StreamBox - Multi Source</title>
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

    /* Source Selector */
    .source-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: rgba(24,24,27,0.9);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 12px;
    }

    .source-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-muted);
    }

    .source-tabs {
      display: flex;
      gap: 6px;
    }

    .source-tab {
      padding: 8px 16px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .source-tab:hover { background: var(--bg-card); color: var(--text); }

    .source-tab.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
    }

    .source-icon {
      font-size: 16px;
    }

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

    /* Genre Filter */
    .genre-filter {
      display: none;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: rgba(24,24,27,0.9);
      backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 12px;
    }

    .genre-filter.show {
      display: flex;
    }

    .genre-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .genre-select {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      max-width: 300px;
    }

    .genre-select:hover {
      border-color: var(--primary);
    }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 24px 20px;
      margin-top: 20px;
    }

    .page-btn {
      padding: 10px 16px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      min-width: 44px;
    }

    .page-btn:hover:not(:disabled) {
      background: var(--bg-elevated);
      border-color: var(--primary);
    }

    .page-btn.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-info {
      padding: 0 12px;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 600;
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

    .badge.cyan {
      background: rgba(6,182,212,0.15);
      color: var(--accent);
    }

    .badge.rose {
      background: rgba(244,63,94,0.15);
      color: #f43f5e;
    }

    .badge.red {
      background: rgba(220,38,38,0.15);
      color: #dc2626;
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

    .empty {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    /* Brand Header */
    .brand-header {
      text-align: center;
      padding: 24px 20px 16px;
      background: rgba(0, 0, 0, 0.3);
      border-bottom: 2px solid var(--primary);
    }

    .brand-title {
      font-size: 56px;
      font-weight: 900;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 10px;
      text-transform: uppercase;
      text-shadow: 0 0 40px var(--primary-glow);
      animation: brandGlow 3s ease-in-out infinite;
      margin-bottom: 12px;
    }

    .brand-info {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .brand-info-item {
      font-size: 13px;
      color: var(--text-muted);
    }

    .brand-info-item a {
      color: var(--primary);
      text-decoration: none;
      transition: all 0.3s ease;
    }

    .brand-info-item a:hover {
      color: var(--secondary);
      text-shadow: 0 0 10px var(--primary-glow);
    }

    @keyframes brandGlow {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }

    @media (max-width: 768px) {
      .brand-title {
        font-size: 38px;
        letter-spacing: 5px;
      }
      .brand-info {
        flex-direction: column;
        gap: 8px;
      }
      .header { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; }
      .logo { justify-content: center; }
      .nav { justify-content: center; }
      .source-bar { flex-wrap: wrap; justify-content: center; }
      .genre-filter { flex-wrap: wrap; }
      .pagination { flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <h1 class="brand-title">ZEROSTORE</h1>
    <div class="brand-info">
      <div class="brand-info-item">Admin: <a href="https://t.me/kakatiri" target="_blank" rel="noopener">t.me/kakatiri</a></div>
      <div class="brand-info-item">Thanks for API: <a href="https://t.me/yourealya" target="_blank" rel="noopener">t.me/@yourealya</a></div>
    </div>
  </div>
  <div class="container">
    <div class="source-bar">
      <span class="source-label">Sumber:</span>
      <div class="source-tabs">
        <button class="source-tab active" data-source="melolo">
          <span class="source-icon">🔴</span> MELOLO
        </button>
        <button class="source-tab" data-source="dramabox">
          <span class="source-icon">🎬</span> Dramabox
        </button>
        <button class="source-tab" data-source="tensei">
          <span class="source-icon">🎌</span> Tensei
        </button>
        <button class="source-tab" data-source="dramaid">
          <span class="source-icon">🎭</span> DramaId
        </button>
        <button class="source-tab" data-source="moviebox">
          <span class="source-icon">🍿</span> MovieBox
        </button>
      </div>
    </div>

    <div class="genre-filter" id="genreFilter">
      <span class="genre-label">Genre:</span>
      <select class="genre-select" id="genreSelect">
        <option value="">Semua Genre</option>
      </select>
    </div>

    <header class="header">
      <div class="logo">
        <div class="logo-icon">▶</div>
        <span class="logo-text" id="logoText">MELOLO</span>
      </div>
      <nav class="nav" id="navTabs"></nav>
      <div class="search-box">
        <input type="text" class="search-input" id="searchInput" placeholder="Cari..." />
        <button class="search-btn" id="btnSearch">Cari</button>
      </div>
    </header>

    <main id="grid" class="grid"></main>

    <div class="pagination" id="pagination"></div>
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

const SOURCES = {
  melolo: {
    name: "MELOLO",
    color: "#dc2626",
    navTabs: [
      { id: "home", label: "Home" }
    ]
  },
  dramabox: {
    name: "Dramabox",
    color: "#a855f7",
    navTabs: [
      { id: "foryou", label: "For You" },
      { id: "new", label: "Terbaru" },
      { id: "rank", label: "Populer" }
    ]
  },
  tensei: {
    name: "Tensei Anime",
    color: "#06b6d4",
    navTabs: [
      { id: "home", label: "Home" },
      { id: "ongoing", label: "Ongoing" },
      { id: "completed", label: "Completed" }
    ]
  },
  dramaid: {
    name: "DramaId",
    color: "#f43f5e",
    navTabs: [
      { id: "home", label: "Home" }
    ]
  },
  moviebox: {
    name: "MovieBox",
    color: "#f59e0b",
    navTabs: [
      { id: "popular", label: "Popular" }
    ]
  }
};

const state = {
  source: "melolo",
  mode: "home",
  page: 1,
  totalPages: 1,
  query: "",
  genre: "",
  genres: [],
  list: [],
  currentId: null,
  currentSlug: null,
  currentTitle: "",
  episodes: [],
  currentEpIndex: 0,
  qualities: [],
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
  console.log("Fetching:", API + path);
  const res = await fetch(API + path, { headers: { accept: "application/json" }});
  if (!res.ok) {
    console.error("HTTP error:", res.status, res.statusText);
    const text = await res.text();
    console.error("Response:", text);
    throw new Error("HTTP " + res.status);
  }
  const data = await res.json();
  console.log("Response data:", data);
  return data;
}

function setStatus(text) {
  $("statusText").textContent = text;
}

// ========== GENRE MANAGEMENT ==========

async function loadGenres() {
  try {
    const json = await jget("/tensei/genres");
    if (json?.code === 0 && Array.isArray(json.data)) {
      const seen = new Set();
      state.genres = json.data.filter(g => {
        if (!g.slug || seen.has(g.slug)) return false;
        seen.add(g.slug);
        return true;
      });
      renderGenreSelect();
    }
  } catch (err) {
    console.error("Failed to load genres:", err);
  }
}

function renderGenreSelect() {
  const select = $("genreSelect");
  select.innerHTML = '<option value="">Semua Genre</option>';

  state.genres.forEach(genre => {
    const opt = document.createElement("option");
    opt.value = genre.slug;
    opt.textContent = genre.name;
    select.appendChild(opt);
  });

  select.value = state.genre;
}

function showGenreFilter(show) {
  const filter = $("genreFilter");
  if (show) {
    filter.classList.add("show");
  } else {
    filter.classList.remove("show");
  }
}

// ========== SOURCE SWITCHING ==========

async function switchSource(source) {
  if (!SOURCES[source]) return;
  state.source = source;
  state.list = [];
  state.page = 1;
  state.query = "";
  state.genre = "";

  document.querySelectorAll(".source-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.source === source);
  });

  $("logoText").textContent = SOURCES[source].name;
  $("searchInput").placeholder = "Cari " + SOURCES[source].name + "...";

  if (source === "tensei" && state.genres.length === 0) {
    await loadGenres();
  }

  showGenreFilter(source === "tensei");

  renderNavTabs();

  const firstTab = SOURCES[source].navTabs[0].id;
  loadList(firstTab, 1);
}

function renderNavTabs() {
  const nav = $("navTabs");
  const tabs = SOURCES[state.source].navTabs;

  nav.innerHTML = tabs.map((tab, i) =>
    "<button class=\\"nav-btn " + (i === 0 ? 'active' : '') + "\\" data-mode=\\"" + tab.id + "\\">" + tab.label + "</button>"
  ).join("");

  nav.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => loadList(btn.dataset.mode, 1);
  });
}

function setActiveNav(mode) {
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
}

// ========== PAGINATION ==========

function renderPagination() {
  const container = $("pagination");

  if (state.mode === "search" || state.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const current = state.page;
  const total = state.totalPages;

  let html = '';

  html += "<button class=\\"page-btn\\" " + (current <= 1 ? 'disabled' : '') + " data-page=\\"" + (current - 1) + "\\">◀ Prev</button>";

  const maxButtons = 5;
  let startPage = Math.max(1, current - Math.floor(maxButtons / 2));
  let endPage = Math.min(total, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    html += "<button class=\\"page-btn\\" data-page=\\"1\\">1</button>";
    if (startPage > 2) {
      html += "<span class=\\"page-info\\">...</span>";
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += "<button class=\\"page-btn " + (i === current ? 'active' : '') + "\\" data-page=\\"" + i + "\\">" + i + "</button>";
  }

  if (endPage < total) {
    if (endPage < total - 1) {
      html += "<span class=\\"page-info\\">...</span>";
    }
    html += "<button class=\\"page-btn\\" data-page=\\"" + total + "\\">" + total + "</button>";
  }

  html += "<button class=\\"page-btn\\" " + (current >= total ? 'disabled' : '') + " data-page=\\"" + (current + 1) + "\\">Next ▶</button>";

  container.innerHTML = html;

  container.querySelectorAll(".page-btn").forEach(btn => {
    if (!btn.disabled) {
      btn.onclick = () => loadList(state.mode, parseInt(btn.dataset.page), state.query);
    }
  });
}

// ========== LIST LOADING ==========

async function loadList(mode, page = 1, query = "") {
  state.mode = mode;
  state.page = page;
  state.query = query;
  setActiveNav(mode);

  $("grid").innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';

  try {
    if (state.source === "melolo") {
      await loadMeloloList(mode, page, query);
    } else if (state.source === "dramabox") {
      await loadDramaboxList(mode, page, query);
    } else if (state.source === "tensei") {
      await loadTenseiList(mode, page, query);
    } else if (state.source === "dramaid") {
      await loadDramaidList(mode, page, query);
    } else if (state.source === "moviebox") {
      await loadMovieboxList(mode, page, query);
    }
    renderList();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    $("grid").innerHTML = '<div class="empty">Error: ' + esc(err.message) + '</div>';
  }
}

async function loadMeloloList(mode, page, query) {
  let path = "";
  const offset = (page - 1) * 18;

  if (mode === "home") path = "/melolo/api/v1/home?offset=" + offset + "&count=18&lang=id";
  if (mode === "search") path = "/melolo/api/v1/search?q=" + encodeURIComponent(query) + "&offset=" + offset + "&count=20&lang=id";

  const json = await jget(path);
  state.list = (json?.data || []).map(item => ({
    id: item.id ?? "",
    title: item.name || item.title || "Untitled",
    img: item.cover || "",
    badge: (item.episodes ?? 0) + " Eps",
    type: "melolo"
  }));

  state.totalPages = mode === "search" ? 1 : 50;
}

async function loadDramaboxList(mode, page, query) {
  let path = "";
  if (mode === "foryou") path = "/dramabox/api/foryou/" + page;
  if (mode === "new") path = "/dramabox/api/new/" + page;
  if (mode === "rank") path = "/dramabox/api/rank/" + page;
  if (mode === "search") path = "/dramabox/api/search/" + encodeURIComponent(query) + "/" + page;

  const json = await jget(path + "?lang=in");
  state.list = (json?.data?.list || []).slice(0, 15).map(item => ({
    id: item.bookId ?? item.id ?? "",
    title: item.bookName || item.name || item.title || "Untitled",
    img: item.cover || item.bookCover || item.bookPic || item.poster || "",
    badge: (item.chapterCount ?? item.chapter_count ?? "-") + " Eps",
    type: "dramabox"
  }));

  state.totalPages = mode === "search" ? 1 : 30;
}

async function loadTenseiList(mode, page, query) {
  let path = "";
  if (mode === "home") path = "/tensei/home?page=" + page;
  if (mode === "ongoing") path = "/tensei/anime?page=" + page + "&status=Ongoing&order=update";
  if (mode === "completed") path = "/tensei/anime?page=" + page + "&status=Completed&order=update";
  if (mode === "search") path = "/tensei/search?q=" + encodeURIComponent(query);

  if (state.genre && mode !== "search") {
    path += (path.includes("?") ? "&" : "?") + "genres=" + encodeURIComponent(state.genre);
  }

  const json = await jget(path);
  const raw = json?.data || [];

  const seen = new Set();
  const unique = raw.filter(item => {
    const slug = item.slug || "";
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  state.list = unique.slice(0, 15).map(item => ({
    id: item.slug || "",
    title: item.title || "Untitled",
    img: upgradeImageQuality(item.img || ""),
    badge: item.status || item.episode || item.type || "Anime",
    type: "tensei"
  }));

  state.totalPages = mode === "search" ? 1 : 50;
}

function upgradeImageQuality(url) {
  if (!url) return "";
  return url.replace(/resize=\d+,\d+/, "resize=400,560");
}

async function loadDramaidList(mode, page, query) {
  let path = "";
  if (mode === "home") path = "/dramaid/home?page=" + page;
  if (mode === "search") path = "/dramaid/search?q=" + encodeURIComponent(query);

  const json = await jget(path);
  const raw = json?.data || [];

  const seen = new Set();
  const unique = raw.filter(item => {
    const slug = item.slug || "";
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  state.list = unique.slice(0, 15).map(item => ({
    id: item.slug || "",
    title: (item.title || "Untitled").replace(/Nonton Drama |Nonton Drakor | Sub Indo|\(\d+\)/g, "").trim(),
    img: item.img || item.poster || "",
    badge: item.negara || item.score || "Drama",
    extra: item.episode || "",
    type: "dramaid"
  }));

  state.totalPages = mode === "search" ? 1 : 20;
}

async function loadMovieboxList(mode, page, query) {
  let path = "";
  if (mode === "popular") path = "/moviebox/v1/popular?p=" + (page - 1);
  if (mode === "search") path = "/moviebox/v1/find?q=" + encodeURIComponent(query);

  const json = await jget(path);
  const list = mode === "search" ? (json?.items || []) : (json?.subjectList || []);

  state.list = list.slice(0, 15).map(item => ({
    id: item.subjectId || "",
    title: item.title || "Untitled",
    img: item.cover?.url || item.thumbnail || "",
    badge: (item.imdbRatingValue || "N/A") + " ⭐",
    extra: item.genre || "Movie",
    type: "moviebox"
  }));

  state.totalPages = mode === "search" ? 1 : 20;
}

function renderList() {
  const grid = $("grid");

  if (!state.list.length) {
    grid.innerHTML = '<div class="empty">Tidak ada data ditemukan.</div>';
    return;
  }

  grid.innerHTML = state.list.map(item => {
    const badgeClass = item.type === 'melolo' ? 'red' : item.type === 'tensei' ? 'cyan' : item.type === 'dramaid' ? 'rose' : item.type === 'moviebox' ? 'badge' : '';
    return "<div class=\\"card\\" data-id=\\"" + esc(item.id) + "\\" data-title=\\"" + esc(item.title) + "\\" data-type=\\"" + item.type + "\\">" +
      "<img class=\\"card-img\\" src=\\"" + esc(item.img) + "\\" alt=\\"" + esc(item.title) + "\\" loading=\\"lazy\\" " +
        "onerror=\\"this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 150%22><rect fill=%22%231c1c22%22 width=%22100%22 height=%22150%22/><text x=%2250%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2210%22>No Image</text></svg>'\\" />" +
      "<div class=\\"card-body\\">" +
        "<h3 class=\\"card-title\\">" + esc(item.title) + "</h3>" +
        "<div class=\\"card-meta\\">" +
          "<span class=\\"badge " + badgeClass + "\\">" + esc(item.badge) + "</span>" +
          "<div class=\\"play-icon\\">▶</div>" +
        "</div>" +
      "</div>" +
    "</div>";
  }).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.onclick = () => openContent(card.dataset.id, card.dataset.title, card.dataset.type);
  });
}

// ========== PLAYER ==========

async function openContent(id, title, type) {
  state.currentId = id;
  state.currentSlug = id;
  state.currentTitle = title || "Untitled";
  state.episodes = [];
  state.currentEpIndex = 0;
  state.qualities = [];

  $("playerTitle").textContent = title;
  $("playerSubtitle").textContent = "Memuat...";
  $("playerOverlay").classList.add("active");
  document.body.style.overflow = "hidden";

  try {
    if (type === "melolo") {
      await loadMeloloEpisodes(id);
    } else if (type === "dramabox") {
      await loadDramaboxEpisodes(id);
    } else if (type === "tensei") {
      await loadTenseiEpisodes(id);
    } else if (type === "dramaid") {
      await loadDramaidEpisodes(id);
    } else if (type === "moviebox") {
      await loadMovieboxEpisodes(id);
    }
    renderEpisodes();
    await loadAndPlay();
  } catch (err) {
    toast("Error: " + err.message);
  }
}

async function loadMeloloEpisodes(id) {
  const json = await jget("/melolo/api/v1/detail/" + encodeURIComponent(id) + "?lang=id");
  const videos = json?.videos || [];

  state.episodes = videos.map(v => ({
    index: v.episode - 1,
    vid: v.vid || "",
    slug: v.vid || "",
    label: "Ep " + v.episode,
    duration: v.duration || 0
  }));

  if (state.episodes.length) {
    state.currentEpIndex = 0;
  }
}

async function loadDramaboxEpisodes(bookId) {
  const json = await jget("/dramabox/api/chapters/" + encodeURIComponent(bookId) + "?lang=in");
  const chapters = json?.data?.chapterList || [];

  state.episodes = chapters
    .map(x => ({
      index: Number(x?.chapterIndex),
      slug: String(x?.chapterIndex),
      label: "Ep " + (Number(x?.chapterIndex) + 1)
    }))
    .filter(ep => Number.isFinite(ep.index))
    .sort((a, b) => a.index - b.index);

  if (state.episodes.length) {
    state.currentEpIndex = 0;
  }
}

async function loadTenseiEpisodes(slug) {
  const json = await jget("/tensei/detail/" + encodeURIComponent(slug));
  const eps = json?.data?.episodes || [];

  state.episodes = eps.map((ep, i) => ({
    index: i,
    slug: ep.slug || "",
    label: "Ep " + (ep.ep || (i + 1))
  }));

  if (state.episodes.length) {
    state.currentEpIndex = 0;
  }
}

async function loadDramaidEpisodes(slug) {
  const json = await jget("/dramaid/detail/" + encodeURIComponent(slug));
  const eps = json?.data?.episodes || [];

  state.episodes = eps.map((ep, i) => ({
    index: i,
    epNum: ep.ep || (i + 1),
    slug: slug,
    label: "Ep " + (ep.ep || (i + 1))
  }));

  if (state.episodes.length) {
    state.currentEpIndex = 0;
  }
}

async function loadMovieboxEpisodes(subjectId) {
  console.log("Loading MovieBox episodes for:", subjectId);
  const json = await jget("/moviebox/v1/info/" + encodeURIComponent(subjectId));
  console.log("Info response:", json);
  const subject = json?.subject || {};
  const resource = json?.resource || {};
  console.log("Subject:", subject);
  console.log("Resource:", resource);

  if (subject.subjectType === 1) {
    state.episodes = [{
      index: 0,
      subjectId: subjectId,
      season: 1,
      episode: 1,
      label: "Movie"
    }];
    console.log("Movie type detected, episodes:", state.episodes);
  } else {
    const seasons = resource.seasons || [];
    let eps = [];
    seasons.forEach((season) => {
      const seasonNum = season.se || 1;
      const epCount = season.maxEp || 0;
      for (let i = 1; i <= epCount; i++) {
        eps.push({
          index: eps.length,
          subjectId: subjectId,
          season: seasonNum,
          episode: i,
          label: "S" + seasonNum + " E" + i
        });
      }
    });
    state.episodes = eps;
    console.log("TV series type detected, episodes:", state.episodes);
  }

  if (state.episodes.length) {
    state.currentEpIndex = 0;
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
  const current = state.currentEpIndex;

  if (!state.episodes.length) {
    grid.innerHTML = '<div style="color: var(--text-muted)">Tidak ada episode.</div>';
    return;
  }

  grid.innerHTML = state.episodes.map((ep, i) => {
    const active = i === current ? "active" : "";
    return "<button class=\\"ep-btn " + active + "\\" data-idx=\\"" + i + "\\">" + esc(ep.label) + "</button>";
  }).join("");

  grid.querySelectorAll(".ep-btn").forEach(btn => {
    btn.onclick = () => goToEpisode(Number(btn.dataset.idx));
  });

  const currentEp = state.episodes[current];
  $("playerSubtitle").textContent = (currentEp?.label || "Episode " + (current + 1)) + " / " + state.episodes.length;
}

async function goToEpisode(idx) {
  if (idx < 0 || idx >= state.episodes.length) return;
  state.currentEpIndex = idx;
  renderEpisodes();
  await loadAndPlay();
}

function goRelative(step) {
  const next = state.currentEpIndex + step;
  if (next < 0) { toast("Sudah episode pertama"); return; }
  if (next >= state.episodes.length) { toast("Sudah episode terakhir"); return; }
  goToEpisode(next);
}

async function loadAndPlay() {
  const ep = state.episodes[state.currentEpIndex];
  if (!ep) return;

  setStatus("Memuat " + ep.label + "...");

  try {
    if (state.source === "melolo") {
      await loadMeloloVideo(ep);
    } else if (state.source === "dramabox") {
      await loadDramaboxVideo(ep);
    } else if (state.source === "tensei") {
      await loadTenseiVideo(ep);
    } else if (state.source === "dramaid") {
      await loadDramaidVideo(ep);
    } else if (state.source === "moviebox") {
      await loadMovieboxVideo(ep);
    }

    buildQualityDropdown();
    applyQuality();
    setStatus(ep.label + " siap");
  } catch (err) {
    setStatus("Error: " + err.message);
  }
}

async function loadMeloloVideo(ep) {
  const json = await jget("/melolo/api/v1/video/" + encodeURIComponent(ep.vid) + "?lang=id");

  if (!json?.url) throw new Error("Video tidak tersedia");

  state.qualities = [{
    label: "Default",
    value: 0,
    url: json.url,
    isDefault: true
  }];

  if (json.backup) {
    state.qualities.push({
      label: "Backup",
      value: 1,
      url: json.backup,
      isDefault: false
    });
  }

  if (Array.isArray(json.list)) {
    json.list.forEach((q, i) => {
      state.qualities.push({
        label: q.definition || ("Quality " + (i + 1)),
        value: state.qualities.length,
        url: q.url || "",
        isDefault: false
      });
    });
  }
}

async function loadDramaboxVideo(ep) {
  const json = await jget(
    "/dramabox/api/watch/player?bookId=" + encodeURIComponent(state.currentId) +
    "&index=" + ep.index + "&lang=in"
  );

  if (!json?.success) throw new Error("API gagal");

  const data = json.data || {};
  state.qualities = Array.isArray(data.qualities) ? data.qualities.map(q => ({
    label: q.quality + "p",
    value: q.quality,
    url: q.videoPath || q.videoUrl || "",
    isDefault: q.isDefault === 1
  })) : [];
}

async function loadTenseiVideo(ep) {
  const json = await jget("/tensei/stream/" + encodeURIComponent(ep.slug));

  if (json?.code !== 0) throw new Error("API gagal");

  state.qualities = (json?.data || []).map((q, i) => ({
    label: q.quality || ("Quality " + (i + 1)),
    value: i,
    url: q.url || "",
    isDefault: i === 0
  }));
}

async function loadDramaidVideo(ep) {
  const json = await jget("/dramaid/play/" + encodeURIComponent(ep.slug) + "/" + ep.epNum);

  if (json?.code !== 0) throw new Error("API gagal");

  const streams = json?.data?.streams || [];
  state.qualities = streams.map((s, i) => ({
    label: s.quality || ("Quality " + (i + 1)),
    value: i,
    url: s.url || "",
    isDefault: s.quality === "720p" || i === streams.length - 1
  }));
}

async function loadMovieboxVideo(ep) {
  console.log("Loading MovieBox video:", ep);
  const watchJson = await jget("/moviebox/v1/watch/" + encodeURIComponent(ep.subjectId) + "?s=" + ep.season + "&e=" + ep.episode);
  console.log("Watch response:", watchJson);

  const sources = watchJson.processedSources || watchJson.downloads || [];
  console.log("Sources found:", sources);

  if (sources.length === 0) {
    console.error("No sources available in response");
    throw new Error("Video tidak tersedia");
  }

  state.qualities = sources.map((source, i) => ({
    label: (source.quality || source.resolution) + "p",
    value: i,
    url: source.directUrl || source.url,
    isDefault: (source.quality || source.resolution) === 720 || (source.quality || source.resolution) === 480
  }));

  console.log("Qualities mapped:", state.qualities);

  if (state.qualities.length === 0) {
    throw new Error("Tidak ada stream video yang tersedia");
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

  state.qualities.forEach((q, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = q.label + (q.isDefault ? " *" : "");
    sel.appendChild(opt);
  });

  const defIdx = state.qualities.findIndex(q => q.isDefault);
  sel.value = defIdx >= 0 ? String(defIdx) : "0";

  sel.onchange = () => applyQuality();
}

function applyQuality() {
  const video = $("videoPlayer");
  const sel = $("qualitySelect");
  const idx = sel.value !== "" ? parseInt(sel.value, 10) : 0;

  const pick = state.qualities[idx] || state.qualities[0];
  if (!pick) {
    setStatus("Link video kosong");
    return;
  }

  let url = pick.url || "";
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

// ========== EVENTS ==========

document.querySelectorAll(".source-tab").forEach(tab => {
  tab.onclick = () => switchSource(tab.dataset.source);
});

$("btnSearch").onclick = () => {
  const q = $("searchInput").value.trim();
  if (!q) return toast("Masukkan judul dulu");
  loadList("search", 1, q);
};

$("searchInput").onkeydown = e => {
  if (e.key === "Enter") $("btnSearch").click();
};

$("genreSelect").onchange = () => {
  state.genre = $("genreSelect").value;
  loadList(state.mode, 1);
};

$("closePlayer").onclick = closePlayer;
$("prevEp").onclick = () => goRelative(-1);
$("nextEp").onclick = () => goRelative(1);

$("playerOverlay").onclick = e => {
  if (e.target === $("playerOverlay")) closePlayer();
};

// ========== INIT ==========
switchSource("melolo");
</script>
</body>
</html>`;
}
