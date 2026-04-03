import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Link, AtSign, Play, Square, Users, Zap, Heart, Gift, Clock, Settings, LayoutGrid, X } from 'lucide-react';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Show notification helper
  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({ type, title, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Gift/like settings
  const [likeThresholdInput, setLikeThresholdInput] = useState<string>('100');
  const [silverMin, setSilverMin] = useState<string>('10');
  const [goldMin, setGoldMin] = useState<string>('50');
  const [eliteMin, setEliteMin] = useState<string>('200');

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
  const setLikeThresholdMutation = trpc.broadcaster.setLikeThreshold.useMutation();
  const setDiamondThresholdsMutation = trpc.broadcaster.setDiamondThresholds.useMutation();
  const likeThresholdQuery = trpc.broadcaster.getLikeThreshold.useQuery(undefined, { enabled: settingsOpen });
  const diamondThresholdsQuery = trpc.broadcaster.getDiamondThresholds.useQuery(undefined, { enabled: settingsOpen });

  // Sync inputs when modal opens
  useEffect(() => {
    if (settingsOpen && likeThresholdQuery.data) {
      setLikeThresholdInput(String(likeThresholdQuery.data.threshold));
    }
  }, [settingsOpen, likeThresholdQuery.data]);

  useEffect(() => {
    if (settingsOpen && diamondThresholdsQuery.data) {
      setSilverMin(String(diamondThresholdsQuery.data.silver));
      setGoldMin(String(diamondThresholdsQuery.data.gold));
      setEliteMin(String(diamondThresholdsQuery.data.elite));
    }
  }, [settingsOpen, diamondThresholdsQuery.data]);

  const handleStartSession = async () => {
    if (!licenseKey || !tiktokUsername) {
      showNotification('error', 'Hata', 'Lütfen lisans anahtarı ve TikTok kullanıcı adı girin');
      return;
    }

    setIsStartingSession(true);
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
        showNotification('success', 'Başarılı', 'Oturum başarıyla başlatıldı');
      } else {
        showNotification('error', 'Hata', result.message || 'Oturum başlatılamadı');
      }
    } catch (error) {
      showNotification('error', 'Hata', 'Oturum başlatılamadı: ' + (error as Error).message);
    } finally {
      setIsStartingSession(false);
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
        showNotification('success', 'Başarılı', 'Oturum sona erdirildi');
      }
    } catch (error) {
      showNotification('error', 'Hata', 'Oturum sonlandırılamadı');
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
        showNotification('success', 'Başarılı', `Mod ${modeValue === 'manual' ? 'Manuel' : 'Otomatik'} olarak ayarlandı`);
      }
    } catch (error) {
      showNotification('error', 'Hata', 'Mod değiştirilemedi');
    }
  };

  const handleSaveLikeThreshold = async () => {
    const n = parseInt(likeThresholdInput, 10);
    if (isNaN(n) || n < 1) { showNotification('error', 'Hata', 'Geçerli bir sayı girin (min 1)'); return; }
    await setLikeThresholdMutation.mutateAsync({ threshold: n });
    showNotification('success', 'Başarılı', 'Beğeni eşiği kaydedildi');
  };

  const handleSaveDiamondThresholds = async () => {
    const s = parseInt(silverMin, 10);
    const g = parseInt(goldMin, 10);
    const e = parseInt(eliteMin, 10);
    if (isNaN(s) || isNaN(g) || isNaN(e) || s < 1 || g < 1 || e < 1) {
      showNotification('error', 'Hata', 'Geçerli jeton sayıları girin (min 1)');
      return;
    }
    await setDiamondThresholdsMutation.mutateAsync({ silver: s, gold: g, elite: e });
    showNotification('success', 'Başarılı', 'Jeton eşikleri kaydedildi');
  };

  const handleTeamNameChange = (index: number, value: string) => {
    const newNames = [...teamNames];
    newNames[index] = value;
    setTeamNames(newNames);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#030a06', padding: '1rem' }}>
      <style>{`
        .bp-pre-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
        .bp-team-names-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; }
        .bp-mode-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; }
        .bp-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0.75rem; }
        .bp-team-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
        .bp-action-row { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; background:#0a1a0f; border:1px solid #14532d; border-radius:8px; padding:0.85rem 1rem; }
        .bp-spacer { flex:1; }
        .bp-settings-btn { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:7px; border:1px solid #14532d; background:#0a1a0f; color:#4ade80; cursor:pointer; transition:background 0.15s; }
        .bp-settings-btn:hover { background:#14532d44; }
        .bp-modal-overlay { position:fixed; inset:0; background:rgba(6, 14, 8, 0.85); backdrop-filter:blur(2px); z-index:100; display:flex; align-items:center; justify-content:center; padding:1rem; }
        .bp-modal { background:linear-gradient(135deg, #0f1f15 0%, #0a1a0f 100%); border:1px solid #22c55e33; border-radius:12px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; padding:1.5rem; box-shadow:0 20px 60px rgba(22, 163, 74, 0.1), inset 0 1px 0 rgba(52, 211, 153, 0.1); }
        .bp-modal::-webkit-scrollbar { width:6px; }
        .bp-modal::-webkit-scrollbar-track { background:#030a06; }
        .bp-modal::-webkit-scrollbar-thumb { background:#22c55e44; border-radius:3px; }
        .bp-modal::-webkit-scrollbar-thumb:hover { background:#4ade8088; }
        @media (max-width:640px) {
          .bp-pre-grid { grid-template-columns:1fr; }
          .bp-stats-grid { grid-template-columns:1fr 1fr; }
          .bp-team-grid { grid-template-columns:1fr; }
          .bp-mode-grid { grid-template-columns:1fr; }
          .bp-action-row { flex-direction:column; align-items:stretch; }
          .bp-spacer { display:none; }
        }
      `}</style>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Settings button */}
            <button className="bp-settings-btn" onClick={() => setSettingsOpen(true)} title="Ayarlar">
              <Settings size={15} />
            </button>
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
        </div>

        {/* ── PRE-SESSION VIEW ── */}
        {!sessionActive && (
          <div className="bp-pre-grid">

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
                disabled={isStartingSession}
                style={{ width: '100%', padding: '0.7rem', borderRadius: '7px', border: 'none', background: isStartingSession ? '#4ade8044' : 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: isStartingSession ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: isStartingSession ? 'none' : '0 4px 14px #16a34a33', opacity: isStartingSession ? 0.7 : 1, transition: 'all 0.2s' }}
              >
                <Play size={14} style={{ animation: isStartingSession ? 'none' : 'none' }} />
                {isStartingSession ? 'Başlatılıyor...' : 'Oturumu Başlat'}
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
                <div className="bp-team-names-grid">
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
                <div className="bp-mode-grid">
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
            <div className="bp-stats-grid">
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
            <div className="bp-team-grid">
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
            <div className="bp-action-row">
              {/* Session info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontSize: '0.72rem' }}>
                <Clock size={12} color="#166534" />
                <span>Oturum: <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>{tiktokUsername}</span></span>
              </div>
              <div className="bp-spacer" />
              {/* Quick links */}
              <a href="/game-screen.html" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '5px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                <LayoutGrid size={11} />
                Oyun Ekranı
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

      {/* ── SETTINGS MODAL ── */}
      {settingsOpen && (
        <div className="bp-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #14532d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                <Settings size={15} />
                Ayarlar
              </div>
              <button onClick={() => setSettingsOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: 'none', border: '1px solid #14532d', borderRadius: '6px', color: '#4ade80', cursor: 'pointer' }}>
                <X size={13} />
              </button>
            </div>

            {/* Team names section */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={11} />
                Takım Adları
              </div>
              <div className="bp-team-names-grid">
                {teamNames.map((name, idx) => (
                  <div key={idx}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: '#166534', marginBottom: '0.3rem', letterSpacing: '0.04em' }}>TAKIM {idx + 1}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => !sessionActive && handleTeamNameChange(idx, e.target.value)}
                      readOnly={sessionActive}
                      style={{ width: '100%', padding: '0.45rem 0.7rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '6px', color: sessionActive ? '#4b5563' : '#e2e8f0', fontSize: '0.8rem', outline: 'none', cursor: sessionActive ? 'not-allowed' : 'text' }}
                    />
                  </div>
                ))}
              </div>
              {sessionActive && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.67rem', color: '#166534' }}>Oturum aktifken takım adları değiştirilemez.</div>
              )}
            </div>

            {/* Mode section */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={11} />
                Takım Seçim Modu
              </div>
              <div className="bp-mode-grid">
                <button
                  onClick={() => sessionActive ? handleModeChange('manual') : setSelectedMode('manual')}
                  style={{ padding: '0.85rem', borderRadius: '7px', border: `1.5px solid ${selectedMode === 'manual' ? '#22c55e' : '#14532d'}`, background: selectedMode === 'manual' ? '#16a34a0f' : '#030a06', cursor: 'pointer', textAlign: 'left' as const }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedMode === 'manual' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <Users size={12} />
                    Manuel
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#166534' }}>Panelden takım seçin</div>
                </button>
                <button
                  onClick={() => sessionActive ? handleModeChange('auto') : setSelectedMode('auto')}
                  style={{ padding: '0.85rem', borderRadius: '7px', border: `1.5px solid ${selectedMode === 'auto' ? '#22c55e' : '#14532d'}`, background: selectedMode === 'auto' ? '#16a34a0f' : '#030a06', cursor: 'pointer', textAlign: 'left' as const }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedMode === 'auto' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <Zap size={12} />
                    Otomatik
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#166534' }}>Chat komutlarıyla (!1, !2)</div>
                </button>
              </div>
            </div>

            {/* Like threshold section */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Heart size={11} />
                Beğeni Eşiği
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  min={1}
                  value={likeThresholdInput}
                  onChange={(e) => setLikeThresholdInput(e.target.value)}
                  style={{ flex: 1, padding: '0.45rem 0.7rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#166534', whiteSpace: 'nowrap' as const }}>beğeni = 1 bronz kart</span>
                <button
                  onClick={handleSaveLikeThreshold}
                  style={{ padding: '0.45rem 0.8rem', background: '#16a34a22', border: '1px solid #22c55e44', borderRadius: '6px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const }}
                >
                  Kaydet
                </button>
              </div>
            </div>

            {/* Diamond thresholds section */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Gift size={11} />
                Hediye Jeton Eşikleri
              </div>
              <div style={{ fontSize: '0.68rem', color: '#166534', marginBottom: '0.75rem' }}>Gelen hediyenin jeton sayısına göre kart kalitesi belirlenir.</div>
              {[
                { label: 'Bronz', color: '#cd7f32', note: '0 – (gümüş eşiği - 1) jeton', input: null },
                { label: 'Gümüş', color: '#a8a9ad', note: 'min jeton', input: silverMin, setter: setSilverMin },
                { label: 'Altın', color: '#ffd700', note: 'min jeton', input: goldMin, setter: setGoldMin },
                { label: 'Elite', color: '#a855f7', note: 'min jeton', input: eliteMin, setter: setEliteMin },
              ].map(({ label, color, note, input, setter }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: '46px', fontSize: '0.75rem', fontWeight: 700, color }}>{label}</span>
                  {input !== null && setter ? (
                    <input
                      type="number"
                      min={1}
                      value={input}
                      onChange={(e) => setter(e.target.value)}
                      style={{ width: '80px', padding: '0.38rem 0.55rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '6px', color: '#e2e8f0', fontSize: '0.78rem', outline: 'none' }}
                    />
                  ) : (
                    <span style={{ width: '80px', padding: '0.38rem 0.55rem', background: '#030a06', border: '1px solid #14532d22', borderRadius: '6px', color: '#4b5563', fontSize: '0.78rem' }}>—</span>
                  )}
                  <span style={{ fontSize: '0.68rem', color: '#166534' }}>{note}</span>
                </div>
              ))}
              <button
                onClick={handleSaveDiamondThresholds}
                style={{ marginTop: '0.25rem', padding: '0.45rem 1rem', background: '#16a34a22', border: '1px solid #22c55e44', borderRadius: '6px', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Eşikleri Kaydet
              </button>
            </div>

            {/* Links section */}
            <div style={{ borderTop: '1px solid #14532d', paddingTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
              <a href="/license-panel.html" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '5px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                <Shield size={11} />
                Lisans Paneli
              </a>
              <a href="/admin-dashboard.html" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '5px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
                <Settings size={11} />
                Admin Paneli
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          pointerEvents: 'none',
        }}>
          <div style={{
            background: notification.type === 'success'
              ? 'linear-gradient(135deg, #15803d 0%, #166534 100%)'
              : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
            border: `1px solid ${notification.type === 'success' ? '#22c55e66' : '#ef444466'}`,
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '420px',
            width: '90%',
            boxShadow: notification.type === 'success'
              ? '0 20px 60px rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(52, 211, 153, 0.2)'
              : '0 20px 60px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(248, 113, 113, 0.2)',
            pointerEvents: 'auto',
            animation: 'slideIn 0.3s ease-out',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: notification.type === 'success' ? '#22c55e' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '0.125rem',
              }}>
                <span style={{
                  color: notification.type === 'success' ? '#fff' : '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  {notification.type === 'success' ? '✓' : '!'}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#fff',
                  marginBottom: '0.25rem',
                }}>
                  {notification.title}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: notification.type === 'success' ? '#d1fae5' : '#fee2e2',
                  lineHeight: '1.4',
                }}>
                  {notification.message}
                </div>
              </div>
              <button
                onClick={() => setNotification(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.7,
                  transition: 'opacity 0.2s',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
              >
                ×
              </button>
            </div>
          </div>
          <style>{`
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(-20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
