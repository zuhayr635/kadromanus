# Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the blue/purple glassmorphism theme on BroadcasterPanel.tsx and license-panel.html with a dark football-field green theme, removing all emojis.

**Architecture:** Two independent visual rewrites — no logic changes. BroadcasterPanel.tsx keeps all state, tRPC mutations, and socket hook unchanged; only JSX and className strings are replaced. license-panel.html is a full CSS + HTML structure replacement.

**Tech Stack:** React 19, Tailwind CSS v4, lucide-react (existing), plain HTML/CSS

---

## Files

| File | Change |
|------|--------|
| `client/src/pages/BroadcasterPanel.tsx` | Replace all JSX/classNames — keep all state/logic/hooks intact |
| `client/public/license-panel.html` | Full replacement with green theme |

---

### Task 1: Rewrite BroadcasterPanel.tsx — visual layer

**Files:**
- Modify: `client/src/pages/BroadcasterPanel.tsx`

No unit tests exist for this component (all tests are server-side). Verify visually after writing.

> **Context for implementer:**
> The file is 389 lines. All state variables, hooks, tRPC mutations, and handlers must stay exactly as-is. Only the `return (...)` JSX block and the import list (icons) change.
>
> Current icon imports: `Gamepad2, Play, Square, Settings, Users, Zap, Trophy, Eye`
> New icon imports needed: `Shield, Link, AtSign, Play, Square, Users, Zap, Heart, Gift, Clock, Settings, LayoutGrid`
>
> Color tokens to use throughout (inline Tailwind or style props):
> - bg page: `#030a06`
> - panel bg: `#0a1a0f`
> - border: `#14532d`
> - accent: `#22c55e`
> - accent light: `#4ade80`
> - text muted: `#166534`

- [ ] **Step 1: Update imports**

Replace the import line at the top of `client/src/pages/BroadcasterPanel.tsx`.

**Remove** these old icons (no longer used): `Gamepad2, Trophy, Eye`
**Add** these new icons: `Shield, Link, AtSign, Heart, Gift, Clock, LayoutGrid`
(Keep `Play, Square, Users, Zap, Settings` — they are reused)

Replace the import line at the top of `client/src/pages/BroadcasterPanel.tsx`:

```tsx
import { Shield, Link, AtSign, Play, Square, Users, Zap, Heart, Gift, Clock, Settings, LayoutGrid } from 'lucide-react';
```

Remove the `Card, CardContent, CardDescription, CardHeader, CardTitle` import from `@/components/ui/card` — the new design uses custom divs, not shadcn Card components. Keep the `Button` import.

The full imports section should be:

```tsx
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Link, AtSign, Play, Square, Users, Zap, Heart, Gift, Clock, Settings, LayoutGrid } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { io, Socket } from 'socket.io-client';
```

- [ ] **Step 2: Remove emojis from all alert() calls and string literals**

Find and replace every emoji character in the handler functions:

```tsx
// handleStartSession — line 67
alert('Lütfen lisans anahtarı ve TikTok kullanıcı adı girin');

// line 82
alert('Oturum başarıyla başlatıldı');

// line 84
alert('Hata: ' + result.message);

// line 87
alert('Oturum başlatılamadı: ' + (error as Error).message);

// handleStopSession — line 101
alert('Oturum sona erdirildi');

// line 105
alert('Oturum sonlandırılamadı');

// handleModeChange — line 119
alert(`Mod ${modeValue === 'manual' ? 'Manuel' : 'Otomatik'} olarak ayarlandı`);

// line 123
alert('Mod değiştirilemedi');
```

- [ ] **Step 3: Replace the return statement with new JSX**

Replace everything from `return (` to the closing `);` with:

```tsx
  return (
    <div style={{ minHeight: '100vh', background: '#030a06', padding: '1rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #14532d', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px #16a34a44' }}>
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', color: '#22c55e' }}>KADROKUR</div>
              <div style={{ fontSize: '0.65rem', color: '#166534', letterSpacing: '0.1em' }}>YAYINCI PANELİ v3</div>
            </div>
          </div>
          {/* Status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px',
            background: sessionActive ? '#16a34a22' : '#0a1a0f',
            border: `1px solid ${sessionActive ? '#22c55e' : '#14532d'}`,
          }}>
            <div style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: sessionActive ? '#22c55e' : '#4b5563',
            }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: sessionActive ? '#22c55e' : '#4b5563' }}>
              {sessionActive ? 'CANLI' : 'HAZIR'}
            </span>
          </div>
        </div>

        {/* ── PRE-SESSION VIEW ── */}
        {!sessionActive && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            {/* Connection settings */}
            <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: '#4ade80', textTransform: 'uppercase' as const, marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #14532d44' }}>
                <Link size={13} />
                Bağlantı
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>Lisans Anahtarı</label>
                <div style={{ position: 'relative' as const }}>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="HIRA-XXXXXXXXXXXXX"
                    style={{ width: '100%', padding: '0.55rem 0.8rem 0.55rem 2rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', fontFamily: 'monospace' }}
                  />
                  <div style={{ position: 'absolute' as const, left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#166534' }}>
                    <Zap size={11} />
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>TikTok Kullanıcı Adı</label>
                <div style={{ position: 'relative' as const }}>
                  <input
                    type="text"
                    value={tiktokUsername}
                    onChange={(e) => setTiktokUsername(e.target.value)}
                    placeholder="@tiktok_adiniz"
                    style={{ width: '100%', padding: '0.55rem 0.8rem 0.55rem 2rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <div style={{ position: 'absolute' as const, left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#166534' }}>
                    <AtSign size={11} />
                  </div>
                </div>
              </div>
              <button
                onClick={handleStartSession}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '7px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 4px 14px #16a34a33' }}
              >
                <Play size={14} />
                Oturumu Başlat
              </button>
            </div>

            {/* Session config */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>
              {/* Team names */}
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: '#4ade80', textTransform: 'uppercase' as const, marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #14532d44' }}>
                  <Users size={13} />
                  Takım Adları
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  {teamNames.map((name, idx) => (
                    <div key={idx}>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: '#166534', marginBottom: '0.3rem', letterSpacing: '0.04em' }}>TAKIM {idx + 1}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                        style={{ width: '100%', padding: '0.45rem 0.7rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.8rem', outline: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode selector */}
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '10px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', color: '#4ade80', textTransform: 'uppercase' as const, marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #14532d44' }}>
                  <Settings size={13} />
                  Takım Seçim Modu
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <button
                    onClick={() => setSelectedMode('manual')}
                    style={{ padding: '0.85rem', borderRadius: '7px', border: `1.5px solid ${selectedMode === 'manual' ? '#22c55e' : '#14532d'}`, background: selectedMode === 'manual' ? '#16a34a0f' : '#030a06', cursor: 'pointer', textAlign: 'left' as const }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedMode === 'manual' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <Users size={12} />
                      Manuel Mod
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#166534' }}>Panelden takım seçin</div>
                  </button>
                  <button
                    onClick={() => setSelectedMode('auto')}
                    style={{ padding: '0.85rem', borderRadius: '7px', border: `1.5px solid ${selectedMode === 'auto' ? '#22c55e' : '#14532d'}`, background: selectedMode === 'auto' ? '#16a34a0f' : '#030a06', cursor: 'pointer', textAlign: 'left' as const }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedMode === 'auto' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <Zap size={12} />
                      Otomatik Mod
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#166534' }}>Chat komutlarıyla (!1, !2)</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE SESSION VIEW ── */}
        {sessionActive && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '1rem' }}>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
              {/* Cards opened */}
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#166534', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
                  <LayoutGrid size={10} />
                  Açılan Kartlar
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>{stats.cardsOpened}</div>
                <div style={{ marginTop: '0.4rem', height: '3px', background: '#14532d', borderRadius: '2px' }}>
                  <div style={{ height: '100%', background: '#22c55e', borderRadius: '2px', width: `${Math.min(100, (stats.cardsOpened / 44) * 100)}%` }} />
                </div>
              </div>
              {/* Participants */}
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#166534', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
                  <Users size={10} />
                  Katılımcı
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>{stats.participants}</div>
              </div>
              {/* Likes */}
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#166534', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
                  <Heart size={10} />
                  Beğeni
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4ade80' }}>{stats.totalLikes}</div>
              </div>
              {/* Gifts */}
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#166534', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
                  <Gift size={10} />
                  Hediye
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>{stats.totalGifts}</div>
              </div>
            </div>

            {/* Team panels 2x2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {teamNames.map((name, idx) => (
                <div key={idx} style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx % 2 === 0 ? '#22c55e' : '#4ade80' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{name}</span>
                  </div>
                  {/* 11-slot card grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11,1fr)', gap: '3px' }}>
                    {Array.from({ length: 11 }).map((_, slotIdx) => (
                      <div key={slotIdx} style={{ height: '22px', borderRadius: '3px', background: '#16a34a22', border: '1px dashed #14532d' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom action row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.85rem 1rem' }}>
              {/* Session info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontSize: '0.72rem' }}>
                <Clock size={12} color="#166534" />
                <span>Oturum: <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>{tiktokUsername}</span></span>
              </div>
              <div style={{ flex: 1 }} />
              {/* Quick links */}
              <a href="/game-screen.html" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '5px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                <LayoutGrid size={11} />
                Oyun Ekranı
              </a>
              <a href="/license-panel.html" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '5px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                <Settings size={11} />
                Lisans Paneli
              </a>
              {/* Stop button */}
              <button
                onClick={handleStopSession}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', background: '#7f1d1d22', border: '1px solid #dc262644', borderRadius: '6px', color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <Square size={12} />
                Oturumu Sonlandur
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
```

- [ ] **Step 4: Verify the file compiles — run dev server**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
npm run dev --prefix client 2>&1 | head -20
```

Expected: No TypeScript errors. If there are errors, fix them (typically missing closing tags or wrong prop types).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
git add client/src/pages/BroadcasterPanel.tsx
git commit -m "feat: redesign BroadcasterPanel with dark green football theme"
```

---

### Task 2: Rewrite license-panel.html

**Files:**
- Modify: `client/public/license-panel.html`

This is a pure static HTML file. No tests needed — verify visually by opening the file.

> **Note:** The JavaScript in this file calls `/api/licenses` endpoints. These are already implemented in the backend (from Phase 1). If the dev server is not running, the page will show empty data — this is expected.

- [ ] **Step 1: Replace entire file content**

Replace the entire contents of `client/public/license-panel.html` with:

```html
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kadrokur — Lisans Yönetimi</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#030a06; color:#e2e8f0; min-height:100vh; }

  .page { max-width:1100px; margin:0 auto; padding:1.5rem; }

  .header { display:flex; align-items:center; justify-content:space-between; padding-bottom:1rem; border-bottom:1px solid #14532d; margin-bottom:1.5rem; }
  .header-left { display:flex; align-items:center; gap:0.75rem; }
  .logo-icon { width:36px; height:36px; background:linear-gradient(135deg,#16a34a,#15803d); border-radius:8px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px #16a34a44; }
  .logo-text { font-size:1.1rem; font-weight:700; letter-spacing:0.08em; color:#22c55e; }
  .logo-sub { font-size:0.65rem; color:#166534; letter-spacing:0.1em; margin-top:1px; }
  .back-btn { display:flex; align-items:center; gap:0.4rem; padding:0.4rem 0.85rem; background:#0a1a0f; border:1px solid #14532d; border-radius:6px; color:#4ade80; font-size:0.75rem; font-weight:600; cursor:pointer; text-decoration:none; }
  .back-btn:hover { border-color:#22c55e44; }

  .grid { display:grid; grid-template-columns:320px 1fr; gap:1.25rem; }

  .panel { background:#0a1a0f; border:1px solid #14532d; border-radius:10px; padding:1.25rem; }
  .panel-title { display:flex; align-items:center; gap:0.6rem; font-size:0.75rem; font-weight:700; letter-spacing:0.08em; color:#4ade80; text-transform:uppercase; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid #14532d44; }

  .pkg-list { display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.25rem; }
  .pkg-item { padding:0.75rem; border:1.5px solid #14532d; border-radius:7px; cursor:pointer; transition:all 0.15s; }
  .pkg-item:hover { border-color:#22c55e44; }
  .pkg-item.selected { border-color:#22c55e; background:#16a34a0f; }
  .pkg-top { display:flex; justify-content:space-between; align-items:center; }
  .pkg-name { font-size:0.82rem; font-weight:700; color:#e2e8f0; }
  .pkg-price { font-size:0.95rem; font-weight:800; color:#22c55e; }
  .pkg-desc { font-size:0.7rem; color:#166534; margin-top:3px; }
  .pkg-badges { display:flex; gap:0.3rem; margin-top:0.4rem; flex-wrap:wrap; }
  .badge { font-size:0.62rem; padding:2px 7px; border-radius:10px; background:#16a34a22; border:1px solid #14532d; color:#4ade80; }
  .badge.gold { background:#92400e22; border-color:#78350f; color:#fbbf24; }

  .field { margin-bottom:0.85rem; }
  label { display:block; font-size:0.72rem; font-weight:600; color:#4ade80; margin-bottom:0.35rem; letter-spacing:0.04em; }
  input[type=text], input[type=email], input[type=number], input[type=date], select {
    width:100%; padding:0.55rem 0.8rem; background:#030a06; border:1px solid #14532d;
    border-radius:6px; color:#e2e8f0; font-size:0.82rem; outline:none; transition:border-color 0.2s;
  }
  input:focus, select:focus { border-color:#22c55e; }
  input::placeholder { color:#166534; }
  select option { background:#030a06; }

  .checkbox-row { display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; }
  .checkbox-row input[type=checkbox] { width:14px; height:14px; accent-color:#22c55e; }
  .checkbox-row label { margin:0; font-size:0.75rem; color:#4ade80; font-weight:500; letter-spacing:0; }

  .btn-primary { width:100%; padding:0.7rem; border-radius:7px; border:none; background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; font-size:0.85rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; box-shadow:0 4px 14px #16a34a33; margin-top:0.5rem; }
  .btn-primary:hover { opacity:0.9; }

  .lic-list { display:flex; flex-direction:column; gap:0.75rem; }
  .lic-item { background:#030a06; border:1px solid #14532d; border-radius:8px; padding:1rem; border-left:3px solid #22c55e; }
  .lic-item.expired { border-left-color:#dc2626; }
  .lic-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; }
  .lic-key { font-family:monospace; font-size:0.75rem; color:#4ade80; background:#0a1a0f; border:1px solid #14532d; padding:3px 8px; border-radius:4px; display:flex; align-items:center; gap:0.4rem; }
  .lic-badge { font-size:0.65rem; font-weight:700; padding:3px 9px; border-radius:10px; }
  .lic-badge.active { background:#16a34a22; border:1px solid #22c55e44; color:#22c55e; }
  .lic-badge.expired { background:#7f1d1d22; border:1px solid #dc262644; color:#fca5a5; }
  .lic-detail-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem; }
  .lic-detail-label { font-size:0.62rem; color:#166534; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:2px; }
  .lic-detail-val { font-size:0.78rem; color:#cbd5e1; font-weight:500; }
  .lic-actions { display:flex; gap:0.4rem; margin-top:0.75rem; padding-top:0.6rem; border-top:1px solid #14532d44; }
  .act-btn { padding:0.3rem 0.7rem; border-radius:5px; font-size:0.7rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:0.3rem; border:none; }
  .act-btn.copy { background:#16a34a12; border:1px solid #14532d; color:#4ade80; }
  .act-btn.extend { background:#16a34a22; border:1px solid #22c55e44; color:#22c55e; }
  .act-btn.revoke { background:#7f1d1d12; border:1px solid #dc262633; color:#fca5a5; }
  .act-btn:hover { opacity:0.8; }

  .stats-strip { display:grid; grid-template-columns:repeat(4,1fr); gap:0.75rem; margin-bottom:1.25rem; }
  .stat-mini { background:#0a1a0f; border:1px solid #14532d; border-radius:8px; padding:0.75rem 1rem; }
  .stat-mini-label { font-size:0.62rem; font-weight:700; letter-spacing:0.1em; color:#166534; text-transform:uppercase; margin-bottom:0.25rem; }
  .stat-mini-val { font-size:1.3rem; font-weight:800; color:#22c55e; }
</style>
</head>
<body>

<div style="background:#030a06;padding:0.6rem 1.5rem;text-align:center;border-bottom:1px solid #14532d66;font-size:0.72rem;color:#166534;letter-spacing:0.06em">
  KADROKUR — LİSANS YÖNETİM PANELİ &nbsp;|&nbsp; Admin erişimi gerektirir
</div>

<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="logo-icon">
        <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <div>
        <div class="logo-text">KADROKUR</div>
        <div class="logo-sub">LİSANS YÖNETİM PANELİ</div>
      </div>
    </div>
    <a class="back-btn" href="/broadcaster">
      <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      Yayıncı Paneline Dön
    </a>
  </div>

  <div class="stats-strip">
    <div class="stat-mini" id="stat-total">
      <div class="stat-mini-label">Toplam Lisans</div>
      <div class="stat-mini-val" id="val-total">—</div>
    </div>
    <div class="stat-mini">
      <div class="stat-mini-label">Aktif</div>
      <div class="stat-mini-val" style="color:#22c55e" id="val-active">—</div>
    </div>
    <div class="stat-mini">
      <div class="stat-mini-label">Süresi Dolmuş</div>
      <div class="stat-mini-val" style="color:#fca5a5" id="val-expired">—</div>
    </div>
    <div class="stat-mini">
      <div class="stat-mini-label">Bu Ay Oluşturulan</div>
      <div class="stat-mini-val" id="val-thismonth">—</div>
    </div>
  </div>

  <div class="grid">

    <div style="display:flex;flex-direction:column;gap:1rem">

      <div class="panel">
        <div class="panel-title">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          Paket Seç
        </div>
        <div class="pkg-list" id="pkg-list">
          <div class="pkg-item" data-pkg="starter" onclick="selectPkg(this)">
            <div class="pkg-top"><div class="pkg-name">Başlangıç</div><div class="pkg-price">₺149</div></div>
            <div class="pkg-desc">30 günlük lisans</div>
            <div class="pkg-badges"><span class="badge">Manuel Mod</span><span class="badge">1 Oturum</span></div>
          </div>
          <div class="pkg-item selected" data-pkg="pro" onclick="selectPkg(this)">
            <div class="pkg-top"><div class="pkg-name">Profesyonel</div><div class="pkg-price">₺349</div></div>
            <div class="pkg-desc">90 günlük lisans — En Popüler</div>
            <div class="pkg-badges"><span class="badge">Manuel + Otomatik</span><span class="badge">Sınırsız Oturum</span><span class="badge gold">Öncelikli Destek</span></div>
          </div>
          <div class="pkg-item" data-pkg="annual" onclick="selectPkg(this)">
            <div class="pkg-top"><div class="pkg-name">Yıllık</div><div class="pkg-price">₺999</div></div>
            <div class="pkg-desc">365 günlük lisans</div>
            <div class="pkg-badges"><span class="badge">Tüm Özellikler</span><span class="badge gold">VIP Destek</span></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Lisans Oluştur
        </div>
        <form id="create-form" onsubmit="handleCreate(event)">
          <div class="field"><label>Kullanıcı Adı</label><input type="text" id="f-username" placeholder="@yayinci_adi" required></div>
          <div class="field"><label>E-posta</label><input type="email" id="f-email" placeholder="ornek@email.com" required></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem">
            <div class="field"><label>Başlangıç Tarihi</label><input type="date" id="f-startdate" required></div>
            <div class="field"><label>Süre (Gün)</label><input type="number" id="f-duration" value="90" min="1" required></div>
          </div>
          <div style="margin-bottom:0.85rem">
            <label style="margin-bottom:0.5rem">İzinler</label>
            <div class="checkbox-row"><input type="checkbox" id="perm-manual" checked><label for="perm-manual">Manuel Mod</label></div>
            <div class="checkbox-row"><input type="checkbox" id="perm-auto" checked><label for="perm-auto">Otomatik Mod</label></div>
            <div class="checkbox-row"><input type="checkbox" id="perm-admin"><label for="perm-admin">Admin Erişimi</label></div>
          </div>
          <div class="field"><label>Not (İsteğe Bağlı)</label><input type="text" id="f-note" placeholder="Sipariş notu..."></div>
          <button type="submit" class="btn-primary">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Lisans Oluştur
          </button>
        </form>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title" style="justify-content:space-between">
        <div style="display:flex;align-items:center;gap:0.6rem">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Lisanslar
        </div>
        <input type="text" id="search-input" placeholder="Ara..." style="width:180px;padding:0.3rem 0.6rem;font-size:0.75rem" oninput="filterLicenses(this.value)">
      </div>
      <div class="lic-list" id="lic-list">
        <div style="color:#166534;font-size:0.8rem;padding:1rem;text-align:center">Lisanslar yükleniyor...</div>
      </div>
    </div>
  </div>
</div>

<script>
  // Package selection
  function selectPkg(el) {
    document.querySelectorAll('.pkg-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
  }

  // Set today's date as default
  document.getElementById('f-startdate').value = new Date().toISOString().split('T')[0];

  // Load licenses from API
  async function loadLicenses() {
    try {
      const res = await fetch('/api/licenses');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      renderLicenses(data.licenses || []);
      updateStats(data.licenses || []);
    } catch (e) {
      document.getElementById('lic-list').innerHTML = '<div style="color:#166534;font-size:0.8rem;padding:1rem;text-align:center">Lisans verisi yüklenemedi.</div>';
    }
  }

  function updateStats(licenses) {
    const now = new Date();
    const active = licenses.filter(l => new Date(l.expiresAt) > now);
    const expired = licenses.filter(l => new Date(l.expiresAt) <= now);
    const thisMonth = licenses.filter(l => {
      const d = new Date(l.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    document.getElementById('val-total').textContent = licenses.length;
    document.getElementById('val-active').textContent = active.length;
    document.getElementById('val-expired').textContent = expired.length;
    document.getElementById('val-thismonth').textContent = thisMonth.length;
  }

  let allLicenses = [];

  function renderLicenses(licenses) {
    allLicenses = licenses;
    _render(licenses);
  }

  function filterLicenses(q) {
    const filtered = allLicenses.filter(l =>
      l.licenseKey.toLowerCase().includes(q.toLowerCase()) ||
      (l.username || '').toLowerCase().includes(q.toLowerCase())
    );
    _render(filtered);
  }

  function _render(licenses) {
    const container = document.getElementById('lic-list');
    if (!licenses.length) {
      container.innerHTML = '<div style="color:#166534;font-size:0.8rem;padding:1rem;text-align:center">Lisans bulunamadı.</div>';
      return;
    }
    container.innerHTML = licenses.map(l => {
      const isActive = new Date(l.expiresAt) > new Date();
      const daysLeft = Math.ceil((new Date(l.expiresAt) - new Date()) / 86400000);
      const daysColor = daysLeft > 30 ? '#22c55e' : daysLeft > 7 ? '#fbbf24' : '#fca5a5';
      return `
        <div class="lic-item${isActive ? '' : ' expired'}">
          <div class="lic-header">
            <div class="lic-key">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
              ${l.licenseKey}
            </div>
            <div class="lic-badge ${isActive ? 'active' : 'expired'}">${isActive ? 'Aktif' : 'Süresi Doldu'}</div>
          </div>
          <div class="lic-detail-grid">
            <div><div class="lic-detail-label">Kullanıcı</div><div class="lic-detail-val">${l.username || '—'}</div></div>
            <div><div class="lic-detail-label">Paket</div><div class="lic-detail-val">${l.packageType || '—'}</div></div>
            <div><div class="lic-detail-label">Bitiş</div><div class="lic-detail-val">${l.expiresAt ? l.expiresAt.split('T')[0] : '—'}</div></div>
            <div><div class="lic-detail-label">Kullanım</div><div class="lic-detail-val">${l.usageCount ?? 0} oturum</div></div>
            <div><div class="lic-detail-label">Mod</div><div class="lic-detail-val">${l.permissions?.autoMode ? 'Manuel + Oto' : 'Manuel'}</div></div>
            <div><div class="lic-detail-label">Kalan</div><div class="lic-detail-val" style="color:${daysColor}">${isActive ? daysLeft + ' gün' : '—'}</div></div>
          </div>
          <div class="lic-actions">
            <button class="act-btn copy" onclick="copyKey('${l.licenseKey}')">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Kopyala
            </button>
            ${isActive ? `<button class="act-btn extend" onclick="extendLicense('${l.id}')">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><path d="M16 5l2 2-8 8-4 1 1-4z"/></svg>
              Uzat
            </button>
            <button class="act-btn revoke" onclick="revokeLicense('${l.id}')">
              <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              İptal Et
            </button>` : `<button class="act-btn extend" onclick="renewLicense('${l.id}')">Yenile</button>`}
          </div>
        </div>
      `;
    }).join('');
  }

  function copyKey(key) {
    navigator.clipboard.writeText(key).then(() => alert('Lisans anahtarı kopyalandı'));
  }

  async function extendLicense(id) {
    const days = prompt('Kaç gün uzatmak istiyorsunuz?', '30');
    if (!days) return;
    try {
      const res = await fetch(`/api/licenses/${id}/extend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: parseInt(days) }) });
      if (res.ok) { alert('Lisans uzatıldı'); loadLicenses(); }
      else alert('İşlem başarısız');
    } catch { alert('Sunucu hatası'); }
  }

  async function revokeLicense(id) {
    if (!confirm('Bu lisansı iptal etmek istediğinizden emin misiniz?')) return;
    try {
      const res = await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
      if (res.ok) { alert('Lisans iptal edildi'); loadLicenses(); }
      else alert('İşlem başarısız');
    } catch { alert('Sunucu hatası'); }
  }

  async function renewLicense(id) {
    const days = prompt('Kaç günlük yenileme yapmak istiyorsunuz?', '30');
    if (!days) return;
    try {
      const res = await fetch(`/api/licenses/${id}/renew`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: parseInt(days) }) });
      if (res.ok) { alert('Lisans yenilendi'); loadLicenses(); }
      else alert('İşlem başarısız');
    } catch { alert('Sunucu hatası'); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const selectedPkg = document.querySelector('.pkg-item.selected')?.dataset.pkg || 'pro';
    const body = {
      username: document.getElementById('f-username').value,
      email: document.getElementById('f-email').value,
      startDate: document.getElementById('f-startdate').value,
      durationDays: parseInt(document.getElementById('f-duration').value),
      packageType: selectedPkg,
      note: document.getElementById('f-note').value,
      permissions: {
        manualMode: document.getElementById('perm-manual').checked,
        autoMode: document.getElementById('perm-auto').checked,
        adminAccess: document.getElementById('perm-admin').checked,
      }
    };
    try {
      const res = await fetch('/api/licenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { alert('Lisans oluşturuldu'); document.getElementById('create-form').reset(); loadLicenses(); }
      else { const err = await res.json(); alert('Hata: ' + (err.message || 'Bilinmeyen hata')); }
    } catch { alert('Sunucu hatası'); }
  }

  loadLicenses();
</script>
</body>
</html>
```

- [ ] **Step 2: Open file in browser and verify layout**

Open file directly:

```bash
start "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus/client/public/license-panel.html"
```

Verify: dark green background, stats strip visible, left panel with package cards + form, right panel with license list area.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
git add client/public/license-panel.html
git commit -m "feat: redesign license-panel.html with dark green football theme"
```
