# Gift Management System Design

## Overview

Yayıncıların TikTok Live yayınlarında kullanılan hediye sistemini yönetmek için gift yönetim paneli. Admin tüm hediyeleri görür/düzenler, yayıncı kendi oyununda aktif hediyeleri seçer.

## Data Source

- `gifts-db.json` — 968 TikTok hediyesi (TR region)
- Alanlar: `id`, `name`, `image`, `diamondCost`, `combo`
- 231 hediyenin ismi boş (filtrelenecek)

## Database Schema (giftTiers update)

```sql
ALTER TABLE giftTiers
  ADD COLUMN image TEXT,
  ADD COLUMN diamondCost INT NOT NULL DEFAULT 0;
```

Mevcut `giftTiers` tablosuna `image` ve `diamondCost` eklenir. `seed-gift-tiers.mjs` yerine `gifts-db.json` import kullanılır.

## Auto Tier Mapping (diamondCost → cardQuality)

| diamondCost | cardQuality |
|-------------|-------------|
| 1-9         | bronze      |
| 10-99       | silver      |
| 100-999     | gold        |
| 1000+       | elite       |

Yayıncı gift seçmezse bu default mapping aktif olur.

## Admin Panel — Hediyeler Sekmesi (license-panel.html)

### UI

- license-panel.html'e iki sekme eklenir: "Lisanslar" | "Hediyeler"
- Hediyeler sekmesi içeriği:

**Arama ve Filtre Çubuğu:**
- Arama kutusu: isme göre anlık filtreleme
- Diamond filtre butonları: `1-5` | `5-10` | `10-50` | `50-100` | `100-500` | `500+`
- Card quality filtre butonları: Bronze | Silver | Gold | Elite
- Toplam gift sayısı ve aktif filtre göstergesi

**Gift Tablosu:**
- Her satır: hediyenin resmi (küçük ikon), isim, diamond cost, cardQuality dropdown
- cardQuality dropdown ile admin manuel olarak tier değiştirebilir
- Boş isimli hediyeler gösterilmez veya gri renkte "İsimsiz" etiketiyle listelenir

### API Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|-----------|
| `/api/gifts/import` | POST | gifts-db.json'dan toplu import |
| `/api/gifts` | GET | Tüm hediyeleri listele (query params: search, minCost, maxCost, quality) |
| `/api/gifts/:id` | PATCH | Tek gift güncelle (cardQuality değişikliği) |

## Broadcaster Panel — Gift Seçim Alanı

### UI (broadcaster-panel.html / BroadcasterPanel.tsx)

- Broadcaster panel'e "Hediyeler" bölümü eklenir
- Aynı arama ve filtre sistemi (admin panel ile tutarlı)
- Her gift satırında toggle switch: aktif/pasif
- Aktif hediyeler için cardQuality dropdown (default: auto mapping)
- Oyun sırasında değişiklik yapılabilir — değişiklikler anlık socket.io ile game-engine'e iletilir

### API Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|-----------|
| `/api/sessions/:sessionId/gifts` | GET | Oturumun aktif gift listesi |
| `/api/sessions/:sessionId/gifts` | PUT | Aktif gift listesini güncelle |
| Socket event: `gift-config-update` | — | Oyun sırasında gift config değişikliği |

### Data Flow

```
Yayıncı gift seçer → API/Socket ile kaydedilir
    ↓
TikTok'dan gift gelir → socket-server.ts'de giftId ile eşleşme
    ↓
Eşleşen gift aktif mi? → Evet: kart aç, Hayır: yok say
    ↓
cardQuality'ye göre kart mekanizması çalışır
```

## Implementation Order

1. DB schema update (giftTiers'e image, diamondCost ekle)
2. Gift import endpoint + script
3. Gift CRUD API (list, update, filter)
4. Admin panel — Hediyeler sekmesi UI
5. Broadcaster panel — Gift seçim alanı UI
6. Socket integration — oyun sırasında gift config güncelleme
