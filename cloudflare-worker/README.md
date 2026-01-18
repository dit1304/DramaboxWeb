# DramaBox Panel - Cloudflare Worker

Panel streaming DramaBox dengan tampilan modern yang bisa di-deploy ke Cloudflare Workers.

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
git commit -m "Deploy DramaBox panel"
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

## Fitur

- Tampilan modern dark theme
- Responsive (mobile-friendly)
- Navigasi: For You, Terbaru, Populer
- Pencarian drama
- Video player dengan quality selector
- Daftar episode
- Next/Prev episode navigation
