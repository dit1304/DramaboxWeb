# 📊 Analytics Setup Guide

Panel streaming sudah dilengkapi dengan sistem statistik lengkap untuk tracking visitor dan video plays.

## ✨ Fitur Analytics

### 1. **Visitor Tracking**
- Total visitors (all time)
- Unique visitors today
- IP-based tracking
- Automatic counting

### 2. **Video Play Counter**
- Track setiap video yang diputar
- Per-content statistics
- Source-based tracking

### 3. **Most Watched**
- Top 10 konten paling banyak ditonton
- Real-time ranking
- Sortir berdasarkan jumlah plays

### 4. **Live Dashboard**
- Real-time statistics display
- Auto-refresh setiap 30 detik
- Beautiful UI dengan gradient cards

---

## 🚀 Setup Instructions

### **Option A: Dengan Cloudflare KV (Recommended - Persistent Data)**

#### 1. Create KV Namespace

Di Cloudflare Dashboard:
```bash
1. Login ke Cloudflare Dashboard
2. Pilih Workers & Pages
3. Klik "KV" di sidebar
4. Klik "Create a namespace"
5. Nama: "dramabox-analytics"
6. Copy namespace ID yang diberikan
```

#### 2. Update wrangler.toml

Edit file `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "ANALYTICS"
id = "your-kv-namespace-id-here"  # Paste ID dari step 1
```

#### 3. Deploy Worker

```bash
cd cloudflare-worker
npx wrangler deploy
```

**Done!** Analytics sekarang persistent dan global untuk semua user! ✅

---

### **Option B: Tanpa KV (Mock Data - untuk Testing)**

Jika tidak setup KV, analytics akan tetap tampil dengan **mock data**:
- Total Visitors: 15,420
- Unique Today: 342
- Total Plays: 8,750
- Sample most watched content

Mock data berguna untuk:
- Testing UI
- Demo purposes
- Development mode

---

## 📊 Cara Menggunakan Analytics

### **1. View Dashboard Stats**

Statistics tampil otomatis di homepage:
```
👥 Total Visitors
🌟 Unique Today
▶️ Video Plays
🔥 Top Content
```

### **2. Detailed Statistics Modal**

Klik tombol floating **📊** di kanan bawah untuk melihat:
- Full statistics
- Most watched list (Top 10)
- Ranking dengan medals (🥇🥈🥉)
- Refresh button

### **3. Auto Tracking**

Analytics otomatis track:
- ✅ Setiap visitor yang buka website
- ✅ Setiap kali video diputar
- ✅ Source dari konten yang ditonton
- ✅ Unique IP per hari

---

## 🔧 Technical Details

### **Endpoints**

```javascript
GET  /analytics/stats
POST /analytics/track
```

### **Data Structure**

**Stats Response:**
```json
{
  "total_visitors": 15420,
  "unique_today": 342,
  "total_plays": 8750,
  "most_watched": [
    {
      "title": "Drama Title",
      "source": "dramabox",
      "plays": 1250
    }
  ]
}
```

**Track Request:**
```json
{
  "type": "video_play",
  "content_id": "123",
  "content_title": "Drama Title",
  "source": "dramabox"
}
```

### **KV Keys Structure**

```
stats:total_visitors          -> Integer
stats:unique:YYYY-MM-DD       -> Array of IPs
stats:total_plays             -> Integer
play:SOURCE:ID                -> Integer (play count)
info:SOURCE:ID                -> JSON (content info)
```

---

## 🎨 UI Features

### **Stats Cards**
- Gradient backgrounds
- Hover animations
- Icon indicators
- Formatted numbers (1.5K, 2.3M)

### **Most Watched List**
- Ranking numbers with medals
- Source badges
- Play count with icon
- Hover effects

### **Floating Button**
- Fixed position (bottom-right)
- Gradient background
- Pulse animation
- Easy access

---

## 🔒 Privacy & Security

### **What is Tracked:**
- Page visits (anonymous)
- IP addresses (for unique counting)
- Video plays
- Content titles

### **What is NOT Tracked:**
- Personal information
- User accounts
- Browsing history
- Device details

### **Data Retention:**
- Unique IPs: 7 days
- Play counts: Permanent
- Visitor count: Permanent

---

## 🐛 Troubleshooting

### **Stats showing 0**
- Check if KV namespace is configured
- Verify binding name is "ANALYTICS"
- Check Worker logs for errors

### **Mock data showing**
- KV namespace not configured
- This is normal for testing
- Follow Option A to enable real tracking

### **Stats not updating**
- Wait for auto-refresh (30s)
- Click refresh button in modal
- Check browser console for errors

---

## 📈 Future Enhancements

Possible additions:
- [ ] Charts & graphs
- [ ] Export to CSV
- [ ] Date range filters
- [ ] Country statistics
- [ ] Device breakdown
- [ ] Referrer tracking
- [ ] Search analytics

---

## 💡 Tips

1. **Monitor Popular Content**: Use most watched to see what users love
2. **Peak Hours**: Check unique visitors to find best posting time
3. **Content Strategy**: Focus on sources with most plays
4. **Performance**: Stats cached 30s for better performance

---

## 🆘 Support

Jika ada masalah dengan analytics:
1. Check Cloudflare Worker logs
2. Verify KV namespace configuration
3. Test endpoints manually
4. Check browser console

---

**Analytics system siap digunakan! Deploy dan lihat statistik real-time website Anda! 📊✨**
