# replit.md

## Overview

StreamBox is a multi-source streaming panel that aggregates content from multiple streaming sources: MELOLO (short drama), Dramabox (short drama), DramaMovie (Asian drama & movies), and Samehadaku (Indonesian-subbed anime). The project has two main components:

1. **Cloudflare Worker** (`cloudflare-worker/worker.js`) — A self-contained edge worker that serves the entire streaming panel (HTML, CSS, JS) as a single file. It handles API proxying to the Sonzaix Hub API (`https://api.sonzaix.indevs.in`), session-based authentication, and optional analytics via Cloudflare KV.

2. **React Frontend** (`src/`) — A Vite + React + TypeScript application that appears to be an alternative or development version of the panel UI, likely used for prototyping features like pagination and genre filtering.

The primary deployment target is **Cloudflare Workers**, with the worker.js file being the production artifact. The React app in `src/` serves as a development environment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Dual Architecture Pattern

The project maintains two parallel implementations:

1. **Cloudflare Worker (Production)**: A monolithic single-file worker (`cloudflare-worker/worker.js`) that generates the entire HTML/CSS/JS interface inline. This is the deployed production version.
   - **Rationale**: Cloudflare Workers have strict size/bundling constraints; a single-file approach simplifies deployment.
   - **Pros**: Zero build step for deployment, runs at the edge globally, no origin server needed.
   - **Cons**: Large single file is hard to maintain, no component reuse.

2. **React App (Development/Prototype)** (`src/`): A standard Vite + React + TypeScript setup with Tailwind CSS.
   - **Tech stack**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React icons
   - **Rationale**: Easier to develop and iterate on UI features before porting to the worker.

### API Layer

- All streaming data comes from the **Sonzaix Hub API** (`https://api.sonzaix.indevs.in`)
- The Cloudflare Worker acts as a **reverse proxy** to this API, handling CORS and adding any necessary headers
- Endpoints follow a pattern like `/melolo/...`, `/dramabox/...`, `/tensei/...` for different sources
- Content includes: listings (with pagination), search, episode details, and video stream URLs

### Authentication & Password Management

- Simple **password-based login** with session cookies
- Password is hashed with SHA-256 combined with a secret to generate a session token
- Session stored as a cookie (`session=<token>.expireAt`)
- Login page is rendered server-side by the worker
- Passwords can be set via env vars (PANEL_PASSWORDS) or managed via **Telegram Bot**
- Password expiry system: fixed date (YYYY-MM-DD) or days-based
- **IP tracking per password**: tracks which IPs use each password (7-day window)
- **Max IP limit per password**: optional device limit enforcement
- **Kicked IP enforcement**: admin can kick IPs via Telegram, immediately blocking access

### Telegram Bot Admin

- Webhook endpoint: `/telegram-webhook`
- Bot commands:
  - `/addpass password:YYYY-MM-DD` or `/addpass password:YYYY-MM-DD:maxIP` — Add/update password
  - `/delpass password` — Delete password
  - `/listpass` — List all passwords with status, expiry, and active IP count
  - `/ips password` — View active IPs for a password
  - `/kick password IP` — Kick specific IP (immediately blocks access)
  - `/kickall password` — Kick all IPs for a password
  - `/broadcast pesan` — Show a broadcast toast to all logged-in users
  - `/broadcastoff` — Remove the active broadcast
  - `/broadcaststatus` — Show the current broadcast payload
  - `/help` — Show command list
- Notifications: Bot sends alerts on new IP login and blocked login attempts
- Broadcasts are stored in Cloudflare KV (`tgbot:broadcast`) and shown once per logged-in browser/device
- Passwords stored in Cloudflare KV (prefix: `tgbot:passwords`, `tgbot:ips:`, `tgbot:kicked:`)
- Webhook secured via `X-Telegram-Bot-Api-Secret-Token` header (env: `TELEGRAM_WEBHOOK_SECRET`)
- Required env vars: `TELEGRAM_BOT_TOKEN`
- Admin allowlist env: `TELEGRAM_CHAT_ID` (single ID) or `TELEGRAM_ADMIN_IDS` (comma-separated multiple IDs)
- Optional: `TELEGRAM_WEBHOOK_SECRET` for webhook signature verification

### Analytics (Optional)

- Uses **Cloudflare KV** for persistent storage of analytics data
- Tracks: total visitors, unique visitors (IP-based), video play counts, most-watched content
- Dashboard auto-refreshes every 30 seconds
- KV namespace named `dramabox-analytics` needs to be created manually in Cloudflare Dashboard

### Content Features

- **Pagination**: All sources support multi-page browsing (Dramabox up to 30 pages, anime up to 50 pages)
- **Genre filtering**: Available for anime source, with 80+ genres loaded from API
- **Continue Watching**: Resume position stored in browser localStorage
- **Favorites/Watchlist**: Stored client-side in localStorage
- **Search History**: Stored client-side for quick suggestions

### UI/UX Design

- Dark theme with gradient accents (purple/pink)
- Font: Plus Jakarta Sans (Google Fonts)
- Responsive/mobile-friendly design
- Features: theater mode, picture-in-picture, keyboard shortcuts, video speed control

## External Dependencies

### APIs
- **Sonzaix Hub API** (`https://api.sonzaix.indevs.in`) — Primary data source for all streaming content. Provides endpoints for browsing, searching, episode listing, and video stream URLs across multiple sources.

### Deployment Platform
- **Cloudflare Workers** — Edge compute platform for hosting the production worker
- **Cloudflare KV** (optional) — Key-value storage for analytics data (namespace: `dramabox-analytics`)
- **GitHub Actions** — CI/CD pipeline for automated deployment to Cloudflare Workers

### Frontend Dependencies (React App)
- **React 18** + **React DOM** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first CSS framework
- **Lucide React** — Icon library
- **@supabase/supabase-js** — Listed as dependency (may be used for data storage or auth in the React version, though current worker uses custom auth)
- **PostCSS** + **Autoprefixer** — CSS processing

### External Resources
- **Google Fonts** — Plus Jakarta Sans font family
