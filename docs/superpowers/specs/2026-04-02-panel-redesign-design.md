# Panel Redesign Design Spec

## Overview

Redesign the Kadrokur v3 broadcaster panel (React) and license management panel (static HTML) with a football-themed dark green aesthetic. No emojis, elegant SVG icons throughout.

## Design Language

**Color tokens:**
- Background: `#030a06`
- Panel background: `#0a1a0f`
- Border: `#14532d`
- Border subtle: `#14532d44`
- Accent primary: `#22c55e`
- Accent secondary: `#4ade80`
- Text muted: `#166534`
- Text body: `#e2e8f0`
- Text secondary: `#cbd5e1`
- Warning/amber: `#fbbf24`
- Danger: `#fca5a5` / `#dc2626`

**Typography:** `'Segoe UI', system-ui, sans-serif` — uppercase labels with `letter-spacing: 0.08em`, bold weights for values

**Icons:** lucide-react for BroadcasterPanel.tsx; inline SVG (same lucide shapes) for license-panel.html

**No emojis anywhere** — including alert() calls, button text, and status messages

---

## Part 1 — BroadcasterPanel.tsx (React)

### Layout: Minimal Header + Full-Focus Content

Single-page layout with no sidebar navigation:

```
┌─────────────────────────────────────────────────────┐
│ [logo icon] KADROKUR / YAYINCI PANELİ v3  [status pill] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Pre-session view OR Active session view]          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Header:**
- Left: Green gradient square logo icon (Shield icon) + "KADROKUR" bold + "YAYINCI PANELİ" subtitle
- Right: Status pill — offline state: `#0a1a0f` bg + `#14532d` border + grey dot + "HAZIR"; live state: `#16a34a22` bg + `#22c55e` border + green pulse dot + "CANLI"

### Pre-Session View

Two-column layout:

**Left column — Connection settings:**
- Panel: "BAĞLANTI" title with Link icon
- License key input (Key icon, monospace font)
- TikTok username input (At-sign icon)
- Connect button: full-width green gradient

**Right column — Session configuration:**
- Panel: "OTURUM AYARLARI" title with Settings icon
- Team names: 2×2 grid (Takım A / Takım B labels + text inputs)
- Mode selector: two radio-style cards
  - Manuel: Users icon + description
  - Otomatik: Zap icon + description
  - Selected state: `#22c55e` border + `#16a34a0f` background

### Active Session View

**Stats row (4 cards):**
1. Açılan Kartlar — value + progress bar (cards opened / total)
2. Katılımcı — Users icon + count
3. Beğeni — Heart icon + count
4. Hediye — Gift icon + count

**Team panels (2×2 grid):**
Each panel shows:
- Team name + colored indicator
- 11-slot card grid: filled slots = `#16a34a33` bg rounded square; empty slots = dashed `#14532d` border

**Bottom action row:**
- Left: Session info (session ID + elapsed time with Clock icon)
- Center: Quick links (Settings, Stats icons as ghost buttons)
- Right: "OTURUMU SONLANDUR" — red-tinted destructive button (Square icon)

### State mapping

| State | `sessionActive` | View shown |
|-------|----------------|-----------|
| Not connected | false | Pre-session |
| Connected, session running | true | Active session |

### Remove all emojis from:
- `alert()` calls → plain text messages
- Button labels → icon + text only
- Any string literals with emoji characters

---

## Part 2 — license-panel.html (Static HTML)

### Layout

```
┌──────────────────────────────────────────────────────┐
│ [Lock icon] KADROKUR  LİSANS YÖNETİM PANELİ  [back] │
├──────────────────────────────────────────────────────┤
│  [Toplam]  [Aktif]  [Süresi Dolmuş]  [Bu Ay]        │
├────────────────┬─────────────────────────────────────┤
│  Package list  │  License list with search           │
│  + Create form │  (3 sample cards)                   │
└────────────────┴─────────────────────────────────────┘
```

**Header:**
- Lock icon in green gradient square + "KADROKUR" + "LİSANS YÖNETİM PANELİ"
- Back button (ArrowLeft icon) → links to broadcaster panel

**Stats strip (4 mini cards):**
- Toplam Lisans, Aktif (green value), Süresi Dolmuş (red value), Bu Ay Oluşturulan

**Left column (320px fixed):**
1. Package selector panel — 3 clickable cards: Başlangıç ₺149 / Profesyonel ₺349 (default selected) / Yıllık ₺999
2. Create license form panel:
   - Kullanıcı Adı, E-posta, Başlangıç Tarihi + Süre (Gün) side-by-side, İzinler checkboxes, Not
   - Submit button: green gradient full-width

**Right column (flex):**
- License list panel with inline search input
- Each license card:
  - Active: green left border (3px) + monospace key + "Aktif" badge
  - Expired: red left border + greyed key + "Süresi Doldu" badge
  - 6-field detail grid: Kullanıcı / Paket / Bitiş / Kullanım / Mod / Kalan
  - Action buttons: Kopyala / Uzat / İptal Et (or Yenile for expired)

---

## Files to Modify

| File | Change |
|------|--------|
| `client/src/pages/BroadcasterPanel.tsx` | Full redesign — new layout, colors, no emojis |
| `client/public/license-panel.html` | Full redesign — replace purple theme with green |

No new files. No new dependencies (lucide-react already installed, framer-motion available but not required for this redesign).

---

## Out of Scope

- No changes to backend API, tRPC routes, or socket handlers
- No changes to game-screen-websocket.html
- No new routes or navigation changes
- No mobile/responsive optimizations beyond what exists today
