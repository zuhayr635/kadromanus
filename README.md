# Kadrokur v3 - TikTok Live Futbol Kartları Oyunu

Kadrokur, TikTok canlı yayınlarında futbolcuların kart açma oyunudur. Yayıncılar, izleyicilerin hediye göndermesi ve beğenmeleri aracılığıyla futbolcu kartları açabilir, 4 takımın kadrolarını tamamlamaya çalışır ve final skorlarını Telegram üzerinden paylaşabilir.

## 🎮 Özellikler

### TikTok Live Entegrasyonu
- **Canlı Event İşleme:** Beğeni, hediye, yorum ve bağlantı olaylarını gerçek zamanlı olarak yakalama
- **Hediye Tier Sistemi:** Hediye değerine göre farklı kalitede kartlar (Bronz, Gümüş, Altın, Elit)
- **Beğeni Kombo Sistemi:** Beğeni sayısına göre otomatik kart açma
- **Multi-Session Yönetimi:** Birden fazla yayıncı eş zamanlı oyun oynayabilir

### Oyun Motoru
- **4 Takım Kadrosu:** Her takım 11 oyuncu ile tamamlanır
- **Dinamik Oyuncu Seçimi:** 550+ futbolcu veritabanından rastgele seçim
- **Skor Hesaplama:** Takım başına puan sistemi
- **Oyun Sonu Otomasyonu:** Kadrolar dolduğunda veya kart havuzu bittiğinde

### Yayıncı Kontrol Paneli
- **Lisans Doğrulama:** KDR-* formatında lisans anahtarları
- **TikTok Bağlantısı:** Kullanıcı adı girişi ve otomatik bağlantı
- **Takım Özelleştirmesi:** 4 takım adı özel tanımlama
- **Mod Seçimi:** 
  - **Manuel Mod:** Yayıncı panelden takım seçimi
  - **Otomatik Mod:** İzleyiciler `!1`, `!2`, `!3`, `!4` komutları ile takım seçimi

### OBS Browser Source Oyun Ekranı
- **1920x1080 Optimize:** OBS ve diğer yayın yazılımları ile tam uyumluluk
- **Gerçek Zamanlı Güncellemeler:** 500ms polling sistemi
- **Kart Açma Animasyonları:** Smooth CSS animasyonları
- **Final Skor Tablosu:** Oyun bitişinde otomatik gösterim

### Telegram Bot Entegrasyonu
- **Otomatik Bildirimler:** Oyun sonu sonuçları Telegram grubuna gönderme
- **Ekran Görüntüsü:** Oyun ekranının PNG olarak kaydedilmesi
- **Skor Paylaşımı:** Formatted skor tablosu ve istatistikler
- **30 Saniye Gösterim:** Ekranda sonuçlar 30 saniye gösterilir

### Lisans Yönetimi
Dört paket türü ile esnek lisanslama:

| Özellik | Basic | Pro | Premium | Unlimited |
|---------|-------|-----|---------|-----------|
| Oyun Oynama | ✅ | ✅ | ✅ | ✅ |
| Telegram Bot | ❌ | ✅ | ✅ | ✅ |
| Otomatik Mod | ❌ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ | ✅ |
| Multi-Session | ❌ | ❌ | ✅ | ✅ |
| Eş Zamanlı Oturum | 1 | 1 | 2 | Sınırsız |

### Admin Dashboard
- **Session History:** Tüm oyunların detaylı geçmişi
- **İstatistikler:** Grafikler ve analitikler
- **Lisans Yönetimi:** Lisans oluşturma, düzenleme, silme
- **Veri Dışa Aktarma:** JSON ve CSV formatında export

### Profil Sayfası
- **Oyun Geçmişi:** Kullanıcının tüm oyunları
- **İstatistikler:** Toplam kart, katılımcılar, ortalama süre
- **Grafikler:** Kart dağılımı, oyun süresi, durum dağılımı
- **Detaylı Tablo:** Tarih, kart sayısı, katılımcılar, durum

## 🛠️ Teknik Stack

| Bileşen | Teknoloji |
|---------|-----------|
| **Backend** | Node.js + Express + tRPC |
| **Veritabanı** | MySQL/TiDB + Drizzle ORM |
| **Frontend** | React 19 + Tailwind 4 |
| **TikTok** | tiktok-live-connector |
| **Telegram** | node-telegram-bot-api |
| **Realtime** | Socket.io |
| **Testing** | Vitest (96 test) |

## 📦 Kurulum

### Gereksinimler
- Node.js 22+
- MySQL/TiDB veritabanı
- TikTok API erişimi
- Telegram Bot Token

### Adımlar

1. **Depoyu klonla:**
```bash
git clone <repo-url>
cd kadrokur
```

2. **Bağımlılıkları yükle:**
```bash
pnpm install
```

3. **Veritabanı şemasını oluştur:**
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

4. **Oyuncu veritabanını seed'le:**
```bash
npx tsx server/seed-players.mjs
npx tsx server/seed-gift-tiers.mjs
```

5. **Environment variables ayarla:**
```bash
cp .env.example .env
# Aşağıdaki değerleri doldur:
# DATABASE_URL=mysql://user:password@localhost/kadrokur
# TELEGRAM_BOT_TOKEN=your_token_here
# TELEGRAM_GROUP_ID=your_group_id
```

6. **Geliştirme sunucusunu başlat:**
```bash
pnpm dev
```

7. **Testleri çalıştır:**
```bash
pnpm test
```

## 🎯 Kullanım

### Yayıncı Paneli
1. `http://localhost:3000/broadcaster-panel.html` adresine git
2. Lisans anahtarını gir (KDR-* formatı)
3. TikTok kullanıcı adını gir
4. Takım adlarını özelleştir
5. Manuel veya Otomatik mod seç
6. "Oyunu Başlat" butonuna tıkla

### OBS Browser Source
1. OBS'de "Browser Source" ekle
2. URL: `http://localhost:3000/game-screen.html?sessionId=YOUR_SESSION_ID`
3. Çözünürlük: 1920x1080
4. Arka plan: Transparent (CSS ile)

### Admin Dashboard
1. `http://localhost:3000/admin-dashboard.html` adresine git
2. JWT token ile giriş yap
3. Lisans ve session yönetimi

### Profil Sayfası
1. `http://localhost:3000/profile` adresine git
2. Oyun geçmişi ve istatistikleri görüntüle

## 📊 API Endpoints

### Yayıncı API
- `POST /api/trpc/broadcaster.createSession` - Oturum oluştur
- `GET /api/trpc/broadcaster.getSession` - Oturum bilgisi al
- `POST /api/trpc/broadcaster.updateMode` - Mod değiştir
- `POST /api/trpc/broadcaster.selectTeam` - Takım seç (otomatik mod)
- `POST /api/trpc/broadcaster.endSession` - Oturum sonlandır

### Oyun API
- `GET /api/trpc/game.getState` - Oyun durumunu al
- `GET /api/trpc/game.getFinalScores` - Final skorları al
- `GET /api/trpc/game.isComplete` - Oyun tamamlandı mı?

### Lisans API
- `POST /api/trpc/license.create` - Lisans oluştur
- `GET /api/trpc/license.getByKey` - Lisans bilgisi al
- `GET /api/trpc/license.validate` - Lisansı doğrula
- `POST /api/trpc/license.updateFeatures` - Özellikleri güncelle

### Admin API
- `GET /api/trpc/admin.getSessionHistory` - Oturum geçmişi
- `GET /api/trpc/admin.getStatistics` - İstatistikler
- `GET /api/trpc/admin.getTopBroadcasters` - En iyi yayıncılar
- `POST /api/trpc/admin.exportData` - Veri dışa aktar

## 🧪 Testler

```bash
# Tüm testleri çalıştır
pnpm test

# Belirli bir dosyayı test et
pnpm test -- server/game-engine.test.ts

# Watch modunda çalıştır
pnpm test -- --watch
```

**Test Kapsamı:**
- 96 vitest testi
- TikTok entegrasyonu
- Oyun motoru
- Multi-tenant izolasyonu
- Concurrent session yönetimi
- Lisans doğrulama
- Integration tests

## 📁 Proje Yapısı

```
kadrokur/
├── client/
│   ├── public/
│   │   ├── broadcaster-panel.html
│   │   ├── game-screen.html
│   │   ├── license-panel.html
│   │   └── admin-dashboard.html
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Profile.tsx
│       │   └── NotFound.tsx
│       ├── components/
│       ├── lib/
│       └── App.tsx
├── server/
│   ├── tiktok-integration.ts
│   ├── game-engine.ts
│   ├── broadcaster-session.ts
│   ├── telegram-bot.ts
│   ├── license-manager.ts
│   ├── session-history.ts
│   ├── game-end-workflow.ts
│   ├── routers/
│   │   ├── broadcaster.ts
│   │   ├── game.ts
│   │   ├── license.ts
│   │   └── admin.ts
│   └── routers.ts
├── drizzle/
│   ├── schema.ts
│   ├── migrations/
│   └── meta/
├── server/
│   ├── seed-players.mjs
│   └── seed-gift-tiers.mjs
└── README.md
```

## 🚀 Dağıtım

### Docker
```bash
# Dockerfile oluştur
docker build -t kadrokur:latest .

# Container çalıştır
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://... \
  -e TELEGRAM_BOT_TOKEN=... \
  kadrokur:latest
```

### Coolify
1. Coolify dashboard'a git
2. Yeni proje oluştur
3. GitHub repo bağla
4. Environment variables ayarla
5. Deploy et

## 📝 Lisans

MIT License - Detaylar için LICENSE dosyasına bakınız

## 🤝 Katkıda Bulunma

1. Fork et
2. Feature branch oluştur (`git checkout -b feature/amazing-feature`)
3. Commit et (`git commit -m 'Add amazing feature'`)
4. Push et (`git push origin feature/amazing-feature`)
5. Pull Request aç

## 📞 Destek

Sorularınız veya sorunlarınız için:
- GitHub Issues: [Issues](https://github.com/yourusername/kadrokur/issues)
- Email: support@kadrokur.com
- Discord: [Sunucuya katıl](https://discord.gg/kadrokur)

## 🎓 Öğrenme Kaynakları

- [TikTok Live Connector Docs](https://github.com/zerodytrash/TikTok-Live-Connector)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [tRPC Dokumentasyon](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)

## 📈 Roadmap

- [ ] WebSocket real-time event pipeline
- [ ] Ekran görüntüsü capture (Puppeteer)
- [ ] JWT-based admin auth
- [ ] Mobile app (React Native)
- [ ] Streaming platform entegrasyonu (YouTube, Twitch)
- [ ] AI-powered oyuncu önerileri
- [ ] Multiplayer turnuvalar
- [ ] Sosyal medya entegrasyonu

---

**Kadrokur v3** - TikTok Live Futbol Kartları Oyunu | Yapım: 2026
