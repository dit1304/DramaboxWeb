# Panduan Deployment ke Cloudflare Workers

## Struktur File yang Dibutuhkan

```
your-repo/
├── worker.js           # File worker utama
├── wrangler.toml       # Konfigurasi Cloudflare Workers
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions workflow (opsional)
```

## Metode 1: Deploy via Dashboard Cloudflare (Paling Mudah)

### Langkah-langkah:

1. **Login ke Cloudflare Dashboard**
   - Buka https://dash.cloudflare.com
   - Login dengan akun Anda

2. **Buat Worker Baru**
   - Klik menu "Workers & Pages"
   - Klik tombol "Create Application"
   - Pilih "Create Worker"
   - Beri nama worker (contoh: `streambox`)
   - Klik "Deploy"

3. **Edit Code Worker**
   - Klik tombol "Edit Code"
   - Hapus semua kode default yang ada
   - Copy SEMUA isi file `worker.js` dari GitHub Anda
   - Paste ke editor
   - Klik "Save and Deploy"

4. **Testing**
   - Klik link worker Anda (contoh: `https://streambox.your-username.workers.dev`)
   - Seharusnya tampil interface StreamBox

### Troubleshooting Dashboard Method:

**Error: "Uncaught SyntaxError"**
- Pastikan Anda copy SELURUH isi file worker.js
- Jangan ada karakter yang tertinggal di awal/akhir

**Error: "Script startup exceeded CPU limit"**
- Kode terlalu besar untuk di-parse sekaligus
- Coba minimize HTML di dalam fungsi `htmlPage()`

---

## Metode 2: Deploy via GitHub Actions (Otomatis)

### Setup Awal (Sekali Saja):

#### 1. Dapatkan Cloudflare API Token

1. Login ke https://dash.cloudflare.com
2. Klik profil Anda (kanan atas) → "My Profile"
3. Pilih tab "API Tokens"
4. Klik "Create Token"
5. Pilih template "Edit Cloudflare Workers"
6. Klik "Continue to summary" → "Create Token"
7. **Copy token** yang muncul (hanya muncul sekali!)

#### 2. Dapatkan Account ID

1. Di Dashboard Cloudflare, klik "Workers & Pages"
2. Di bagian kanan, lihat "Account ID"
3. Copy Account ID

#### 3. Tambahkan Secrets di GitHub

1. Buka repository GitHub Anda
2. Klik "Settings" → "Secrets and variables" → "Actions"
3. Klik "New repository secret"
4. Tambahkan 2 secrets:

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: [paste token dari step 1]

   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: [paste account ID dari step 2]

#### 4. Push File ke GitHub

Pastikan file-file ini ada di repository:
```
- worker.js
- wrangler.toml
- .github/workflows/deploy.yml
```

#### 5. Deploy Otomatis

Setiap kali Anda push ke branch `main`, GitHub Actions akan otomatis deploy ke Cloudflare Workers.

### Troubleshooting GitHub Actions:

**Error: "Authentication error"**
```
✓ Pastikan CLOUDFLARE_API_TOKEN sudah benar
✓ Pastikan token belum expired
✓ Buat token baru jika perlu
```

**Error: "Account ID not found"**
```
✓ Pastikan CLOUDFLARE_ACCOUNT_ID sudah benar
✓ Copy ulang dari dashboard Cloudflare
```

**Error: "Worker name already exists"**
```
✓ Ubah name di wrangler.toml menjadi unik
✓ Atau hapus worker lama dari dashboard
```

**Error: "main file not found"**
```
✓ Pastikan worker.js ada di root folder repository
✓ Cek file name sama persis dengan yang di wrangler.toml
```

---

## Metode 3: Deploy via Wrangler CLI (Manual)

### Install Wrangler:

```bash
npm install -g wrangler
```

### Login:

```bash
wrangler login
```

### Deploy:

```bash
wrangler deploy
```

### Troubleshooting Wrangler:

**Error: "No such file worker.js"**
```bash
# Pastikan Anda di folder yang benar
ls -la worker.js

# Atau specify file path
wrangler deploy worker.js
```

**Error: "wrangler.toml not found"**
```bash
# Buat file wrangler.toml dulu atau specify config
wrangler deploy --config wrangler.toml
```

---

## Error Umum dan Solusinya

### 1. "Script parse error"

**Penyebab:** Syntax error di JavaScript

**Solusi:**
- Check syntax di worker.js
- Pastikan semua bracket `{}` dan parentheses `()` match
- Pastikan tidak ada karakter aneh (copy-paste issue)

### 2. "Worker exceeded memory"

**Penyebab:** HTML terlalu besar

**Solusi:**
- Minimize CSS dan JavaScript di dalam HTML
- Hapus comments yang tidak perlu
- Kompres string HTML

### 3. "CORS error" setelah deploy

**Penyebab:** CORS headers tidak correct

**Solusi:**
- Sudah handled di `corsHeaders()` function
- Pastikan function ini dipanggil di semua response

### 4. "API calls failing"

**Penyebab:** API proxy tidak bekerja

**Solusi:**
- Check path proxy di worker: `/api/` harus forward ke `https://dramabos.asia/api/`
- Test dengan: `https://your-worker.workers.dev/api/tensei/home?page=1`

### 5. "Worker not updating"

**Penyebab:** Cache

**Solusi:**
```bash
# Clear cache
# Hard refresh browser: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)

# Atau tambah query param
https://your-worker.workers.dev/?v=2
```

---

## Verifikasi Deployment Berhasil

### Test Manual:

1. **Test Homepage:**
   ```
   https://your-worker.workers.dev/
   ```
   Harus tampil interface StreamBox

2. **Test API Proxy:**
   ```
   https://your-worker.workers.dev/api/tensei/home?page=1
   ```
   Harus return JSON data

3. **Test Source Switching:**
   - Klik tab Dramabox, Tensei, DramaId
   - Semua harus load data

4. **Test Pagination:**
   - Klik nomor halaman
   - Harus load data baru

5. **Test Genre Filter (Tensei):**
   - Pilih genre dari dropdown
   - Harus filter sesuai genre

---

## Tips Optimasi

### 1. Minimize File Size

Jika worker terlalu besar, minimize HTML:

```javascript
// Hapus white space berlebih
const html = `<!doctype html><html><head>...`;

// Atau gunakan tool online:
// https://www.minifier.org/
```

### 2. Enable Caching

Sudah enabled di code:
```javascript
cf: { cacheEverything: true, cacheTtl: 10 }
```

### 3. Monitor Usage

Di Cloudflare Dashboard → Workers → Analytics:
- Request count
- CPU time
- Errors

---

## Bantuan Lebih Lanjut

Jika masih gagal, share informasi berikut:

1. ✅ Error message lengkap
2. ✅ Method deployment yang digunakan
3. ✅ Screenshot error (jika ada)
4. ✅ Link repository GitHub (jika public)

Atau lihat Cloudflare Workers documentation:
https://developers.cloudflare.com/workers/
