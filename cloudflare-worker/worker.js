/**
 * Cloudflare Worker - Multi-Source Streaming Panel
 * Supports: MELOLO, Dramabox, Samehadaku (Anime)
 * Features: Pagination, Multiple Quality Options
 * Deploy via GitHub Actions to Cloudflare Workers
 * API: Sonzaix Hub by @November2k
 */

const API_BASE = "https://api.sonzaix.indevs.in";

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

    // Stream proxy for video URLs
    if (url.pathname === "/stream") {
      return proxyStream(request, url);
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

async function proxyStream(request, url) {
  const videoUrl = url.searchParams.get("url");

  if (!videoUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const headers = new Headers({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  });

  // Set referer based on video URL domain
  if (videoUrl.includes("aoneroom.com") || videoUrl.includes("melolo")) {
    headers.set("Referer", "https://h5.aoneroom.com/");
    headers.set("Origin", "https://h5.aoneroom.com");
  } else if (videoUrl.includes("berkasdrive.com")) {
    headers.set("Referer", "https://berkasdrive.com/");
  } else if (videoUrl.includes("dramaid") || videoUrl.includes("emturbovid") || videoUrl.includes("streamtape")) {
    headers.set("Referer", "https://dramaid.us/");
  }

  if (request.headers.has("range")) {
    headers.set("Range", request.headers.get("range"));
  }

  try {
    const response = await fetch(videoUrl, {
      method: "GET",
      headers: headers,
      cf: { cacheEverything: false, cacheTtl: 300 }
    });

    const responseHeaders = new Headers(response.headers);
    const c = corsHeaders();
    c.forEach((v, k) => responseHeaders.set(k, v));

    responseHeaders.set("cache-control", "public, max-age=300");

    if (response.headers.has("content-range")) {
      responseHeaders.set("content-range", response.headers.get("content-range"));
    }
    if (response.headers.has("accept-ranges")) {
      responseHeaders.set("accept-ranges", response.headers.get("accept-ranges"));
    }
    if (response.headers.has("content-length")) {
      responseHeaders.set("content-length", response.headers.get("content-length"));
    }
    if (response.headers.has("content-type")) {
      responseHeaders.set("content-type", response.headers.get("content-type"));
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error("Stream proxy error:", error);
    return new Response("Failed to fetch video: " + error.message, { status: 500 });
  }
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
      --bg: #0a0a0f;
      --bg-elevated: #16161f;
      --bg-card: #1a1a26;
      --border: rgba(255,255,255,0.06);
      --text: #ffffff;
      --text-muted: #9ca3af;
      --primary: #8b5cf6;
      --primary-dark: #7c3aed;
      --primary-glow: rgba(139,92,246,0.3);
      --accent: #06b6d4;
      --accent-pink: #ec4899;
      --accent-orange: #f97316;
      --gradient: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%);
      --gradient-card: linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(236,72,153,0.1) 100%);
      --shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
      --shadow-colored: 0 20px 40px rgba(139,92,246,0.2);
      --radius: 20px;
      --radius-sm: 12px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    html {
      overflow-x: hidden;
      width: 100%;
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
      overflow-x: hidden;
      width: 100%;
      position: relative;
    }

    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        radial-gradient(ellipse 100% 60% at 20% 0%, var(--primary-glow), transparent),
        radial-gradient(ellipse 80% 50% at 80% 100%, rgba(236,72,153,0.2), transparent),
        radial-gradient(ellipse 60% 40% at 50% 50%, rgba(6,182,212,0.1), transparent);
      pointer-events: none;
      z-index: -1;
      animation: backgroundShift 15s ease-in-out infinite;
    }

    @keyframes backgroundShift {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .container { max-width: 1400px; margin: 0 auto; padding: 20px; overflow-x: hidden; width: 100%; }

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
      overflow-x: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .source-bar::-webkit-scrollbar {
      display: none;
    }

    .source-label {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-muted);
      flex-shrink: 0;
      white-space: nowrap;
    }

    .source-tabs {
      display: flex;
      gap: 6px;
      flex-wrap: nowrap;
    }

    .source-tab {
      padding: 10px 20px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      border-radius: 12px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
    }

    .source-tab::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--gradient);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .source-tab:hover { 
      background: var(--bg-card); 
      color: var(--text);
      border-color: var(--primary);
      transform: translateY(-2px);
    }

    .source-tab.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
      box-shadow: 0 4px 16px rgba(139,92,246,0.4);
      transform: translateY(-1px);
    }

    .source-tab .source-icon {
      font-size: 18px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
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
      overflow-x: hidden;
      width: 100%;
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
      padding: 10px 20px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .nav-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--gradient);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .nav-btn:hover {
      background: var(--bg-card);
      color: var(--text);
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(139,92,246,0.2);
    }

    .nav-btn.active {
      background: var(--gradient);
      color: white;
      border-color: transparent;
      box-shadow: 0 4px 16px rgba(139,92,246,0.4);
    }

    .nav-btn.active::before {
      opacity: 1;
    }

    .search-box {
      display: flex;
      gap: 8px;
      flex: 1;
      max-width: 400px;
      min-width: 0;
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
      min-width: 0;
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
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(139,92,246,0.3);
    }

    .search-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(139,92,246,0.5);
    }

    .search-btn:active {
      transform: translateY(0px);
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
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 44px;
    }

    .page-btn:hover:not(:disabled) {
      background: var(--bg-elevated);
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(139,92,246,0.2);
    }

    .page-btn.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
      box-shadow: 0 4px 16px rgba(139,92,246,0.4);
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-btn:active:not(:disabled) {
      transform: translateY(0px);
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
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--gradient-card);
      opacity: 0;
      transition: opacity 0.4s ease;
      z-index: 0;
    }

    .card:hover::before {
      opacity: 1;
    }

    .card:hover {
      transform: translateY(-8px) scale(1.02);
      border-color: var(--primary);
      box-shadow: var(--shadow-colored), 0 0 40px rgba(139,92,246,0.3);
    }

    .card-img, .card-body {
      position: relative;
      z-index: 1;
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
      padding: 5px 12px;
      background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(168,85,247,0.3));
      color: #c084fc;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      border: 1px solid rgba(139,92,246,0.3);
      box-shadow: 0 2px 8px rgba(139,92,246,0.2);
    }

    .badge.cyan {
      background: linear-gradient(135deg, rgba(6,182,212,0.2), rgba(20,184,166,0.3));
      color: #5eead4;
      border-color: rgba(6,182,212,0.3);
      box-shadow: 0 2px 8px rgba(6,182,212,0.2);
    }

    .badge.red {
      background: linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.3));
      color: #fca5a5;
      border-color: rgba(220,38,38,0.3);
      box-shadow: 0 2px 8px rgba(220,38,38,0.2);
    }

    .play-icon {
      width: 36px;
      height: 36px;
      background: var(--gradient);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      opacity: 0;
      transform: scale(0.7) rotate(-90deg);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(139,92,246,0.4);
    }

    .card:hover .play-icon {
      opacity: 1;
      transform: scale(1.1) rotate(0deg);
      box-shadow: 0 6px 20px rgba(139,92,246,0.6);
    }

    .play-icon:active {
      transform: scale(0.95) rotate(0deg);
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
      width: 44px;
      height: 44px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: 12px;
      cursor: pointer;
      font-size: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: var(--gradient);
      border-color: transparent;
      transform: rotate(90deg) scale(1.1);
      box-shadow: 0 4px 16px rgba(139,92,246,0.5);
    }

    .close-btn:active {
      transform: rotate(90deg) scale(0.95);
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
      padding: 12px 20px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .control-btn:hover {
      background: var(--bg-elevated);
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(139,92,246,0.3);
    }

    .control-btn:active {
      transform: translateY(0px);
    }

    .control-btn.primary {
      background: var(--gradient);
      border: none;
      box-shadow: 0 4px 12px rgba(139,92,246,0.4);
    }

    .control-btn.primary:hover {
      box-shadow: 0 6px 20px rgba(139,92,246,0.6);
      transform: translateY(-2px);
    }

    .quality-select {
      padding: 12px 16px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      border-radius: var(--radius-sm);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      transition: all 0.3s ease;
    }

    .quality-select:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(139,92,246,0.2);
    }

    .quality-select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
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
      padding: 14px 10px;
      border: 1px solid var(--border);
      background: var(--bg);
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .ep-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--gradient);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .ep-btn:hover {
      border-color: var(--primary);
      color: var(--text);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(139,92,246,0.3);
    }

    .ep-btn:hover::before {
      opacity: 0.1;
    }

    .ep-btn.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
      box-shadow: 0 4px 16px rgba(139,92,246,0.4);
      transform: scale(1.05);
    }

    .ep-btn.active::before {
      opacity: 1;
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

    /* Download Section (for Samehadaku) */
    .download-section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      margin-top: 20px;
    }

    .download-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .download-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }

    .download-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: linear-gradient(135deg, var(--bg-elevated), var(--bg-card));
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }

    .download-btn:hover {
      background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1));
      border-color: var(--primary);
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(139,92,246,0.3);
    }

    .download-quality {
      font-weight: 700;
      color: var(--primary);
    }

    .download-host {
      font-size: 11px;
      color: var(--text-muted);
      background: rgba(255,255,255,0.05);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .download-icon {
      font-size: 16px;
    }

    .video-hidden {
      display: none !important;
    }

    /* Continue Watching & Favorites Section */
    .feature-section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 0 4px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-icon {
      font-size: 24px;
    }

    .clear-btn {
      padding: 6px 14px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      color: #ef4444;
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .clear-btn:hover {
      background: rgba(239,68,68,0.2);
      transform: translateY(-2px);
    }

    .horizontal-scroll {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding: 8px 4px 16px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: var(--primary) transparent;
    }

    .horizontal-scroll::-webkit-scrollbar {
      height: 6px;
    }

    .horizontal-scroll::-webkit-scrollbar-thumb {
      background: var(--primary);
      border-radius: 3px;
    }

    .mini-card {
      min-width: 160px;
      max-width: 160px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }

    .mini-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
      box-shadow: 0 8px 24px rgba(139,92,246,0.3);
    }

    .mini-card-img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: var(--bg-elevated);
    }

    .mini-card-body {
      padding: 10px;
    }

    .mini-card-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.3;
    }

    .mini-card-meta {
      font-size: 11px;
      color: var(--text-muted);
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(139,92,246,0.2);
    }

    .progress-fill {
      height: 100%;
      background: var(--gradient);
      transition: width 0.3s ease;
    }

    .favorite-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      z-index: 10;
    }

    .favorite-btn:hover {
      background: rgba(0,0,0,0.8);
      transform: scale(1.1);
    }

    .favorite-btn.active {
      background: var(--gradient);
      border-color: transparent;
    }

    /* Video Controls Enhancement */
    .speed-control {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .speed-btn {
      padding: 8px 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      transition: all 0.3s ease;
      min-width: 50px;
      text-align: center;
    }

    .speed-btn:hover {
      border-color: var(--primary);
      background: var(--bg-elevated);
    }

    .speed-btn.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
    }

    .theater-btn, .pip-btn {
      padding: 10px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .theater-btn:hover, .pip-btn:hover {
      border-color: var(--primary);
      background: var(--bg-elevated);
      transform: translateY(-2px);
    }

    .theater-btn.active {
      background: var(--gradient);
      border-color: transparent;
      color: white;
    }

    /* Theater Mode */
    body.theater-mode .player-container {
      max-width: 100%;
    }

    body.theater-mode .video-wrapper {
      max-height: 85vh;
    }

    /* Auto Next Countdown */
    .auto-next-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(12px);
      padding: 32px 48px;
      border-radius: 20px;
      text-align: center;
      z-index: 100;
      border: 2px solid var(--primary);
      box-shadow: 0 8px 32px rgba(139,92,246,0.5);
      display: none;
    }

    .auto-next-overlay.show {
      display: block;
      animation: fadeInScale 0.3s ease-out;
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    .countdown-number {
      font-size: 64px;
      font-weight: 900;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 16px 0;
    }

    .countdown-text {
      font-size: 16px;
      color: var(--text-muted);
      margin-bottom: 20px;
    }

    .countdown-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .countdown-btn {
      padding: 10px 24px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
    }

    .countdown-btn.primary {
      background: var(--gradient);
      color: white;
    }

    .countdown-btn.secondary {
      background: rgba(255,255,255,0.1);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .countdown-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(139,92,246,0.4);
    }

    /* Search Suggestions */
    .search-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      margin-top: 4px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }

    .search-suggestions.show {
      display: block;
    }

    .suggestion-item {
      padding: 12px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s ease;
      border-bottom: 1px solid var(--border);
    }

    .suggestion-item:last-child {
      border-bottom: none;
    }

    .suggestion-item:hover {
      background: var(--bg-elevated);
    }

    .suggestion-icon {
      color: var(--text-muted);
      font-size: 14px;
    }

    .suggestion-text {
      flex: 1;
      font-size: 14px;
      color: var(--text);
    }

    /* Keyboard Shortcuts Indicator */
    .shortcuts-hint {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(12px);
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid var(--border);
      font-size: 13px;
      color: var(--text);
      z-index: 1001;
      display: none;
      animation: fadeInUp 0.3s ease-out;
    }

    .shortcuts-hint.show {
      display: block;
    }

    .shortcuts-hint kbd {
      background: var(--bg-elevated);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      border: 1px solid var(--border);
      margin: 0 2px;
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-right-color: var(--accent-pink);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
      box-shadow: 0 4px 12px rgba(139,92,246,0.3);
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Fade in animation */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .grid > .card {
      animation: fadeInUp 0.5s ease-out forwards;
      opacity: 0;
    }

    .grid > .card:nth-child(1) { animation-delay: 0.05s; }
    .grid > .card:nth-child(2) { animation-delay: 0.1s; }
    .grid > .card:nth-child(3) { animation-delay: 0.15s; }
    .grid > .card:nth-child(4) { animation-delay: 0.2s; }
    .grid > .card:nth-child(5) { animation-delay: 0.25s; }
    .grid > .card:nth-child(n+6) { animation-delay: 0.3s; }

    .empty {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-muted);
    }

    /* Brand Header */
    .brand-header {
      text-align: center;
      padding: 32px 20px 20px;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.2) 100%);
      border-bottom: 2px solid;
      border-image: var(--gradient) 1;
      position: relative;
      overflow: hidden;
    }

    .brand-header::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--gradient);
      opacity: 0.05;
      animation: brandShimmer 3s ease-in-out infinite;
    }

    @keyframes brandShimmer {
      0%, 100% { opacity: 0.05; }
      50% { opacity: 0.1; }
    }

    .brand-title {
      font-size: 64px;
      font-weight: 900;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 12px;
      text-transform: uppercase;
      filter: drop-shadow(0 0 30px rgba(139,92,246,0.5));
      animation: brandGlow 3s ease-in-out infinite;
      margin-bottom: 16px;
      position: relative;
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
      position: relative;
    }

    .brand-info-item a::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 0;
      height: 2px;
      background: var(--gradient);
      transition: width 0.3s ease;
    }

    .brand-info-item a:hover {
      color: #c084fc;
      filter: drop-shadow(0 0 8px rgba(139,92,246,0.5));
    }

    .brand-info-item a:hover::after {
      width: 100%;
    }

    @keyframes brandGlow {
      0%, 100% { filter: drop-shadow(0 0 30px rgba(139,92,246,0.5)); }
      50% { filter: drop-shadow(0 0 40px rgba(139,92,246,0.7)); }
    }

    @media (max-width: 768px) {
      .brand-title {
        font-size: 42px;
        letter-spacing: 6px;
      }
      .brand-info {
        flex-direction: column;
        gap: 8px;
      }
      .header { 
        flex-direction: column; 
        align-items: stretch;
        gap: 12px;
      }
      .search-box { max-width: none; }
      .logo { justify-content: center; }
      .nav { 
        justify-content: center;
        flex-wrap: wrap;
      }
      .source-bar { 
        flex-wrap: wrap; 
        justify-content: center;
        padding: 16px;
      }
      .pagination { 
        flex-wrap: wrap;
        gap: 6px;
      }
      .download-grid {
        grid-template-columns: 1fr;
      }
      .player-container {
        padding: 0 12px;
      }
      .controls {
        flex-wrap: wrap;
        gap: 8px;
      }
      .control-btn {
        flex: 1;
        min-width: 120px;
        justify-content: center;
      }
      .speed-control {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
      }
      .theater-btn, .pip-btn {
        flex: 1;
        min-width: 100px;
        justify-content: center;
      }
      .feature-section {
        margin-bottom: 24px;
      }
      .section-title {
        font-size: 16px;
      }
      .section-icon {
        font-size: 20px;
      }
      .auto-next-overlay {
        padding: 24px 32px;
        max-width: 90%;
      }
      .countdown-number {
        font-size: 48px;
      }
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <h1 class="brand-title">ZEROSTORE</h1>
    <div class="brand-info">
      <div class="brand-info-item">Admin: <a href="https://t.me/kakatiri" target="_blank" rel="noopener">t.me/kakatiri</a></div>
      <div class="brand-info-item">Thanks for API: <a href="https://t.me/November2k" target="_blank" rel="noopener">t.me/November2k</a></div>
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
        <button class="source-tab" data-source="dramamovie">
          <span class="source-icon">🎭</span> DramaMovie
        </button>
        <button class="source-tab" data-source="samehadaku">
          <span class="source-icon">🎌</span> Samehadaku
        </button>
      </div>
    </div>


    <header class="header">
      <div class="logo">
        <div class="logo-icon">▶</div>
        <span class="logo-text" id="logoText">MELOLO</span>
      </div>
      <nav class="nav" id="navTabs"></nav>
      <div class="search-box" style="position: relative;">
        <input type="text" class="search-input" id="searchInput" placeholder="Cari..." autocomplete="off" />
        <button class="search-btn" id="btnSearch">Cari</button>
        <div class="search-suggestions" id="searchSuggestions"></div>
      </div>
    </header>

    <!-- Continue Watching Section -->
    <div class="feature-section" id="continueWatchingSection" style="display: none;">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">⏱️</span>
          Lanjutkan Menonton
        </h2>
        <button class="clear-btn" id="clearContinue">Clear All</button>
      </div>
      <div class="horizontal-scroll" id="continueWatchingList"></div>
    </div>

    <!-- Favorites Section -->
    <div class="feature-section" id="favoritesSection" style="display: none;">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">⭐</span>
          Favorit Saya
        </h2>
        <button class="clear-btn" id="clearFavorites">Clear All</button>
      </div>
      <div class="horizontal-scroll" id="favoritesList"></div>
    </div>

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
      <div class="video-wrapper" id="videoWrapper">
        <video id="videoPlayer" controls playsinline></video>
        <div class="auto-next-overlay" id="autoNextOverlay">
          <div class="countdown-text">Episode berikutnya dimulai dalam</div>
          <div class="countdown-number" id="countdownNumber">10</div>
          <div class="countdown-actions">
            <button class="countdown-btn secondary" id="cancelAutoNext">Cancel</button>
            <button class="countdown-btn primary" id="playNextNow">Play Now</button>
          </div>
        </div>
      </div>
      <div class="controls" id="videoControls">
        <button class="control-btn" id="prevEp">◀ Prev</button>
        <button class="control-btn primary" id="nextEp">Next ▶</button>
        <select class="quality-select" id="qualitySelect">
          <option value="">Auto</option>
        </select>
        <div class="speed-control">
          <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Speed:</span>
          <button class="speed-btn" data-speed="0.5">0.5x</button>
          <button class="speed-btn" data-speed="0.75">0.75x</button>
          <button class="speed-btn active" data-speed="1">1x</button>
          <button class="speed-btn" data-speed="1.25">1.25x</button>
          <button class="speed-btn" data-speed="1.5">1.5x</button>
          <button class="speed-btn" data-speed="2">2x</button>
        </div>
        <button class="theater-btn" id="theaterBtn">
          <span>🎬</span> Theater
        </button>
        <button class="pip-btn" id="pipBtn">
          <span>📺</span> PiP
        </button>
        <span class="status-text" id="statusText">Siap</span>
      </div>
      <div class="download-section" id="downloadSection" style="display: none;">
        <h3 class="download-title">
          <span>📥</span> Download Links
        </h3>
        <div class="download-grid" id="downloadGrid"></div>
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
      { id: "home", label: "Home" },
      { id: "populer", label: "Populer" }
    ]
  },
  dramabox: {
    name: "Dramabox",
    color: "#a855f7",
    navTabs: [
      { id: "populer", label: "Populer" },
      { id: "new", label: "Terbaru" }
    ]
  },
  dramamovie: {
    name: "DramaMovie",
    color: "#ec4899",
    navTabs: [
      { id: "search", label: "Search" }
    ]
  },
  samehadaku: {
    name: "Samehadaku",
    color: "#f97316",
    navTabs: [
      { id: "search", label: "Search" }
    ]
  }
};

const state = {
  source: "melolo",
  mode: "home",
  page: 1,
  totalPages: 1,
  query: "",
  list: [],
  currentId: null,
  currentSlug: null,
  currentTitle: "",
  episodes: [],
  currentEpIndex: 0,
  qualities: [],
  playbackRate: 1,
  theaterMode: false,
  autoNextCountdown: null,
};

// LocalStorage Manager
const storage = {
  get(key) {
    try {
      const item = localStorage.getItem('streambox_' + key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('streambox_' + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem('streambox_' + key);
    } catch (e) {}
  }
};

// Continue Watching Manager
const continueWatching = {
  save(source, id, title, img, episode, currentTime, duration) {
    const watching = storage.get('continue_watching') || {};
    const key = source + '_' + id;
    watching[key] = {
      source, id, title, img, episode, currentTime, duration,
      timestamp: Date.now()
    };
    storage.set('continue_watching', watching);
  },
  get() {
    const watching = storage.get('continue_watching') || {};
    return Object.values(watching).sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  },
  remove(source, id) {
    const watching = storage.get('continue_watching') || {};
    delete watching[source + '_' + id];
    storage.set('continue_watching', watching);
  }
};

// Favorites Manager
const favorites = {
  toggle(source, id, title, img, badge) {
    const favs = storage.get('favorites') || {};
    const key = source + '_' + id;
    if (favs[key]) {
      delete favs[key];
      storage.set('favorites', favs);
      return false;
    } else {
      favs[key] = { source, id, title, img, badge, timestamp: Date.now() };
      storage.set('favorites', favs);
      return true;
    }
  },
  isFavorite(source, id) {
    const favs = storage.get('favorites') || {};
    return !!(favs[source + '_' + id]);
  },
  get() {
    const favs = storage.get('favorites') || {};
    return Object.values(favs).sort((a, b) => b.timestamp - a.timestamp);
  },
  remove(source, id) {
    const favs = storage.get('favorites') || {};
    delete favs[source + '_' + id];
    storage.set('favorites', favs);
  }
};

// Search History Manager
const searchHistory = {
  add(source, query) {
    if (!query || query.length < 2) return;
    const history = storage.get('search_history') || {};
    if (!history[source]) history[source] = [];
    history[source] = history[source].filter(q => q !== query);
    history[source].unshift(query);
    history[source] = history[source].slice(0, 10);
    storage.set('search_history', history);
  },
  get(source) {
    const history = storage.get('search_history') || {};
    return history[source] || [];
  },
  clear(source) {
    const history = storage.get('search_history') || {};
    if (source) {
      delete history[source];
    } else {
      return {};
    }
    storage.set('search_history', history);
  }
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

// ========== CONTINUE WATCHING & FAVORITES ==========

function renderContinueWatching() {
  const list = continueWatching.get();
  const section = $("continueWatchingSection");
  const container = $("continueWatchingList");
  
  if (list.length === 0) {
    section.style.display = "none";
    return;
  }
  
  section.style.display = "block";
  container.innerHTML = list.map(item => {
    const progress = (item.currentTime / item.duration) * 100;
    return '<div class="mini-card" data-source="' + item.source + '" data-id="' + item.id + '">' +
      '<img class="mini-card-img" src="' + esc(item.img) + '" alt="' + esc(item.title) + '" />' +
      '<div class="progress-bar"><div class="progress-fill" style="width: ' + progress + '%"></div></div>' +
      '<div class="mini-card-body">' +
        '<div class="mini-card-title">' + esc(item.title) + '</div>' +
        '<div class="mini-card-meta">' + esc(item.episode) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  
  container.querySelectorAll('.mini-card').forEach(card => {
    card.onclick = () => {
      state.source = card.dataset.source;
      switchSource(card.dataset.source);
      setTimeout(() => {
        openContent(card.dataset.id, '', card.dataset.source, '');
      }, 500);
    };
  });
}

function renderFavorites() {
  const list = favorites.get();
  const section = $("favoritesSection");
  const container = $("favoritesList");
  
  if (list.length === 0) {
    section.style.display = "none";
    return;
  }
  
  section.style.display = "block";
  container.innerHTML = list.map(item => {
    return '<div class="mini-card" data-source="' + item.source + '" data-id="' + item.id + '">' +
      '<img class="mini-card-img" src="' + esc(item.img) + '" alt="' + esc(item.title) + '" />' +
      '<div class="mini-card-body">' +
        '<div class="mini-card-title">' + esc(item.title) + '</div>' +
        '<div class="mini-card-meta">' + esc(item.badge) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  
  container.querySelectorAll('.mini-card').forEach(card => {
    card.onclick = () => {
      state.source = card.dataset.source;
      switchSource(card.dataset.source);
      setTimeout(() => {
        openContent(card.dataset.id, '', card.dataset.source, '');
      }, 500);
    };
  });
}

// ========== SOURCE SWITCHING ==========

async function switchSource(source) {
  if (!SOURCES[source]) return;
  state.source = source;
  state.list = [];
  state.page = 1;
  state.query = "";

  document.querySelectorAll(".source-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.source === source);
  });

  $("logoText").textContent = SOURCES[source].name;
  $("searchInput").placeholder = "Cari " + SOURCES[source].name + "...";

  renderNavTabs();

  const firstTab = SOURCES[source].navTabs[0].id;
  if ((source === "samehadaku" || source === "dramamovie") && firstTab === "search") {
    // For search-only sources, show empty state with search prompt
    state.mode = "search";
    const searchPrompt = source === "samehadaku" ? "anime" : "drama/movie";
    $("grid").innerHTML = '<div class="empty">Gunakan kotak pencarian untuk mencari ' + searchPrompt + '...</div>';
    setActiveNav("search");
  } else {
    loadList(firstTab, 1);
  }
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
    } else if (state.source === "dramamovie") {
      await loadDramaMovieList(mode, page, query);
    } else if (state.source === "samehadaku") {
      await loadSamehadakuList(mode, page, query);
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

  if (mode === "home") path = "/melolo/home";
  if (mode === "populer") path = "/melolo/populer";
  if (mode === "search") path = "/melolo/search?q=" + encodeURIComponent(query);

  const json = await jget(path);
  
  // Extract from nested structure: home_data[].books[] or populer_data[].books[]
  let books = [];
  if (json?.home_data) {
    json.home_data.forEach(section => {
      if (section.books) books.push(...section.books);
    });
  } else if (json?.populer_data) {
    json.populer_data.forEach(section => {
      if (section.books) books.push(...section.books);
    });
  } else if (json?.search_result) {
    books = json.search_result;
  }

  state.list = books.slice(0, 20).map(item => ({
    id: item.drama_id ?? "",
    title: item.drama_name || "Untitled",
    img: item.thumb_url || "",
    badge: (item.episode_count ?? 0) + " Eps",
    type: "melolo"
  }));

  state.totalPages = mode === "search" ? 1 : 1;
}

async function loadDramaboxList(mode, page, query) {
  let path = "";
  if (mode === "populer") path = "/dramabox/populer?page=" + page;
  if (mode === "new") path = "/dramabox/new?page=" + page;
  if (mode === "search") path = "/dramabox/search?q=" + encodeURIComponent(query) + "&page=" + page;

  const json = await jget(path);
  
  // Extract from nested structure
  let books = [];
  if (json?.populer_data) {
    json.populer_data.forEach(section => {
      if (section.books) books.push(...section.books);
    });
  } else if (json?.new_data) {
    json.new_data.forEach(section => {
      if (section.books) books.push(...section.books);
    });
  } else if (json?.search_result) {
    books = json.search_result;
  }

  state.list = books.slice(0, 20).map(item => ({
    id: item.drama_id ?? "",
    title: item.drama_name || "Untitled",
    img: item.thumb_url || "",
    badge: (item.episode_count ?? 0) + " Eps",
    type: "dramabox"
  }));

  state.totalPages = mode === "search" ? 1 : 10;
}

async function loadDramaMovieList(mode, page, query) {
  if (mode === "search" && !query) {
    state.list = [];
    return;
  }

  let path = "/drama/search?q=" + encodeURIComponent(query);
  const json = await jget(path);
  
  const dramaList = json?.data || [];
  
  state.list = dramaList.slice(0, 20).map(item => ({
    id: item.id || "",
    link: item.link || "",
    title: item.title || "Untitled",
    img: item.image || "",
    badge: item.category?.split(',').slice(0, 2).join(' • ') || "Drama",
    hits: item.hits || "0",
    type: "dramamovie"
  }));

  state.totalPages = 1;
}

async function loadSamehadakuList(mode, page, query) {
  if (mode === "search" && !query) {
    state.list = [];
    return;
  }

  let path = "/samehada?s=" + encodeURIComponent(query);
  const json = await jget(path);
  
  const animeList = json?.data || [];
  
  state.list = animeList.slice(0, 20).map(item => ({
    id: item.title || "",
    slug: item.episodes?.[0]?.slug_episode || "",
    title: item.title || "Untitled",
    img: item.thumbnail || "",
    badge: item.type + " • " + item.status,
    score: item.score || "N/A",
    episodes: item.episodes || [],
    type: "samehadaku"
  }));

  state.totalPages = 1;
}

function renderList() {
  const grid = $("grid");

  if (!state.list.length) {
    grid.innerHTML = '<div class="empty">Tidak ada data ditemukan.</div>';
    return;
  }

  grid.innerHTML = state.list.map(item => {
    let badgeClass = '';
    if (item.type === 'melolo') badgeClass = 'red';
    else if (item.type === 'dramabox') badgeClass = 'badge';
    else if (item.type === 'dramamovie') badgeClass = 'badge';
    else if (item.type === 'samehadaku') badgeClass = 'cyan';
    
    const isFav = favorites.isFavorite(item.type, item.id);
    const favIcon = isFav ? '❤️' : '🤍';
    
    // Add trending badge if hits > 500k
    let trendingBadge = '';
    if (item.hits && parseInt(item.hits) > 500000) {
      trendingBadge = '<div style="position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg, #ef4444, #dc2626); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; color: white; box-shadow: 0 2px 8px rgba(239,68,68,0.4);">🔥 Trending</div>';
    }
    
    return "<div class=\\"card\\" data-id=\\"" + esc(item.id) + "\\" data-slug=\\"" + esc(item.slug || '') + "\\" data-title=\\"" + esc(item.title) + "\\" data-type=\\"" + item.type + "\\" data-badge=\\"" + esc(item.badge) + "\\" data-img=\\"" + esc(item.img) + "\\">" +
      trendingBadge +
      "<div class=\\"favorite-btn " + (isFav ? 'active' : '') + "\\" data-action=\\"favorite\\">" + favIcon + "</div>" +
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
    const favBtn = card.querySelector('[data-action="favorite"]');
    if (favBtn) {
      favBtn.onclick = (e) => {
        e.stopPropagation();
        const isFav = favorites.toggle(
          card.dataset.type,
          card.dataset.id,
          card.dataset.title,
          card.dataset.img,
          card.dataset.badge
        );
        favBtn.classList.toggle('active', isFav);
        favBtn.textContent = isFav ? '❤️' : '🤍';
        toast(isFav ? '➕ Ditambahkan ke favorit' : '➖ Dihapus dari favorit');
        renderFavorites();
      };
    }
    
    card.onclick = (e) => {
      if (e.target.closest('[data-action="favorite"]')) return;
      openContent(card.dataset.id, card.dataset.title, card.dataset.type, card.dataset.slug);
    };
  });
}

// ========== PLAYER ==========

async function openContent(id, title, type, slug) {
  state.currentId = id;
  state.currentSlug = slug || id;
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
    } else if (type === "dramamovie") {
      await loadDramaMovieEpisodes(id);
    } else if (type === "samehadaku") {
      await loadSamehadakuEpisodes(title);
    }
    renderEpisodes();
    
    if (type !== "samehadaku") {
      await loadAndPlay();
    } else {
      // For samehadaku, load episode on click only
      if (state.episodes.length > 0) {
        await loadAndPlay();
      }
    }
  } catch (err) {
    toast("Error: " + err.message);
  }
}

async function loadMeloloEpisodes(id) {
  const json = await jget("/melolo/detail/" + encodeURIComponent(id));
  const videos = json?.video_list || [];

  state.episodes = videos.map((v, idx) => ({
    index: idx,
    vid: v.video_id || "",
    slug: v.video_id || "",
    label: "Ep " + v.episode,
    duration: v.duration || 0
  }));

  if (state.episodes.length) {
    state.currentEpIndex = 0;
  }
}

async function loadDramaboxEpisodes(dramaId) {
  const json = await jget("/dramabox/detail/" + encodeURIComponent(dramaId));
  const chapters = json?.chapterList || [];

  state.episodes = chapters.map(x => ({
    index: Number(x?.chapterIndex),
    chapterId: x?.chapterId || "",
    slug: x?.chapterId || "",
    label: "Ep " + (Number(x?.chapterIndex) + 1)
  })).sort((a, b) => a.index - b.index);

  if (state.episodes.length) {
    state.currentEpIndex = 0;
  }
}

async function loadDramaMovieEpisodes(dramaId) {
  const json = await jget("/drama/info?id=" + encodeURIComponent(dramaId));
  const episodes = json?.data_episode || [];

  state.episodes = episodes.map((ep, i) => ({
    index: i,
    episodeId: ep.episode_id || "",
    streamingId: ep.streaming || "",
    label: ep.episode_label || ("Episode " + (i + 1)),
    image: ep.episode_image || ""
  }));

  if (state.episodes.length) {
    state.currentEpIndex = 0;
  }
}

async function loadSamehadakuEpisodes(title) {
  // For samehadaku, we already have episodes from search result
  const anime = state.list.find(item => item.title === title);
  if (anime && anime.episodes) {
    state.episodes = anime.episodes.map((ep, i) => ({
      index: i,
      slug: ep.slug_episode || "",
      label: "Ep " + ep.episode,
      title: ep.title || ""
    }));
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
  cancelAutoNext();
  state.theaterMode = false;
  document.body.classList.remove('theater-mode');
  $("theaterBtn").classList.remove('active');
  renderContinueWatching();
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
    if (state.source === "samehadaku") {
      // For Samehadaku, show download links instead of video player
      $("videoWrapper").classList.add("video-hidden");
      $("videoControls").classList.add("video-hidden");
      $("downloadSection").style.display = "block";
      await loadSamehadakuVideo(ep);
      renderDownloadLinks();
      setStatus(ep.label + " siap");
    } else {
      // For other sources, show video player
      $("videoWrapper").classList.remove("video-hidden");
      $("videoControls").classList.remove("video-hidden");
      $("downloadSection").style.display = "none";
      
      if (state.source === "melolo") {
        await loadMeloloVideo(ep);
      } else if (state.source === "dramabox") {
        await loadDramaboxVideo(ep);
      } else if (state.source === "dramamovie") {
        await loadDramaMovieVideo(ep);
      }

      buildQualityDropdown();
      applyQuality();
      setStatus(ep.label + " siap");
    }
  } catch (err) {
    setStatus("Error: " + err.message);
  }
}

async function loadMeloloVideo(ep) {
  const json = await jget("/melolo/stream/" + encodeURIComponent(ep.vid));

  if (!json?.qualities || json.qualities.length === 0) {
    throw new Error("Video tidak tersedia");
  }

  state.qualities = json.qualities.map((q, i) => ({
    label: q.label || q.width + "p",
    value: i,
    url: q.url || "",
    isDefault: q.label === "720p" || i === json.qualities.length - 1
  }));
}

async function loadDramaboxVideo(ep) {
  const json = await jget(
    "/dramabox/stream?dramaId=" + encodeURIComponent(state.currentId) +
    "&chapterId=" + encodeURIComponent(ep.chapterId)
  );

  if (!json?.success) throw new Error("API gagal");

  const data = json.data || {};
  state.qualities = Array.isArray(data.qualities) ? data.qualities.map((q, i) => ({
    label: q.quality + "p",
    value: i,
    url: q.videoPath || q.videoUrl || "",
    isDefault: q.isDefault === 1
  })) : [];

  if (state.qualities.length === 0) {
    throw new Error("Tidak ada stream video yang tersedia");
  }
}

async function loadDramaMovieVideo(ep) {
  const json = await jget("/drama/stream?id=" + encodeURIComponent(ep.streamingId));

  if (!json?.data_stream || json.data_stream.length === 0) {
    throw new Error("Video tidak tersedia");
  }

  const stream = json.data_stream[0];
  state.qualities = [];

  // Add qualities in order: 720p, 480p, 360p
  if (stream["720p"]) {
    state.qualities.push({
      label: "720p" + (stream["720p_size"] ? " (" + stream["720p_size"] + ")" : ""),
      value: state.qualities.length,
      url: stream["720p"],
      isDefault: true
    });
  }

  if (stream["480p"]) {
    state.qualities.push({
      label: "480p" + (stream["480p_size"] ? " (" + stream["480p_size"] + ")" : ""),
      value: state.qualities.length,
      url: stream["480p"],
      isDefault: !stream["720p"]
    });
  }

  if (stream["360p"]) {
    state.qualities.push({
      label: "360p" + (stream["360p_size"] ? " (" + stream["360p_size"] + ")" : ""),
      value: state.qualities.length,
      url: stream["360p"],
      isDefault: !stream["720p"] && !stream["480p"]
    });
  }

  if (state.qualities.length === 0) {
    throw new Error("Tidak ada stream video yang tersedia");
  }
}

async function loadSamehadakuVideo(ep) {
  const json = await jget("/samehada?dl=" + encodeURIComponent(ep.slug));

  if (!json?.status || !json?.data?.downloads) {
    throw new Error("Video tidak tersedia");
  }

  const downloads = json.data.downloads;
  
  // Group by resolution and pick the first host for each resolution
  const resolutionMap = new Map();
  downloads.forEach(dl => {
    if (!resolutionMap.has(dl.resolution)) {
      resolutionMap.set(dl.resolution, dl);
    }
  });

  state.qualities = Array.from(resolutionMap.values()).map((dl, i) => ({
    label: dl.resolution + " (" + dl.host + ")",
    value: i,
    url: dl.url,
    host: dl.host,
    isDefault: dl.resolution === "720p" || dl.resolution === "480p"
  }));

  if (state.qualities.length === 0) {
    throw new Error("Tidak ada download link yang tersedia");
  }
}

function renderDownloadLinks() {
  const grid = $("downloadGrid");
  
  if (!state.qualities.length) {
    grid.innerHTML = '<div style="color: var(--text-muted); text-align: center;">Tidak ada download link tersedia</div>';
    return;
  }

  grid.innerHTML = state.qualities.map(q => {
    return '<a href="' + esc(q.url) + '" target="_blank" rel="noopener noreferrer" class="download-btn">' +
      '<div>' +
        '<div class="download-quality">' + esc(q.label.split(' (')[0]) + '</div>' +
        '<div class="download-host">' + esc(q.host || 'Direct') + '</div>' +
      '</div>' +
      '<div class="download-icon">⬇️</div>' +
    '</a>';
  }).join("");
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
  console.log("Applying quality. Available qualities:", state.qualities);
  const video = $("videoPlayer");
  const sel = $("qualitySelect");
  const idx = sel.value !== "" ? parseInt(sel.value, 10) : 0;
  console.log("Selected quality index:", idx);

  const pick = state.qualities[idx] || state.qualities[0];
  console.log("Picked quality:", pick);
  if (!pick) {
    console.error("No quality available");
    setStatus("Link video kosong");
    return;
  }

  let url = pick.url || "";
  console.log("URL before processing:", url);
  if (typeof url === "string" && url.startsWith("//")) url = "https:" + url;
  console.log("URL after processing:", url);

  if (!url) {
    console.error("URL is empty");
    setStatus("Link video kosong");
    return;
  }

  const prevTime = video.currentTime || 0;
  const wasPaused = video.paused;

  console.log("Setting video src to:", url);
  video.src = url;
  video.load();
  console.log("Video loaded. Ready to play.");

  if (prevTime > 0) video.currentTime = prevTime;
  if (!wasPaused) video.play().catch((e) => {
    console.error("Failed to play video:", e);
  });
}

// ========== EVENTS ==========

const videoPlayer = $("videoPlayer");
videoPlayer.addEventListener('error', (e) => {
  console.error("Video error event:", e);
  console.error("Video error code:", videoPlayer.error?.code);
  console.error("Video error message:", videoPlayer.error?.message);
  let errorMsg = "Error loading video";
  if (videoPlayer.error) {
    switch(videoPlayer.error.code) {
      case 1: errorMsg = "Video loading aborted"; break;
      case 2: errorMsg = "Network error"; break;
      case 3: errorMsg = "Video decoding failed"; break;
      case 4: errorMsg = "Video format not supported"; break;
      default: errorMsg = "Unknown video error";
    }
  }
  setStatus(errorMsg);
  toast(errorMsg);
});

videoPlayer.addEventListener('loadstart', () => console.log("Video loadstart"));
videoPlayer.addEventListener('loadedmetadata', () => console.log("Video metadata loaded"));
videoPlayer.addEventListener('canplay', () => console.log("Video can play"));
videoPlayer.addEventListener('playing', () => console.log("Video is playing"));

document.querySelectorAll(".source-tab").forEach(tab => {
  tab.onclick = () => switchSource(tab.dataset.source);
});


// ========== SEARCH WITH HISTORY ==========

function showSearchSuggestions() {
  const history = searchHistory.get(state.source);
  const suggestions = $("searchSuggestions");
  
  if (history.length === 0) {
    suggestions.classList.remove("show");
    return;
  }
  
  suggestions.innerHTML = history.map(query => 
    '<div class="suggestion-item" data-query="' + esc(query) + '">' +
      '<span class="suggestion-icon">🔍</span>' +
      '<span class="suggestion-text">' + esc(query) + '</span>' +
    '</div>'
  ).join('');
  
  suggestions.querySelectorAll('.suggestion-item').forEach(item => {
    item.onclick = () => {
      $("searchInput").value = item.dataset.query;
      $("btnSearch").click();
      suggestions.classList.remove("show");
    };
  });
  
  suggestions.classList.add("show");
}

$("searchInput").onfocus = () => showSearchSuggestions();
$("searchInput").onblur = () => setTimeout(() => $("searchSuggestions").classList.remove("show"), 200);

$("searchInput").onkeydown = e => {
  if (e.key === "Enter") {
    $("btnSearch").click();
    $("searchSuggestions").classList.remove("show");
  }
};

$("btnSearch").onclick = () => {
  const q = $("searchInput").value.trim();
  if (!q) return toast("Masukkan judul dulu");
  searchHistory.add(state.source, q);
  loadList("search", 1, q);
};

// ========== PLAYER ENHANCEMENTS ==========

$("closePlayer").onclick = closePlayer;
$("prevEp").onclick = () => goRelative(-1);
$("nextEp").onclick = () => goRelative(1);

// Speed Control
document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.onclick = () => {
    const speed = parseFloat(btn.dataset.speed);
    state.playbackRate = speed;
    $("videoPlayer").playbackRate = speed;
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    toast('🎬 Speed: ' + speed + 'x');
  };
});

// Theater Mode
$("theaterBtn").onclick = () => {
  state.theaterMode = !state.theaterMode;
  document.body.classList.toggle('theater-mode', state.theaterMode);
  $("theaterBtn").classList.toggle('active', state.theaterMode);
  toast(state.theaterMode ? '🎬 Theater Mode ON' : '🎬 Theater Mode OFF');
};

// Picture in Picture
$("pipBtn").onclick = async () => {
  const video = $("videoPlayer");
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      toast('📺 PiP OFF');
    } else {
      await video.requestPictureInPicture();
      toast('📺 PiP ON');
    }
  } catch (err) {
    toast('❌ PiP not supported');
  }
};

// Auto Next Episode
let autoNextTimer = null;
let autoNextCountdown = 10;

function startAutoNext() {
  if (state.currentEpIndex >= state.episodes.length - 1) return;
  
  autoNextCountdown = 10;
  $("autoNextOverlay").classList.add("show");
  $("countdownNumber").textContent = autoNextCountdown;
  
  autoNextTimer = setInterval(() => {
    autoNextCountdown--;
    $("countdownNumber").textContent = autoNextCountdown;
    
    if (autoNextCountdown <= 0) {
      clearInterval(autoNextTimer);
      $("autoNextOverlay").classList.remove("show");
      goRelative(1);
    }
  }, 1000);
}

function cancelAutoNext() {
  if (autoNextTimer) {
    clearInterval(autoNextTimer);
    autoNextTimer = null;
  }
  $("autoNextOverlay").classList.remove("show");
}

$("cancelAutoNext").onclick = () => {
  cancelAutoNext();
  toast('⏹️ Auto next cancelled');
};

$("playNextNow").onclick = () => {
  cancelAutoNext();
  goRelative(1);
};

// Video ended event - trigger auto next
videoPlayer.addEventListener('ended', () => {
  if (state.source !== 'samehadaku') {
    startAutoNext();
  }
});

// Save continue watching progress
videoPlayer.addEventListener('timeupdate', () => {
  const video = $("videoPlayer");
  if (video.currentTime > 5 && video.duration > 0) {
    const ep = state.episodes[state.currentEpIndex];
    if (ep && state.currentTitle) {
      continueWatching.save(
        state.source,
        state.currentId,
        state.currentTitle,
        state.list.find(item => item.id === state.currentId)?.img || '',
        ep.label,
        video.currentTime,
        video.duration
      );
    }
  }
});

// Keyboard Shortcuts
let shortcutHintTimeout;

function showShortcutHint(text) {
  const hint = document.createElement('div');
  hint.className = 'shortcuts-hint show';
  hint.innerHTML = text;
  document.body.appendChild(hint);
  
  clearTimeout(shortcutHintTimeout);
  shortcutHintTimeout = setTimeout(() => {
    hint.classList.remove('show');
    setTimeout(() => hint.remove(), 300);
  }, 2000);
}

document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  const video = $("videoPlayer");
  const playerActive = $("playerOverlay").classList.contains('active');
  
  if (!playerActive) return;
  
  switch(e.key.toLowerCase()) {
    case ' ':
      e.preventDefault();
      if (video.paused) {
        video.play();
        showShortcutHint('<kbd>Space</kbd> Play');
      } else {
        video.pause();
        showShortcutHint('<kbd>Space</kbd> Pause');
      }
      break;
    case 'arrowleft':
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 10);
      showShortcutHint('<kbd>←</kbd> -10s');
      break;
    case 'arrowright':
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
      showShortcutHint('<kbd>→</kbd> +10s');
      break;
    case 'arrowup':
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.1);
      showShortcutHint('<kbd>↑</kbd> Volume: ' + Math.round(video.volume * 100) + '%');
      break;
    case 'arrowdown':
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.1);
      showShortcutHint('<kbd>↓</kbd> Volume: ' + Math.round(video.volume * 100) + '%');
      break;
    case 'f':
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen();
        showShortcutHint('<kbd>F</kbd> Exit Fullscreen');
      } else {
        video.requestFullscreen();
        showShortcutHint('<kbd>F</kbd> Fullscreen');
      }
      break;
    case 'm':
      e.preventDefault();
      video.muted = !video.muted;
      showShortcutHint('<kbd>M</kbd> ' + (video.muted ? 'Muted' : 'Unmuted'));
      break;
    case 'n':
      e.preventDefault();
      goRelative(1);
      showShortcutHint('<kbd>N</kbd> Next Episode');
      break;
    case ',':
      e.preventDefault();
      const newSpeed = Math.max(0.25, state.playbackRate - 0.25);
      state.playbackRate = newSpeed;
      video.playbackRate = newSpeed;
      showShortcutHint('<kbd>&lt;</kbd> Speed: ' + newSpeed + 'x');
      break;
    case '.':
      e.preventDefault();
      const fasterSpeed = Math.min(2, state.playbackRate + 0.25);
      state.playbackRate = fasterSpeed;
      video.playbackRate = fasterSpeed;
      showShortcutHint('<kbd>&gt;</kbd> Speed: ' + fasterSpeed + 'x');
      break;
  }
});

// Clear buttons
$("clearContinue").onclick = () => {
  if (confirm('Hapus semua riwayat tontonan?')) {
    storage.set('continue_watching', {});
    renderContinueWatching();
    toast('🗑️ Riwayat dihapus');
  }
};

$("clearFavorites").onclick = () => {
  if (confirm('Hapus semua favorit?')) {
    storage.set('favorites', {});
    renderFavorites();
    renderList();
    toast('🗑️ Favorit dihapus');
  }
};

$("playerOverlay").onclick = e => {
  if (e.target === $("playerOverlay")) closePlayer();
};

// ========== INIT ==========
renderContinueWatching();
renderFavorites();
switchSource("melolo");
</script>
</body>
</html>`;
}
