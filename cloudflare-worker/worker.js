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
      <div class="video-wrapper" id="videoWrapper">
        <video id="videoPlayer" controls playsinline></video>
      </div>
      <div class="controls" id="videoControls">
        <button class="control-btn" id="prevEp">◀ Prev</button>
        <button class="control-btn primary" id="nextEp">Next ▶</button>
        <select class="quality-select" id="qualitySelect">
          <option value="">Auto</option>
        </select>
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
  if (source === "samehadaku" && firstTab === "search") {
    // For samehadaku, show empty state with search prompt
    state.mode = "search";
    $("grid").innerHTML = '<div class="empty">Gunakan kotak pencarian untuk mencari anime...</div>';
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
    const badgeClass = item.type === 'melolo' ? 'red' : item.type === 'dramabox' ? 'badge' : item.type === 'samehadaku' ? 'cyan' : '';
    return "<div class=\\"card\\" data-id=\\"" + esc(item.id) + "\\" data-slug=\\"" + esc(item.slug || '') + "\\" data-title=\\"" + esc(item.title) + "\\" data-type=\\"" + item.type + "\\">" +
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
    card.onclick = () => openContent(card.dataset.id, card.dataset.title, card.dataset.type, card.dataset.slug);
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

// ========== INIT ==========
switchSource("melolo");
</script>
</body>
</html>`;
}
