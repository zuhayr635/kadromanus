import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Link, AtSign, Play, Square, Users, Zap, Heart, Gift, Clock, Settings, LayoutGrid, X, Calendar } from 'lucide-react';
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
  const [pendingCard, setPendingCard] = useState<{
    username: string;
    quality: string;
    teams: { id: number; name: string }[];
  } | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // License info state
  const [licenseInfo, setLicenseInfo] = useState<{
    isValid: boolean;
    expiresAt: string | null;
    packageType: string | null;
    daysRemaining: number | null;
    broadcasterName: string | null;
    ownerTikTok: string | null;
  }>({ isValid: false, expiresAt: null, packageType: null, daysRemaining: null, broadcasterName: null, ownerTikTok: null });

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

  // Gift selection state
  const [gifts, setGifts] = useState<any[]>([]);
  const [activeGiftIds, setActiveGiftIds] = useState<number[]>([]);
  const [giftSearchQuery, setGiftSearchQuery] = useState('');
  const [giftFilters, setGiftFilters] = useState({ costRange: 'all', quality: 'all' });
  const [giftsLoaded, setGiftsLoaded] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const s = io(window.location.origin);
    socketRef.current = s;
    s.emit("joinSession", sessionId);

    s.on("gameEvent", (event: { type: string; sessionId: string; data: any; timestamp: number }) => {
      if (!socketRef.current) return;
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
        case "pendingCard":
          setPendingCard({
            username: event.data.pending.username,
            quality: event.data.pending.quality,
            teams: event.data.teams,
          });
          break;
        case "cardRevealed":
          setPendingCard(null);
          break;
        case "gameEnded":
          setSessionActive(false);
          setPendingCard(null);
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
  const assignPendingCardMutation = trpc.broadcaster.assignPendingCard.useMutation();

  // License query - fetch when license key changes
  const licenseQuery = trpc.license.getByKey.useQuery(
    { licenseKey },
    { enabled: !!licenseKey, refetchOnWindowFocus: false }
  );

  // Update license info when query data changes
  useEffect(() => {
    if (licenseQuery.data) {
      const license = licenseQuery.data;
      if (license) {
        const expiresAt = license.expiresAt ? new Date(license.expiresAt) : null;
        const now = new Date();
        const daysRemaining = expiresAt
          ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        setLicenseInfo({
          isValid: true,
          expiresAt: license.expiresAt || null,
          packageType: license.packageType || 'basic',
          daysRemaining,
          broadcasterName: license.broadcasterName || null,
          ownerTikTok: license.ownerTikTok || null,
        });
        // Auto-fill TikTok username from license
        if (license.ownerTikTok) {
          setTiktokUsername(license.ownerTikTok);
        }
      } else {
        setLicenseInfo({ isValid: false, expiresAt: null, packageType: null, daysRemaining: null, broadcasterName: null, ownerTikTok: null });
      }
    } else if (licenseKey && !licenseQuery.isLoading) {
      setLicenseInfo({ isValid: false, expiresAt: null, packageType: null, daysRemaining: null, broadcasterName: null, ownerTikTok: null });
    }
  }, [licenseQuery.data, licenseKey, licenseQuery.isLoading]);

  // Poll game state every second while session is active to catch pendingCard
  const gameStateQuery = trpc.game.getState.useQuery(
    { sessionId: sessionId ?? '' },
    { enabled: !!sessionId && sessionActive, refetchInterval: 1000 }
  );
  useEffect(() => {
    if (!gameStateQuery.data) return;
    const gs = gameStateQuery.data as any;
    if (gs.pendingCard) {
      setPendingCard({
        username: gs.pendingCard.username,
        quality: gs.pendingCard.quality,
        teams: gs.teams.map((t: any) => ({ id: t.id, name: t.name })),
      });
    } else {
      setPendingCard(null);
    }
  }, [gameStateQuery.data]);

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
    if (!licenseKey) {
      showNotification('error', 'Hata', 'Lütfen lisans anahtarı girin');
      return;
    }
    // TikTok kullanıcı adı lisans varsa opsionel, yoksa gerekli
    if (!tiktokUsername && !licenseInfo.broadcasterName) {
      showNotification('error', 'Hata', 'TikTok kullanıcı adı bulunamadı. Lütfen lisansınızı kontrol edin.');
      return;
    }

    setIsStartingSession(true);
    try {
      const result = await createSessionMutation.mutateAsync({
        licenseKey,
        tiktokUsername: tiktokUsername || licenseInfo.broadcasterName || '',
        teamSelectionMode: selectedMode === 'auto' ? 'automatic' : 'manual',
        teamNames,
      });

      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setSessionActive(true);
        const gameScreenUrl = window.location.origin + '/game-screen.html?sessionId=' + result.sessionId;
        showNotification('success', 'Başarılı', 'Oturum başlatıldı. Oyun ekranını aç: game-screen.html?sessionId=' + result.sessionId);
        // Copy URL to clipboard for easier access
        navigator.clipboard.writeText(gameScreenUrl).catch(() => {});
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

  const handleAssignTeam = async (teamId: number) => {
    if (!sessionId || !pendingCard) return;
    try {
      await assignPendingCardMutation.mutateAsync({ sessionId, teamId });
      setPendingCard(null);
    } catch (error) {
      showNotification('error', 'Hata', 'Takım ataması başarısız');
    }
  };

  // Load gifts when settings modal opens
  useEffect(() => {
    if (settingsOpen && !giftsLoaded) {
      (async () => {
        try {
          const response = await fetch('/api/gifts?limit=500');
          const data = await response.json();
          setGifts(data.gifts || []);
          setGiftsLoaded(true);
        } catch (err) {
          console.error('Failed to load gifts:', err);
        }
      })();
    }
  }, [settingsOpen, giftsLoaded]);

  // Load session's active gift config when session starts
  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/gifts`);
        const data = await response.json();
        setActiveGiftIds(data.activeGiftIds || []);
      } catch (err) {
        console.error('Failed to load gift config:', err);
      }
    })();
  }, [sessionId]);

  // Filter gifts based on search and filters
  const filteredGifts = gifts.filter(gift => {
    if (giftSearchQuery && !gift.giftName.toLowerCase().includes(giftSearchQuery.toLowerCase())) {
      return false;
    }

    if (giftFilters.costRange !== 'all') {
      const cost = gift.diamondCost;
      if (giftFilters.costRange === '500+') {
        if (cost < 500) return false;
      } else {
        const [min, max] = giftFilters.costRange.split('-').map(Number);
        if (cost < min || cost > max) return false;
      }
    }

    if (giftFilters.quality !== 'all' && gift.cardQuality !== giftFilters.quality) {
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeGiftIds })
      });
      showNotification('success', 'Başarılı', `${activeGiftIds.length} hediye aktif edildi`);
    } catch (err) {
      console.error('Failed to save gift config:', err);
      showNotification('error', 'Hata', 'Gift config kaydedilemedi');
    }
  }

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
            <img src="/logo.svg" alt="Kadrokur" style={{ width: '38px', height: '38px' }} />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.08em', color: '#22c55e' }}>KADROKUR</div>
              <div style={{ fontSize: '0.65rem', color: '#166534', letterSpacing: '0.1em' }}>
                {licenseInfo.broadcasterName || 'Yayıncı'} <span style={{ color: '#4b5563', margin: '0 0.25rem' }}>•</span> YAYINCI PANELİ v3
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* License expiry badge - shown when license is entered */}
            {licenseKey && licenseInfo.isValid && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                background: licenseInfo.daysRemaining && licenseInfo.daysRemaining > 7
                  ? 'rgba(34, 197, 94, 0.1)'
                  : licenseInfo.daysRemaining && licenseInfo.daysRemaining > 0
                  ? 'rgba(251, 191, 36, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: licenseInfo.daysRemaining && licenseInfo.daysRemaining > 7
                  ? '1px solid rgba(34, 197, 94, 0.3)'
                  : licenseInfo.daysRemaining && licenseInfo.daysRemaining > 0
                  ? '1px solid rgba(251, 191, 36, 0.3)'
                  : '1px solid rgba(239, 68, 68, 0.3)',
              }}>
                <Calendar size={12} style={{
                  color: licenseInfo.daysRemaining && licenseInfo.daysRemaining > 7
                    ? '#22c55e'
                    : licenseInfo.daysRemaining && licenseInfo.daysRemaining > 0
                    ? '#fbbf24'
                    : '#ef4444'
                }} />
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: licenseInfo.daysRemaining && licenseInfo.daysRemaining > 7
                    ? '#22c55e'
                    : licenseInfo.daysRemaining && licenseInfo.daysRemaining > 0
                    ? '#fbbf24'
                    : '#ef4444'
                }}>
                  {licenseInfo.daysRemaining !== null
                    ? licenseInfo.daysRemaining + ' gün kaldı'
                    : 'Lisans aktif'
                  }
                </span>
              </div>
            )}
            {/* Settings button */}
            <button className="bp-settings-btn" onClick={() => setSettingsOpen(true)} title="Ayarlar">
              <Settings size={15} />
            </button>
            {/* Status pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '20px',
              background: sessionActive ? '#16a34a22' : '#0a1a0f',
              border: sessionActive ? '1px solid #22c55e' : '1px solid #14532d',
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
                {/* License status indicator */}
                {licenseKey && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {licenseQuery.isLoading ? (
                      <span style={{ color: '#4ade80' }}>Kontrol ediliyor...</span>
                    ) : licenseInfo.isValid ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>
                        ✓ Lisans aktif ({licenseInfo.packageType?.toUpperCase()})
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>
                        ✗ Geçersiz lisans anahtarı
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#4ade80', marginBottom: '0.35rem', letterSpacing: '0.04em' }}>TikTok Kullanıcı Adı</label>
                <div style={{ position: 'relative' as const }}>
                  <input
                    type="text"
                    value={tiktokUsername || licenseInfo.broadcasterName || ''}
                    onChange={(e) => setTiktokUsername(e.target.value)}
                    placeholder="Lisans anahtarı girin..."
                    readOnly
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.8rem 0.55rem 2rem',
                      background: '#0a1a0f',
                      border: '1px solid #14532d',
                      borderRadius: '6px',
                      color: (tiktokUsername || licenseInfo.broadcasterName) ? '#e2e8f0' : '#4b5563',
                      fontSize: '0.82rem',
                      outline: 'none',
                      cursor: 'not-allowed'
                    }}
                  />
                  <div style={{ position: 'absolute' as const, left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#166534' }}>
                    <AtSign size={11} />
                  </div>
                </div>
                {(tiktokUsername || licenseInfo.broadcasterName) && (
                  <div style={{ fontSize: '0.65rem', color: '#22c55e', marginTop: '0.25rem' }}>
                    ✓ Lisanstan yüklendi
                  </div>
                )}
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
                    style={{
                      padding: '0.85rem',
                      borderRadius: '7px',
                      border: selectedMode === 'manual' ? '1.5px solid #22c55e' : '1.5px solid #14532d',
                      background: selectedMode === 'manual' ? '#16a34a0f' : '#030a06',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedMode === 'manual' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <Users size={12} />
                      Manuel Mod
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#166534' }}>Panelden takım seçin</div>
                  </button>
                  <button
                    onClick={() => setSelectedMode('auto')}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '7px',
                      border: selectedMode === 'auto' ? '1.5px solid #22c55e' : '1.5px solid #14532d',
                      background: selectedMode === 'auto' ? '#16a34a0f' : '#030a06',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* ── PENDING CARD: team selection ── */}
            {pendingCard && (
              <div style={{ background: 'linear-gradient(135deg,#1a0a0a,#1a0f0a)', border: '1px solid #f59e0b88', borderRadius: '10px', padding: '1.25rem', animation: 'slideIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', textTransform: 'uppercase' as const, marginBottom: '0.85rem' }}>
                  <Zap size={13} />
                  Kart Bekliyor — Takım Seç
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    padding: '6px 14px',
                    border: pendingCard.quality === 'elite' ? '1px solid #e879f9' : pendingCard.quality === 'gold' ? '1px solid #D4AF37' : pendingCard.quality === 'silver' ? '1px solid #c0c0c0' : '1px solid #cd7f32',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: pendingCard.quality === 'elite' ? '#e879f9' : pendingCard.quality === 'gold' ? '#D4AF37' : pendingCard.quality === 'silver' ? '#c0c0c0' : '#cd7f32'
                  }}>
                    {pendingCard.quality.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>
                    @{pendingCard.username}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' }}>
                  {pendingCard.teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleAssignTeam(team.id)}
                      disabled={assignPendingCardMutation.isPending}
                      style={{ padding: '0.65rem 0.75rem', background: '#0a1a0f', border: '1px solid #22c55e44', borderRadius: '7px', color: '#4ade80', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', textAlign: 'left' as const, opacity: assignPendingCardMutation.isPending ? 0.5 : 1 }}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  <div style={{ height: '100%', background: '#22c55e', borderRadius: '2px', width: Math.round(Math.min(100, (stats.cardsOpened / 44) * 100)) + '%' }} />
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
              <a href={'/game-screen.html?sessionId=' + sessionId} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '5px', color: '#4ade80', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none' }}>
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
                  style={{
                    padding: '0.85rem',
                    borderRadius: '7px',
                    border: selectedMode === 'manual' ? '1.5px solid #22c55e' : '1.5px solid #14532d',
                    background: selectedMode === 'manual' ? '#16a34a0f' : '#030a06',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selectedMode === 'manual' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <Users size={12} />
                    Manuel
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#166534' }}>Panelden takım seçin</div>
                </button>
                <button
                  onClick={() => sessionActive ? handleModeChange('auto') : setSelectedMode('auto')}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '7px',
                    border: selectedMode === 'auto' ? '1.5px solid #22c55e' : '1.5px solid #14532d',
                    background: selectedMode === 'auto' ? '#16a34a0f' : '#030a06',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
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

            {/* ═══════════════════════════════════════════════════════════
                GIFT SELECTION - DB'den çekilen gerçek hediye verileri
            ═══════════════════════════════════════════════════════════ */}
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#0a0f0a', border: '1px solid #1a2e1a', borderRadius: '8px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Gift size={14} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                    Aktif Hediyeler
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                  {activeGiftIds.length} seçili
                </div>
              </div>

              {/* Search Input */}
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Hediye ara..."
                  value={giftSearchQuery}
                  onChange={(e) => setGiftSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.7rem',
                    paddingLeft: '2rem',
                    background: '#030a06',
                    border: '1px solid #14532d',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: '0.75rem',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#22c55e'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#14532d'}
                />
              </div>

              {/* Filter Buttons */}
              <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Tümü', value: 'all' },
                  { label: '1-5', value: '1-5' },
                  { label: '5-10', value: '5-10' },
                  { label: '10-50', value: '10-50' },
                  { label: '50-100', value: '50-100' },
                  { label: '100+', value: '100+' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setGiftFilters(prev => ({ ...prev, costRange: filter.value }))}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: giftFilters.costRange === filter.value ? '#22c55e' : 'transparent',
                      border: '1px solid #14532d',
                      borderRadius: '4px',
                      color: giftFilters.costRange === filter.value ? '#fff' : '#6b7280',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Quality Filter Pills */}
              <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
                {[
                  { label: 'Tümü', value: 'all', color: '#6b7280' },
                  { label: 'Bronze', value: 'bronze', color: '#cd7f32' },
                  { label: 'Silver', value: 'silver', color: '#a8a9ad' },
                  { label: 'Gold', value: 'gold', color: '#ffd700' },
                  { label: 'Elite', value: 'elite', color: '#a855f7' }
                ].map(qf => (
                  <button
                    key={qf.value}
                    onClick={() => setGiftFilters(prev => ({ ...prev, quality: qf.value }))}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: giftFilters.quality === qf.value ? qf.color + '33' : 'transparent',
                      border: `1px solid ${qf.color}66`,
                      borderRadius: '12px',
                      color: giftFilters.quality === qf.value ? qf.color : qf.color + '88',
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {qf.label}
                  </button>
                ))}
              </div>

              {/* Gift Grid */}
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.4rem',
                background: '#030a06',
                border: '1px solid #14532d',
                borderRadius: '6px'
              }}>
                {gifts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#4b5563' }}>
                    <Gift size={20} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.7rem' }}>Hediyeler yükleniyor...</div>
                  </div>
                ) : filteredGifts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#4b5563', fontSize: '0.7rem' }}>
                    Hediye bulunamadı
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.3rem' }}>
                    {filteredGifts.slice(0, 50).map(gift => {
                      const isActive = activeGiftIds.includes(gift.id);
                      const qualityColors = {
                        bronze: { bg: '#cd7f3222', border: '#cd7f32', text: '#cd7f32' },
                        silver: { bg: '#a8a9ad22', border: '#a8a9ad', text: '#a8a9ad' },
                        gold: { bg: '#ffd70022', border: '#ffd700', text: '#ffd700' },
                        elite: { bg: '#a855f722', border: '#a855f7', text: '#a855f7' }
                      };
                      const qc = qualityColors[gift.cardQuality as keyof typeof qualityColors] || qualityColors.bronze;

                      return (
                        <div
                          key={gift.id}
                          onClick={() => toggleGift(gift.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem',
                            background: isActive ? qc.bg : 'transparent',
                            border: `1px solid ${isActive ? qc.border : '#14532d44'}`,
                            borderRadius: '5px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <img
                            src={gift.image || '/logo.svg'}
                            alt={gift.giftName}
                            style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.svg'; }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.65rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {gift.giftName}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>
                              {gift.diamondCost} 💎
                            </div>
                          </div>
                          <div style={{
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            color: qc.text,
                            padding: '0.1rem 0.3rem',
                            background: qc.bg,
                            borderRadius: '3px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {gift.cardQuality.slice(0, 3)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #14532d' }}>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                  {gifts.length > 0 ? `${filteredGifts.length} / ${gifts.length} hediye` : '-'}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => setActiveGiftIds([])}
                    disabled={activeGiftIds.length === 0}
                    style={{
                      padding: '0.35rem 0.7rem',
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      borderRadius: '5px',
                      color: '#ef444488',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: activeGiftIds.length > 0 ? 'pointer' : 'not-allowed',
                      opacity: activeGiftIds.length > 0 ? 1 : 0.4
                    }}
                  >
                    Temizle
                  </button>
                  <button
                    onClick={saveGiftConfig}
                    style={{
                      padding: '0.35rem 0.8rem',
                      background: '#22c55e',
                      border: 'none',
                      borderRadius: '5px',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>

            {/* Links section removed - license panel only accessible via /licensepanel */}
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
            border: notification.type === 'success' ? '1px solid #22c55e66' : '1px solid #ef444466',
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
