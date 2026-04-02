import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Link, AtSign, Play, Square, Users, Zap, Heart, Gift, Clock, Settings, LayoutGrid } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { io, Socket } from 'socket.io-client';

export default function BroadcasterPanel() {
  const [licenseKey, setLicenseKey] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'manual' | 'auto'>('manual');
  const [teamNames, setTeamNames] = useState(['Takım 1', 'Takım 2', 'Takım 3', 'Takım 4']);
  const [stats, setStats] = useState({
    cardsOpened: 0,
    participants: 0,
    totalLikes: 0,
    totalGifts: 0,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const s = io(window.location.origin);
    socketRef.current = s;
    s.emit("joinSession", sessionId);

    s.on("gameEvent", (event: { type: string; sessionId: string; data: any; timestamp: number }) => {
      if (!socketRef.current) return; // race condition guard
      if (event.sessionId !== sessionId) return;

      switch (event.type) {
        case "statsUpdated":
          if (event.data && typeof event.data.cardsOpened === "number") {
            setStats({
              cardsOpened: event.data.cardsOpened,
              participants: event.data.participants ?? 0,
              totalLikes: event.data.totalLikes ?? 0,
              totalGifts: event.data.totalGifts ?? 0,
            });
          }
          break;
        case "gameEnded":
          setSessionActive(false);
          break;
        default:
          console.log("[Socket] gameEvent:", event.type, event.data);
      }
    });

    return () => {
      s.emit("leaveSession", sessionId);
      s.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  const createSessionMutation = trpc.broadcaster.createSession.useMutation();
  const endSessionMutation = trpc.broadcaster.endSession.useMutation();
  const updateModeMutation = trpc.broadcaster.updateMode.useMutation();

  const handleStartSession = async () => {
    if (!licenseKey || !tiktokUsername) {
      alert('Lütfen lisans anahtarı ve TikTok kullanıcı adı girin');
      return;
    }

    try {
      const result = await createSessionMutation.mutateAsync({
        licenseKey,
        tiktokUsername,
        teamSelectionMode: selectedMode === 'auto' ? 'automatic' : 'manual',
        teamNames,
      });

      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setSessionActive(true);
        alert('Oturum başarıyla başlatıldı');
      } else {
        alert('Hata: ' + result.message);
      }
    } catch (error) {
      alert('Oturum başlatılamadı: ' + (error as Error).message);
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;
    try {
      const result = await endSessionMutation.mutateAsync({
        sessionId,
      });

      if (result.success) {
        setSessionActive(false);
        setSessionId(null);
        alert('Oturum sona erdirildi');
      }
    } catch (error) {
      alert('Oturum sonlandırılamadı');
    }
  };

  const handleModeChange = async (mode: 'manual' | 'auto') => {
    if (!sessionId) return;
    try {
      const modeValue = mode === 'auto' ? 'automatic' : 'manual';
      const result = await updateModeMutation.mutateAsync({
        sessionId,
        mode: modeValue,
      });

      if (result.success) {
        setSelectedMode(mode);
        alert(`Mod ${modeValue === 'manual' ? 'Manuel' : 'Otomatik'} olarak ayarlandı`);
      }
    } catch (error) {
      alert('Mod değiştirilemedi');
    }
  };

  const handleTeamNameChange = (index: number, value: string) => {
    const newNames = [...teamNames];
    newNames[index] = value;
    setTeamNames(newNames);
  };

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
                Oturumu Sonlandır
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
