# StreamBox - Multi Source Streaming Panel

Panel streaming dengan tampilan modern yang mendukung **multiple sources**:
- **MELOLO** - Short Drama
- **Dramabox** - Short Drama
- **DramaMovie** - Drama & Movie Asia
- **Samehadaku** - Anime subtitle Indonesia

## ✨ Fitur Lengkap

### 🎬 Streaming Features
- 4 sumber streaming berbeda
- Pilih sumber dengan mudah (tabs)
- Video player dengan quality selector
- Multiple quality options (360p-720p)
- Daftar episode lengkap
- Next/Prev episode navigation
- Pencarian dengan history

### 🎯 Advanced Features
- ⏱️ **Continue Watching** - Resume dari posisi terakhir
- ⭐ **Favorites/Watchlist** - Bookmark konten favorit
- ▶️ **Auto Next Episode** - Countdown otomatis
- ⚡ **Video Speed Control** - 0.5x sampai 2x
- ⌨️ **Keyboard Shortcuts** - 10+ shortcuts
- 🎬 **Theater Mode** - Wide screen mode
- 📺 **Picture in Picture** - Floating player
- 🔍 **Search History** - Quick suggestions
- 🔥 **Trending Badges** - Popular content
- 📊 **Analytics Dashboard** - Visitor & play statistics

### 🎨 UI/UX
- Tampilan modern dark theme
- Smooth animations & transitions
- Gradient effects
- Responsive (mobile-friendly)
- Touch gestures support
- Beautiful card designs

## Cara Deploy via GitHub Actions

### 1. Dapatkan Credentials Cloudflare

**API Token:**
1. Buka https://dash.cloudflare.com/profile/api-tokens
2. Klik **Create Token**
3. Pilih template **Edit Cloudflare Workers** → **Use Template**
4. Klik **Continue to Summary** → **Create Token**
5. Copy token yang dihasilkan

**Account ID:**
1. Buka dashboard Cloudflare
2. Lihat di sidebar kanan, ada **Account ID**
3. Copy ID tersebut

### 2. Tambah Secrets di GitHub

1. Buka repository GitHub kamu → **Settings** → **Secrets and variables** → **Actions**
2. Klik **New repository secret**
3. Tambahkan:
   - Name: `CLOUDFLARE_API_TOKEN` → Value: (paste API token)
   - Name: `CLOUDFLARE_ACCOUNT_ID` → Value: (paste Account ID)

### 3. Push ke GitHub

Setelah secrets ditambahkan, push perubahan ke branch `main`. GitHub Actions akan otomatis deploy ke Cloudflare Workers.

```bash
git add .
git commit -m "Deploy multi-source streaming panel"
git push origin main
```

### 4. Akses Worker

Setelah deploy berhasil, worker akan tersedia di:
```
https://dramabox-panel.<account-subdomain>.workers.dev
```

## Deploy Manual (Opsional)

Jika ingin deploy manual:

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

## Konfigurasi

Edit `wrangler.toml` untuk:
- Mengubah nama worker (`name`)
- Menambahkan token proteksi (`PANEL_TOKEN`)

## Menambah Sumber Baru

Untuk menambah sumber API baru, edit bagian `SOURCES` di worker.js dan tambahkan fungsi load yang sesuai.
