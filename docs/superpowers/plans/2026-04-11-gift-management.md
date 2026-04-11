# Gift Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import 968 TikTok gifts, add admin panel for gift management, and enable broadcasters to select active gifts per session

**Architecture:** Extend giftTiers schema with image/diamondCost, create REST API for gift CRUD, add admin UI tab to license-panel.html, add broadcaster UI section to BroadcasterPanel.tsx, integrate with existing game-engine.ts gift processing

**Tech Stack:** Drizzle ORM (MySQL), Express REST API, static HTML+vanilla JS (admin), React 19 (broadcaster panel), Socket.io

---

## File Structure

### Files to Create
- `server/scripts/import-gifts.mjs` — One-time script to import gifts-db.json into giftTiers table
- `server/gift-manager.ts` — Gift CRUD functions (DB layer)
- `server/routers/gifts.ts` — tRPC router for gift endpoints
- `server/gift-manager.test.ts` — Unit tests for gift-manager.ts
- `server/routers/gifts.test.ts` — Integration tests for gift API

### Files to Modify
- `drizzle/schema.ts:153-159` — Add image, diamondCost columns to giftTiers
- `server/_core/index.ts` — Register gift REST endpoints (admin-protected)
- `server/routers/index.ts` — Export gifts router
- `client/public/license-panel.html` — Add "Hediyeler" tab with gift list UI
- `client/src/pages/BroadcasterPanel.tsx` — Add gift selection section
- `server/socket-server.ts` — Add gift-config-update event handler
- `server/game-engine.ts:279-306` — Respect session-specific gift config in processGiftEvent
- `drizzle/schema.ts:66-78` — Add giftConfig JSON field to sessions table

---

## Task 1: Database Schema Update

**Files:**
- Modify: `drizzle/schema.ts:153-159`
- Modify: `drizzle/schema.ts:66-78`

### Step 1.1: Add columns to giftTiers table

- [ ] **Update giftTiers schema**

```typescript
export const giftTiers = mysqlTable("giftTiers", {
  id: int("id").autoincrement().primaryKey(),
  giftName: varchar("giftName", { length: 64 }).notNull().unique(),
  giftId: int("giftId").notNull(),
  image: text("image"), // NEW: Gift icon URL
  diamondCost: int("diamondCost").notNull().default(0), // NEW: Coin/diamond value
  tierLevel: mysqlEnum("tierLevel", ["1", "2", "3"]).notNull(),
  cardQuality: mysqlEnum("cardQuality", ["bronze", "silver", "gold", "elite"]).notNull(),
});
```

### Step 1.2: Add giftConfig to sessions table

- [ ] **Update sessions schema**

```typescript
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  licenseId: int("licenseId").notNull(),
  tiktokUsername: varchar("tiktokUsername", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["active", "paused", "ended", "error"]).default("active").notNull(),
  pythonPid: int("pythonPid"),
  gameState: json("gameState"),
  teamSettings: json("teamSettings"),
  gameSettings: json("gameSettings"),
  giftConfig: json("giftConfig"), // NEW: { activeGiftIds: number[], customMappings: Record<number, CardQuality> }
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});
```

### Step 1.3: Push schema changes

- [ ] **Run Drizzle migration**

Run: `pnpm db:push`
Expected: Schema updated successfully

### Step 1.4: Commit schema changes

- [ ] **Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat: add image, diamondCost to giftTiers and giftConfig to sessions"
```

---

## Task 2: Gift Import Script

**Files:**
- Create: `server/scripts/import-gifts.mjs`

### Step 2.1: Write import script

- [ ] **Create import-gifts.mjs**

```javascript
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { giftTiers } from "../../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// Auto tier mapping by diamond cost
function autoMapQuality(diamondCost) {
  if (diamondCost >= 1000) return "elite";
  if (diamondCost >= 100) return "gold";
  if (diamondCost >= 10) return "silver";
  return "bronze";
}

function autoMapTier(diamondCost) {
  if (diamondCost >= 100) return "3";
  if (diamondCost >= 10) return "2";
  return "1";
}

async function importGifts() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // Read JSON file
    const raw = fs.readFileSync("gifts-db.json", "utf-8");
    const giftsObj = JSON.parse(raw);
    const gifts = Object.values(giftsObj);

    console.log(`Toplam ${gifts.length} hediye bulundu`);

    // Filter out empty names
    const validGifts = gifts.filter(g => g.name && g.name.trim().length > 0);
    console.log(`Geçerli hediye sayısı: ${validGifts.length} (${gifts.length - validGifts.length} boş isim filtrelendi)`);

    let imported = 0;
    let skipped = 0;

    for (const gift of validGifts) {
      // Check if already exists
      const existing = await db.select().from(giftTiers).where(eq(giftTiers.giftId, gift.id)).limit(1);
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(giftTiers).values({
        giftName: gift.name,
        giftId: gift.id,
        image: gift.image || null,
        diamondCost: gift.diamondCost || 0,
        tierLevel: autoMapTier(gift.diamondCost || 0),
        cardQuality: autoMapQuality(gift.diamondCost || 0),
      });
      
      imported++;
      if (imported % 50 === 0) {
        console.log(`İlerleme: ${imported}/${validGifts.length}`);
      }
    }

    console.log(`\n✅ Import tamamlandı!`);
    console.log(`- İçe aktarılan: ${imported}`);
    console.log(`- Atlanan (zaten var): ${skipped}`);

    await connection.end();
  } catch (error) {
    console.error("❌ Import hatası:", error);
    process.exit(1);
  }
}

importGifts();
```

### Step 2.2: Run import script

- [ ] **Execute import**

Run: `node server/scripts/import-gifts.mjs`
Expected: "✅ Import tamamlandı! - İçe aktarılan: 737"

### Step 2.3: Verify data in DB

- [ ] **Check database**

Run: `pnpm db:push` (just to verify connection), then manually check giftTiers table has ~737 rows

Expected: giftTiers table populated

### Step 2.4: Commit import script

- [ ] **Commit**

```bash
git add server/scripts/import-gifts.mjs
git commit -m "feat: add gift import script from gifts-db.json"
```

---

## Task 3: Gift Manager (DB Layer)

**Files:**
- Create: `server/gift-manager.ts`
- Create: `server/gift-manager.test.ts`

### Step 3.1: Write failing test for getAllGifts

- [ ] **Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as giftManager from "./gift-manager";

// Mock DB
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("gift-manager", () => {
  describe("getAllGifts", () => {
    it("should return all gifts with filters", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([
          { id: 1, giftName: "Rose", diamondCost: 1, cardQuality: "bronze", image: "url" },
        ]),
      };
      
      const { getDb } = await import("./db");
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await giftManager.getAllGifts({ search: "Rose", minCost: 0, maxCost: 10, quality: "bronze", limit: 50, offset: 0 });
      
      expect(result.gifts).toHaveLength(1);
      expect(result.gifts[0].giftName).toBe("Rose");
    });
  });
});
```

### Step 3.2: Run test to verify it fails

- [ ] **Run test**

Run: `pnpm test gift-manager.test.ts`
Expected: FAIL with "Cannot find module './gift-manager'"

### Step 3.3: Write gift-manager.ts

- [ ] **Create gift-manager.ts**

```typescript
import { getDb } from "./db";
import { giftTiers } from "../drizzle/schema";
import { eq, and, gte, lte, like, sql, desc } from "drizzle-orm";

export interface GiftFilters {
  search?: string;
  minCost?: number;
  maxCost?: number;
  quality?: "bronze" | "silver" | "gold" | "elite";
  limit?: number;
  offset?: number;
}

export async function getAllGifts(filters: GiftFilters = {}) {
  const db = await getDb();
  if (!db) return { gifts: [], total: 0 };

  const { search, minCost, maxCost, quality, limit = 50, offset = 0 } = filters;

  const whereClause = [];
  if (search) whereClause.push(like(giftTiers.giftName, `%${search}%`));
  if (minCost !== undefined) whereClause.push(gte(giftTiers.diamondCost, minCost));
  if (maxCost !== undefined) whereClause.push(lte(giftTiers.diamondCost, maxCost));
  if (quality) whereClause.push(eq(giftTiers.cardQuality, quality));

  const where = whereClause.length > 0 ? and(...whereClause) : undefined;

  const [gifts, totalCount] = await Promise.all([
    db.select().from(giftTiers).where(where).orderBy(desc(giftTiers.diamondCost)).limit(limit).offset(offset),
    db.select({ count: sql`COUNT(*)` }).from(giftTiers).where(where),
  ]);

  return {
    gifts,
    total: Number(totalCount[0]?.count || 0),
    limit,
    offset,
  };
}

export async function updateGiftQuality(giftId: number, cardQuality: "bronze" | "silver" | "gold" | "elite") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db.update(giftTiers).set({ cardQuality }).where(eq(giftTiers.id, giftId));

  const [updated] = await db.select().from(giftTiers).where(eq(giftTiers.id, giftId)).limit(1);
  return updated;
}
```

### Step 3.4: Run test to verify it passes

- [ ] **Run test**

Run: `pnpm test gift-manager.test.ts`
Expected: PASS

### Step 3.5: Commit gift-manager

- [ ] **Commit**

```bash
git add server/gift-manager.ts server/gift-manager.test.ts
git commit -m "feat: add gift-manager with getAllGifts and updateGiftQuality"
```

---

## Task 4: Gift REST API Endpoints

**Files:**
- Modify: `server/_core/index.ts:210` (after existing admin routes)

### Step 4.1: Add gift endpoints to index.ts

- [ ] **Add REST endpoints**

In `server/_core/index.ts` after line 210 (after license routes), add:

```typescript
// Gift management API (admin-protected)
app.get("/api/gifts", requireAdmin, async (req, res) => {
  try {
    const { getAllGifts } = await import("../gift-manager");
    const { search, minCost, maxCost, quality, limit, offset } = req.query;
    
    const result = await getAllGifts({
      search: search as string,
      minCost: minCost ? Number(minCost) : undefined,
      maxCost: maxCost ? Number(maxCost) : undefined,
      quality: quality as any,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
    
    res.json(result);
  } catch (err) {
    console.error("Error getting gifts:", err);
    res.status(500).json({ error: "Failed to get gifts" });
  }
});

app.patch("/api/gifts/:id", requireAdmin, async (req, res) => {
  try {
    const { updateGiftQuality } = await import("../gift-manager");
    const { id } = req.params;
    const { cardQuality } = req.body;
    
    if (!cardQuality || !["bronze", "silver", "gold", "elite"].includes(cardQuality)) {
      return res.status(400).json({ error: "Invalid cardQuality" });
    }
    
    const result = await updateGiftQuality(Number(id), cardQuality);
    res.json(result);
  } catch (err) {
    console.error("Error updating gift:", err);
    res.status(500).json({ error: "Failed to update gift" });
  }
});
```

### Step 4.2: Test API manually

- [ ] **Start server and test**

Run: `pnpm dev`
Then: `curl -X GET http://localhost:3000/api/gifts?limit=10` (with admin cookie)
Expected: JSON response with 10 gifts

### Step 4.3: Commit API endpoints

- [ ] **Commit**

```bash
git add server/_core/index.ts
git commit -m "feat: add gift REST API endpoints (GET /api/gifts, PATCH /api/gifts/:id)"
```

---

## Task 5: Admin Panel - Hediyeler Tab UI

**Files:**
- Modify: `client/public/license-panel.html:30-50` (add tab navigation)
- Modify: `client/public/license-panel.html:700+` (add gift list UI before closing </body>)

### Step 5.1: Add tab navigation

- [ ] **Add tabs to license-panel.html**

After line 29 (inside .nav), add:

```html
<div class="nav-tabs" style="display:flex; gap:1rem; margin-left:2rem;">
  <button class="tab-btn active" data-tab="licenses" style="padding:0.5rem 1rem; border:1px solid rgba(212,175,55,0.25); background:rgba(212,175,55,0.1); color:#D4AF37; cursor:pointer; font-size:0.7rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;">Lisanslar</button>
  <button class="tab-btn" data-tab="gifts" style="padding:0.5rem 1rem; border:1px solid rgba(212,175,55,0.25); background:transparent; color:#6b7a6b; cursor:pointer; font-size:0.7rem; font-weight:600; letter-spacing:0.1em; text-transform:uppercase;">Hediyeler</button>
</div>
```

### Step 5.2: Add gift tab content

- [ ] **Add gift list UI**

Before closing `</body>` tag, add:

```html
<!-- Gift Management Tab (hidden by default) -->
<div id="gifts-tab" class="tab-content" style="display:none;">
  <div class="page">
    <!-- Search and Filters -->
    <div class="panel" style="margin-bottom:1.5rem;">
      <div class="panel-head">
        <div class="panel-title">Hediye Ara ve Filtrele</div>
      </div>
      <div class="panel-body">
        <input type="text" id="gift-search" placeholder="Hediye adı ara..." style="margin-bottom:0.8rem;">
        
        <div style="display:flex; gap:0.5rem; margin-bottom:0.8rem; flex-wrap:wrap;">
          <button class="filter-btn" data-filter="cost" data-value="1-5">1-5</button>
          <button class="filter-btn" data-filter="cost" data-value="5-10">5-10</button>
          <button class="filter-btn" data-filter="cost" data-value="10-50">10-50</button>
          <button class="filter-btn" data-filter="cost" data-value="50-100">50-100</button>
          <button class="filter-btn" data-filter="cost" data-value="100-500">100-500</button>
          <button class="filter-btn" data-filter="cost" data-value="500+">500+</button>
          <button class="filter-btn active" data-filter="cost" data-value="all">Tümü</button>
        </div>
        
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="filter-btn" data-filter="quality" data-value="bronze">Bronze</button>
          <button class="filter-btn" data-filter="quality" data-value="silver">Silver</button>
          <button class="filter-btn" data-filter="quality" data-value="gold">Gold</button>
          <button class="filter-btn" data-filter="quality" data-value="elite">Elite</button>
          <button class="filter-btn active" data-filter="quality" data-value="all">Tümü</button>
        </div>
        
        <div id="gift-count" style="margin-top:0.8rem; font-size:0.7rem; color:#6b7a6b;">Toplam: 0 hediye</div>
      </div>
    </div>
    
    <!-- Gift List -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Hediyeler</div>
      </div>
      <div class="panel-body">
        <div id="gift-list" style="display:flex; flex-direction:column; gap:0.75rem; max-height:600px; overflow-y:auto;">
          <!-- Gift items will be populated here -->
        </div>
      </div>
    </div>
  </div>
</div>

<style>
.filter-btn {
  padding:0.4rem 0.8rem;
  font-size:0.68rem;
  font-weight:600;
  border:1px solid rgba(212,175,55,0.2);
  background:transparent;
  color:#6b7a6b;
  cursor:pointer;
  transition:all 0.15s;
  letter-spacing:0.06em;
}
.filter-btn:hover {
  border-color:#D4AF37;
  color:#D4AF37;
}
.filter-btn.active {
  border-color:#D4AF37;
  background:rgba(212,175,55,0.1);
  color:#D4AF37;
}
.gift-item {
  display:flex;
  align-items:center;
  gap:1rem;
  padding:0.8rem;
  border:1px solid rgba(212,175,55,0.08);
  background:#080c09;
}
.gift-img {
  width:40px;
  height:40px;
  object-fit:contain;
}
.gift-info {
  flex:1;
}
.gift-name {
  font-size:0.85rem;
  font-weight:600;
  color:#F8F6F3;
}
.gift-cost {
  font-size:0.7rem;
  color:#6b7a6b;
  margin-top:2px;
}
.gift-quality-select {
  padding:0.4rem 0.6rem;
  background:#080c09;
  border:1px solid rgba(212,175,55,0.12);
  color:#F8F6F3;
  font-size:0.72rem;
}
</style>
```

### Step 5.3: Add tab switching logic

- [ ] **Add JavaScript for tabs and gift loading**

Before closing `</body>`, add:

```html
<script>
// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Show/hide tab content
    if (tab === 'licenses') {
      document.getElementById('gifts-tab').style.display = 'none';
      document.querySelector('.page').style.display = 'block';
    } else if (tab === 'gifts') {
      document.getElementById('gifts-tab').style.display = 'block';
      document.querySelector('.page').style.display = 'none';
      loadGifts(); // Load gifts when tab is opened
    }
  });
});

// Gift management
let currentFilters = { search: '', minCost: undefined, maxCost: undefined, quality: undefined };

async function loadGifts() {
  try {
    const params = new URLSearchParams();
    if (currentFilters.search) params.set('search', currentFilters.search);
    if (currentFilters.minCost !== undefined) params.set('minCost', currentFilters.minCost);
    if (currentFilters.maxCost !== undefined) params.set('maxCost', currentFilters.maxCost);
    if (currentFilters.quality) params.set('quality', currentFilters.quality);
    params.set('limit', '500'); // Load all for now
    
    const response = await fetch(`/api/gifts?${params}`);
    const data = await response.json();
    
    const container = document.getElementById('gift-list');
    container.innerHTML = '';
    
    data.gifts.forEach(gift => {
      const item = document.createElement('div');
      item.className = 'gift-item';
      item.innerHTML = `
        <img src="${gift.image || '/logo.svg'}" alt="${gift.giftName}" class="gift-img" onerror="this.src='/logo.svg'">
        <div class="gift-info">
          <div class="gift-name">${gift.giftName}</div>
          <div class="gift-cost">${gift.diamondCost} jeton</div>
        </div>
        <select class="gift-quality-select" data-gift-id="${gift.id}" onchange="updateGiftQuality(${gift.id}, this.value)">
          <option value="bronze" ${gift.cardQuality === 'bronze' ? 'selected' : ''}>Bronze</option>
          <option value="silver" ${gift.cardQuality === 'silver' ? 'selected' : ''}>Silver</option>
          <option value="gold" ${gift.cardQuality === 'gold' ? 'selected' : ''}>Gold</option>
          <option value="elite" ${gift.cardQuality === 'elite' ? 'selected' : ''}>Elite</option>
        </select>
      `;
      container.appendChild(item);
    });
    
    document.getElementById('gift-count').textContent = `Toplam: ${data.total} hediye`;
  } catch (err) {
    console.error('Gift load error:', err);
  }
}

async function updateGiftQuality(giftId, quality) {
  try {
    await fetch(`/api/gifts/${giftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardQuality: quality })
    });
  } catch (err) {
    console.error('Gift update error:', err);
  }
}

// Search input
document.getElementById('gift-search').addEventListener('input', (e) => {
  currentFilters.search = e.target.value;
  loadGifts();
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const filterType = btn.dataset.filter;
    const value = btn.dataset.value;
    
    // Update active state
    document.querySelectorAll(`.filter-btn[data-filter="${filterType}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Apply filter
    if (filterType === 'cost') {
      if (value === 'all') {
        currentFilters.minCost = undefined;
        currentFilters.maxCost = undefined;
      } else if (value === '500+') {
        currentFilters.minCost = 500;
        currentFilters.maxCost = undefined;
      } else {
        const [min, max] = value.split('-').map(Number);
        currentFilters.minCost = min;
        currentFilters.maxCost = max;
      }
    } else if (filterType === 'quality') {
      currentFilters.quality = value === 'all' ? undefined : value;
    }
    
    loadGifts();
  });
});
</script>
```

### Step 5.4: Test admin panel

- [ ] **Manual test**

Run: `pnpm dev`
Open: http://localhost:3000/licensepanel
Expected: Two tabs (Lisanslar, Hediyeler), clicking Hediyeler shows gift list with filters

### Step 5.5: Commit admin UI

- [ ] **Commit**

```bash
git add client/public/license-panel.html
git commit -m "feat: add gift management tab to admin license panel"
```

---

## Task 6: Broadcaster Panel - Gift Selection UI

**Files:**
- Modify: `client/src/pages/BroadcasterPanel.tsx:220+` (add gift section after game settings)

### Step 6.1: Add gift selection section to BroadcasterPanel.tsx

- [ ] **Add gift UI section**

After the game settings section (~line 220), add:

```typescript
// Add state for gifts
const [gifts, setGifts] = useState<any[]>([]);
const [activeGiftIds, setActiveGiftIds] = useState<number[]>([]);
const [giftSearchQuery, setGiftSearchQuery] = useState("");
const [giftFilters, setGiftFilters] = useState({ costRange: "all", quality: "all" });

// Load gifts on mount
useEffect(() => {
  async function loadGifts() {
    try {
      const response = await fetch("/api/gifts?limit=500");
      const data = await response.json();
      setGifts(data.gifts || []);
    } catch (err) {
      console.error("Failed to load gifts:", err);
    }
  }
  loadGifts();
}, []);

// Filter gifts
const filteredGifts = gifts.filter(gift => {
  if (giftSearchQuery && !gift.giftName.toLowerCase().includes(giftSearchQuery.toLowerCase())) {
    return false;
  }
  
  if (giftFilters.costRange !== "all") {
    const cost = gift.diamondCost;
    const [min, max] = giftFilters.costRange === "500+" ? [500, Infinity] : giftFilters.costRange.split("-").map(Number);
    if (cost < min || cost > max) return false;
  }
  
  if (giftFilters.quality !== "all" && gift.cardQuality !== giftFilters.quality) {
    return false;
  }
  
  return true;
});

// Toggle gift active/inactive
function toggleGift(giftId: number) {
  setActiveGiftIds(prev => 
    prev.includes(giftId) ? prev.filter(id => id !== giftId) : [...prev, giftId]
  );
}

// Save gift config to session
async function saveGiftConfig() {
  if (!sessionId) return;
  try {
    await fetch(`/api/sessions/${sessionId}/gifts`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeGiftIds })
    });
    // Also emit socket event for real-time update
    socket?.emit("gift-config-update", { sessionId, activeGiftIds });
  } catch (err) {
    console.error("Failed to save gift config:", err);
  }
}

// Add to JSX (after game settings section):
<div className="panel">
  <div className="panel-head">
    <h3>Aktif Hediyeler</h3>
    <button onClick={saveGiftConfig} className="btn-gold">Kaydet</button>
  </div>
  <div className="panel-body">
    <input
      type="text"
      placeholder="Hediye ara..."
      value={giftSearchQuery}
      onChange={(e) => setGiftSearchQuery(e.target.value)}
      className="search-input"
    />
    
    <div className="filter-row">
      <select value={giftFilters.costRange} onChange={(e) => setGiftFilters(prev => ({ ...prev, costRange: e.target.value }))}>
        <option value="all">Tüm Fiyatlar</option>
        <option value="1-5">1-5</option>
        <option value="5-10">5-10</option>
        <option value="10-50">10-50</option>
        <option value="50-100">50-100</option>
        <option value="100-500">100-500</option>
        <option value="500+">500+</option>
      </select>
      
      <select value={giftFilters.quality} onChange={(e) => setGiftFilters(prev => ({ ...prev, quality: e.target.value }))}>
        <option value="all">Tüm Kaliteler</option>
        <option value="bronze">Bronze</option>
        <option value="silver">Silver</option>
        <option value="gold">Gold</option>
        <option value="elite">Elite</option>
      </select>
    </div>
    
    <div className="gift-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
      {filteredGifts.map(gift => (
        <div key={gift.id} className="gift-item">
          <input
            type="checkbox"
            checked={activeGiftIds.includes(gift.id)}
            onChange={() => toggleGift(gift.id)}
          />
          <img src={gift.image || "/logo.svg"} alt={gift.giftName} style={{ width: "30px", height: "30px" }} />
          <span>{gift.giftName}</span>
          <span style={{ color: "#6b7a6b", fontSize: "0.8rem" }}>{gift.diamondCost} jeton</span>
          <span style={{ color: "#D4AF37", fontSize: "0.75rem" }}>{gift.cardQuality}</span>
        </div>
      ))}
    </div>
    
    <div style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#6b7a6b" }}>
      {activeGiftIds.length} hediye aktif / {filteredGifts.length} gösteriliyor
    </div>
  </div>
</div>
```

### Step 6.2: Add session gift config endpoint

- [ ] **Add REST endpoint in index.ts**

In `server/_core/index.ts`, add after gift routes:

```typescript
// Session gift config endpoints
app.get("/api/sessions/:sessionId/gifts", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ activeGiftIds: [] });
    
    const [session] = await db.select().from(sessions).where(eq(sessions.sessionId, req.params.sessionId)).limit(1);
    
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    const giftConfig = session.giftConfig as any;
    res.json({ activeGiftIds: giftConfig?.activeGiftIds || [] });
  } catch (err) {
    console.error("Get session gifts error:", err);
    res.status(500).json({ error: "Failed to get session gifts" });
  }
});

app.put("/api/sessions/:sessionId/gifts", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });
    
    const { activeGiftIds } = req.body;
    
    await db.update(sessions)
      .set({ giftConfig: { activeGiftIds } })
      .where(eq(sessions.sessionId, req.params.sessionId));
    
    res.json({ success: true });
  } catch (err) {
    console.error("Update session gifts error:", err);
    res.status(500).json({ error: "Failed to update session gifts" });
  }
});
```

### Step 6.3: Test broadcaster UI

- [ ] **Manual test**

Run: `pnpm dev`
Start session, open broadcaster panel
Expected: Gift section with checkboxes, search, filters

### Step 6.4: Commit broadcaster UI

- [ ] **Commit**

```bash
git add client/src/pages/BroadcasterPanel.tsx server/_core/index.ts
git commit -m "feat: add gift selection UI to broadcaster panel"
```

---

## Task 7: Socket Integration - Real-time Gift Config Updates

**Files:**
- Modify: `server/socket-server.ts:120` (add gift-config-update handler)
- Modify: `server/game-engine.ts:279-306` (respect session gift config in processGiftEvent)

### Step 7.1: Add socket event handler

- [ ] **Add gift-config-update event**

In `socket-server.ts`, inside `setupEventHandlers()` method (~line 120), add:

```typescript
socket.on("gift-config-update", async ({ sessionId, activeGiftIds }) => {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db.update(sessions)
      .set({ giftConfig: { activeGiftIds } })
      .where(eq(sessions.sessionId, sessionId));
    
    // Broadcast to all connected clients in this session
    this.io.to(`session:${sessionId}`).emit("gift-config-updated", { activeGiftIds });
    
    console.log(`[${sessionId}] Gift config updated: ${activeGiftIds.length} active gifts`);
  } catch (err) {
    console.error("Gift config update error:", err);
  }
});
```

### Step 7.2: Update game-engine.ts to respect gift config

- [ ] **Modify processGiftEvent**

In `server/game-engine.ts`, replace `processGiftEvent` function (lines 279-306):

```typescript
export async function processGiftEvent(
  sessionId: string,
  giftName: string,
  diamondCount: number,
  username: string
): Promise<PendingCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  gameState.totalGifts += diamondCount;
  gameState.participants.add(username);

  // Already waiting for team selection — don't queue another pending card
  if (gameState.pendingCard) return null;

  // Check if gift is active in session config
  const db = await getDb();
  if (db) {
    const [session] = await db.select().from({ sessions: (await import("../drizzle/schema")).sessions }).where((await import("drizzle-orm")).eq((await import("../drizzle/schema")).sessions.sessionId, sessionId)).limit(1);
    
    if (session?.giftConfig) {
      const giftConfig = session.giftConfig as any;
      
      // Get gift from DB by name
      const [giftData] = await db.select().from(giftTiers).where((await import("drizzle-orm")).eq(giftTiers.giftName, giftName)).limit(1);
      
      // If gift config has activeGiftIds and this gift is not in the list, ignore
      if (giftConfig.activeGiftIds && Array.isArray(giftConfig.activeGiftIds) && giftConfig.activeGiftIds.length > 0) {
        if (!giftData || !giftConfig.activeGiftIds.includes(giftData.id)) {
          console.log(`[${sessionId}] Gift ${giftName} not active in this session, ignoring`);
          return null;
        }
      }
    }
  }

  const quality = qualityFromDiamonds(diamondCount);
  const player = await getRandomPlayer();
  if (!player) return null;

  const pending: PendingCard = {
    username,
    quality,
    player: { id: player.id, name: player.name, position: player.position, overall: player.overall, faceImageUrl: player.faceImageUrl, nation: player.nation, team: player.team },
    timestamp: Date.now(),
  };
  gameState.pendingCard = pending;
  console.log(`[${sessionId}] Hediye: ${giftName} (${diamondCount} jeton) → ${quality} bekleyen kart (${username})`);
  return pending;
}
```

### Step 7.3: Add missing import

- [ ] **Import sessions in game-engine.ts**

At top of `server/game-engine.ts`:

```typescript
import { giftTiers, players, sessions } from "../drizzle/schema";
```

### Step 7.4: Test real-time updates

- [ ] **Manual test**

Run: `pnpm dev`
Start session, open broadcaster panel, toggle gifts, click save
Expected: Gift config saved, inactive gifts ignored in game

### Step 7.5: Commit socket integration

- [ ] **Commit**

```bash
git add server/socket-server.ts server/game-engine.ts
git commit -m "feat: add real-time gift config updates via socket.io"
```

---

## Task 8: End-to-End Testing

**Files:**
- Manual testing checklist

### Step 8.1: Test admin panel flow

- [ ] **Test admin gift management**

1. Open /licensepanel
2. Click "Hediyeler" tab
3. Search for "Rose"
4. Filter by 1-5 diamond range
5. Change Rose to "silver" quality
6. Verify database updated

Expected: All features work, no console errors

### Step 8.2: Test broadcaster panel flow

- [ ] **Test broadcaster gift selection**

1. Start a session
2. Open broadcaster panel
3. Search for specific gift
4. Toggle 5 gifts active
5. Click "Kaydet"
6. Verify gifts saved to session

Expected: Gift selection persists

### Step 8.3: Test game integration

- [ ] **Test gift filtering in game**

1. Start session with only "Rose" (1 diamond) active
2. Simulate gift event with inactive gift
3. Verify inactive gift ignored
4. Simulate "Rose" gift
5. Verify pending card created

Expected: Only active gifts trigger cards

### Step 8.4: Final commit

- [ ] **Commit**

```bash
git add .
git commit -m "feat: gift management system complete - admin panel, broadcaster selection, real-time updates"
```

---

## Rollback Plan

If issues arise during implementation:

1. **Database rollback:** Run `pnpm db:push` to revert schema (requires manual column drop)
2. **Code rollback:** `git revert <commit-hash>` for each commit in reverse order
3. **Data cleanup:** `DELETE FROM giftTiers WHERE diamondCost > 0` to remove imported gifts

## Performance Notes

- Gift list is limited to 500 items client-side (pagination can be added later)
- Search/filter operations are client-side after initial load
- Real-time updates use Socket.io rooms for efficiency
- Database queries use indexes on giftName and diamondCost (add if slow)
