# StreamBox Cloudflare Worker

Multi-source streaming panel yang mendukung Dramabox, Tensei Anime, dan DramaId.

## Fitur Baru

### 1. Pagination (Semua Sumber)

Semua sumber streaming sekarang mendukung pagination:

- **Dramabox**: Hingga 30 halaman (For You, Terbaru, Populer)
- **Tensei**: Hingga 50 halaman (Home, Ongoing, Completed)
- **DramaId**: Hingga 20 halaman (Home)

Fitur pagination:
- Tombol Previous/Next untuk navigasi
- Nomor halaman dengan smart pagination (menampilkan 5 halaman terdekat)
- Tombol halaman pertama dan terakhir dengan ellipsis
- Auto scroll ke atas saat ganti halaman
- Tidak muncul untuk hasil pencarian (search)

### 2. Filter Genre (Tensei)

Khusus untuk sumber Tensei:
- Dropdown genre yang otomatis memuat dari API `/tensei/genres`
- Menghapus duplikat genre
- Filter dapat dikombinasikan dengan tab Ongoing/Completed
- Lebih dari 80+ genre tersedia

## Cara Deploy ke Cloudflare Workers

### Opsi 1: Via GitHub Actions (Otomatis)

Worker akan otomatis deploy ketika ada perubahan di folder `cloudflare-worker/`:

1. Setup secrets di GitHub repository:
   - `CLOUDFLARE_API_TOKEN`: Token API dari Cloudflare
   - `CLOUDFLARE_ACCOUNT_ID`: Account ID dari Cloudflare

2. Push perubahan ke branch `main`:
```bash
git add cloudflare-worker/
git commit -m "Update worker"
git push origin main
```

3. GitHub Actions akan otomatis deploy worker

### Opsi 2: Via Dashboard Cloudflare

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pilih akun Anda → Workers & Pages
3. Klik "Create Application" → "Create Worker"
4. Beri nama worker (contoh: `streambox`)
5. Klik "Deploy"
6. Klik "Edit Code"
7. Hapus kode default, copy semua isi dari `cloudflare-worker/worker.js`
8. Paste ke editor
9. Klik "Save and Deploy"

### Opsi 3: Via Wrangler CLI

1. Install Wrangler:
```bash
npm install -g wrangler
```

2. Login ke Cloudflare:
```bash
wrangler login
```

3. Deploy worker dari folder cloudflare-worker:
```bash
cd cloudflare-worker
wrangler deploy
```

## Environment Variables (Opsional)

Jika ingin menambahkan token protection:

1. Di Dashboard Cloudflare Workers → Settings → Variables
2. Tambahkan variable baru:
   - Name: `PANEL_TOKEN`
   - Value: `token_rahasia_anda`
3. Save

Kemudian akses worker dengan: `https://your-worker.workers.dev/?token=token_rahasia_anda`

## API Endpoints yang Diproxy

Worker ini mem-proxy semua request ke `https://dramabos.asia/api` dengan menambahkan CORS headers.

Contoh:
- Request: `https://your-worker.workers.dev/api/tensei/home?page=1`
- Diproxy ke: `https://dramabos.asia/api/tensei/home?page=1`

## Struktur State untuk Tensei

```javascript
{
  source: "tensei",
  mode: "ongoing",      // home, ongoing, completed, search
  page: 1,              // halaman saat ini
  totalPages: 50,       // total halaman (estimasi)
  genre: "action",      // slug genre yang dipilih
  genres: [...],        // array semua genre dari API
  query: "",            // search query
  list: [...]           // data yang ditampilkan
}
```

## Changelog

### v2.1.1 (2026-01-21)
- 🐛 Fix nested template literals untuk Cloudflare Workers parser
- 📁 Reorganisasi struktur: pindah file ke folder `cloudflare-worker/`
- 🚀 Setup GitHub Actions untuk auto-deployment
- 📝 Update dokumentasi deployment

### v2.1 (2026-01-21)
- ✨ Tambah pagination untuk **semua sumber** (Dramabox, Tensei, DramaId)
- ✨ Dramabox: 30 halaman pagination
- ✨ Tensei: 50 halaman pagination + filter genre
- ✨ DramaId: 20 halaman pagination
- ✨ Smart pagination dengan ellipsis
- ✨ Auto scroll to top saat ganti halaman
- 🎨 Improved UI dengan pagination controls

### v2.0 (2026-01-21)
- ✨ Tambah filter genre untuk Tensei
- ✨ Tambah pagination dengan tombol Next/Prev dan nomor halaman
- ✨ Auto-load genre dari API saat pertama kali buka Tensei
- ✨ Remove duplicate genres
- 🎨 Improved UI dengan genre dropdown
- 🐛 Fix duplicate items di list

### v1.0
- 🎉 Initial release
- ✅ Support Dramabox, Tensei, DramaId
- ✅ Search functionality
- ✅ Video player dengan multi quality
- ✅ Episode navigation
