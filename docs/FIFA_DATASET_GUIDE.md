# FIFA/EA FC Oyuncu Verisi Import Kılavuzu

## 1. Dataset İndirme

### Seçenek A: Kaggle (En Güncel)
1. https://www.kaggle.com/ adresine git
2. Search: "FIFA 25 complete player dataset" veya "EA FC 25 players"
3. Önerilen dataset: [FC 25 - Complete Player Dataset](https://www.kaggle.com/datasets)
4. İndir: `male_players.csv` veya `players_25.csv`

### Seçenek B: GitHub (Hızlı)
```bash
# Fork'lanmış FIFA dataset repo
git clone https://github.com/akarshkalla0101/FIFA-Analysis
cd FIFA-Analysis
# CSV dosyası: data/male_players.csv
```

### Seçenek C: Direct Download (Hızlı alternatif)
Bu repo'larda FIFA CSV dosyaları mevcut:
- https://github.com/AjeetVaibhav/FIFA-Player-Data-Analysis
- https://github.com/stefanobaghino/FIFA-dataset

## 2. CSV Dosyasını Yerleştir

İndirilen CSV dosyasını proje kök dizinine koy:
```bash
# Örnek
cp ~/Downloads/male_players.csv ./fifa-players.csv
```

## 3. Veritabanını Güncelle

```bash
# Migration çalıştır
mysql -u root -p kadrokur < drizzle/migrations/0002_fifa_players.sql

# Veya manuel migration
npx tsx server/apply-migration.mjs
```

## 4. Oyuncuları İmport Et

```bash
# Tüm oyuncuları import et (minimum 60 overall)
npx tsx server/seed-players-fifa.mjs fifa-players.csv

# Sadece Süper Lig oyuncuları için (script'i düzenle)
# leagues: ["Süper Lig"] filtresini aktif et
```

## 5. Doğrula

```bash
# Veritabanına bağlanıp kontrol et
mysql -u root -p kadrokur
mysql> SELECT COUNT(*) FROM players;
mysql> SELECT position, cardQuality, COUNT(*) FROM players GROUP BY position, cardQuality;
```

## CSV Formatı (Beklenen Kolonlar)

FIFA dataset'lerinde bu kolonlar olmalı:
```
short_name, long_name
club_name, league_name, nationality_name
overall, potential
age, height_cm, weight_kg
club_position, nation_position
preferred_foot
weak_foot, skill_moves
pace, shooting, passing, dribbling, defending, physic
diving, handling, kicking, positioning, reflexes
player_face_url
```

## Kart Kalite Seviyeleri

| Overall | Card Quality |
|---------|--------------|
| 89+     | Elite (Mor)  |
| 75-88   | Gold (Altın) |
| 65-74   | Silver (Gümüş) |
| 64-     | Bronze (Bronz) |

## Notlar

- Dataset ~17,000+ oyuncu içerir
- Resim URL'leri CSV'de gelir (player_face_url)
- Eğer resim URL'leri çalışmazsa, alternatif kaynaklar:
  - https://fifadatabase.org/assets/players/{id}.png
  - https://cdn.sofifa.net/players/{id:3}/{id:2}/{id}.png

## Sorun Giderme

**CSV parse hatası:**
- CSV dosyasının UTF-8 encoded olduğundan emin ol
- Kolon başlıklarını kontrol et

**Veritabanı bağlantı hatası:**
- `.env` dosyasında `DATABASE_URL` doğru mu?
- MySQL servisi çalışıyor mu?

**Resimler görünmüyor:**
- FIFA face URL'leri hotspot protection olabilir
- Alternatif: Futbin / FUTWiz API kullan
