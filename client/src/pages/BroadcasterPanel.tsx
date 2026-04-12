import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Link, AtSign, Play, Square, Users, Zap, Heart, Gift, Clock, Settings, LayoutGrid, X, Calendar, HelpCircle, Pause, Trophy, Wifi, WifiOff, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { io, Socket } from 'socket.io-client';

export default function BroadcasterPanel() {
  const [licenseKey, setLicenseKey] = useState(() => localStorage.getItem('kadrokur_licenseKey') || '');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  // Auto mode removed - always manual mode
  const teamSelectionMode = 'manual' as const;
  const [teamNames, setTeamNames] = useState(['Takım 1', 'Takım 2', 'Takım 3', 'Takım 4']);
  const [stats, setStats] = useState({
    cardsOpened: 0,
    participants: 0,
    totalLikes: 0,
    totalGifts: 0,
    isPaused: false,
    teamScores: [] as { id: number; name: string; score: number; playerCount: number }[],
    topViewers: [] as { username: string; displayName: string; total: number }[],
    queueLength: 0,
    likeProgress: 0,
    likeThreshold: 100,
    tiktokConnected: false,
    startedAt: 0,
  });

  // Feature toggles - persisted to localStorage
  const [features, setFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem('kadrokur_panel_features');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      sessionTimer: true,
      queueBadge: true,
      teamScores: true,
      likeProgress: true,
      pauseResume: true,
      cardsCountdown: true,
      topViewers: true,
      tiktokStatus: true,
      prevSession: true,
    };
  });

  const toggleFeature = (key: string) => {
    setFeatures((prev: any) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('kadrokur_panel_features', JSON.stringify(next));
      return next;
    });
  };

  // Session timer
  const [sessionElapsed, setSessionElapsed] = useState('00:00:00');
  useEffect(() => {
    if (!sessionActive || !stats.startedAt) return;
    const tick = () => {
      const diff = Math.floor((Date.now() - stats.startedAt) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setSessionElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [sessionActive, stats.startedAt]);

  // Previous session summary from localStorage
  const prevSession = (() => {
    try {
      const s = localStorage.getItem('kadrokur_prev_session');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startingStep, setStartingStep] = useState(0);
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

  // Gift trigger mode: 'diamond' = all gifts, quality by jeton range; 'specific' = only selected gifts
  const [giftTriggerMode, setGiftTriggerMode] = useState<'disabled' | 'diamond' | 'specific'>('diamond');

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

    // Hem ilk bağlantıda hem de yeniden bağlantıda session'a katıl
    s.on("connect", () => {
      s.emit("joinSession", sessionId);
    });

    s.on("gameEvent", (event: { type: string; sessionId: string; data: any; timestamp: number }) => {
      if (event.sessionId !== sessionId) return;

      switch (event.type) {
        case "statsUpdated":
          if (event.data) {
            setStats(prev => ({
              ...prev,
              ...(typeof event.data.cardsOpened === "number" ? { cardsOpened: event.data.cardsOpened } : {}),
              ...(typeof event.data.participants === "number" ? { participants: event.data.participants } : {}),
              ...(typeof event.data.totalLikes === "number" ? { totalLikes: event.data.totalLikes } : {}),
              ...(typeof event.data.totalGifts === "number" ? { totalGifts: event.data.totalGifts } : {}),
              ...(typeof event.data.isPaused === "boolean" ? { isPaused: event.data.isPaused } : {}),
              ...(Array.isArray(event.data.teamScores) ? { teamScores: event.data.teamScores } : {}),
              ...(Array.isArray(event.data.topViewers) ? { topViewers: event.data.topViewers } : {}),
              ...(typeof event.data.queueLength === "number" ? { queueLength: event.data.queueLength } : {}),
              ...(typeof event.data.likeProgress === "number" ? { likeProgress: event.data.likeProgress } : {}),
              ...(typeof event.data.likeThreshold === "number" ? { likeThreshold: event.data.likeThreshold } : {}),
              ...(typeof event.data.tiktokConnected === "boolean" ? { tiktokConnected: event.data.tiktokConnected } : {}),
              ...(typeof event.data.startedAt === "number" ? { startedAt: event.data.startedAt } : {}),
            }));
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
          // Save session summary to localStorage
          setStats(prev => {
            const winner = event.data?.winner || null;
            localStorage.setItem('kadrokur_prev_session', JSON.stringify({
              endedAt: Date.now(),
              cardsOpened: prev.cardsOpened,
              totalLikes: prev.totalLikes,
              totalGifts: prev.totalGifts,
              participants: prev.participants,
              teamScores: prev.teamScores,
              elapsed: sessionElapsed,
              winner,
            }));
            return prev;
          });
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

  // Advance loading step while session is starting
  useEffect(() => {
    if (!isStartingSession) { setStartingStep(0); return; }
    const timers = [
      setTimeout(() => setStartingStep(1), 800),
      setTimeout(() => setStartingStep(2), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isStartingSession]);

  // Polling fallback: socket eventleri kaçırılırsa her 5s'de stats güncelle
  const { data: polledGameState } = trpc.game.getState.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId, refetchInterval: 5000, staleTime: 0 }
  );
  useEffect(() => {
    if (!polledGameState) return;
    setStats(prev => ({
      ...prev,
      cardsOpened: polledGameState.openedCards.length,
      participants: polledGameState.participants.length,
      totalLikes: polledGameState.totalLikes,
      totalGifts: polledGameState.totalGifts,
    }));
  }, [polledGameState]);

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
        // Persist license key for next session
        localStorage.setItem('kadrokur_licenseKey', licenseKey);
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
    setStartingStep(0);
    try {
      const result = await createSessionMutation.mutateAsync({
        licenseKey,
        tiktokUsername: tiktokUsername || licenseInfo.broadcasterName || '',
        teamSelectionMode: 'manual', // Auto mode removed
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

  const handleTogglePause = () => {
    if (!sessionId || !socketRef.current) return;
    if (stats.isPaused) {
      socketRef.current.emit('resume-game', { sessionId });
    } else {
      socketRef.current.emit('pause-game', { sessionId });
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
        setGiftTriggerMode(data.giftTriggerMode || 'diamond');
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
        body: JSON.stringify({ activeGiftIds, giftTriggerMode })
      });
      const modeLabel = giftTriggerMode === 'disabled' ? 'Devre dışı modu' : giftTriggerMode === 'specific' ? 'Tekil hediye modu' : 'Jeton aralığı modu';
      showNotification('success', 'Başarılı', `${modeLabel} kaydedildi`);
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
        @keyframes bp-spin { to { transform:rotate(360deg); } }
        @keyframes bp-pulse-dot { 0%,100%{opacity:0.3} 50%{opacity:1} }
        .bp-spinner { width:40px; height:40px; border:3px solid #14532d; border-top-color:#22c55e; border-radius:50%; animation:bp-spin 0.8s linear infinite; }
        .bp-step { display:flex; align-items:center; gap:0.6rem; font-size:0.8rem; transition:all 0.3s; }
        .bp-step.done { color:#4ade80; }
        .bp-step.active { color:#86efac; font-weight:600; }
        .bp-step.pending { color:#14532d; }
        .bp-step-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .bp-step.done .bp-step-dot { background:#22c55e; }
        .bp-step.active .bp-step-dot { background:#22c55e; animation:bp-pulse-dot 0.8s ease infinite; }
        .bp-step.pending .bp-step-dot { background:#14532d; }
      `}</style>
      {/* Session starting overlay */}
      {isStartingSession && (() => {
        const STEPS = [
          { label: 'Lisans doğrulanıyor', sub: 'Lisans anahtarı kontrol ediliyor...' },
          { label: 'Oturum oluşturuluyor', sub: 'Sunucuda oyun oturumu hazırlanıyor...' },
          { label: 'TikTok\'a bağlanıyor', sub: 'Bu adım 5–15 saniye sürebilir, lütfen bekleyin...' },
        ];
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(3,10,6,0.92)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'linear-gradient(135deg,#0f1f15,#0a1a0f)', border:'1px solid #22c55e33', borderRadius:'16px', padding:'2rem 2.5rem', minWidth:'300px', display:'flex', flexDirection:'column', alignItems:'center', gap:'1.5rem', boxShadow:'0 24px 64px rgba(22,163,74,0.15)' }}>
              <div className="bp-spinner" />
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'1rem', fontWeight:700, color:'#4ade80', marginBottom:'0.3rem' }}>Oturum Başlatılıyor</div>
                <div style={{ fontSize:'0.72rem', color:'#166534', letterSpacing:'0.04em' }}>Lütfen sayfayı kapatmayın</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', width:'100%' }}>
                {STEPS.map((s, i) => {
                  const cls = i < startingStep ? 'done' : i === startingStep ? 'active' : 'pending';
                  return (
                    <div key={i} className={`bp-step ${cls}`}>
                      <div className="bp-step-dot" />
                      <div>
                        <div>{i < startingStep ? '✓ ' : ''}{s.label}</div>
                        {i === startingStep && <div style={{ fontSize:'0.65rem', color:'#166534', marginTop:'0.15rem' }}>{s.sub}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

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
            {/* License badge - always visible */}
            {(() => {
              const valid = licenseInfo.isValid;
              const days = licenseInfo.daysRemaining;
              const color = !valid
                ? '#6b7280'
                : days !== null && days <= 0
                ? '#ef4444'
                : days !== null && days <= 7
                ? '#fbbf24'
                : '#22c55e';
              const bg = !valid
                ? 'rgba(107,114,128,0.1)'
                : days !== null && days <= 0
                ? 'rgba(239,68,68,0.1)'
                : days !== null && days <= 7
                ? 'rgba(251,191,36,0.1)'
                : 'rgba(34,197,94,0.1)';
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  background: bg,
                  border: `1px solid ${color}44`,
                }}>
                  <Calendar size={12} style={{ color }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', color }}>
                    {!valid
                      ? (licenseKey && licenseQuery.isLoading ? 'Doğrulanıyor…' : 'Lisans yok')
                      : licenseInfo.packageType
                        ? `${licenseInfo.packageType.toUpperCase()} · ${days !== null ? days + ' gün' : 'Aktif'}`
                        : (days !== null ? days + ' gün kaldı' : 'Lisans aktif')
                    }
                  </span>
                </div>
              );
            })()}
            {/* Guide button */}
            <button className="bp-settings-btn" onClick={() => setGuideOpen(true)} title="Kullanım Rehberi">
              <HelpCircle size={15} />
            </button>
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

            </div>
          </div>
        )}

        {/* ── ACTIVE SESSION VIEW ── */}
        {sessionActive && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>


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

            {/* ── FEATURE ROW: timer + tiktok status + pause + countdown ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Feature 1: Session Timer */}
              {features.sessionTimer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '6px' }}>
                  <Clock size={12} color="#4ade80" />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#4ade80', fontWeight: 700 }}>{sessionElapsed}</span>
                </div>
              )}
              {/* Feature 13: TikTok Connection Status */}
              {features.tiktokStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: '#0a1a0f', border: `1px solid ${stats.tiktokConnected ? '#22c55e' : '#ef4444'}44`, borderRadius: '6px' }}>
                  {stats.tiktokConnected ? <Wifi size={12} color="#22c55e" /> : <WifiOff size={12} color="#ef4444" />}
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: stats.tiktokConnected ? '#22c55e' : '#ef4444' }}>
                    {stats.tiktokConnected ? 'TikTok CANLI' : 'DEMO MOD'}
                  </span>
                </div>
              )}
              {/* Feature 7: Pause/Resume */}
              {features.pauseResume && (
                <button
                  onClick={handleTogglePause}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: stats.isPaused ? '#fbbf2422' : '#0a1a0f', border: `1px solid ${stats.isPaused ? '#fbbf24' : '#14532d'}`, borderRadius: '6px', color: stats.isPaused ? '#fbbf24' : '#4ade80', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {stats.isPaused ? <Play size={11} /> : <Pause size={11} />}
                  {stats.isPaused ? 'Devam Et' : 'Duraklat'}
                </button>
              )}
              {/* Feature 2: Queue badge */}
              {features.queueBadge && stats.queueLength > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: '#7c3aed22', border: '1px solid #7c3aed44', borderRadius: '6px' }}>
                  <LayoutGrid size={12} color="#a855f7" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a855f7' }}>{stats.queueLength} kuyrukta</span>
                </div>
              )}
              {/* Feature 11: Cards remaining */}
              {features.cardsCountdown && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '6px' }}>
                  <TrendingUp size={12} color="#4ade80" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ade80' }}>{Math.max(0, 44 - stats.cardsOpened)} kart kaldı</span>
                </div>
              )}
            </div>

            {/* Feature 5: Like Progress Bar */}
            {features.likeProgress && (
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                    <Heart size={10} />
                    Sonraki Kart Beğeni İlerlemesi
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>{stats.likeProgress} / {stats.likeThreshold}</span>
                </div>
                <div style={{ height: '6px', background: '#14532d', borderRadius: '3px' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: '3px', width: `${Math.min(100, Math.round((stats.likeProgress / Math.max(1, stats.likeThreshold)) * 100))}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )}

            {/* Feature 3: Team Score Table */}
            {features.teamScores && stats.teamScores.length > 0 && (
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.6rem' }}>
                  <Trophy size={10} />
                  Takım Skor Tablosu
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[...stats.teamScores].sort((a, b) => b.score - a.score).map((t, rank) => (
                    <div key={t.id} style={{ background: rank === 0 ? '#16a34a22' : '#030a06', border: `1px solid ${rank === 0 ? '#22c55e44' : '#14532d'}`, borderRadius: '6px', padding: '0.5rem 0.6rem', textAlign: 'center' as const }}>
                      <div style={{ fontSize: '0.6rem', color: '#166534', marginBottom: '0.15rem' }}>{rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{t.name}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#22c55e' }}>{t.score}</div>
                      <div style={{ fontSize: '0.58rem', color: '#4b5563' }}>{t.playerCount}/11</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature 12: Top Viewers */}
            {features.topViewers && stats.topViewers.length > 0 && (
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.6rem' }}>
                  <Users size={10} />
                  En Aktif İzleyiciler
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {stats.topViewers.slice(0, 5).map((v, i) => (
                    <div key={v.username} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem', background: '#030a06', border: '1px solid #14532d', borderRadius: '12px' }}>
                      <span style={{ fontSize: '0.6rem', color: '#166534' }}>{i + 1}.</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#4ade80' }}>{v.displayName || v.username}</span>
                      <span style={{ fontSize: '0.62rem', color: '#fbbf24' }}>+{v.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature 15: Previous Session Summary */}
            {features.prevSession && prevSession && !sessionActive && (
              <div style={{ background: '#0a1a0f', border: '1px solid #14532d44', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4b5563', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.5rem' }}>Önceki Oturum</div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Kart: <strong style={{ color: '#9ca3af' }}>{prevSession.cardsOpened}</strong></span>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Süre: <strong style={{ color: '#9ca3af' }}>{prevSession.elapsed}</strong></span>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Beğeni: <strong style={{ color: '#9ca3af' }}>{prevSession.totalLikes}</strong></span>
                  <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Hediye: <strong style={{ color: '#9ca3af' }}>{prevSession.totalGifts}</strong></span>
                </div>
              </div>
            )}

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

            {/* ── FEATURE TOGGLES SECTION ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Settings size={11} />
                Panel Özellikleri
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.4rem' }}>
                {([
                  { key: 'sessionTimer', label: 'Oturum Süresi Sayacı' },
                  { key: 'queueBadge', label: 'Kart Kuyruğu Göstergesi' },
                  { key: 'teamScores', label: 'Takım Skor Tablosu' },
                  { key: 'likeProgress', label: 'Beğeni İlerleme Çubuğu' },
                  { key: 'pauseResume', label: 'Oyun Duraklat / Devam' },
                  { key: 'cardsCountdown', label: 'Kalan Kart Sayısı' },
                  { key: 'topViewers', label: 'En Aktif İzleyiciler' },
                  { key: 'tiktokStatus', label: 'TikTok Bağlantı Durumu' },
                  { key: 'prevSession', label: 'Önceki Oturum Özeti' },
                ] as { key: string; label: string }[]).map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>{label}</span>
                    <button
                      onClick={() => toggleFeature(key)}
                      style={{ width: '38px', height: '20px', borderRadius: '10px', border: 'none', background: features[key] ? '#22c55e' : '#4b5563', cursor: 'pointer', position: 'relative' as const, transition: 'background 0.2s', flexShrink: 0 }}
                    >
                      <div style={{ position: 'absolute' as const, top: '2px', left: features[key] ? '20px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                GIFT TRIGGER MODE + GIFT SELECTION
            ═══════════════════════════════════════════════════════════ */}
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem', background: '#0a0f0a', border: '1px solid #1a2e1a', borderRadius: '8px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Gift size={14} style={{ color: '#22c55e' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                    Hediye Tetikleyici
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                  {giftTriggerMode === 'specific' ? `${activeGiftIds.length} seçili` : giftTriggerMode === 'disabled' ? 'Kapalı' : 'Tüm hediyeler'}
                </div>
              </div>

              {/* Trigger mode selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <button
                  onClick={() => setGiftTriggerMode('disabled')}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '7px',
                    border: giftTriggerMode === 'disabled' ? '1.5px solid #ef4444' : '1.5px solid #3f1111',
                    background: giftTriggerMode === 'disabled' ? '#ef44440f' : '#030a06',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: giftTriggerMode === 'disabled' ? '#ef4444' : '#9ca3af', fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                    🚫 Devre Dışı
                  </div>
                  <div style={{ fontSize: '0.62rem', color: giftTriggerMode === 'disabled' ? '#ef444488' : '#4b5563' }}>Hiçbir hediye kart açmaz</div>
                </button>
                <button
                  onClick={() => setGiftTriggerMode('diamond')}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '7px',
                    border: giftTriggerMode === 'diamond' ? '1.5px solid #22c55e' : '1.5px solid #14532d',
                    background: giftTriggerMode === 'diamond' ? '#16a34a0f' : '#030a06',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: giftTriggerMode === 'diamond' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                    💎 Jeton Aralığı
                  </div>
                  <div style={{ fontSize: '0.62rem', color: giftTriggerMode === 'diamond' ? '#166534' : '#4b5563' }}>Tüm hediyeler tetikler, jeton miktarına göre kalite</div>
                </button>
                <button
                  onClick={() => setGiftTriggerMode('specific')}
                  style={{
                    padding: '0.6rem 0.75rem',
                    borderRadius: '7px',
                    border: giftTriggerMode === 'specific' ? '1.5px solid #22c55e' : '1.5px solid #14532d',
                    background: giftTriggerMode === 'specific' ? '#16a34a0f' : '#030a06',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: giftTriggerMode === 'specific' ? '#22c55e' : '#4ade80', fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.15rem' }}>
                    🎁 Tekil Hediyeler
                  </div>
                  <div style={{ fontSize: '0.62rem', color: giftTriggerMode === 'specific' ? '#166534' : '#4b5563' }}>Sadece seçili hediyeler tetikler, DB'den kalite</div>
                </button>
              </div>

              {/* Divider + gift list header (only relevant in specific mode) */}
              <div style={{ borderTop: '1px solid #14532d44', paddingTop: '0.6rem', marginBottom: '0.5rem', opacity: giftTriggerMode === 'specific' ? 1 : 0.45 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                  {giftTriggerMode === 'specific' ? 'Aktif hediye listesi' : giftTriggerMode === 'disabled' ? 'Hediye sistemi kapalı' : 'Tekil mod aktif değil — liste yok sayılır'}
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

      {/* ── GUIDE MODAL ── */}
      {guideOpen && (
        <div className="bp-modal-overlay" onClick={() => setGuideOpen(false)}>
          <div className="bp-modal" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #14532d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4ade80', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                <HelpCircle size={15} />
                Kullanım Rehberi
              </div>
              <button onClick={() => setGuideOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', background: 'none', border: '1px solid #14532d', borderRadius: '6px', color: '#4ade80', cursor: 'pointer' }}>
                <X size={13} />
              </button>
            </div>

            {/* ── SECTION 1: Ön Koşullar ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
                <span style={{ background: '#22c55e', color: '#030a06', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>1</span>
                Ön Koşullar
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.4rem', paddingLeft: '1.6rem' }}>
                {[
                  '✅ Geçerli bir lisans anahtarınız olmalı (HIRA-XXXX-XXXX-XXXX formatında)',
                  '✅ TikTok hesabınızda canlı yayın aktif olmalı',
                  '✅ Lisans anahtarınızdaki TikTok kullanıcı adı, canlı yayın hesabınızla eşleşmeli',
                  '✅ OBS Studio veya benzeri bir yayın yazılımı kurulu olmalı (OBS ekranı için)',
                ].map((item, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: '#d1fae5', lineHeight: '1.5' }}>{item}</div>
                ))}
              </div>
            </div>

            {/* ── SECTION 2: Oturum Başlatma ── */}
            <div style={{ marginBottom: '1.25rem', background: '#0a1a0f', border: '1px solid #14532d44', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
                <span style={{ background: '#22c55e', color: '#030a06', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>2</span>
                Oturum Başlatma
              </div>
              <ol style={{ paddingLeft: '1.6rem', margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '0.45rem' }}>
                {[
                  { step: 'Lisans Anahtarı', detail: 'Ana sayfadaki "Lisans Anahtarı" alanına HIRA-... kodunuzu girin. Yeşil ✓ işareti görünce lisans doğrulandı demektir.' },
                  { step: 'TikTok Adı', detail: 'Lisanstan otomatik yüklenir. Elle değiştiremezsiniz — lisanstaki TikTok adresiyle eşleşir.' },
                  { step: 'Takım Adları', detail: '4 takım için özel isim girin (ör: Galatasaray, Fenerbahçe, Beşiktaş, Trabzonspor). Oturum başladıktan sonra değiştirilemez.' },
                  { step: 'Oturumu Başlat', detail: 'Yeşil "Oturumu Başlat" butonuna basın. Sistem TikTok\'a bağlanır. Bağlantı sağlanamazsa Demo Mod devreye girer (sahte gift/like gönderir).' },
                ].map((item, i) => (
                  <li key={i} style={{ fontSize: '0.77rem', color: '#d1fae5', lineHeight: '1.5' }}>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>{item.step}:</span>{' '}
                    <span style={{ color: '#a7f3d0' }}>{item.detail}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* ── SECTION 3: OBS Kurulumu ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
                <span style={{ background: '#22c55e', color: '#030a06', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>3</span>
                OBS Oyun Ekranı Kurulumu
              </div>
              <div style={{ paddingLeft: '1.6rem', display: 'flex', flexDirection: 'column' as const, gap: '0.4rem' }}>
                <div style={{ fontSize: '0.77rem', color: '#a7f3d0' }}>Oturum başladıktan sonra "Oyun Ekranı" linkine tıklayın (veya adres çubuğundan kopyalayın):</div>
                <div style={{ background: '#030a06', border: '1px solid #22c55e33', borderRadius: '5px', padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#4ade80', letterSpacing: '0.03em' }}>
                  http://localhost:3000/game-screen.html?sessionId=SES-XXXX
                </div>
                <div style={{ fontSize: '0.77rem', color: '#a7f3d0', marginTop: '0.3rem' }}>OBS'de <strong style={{ color: '#4ade80' }}>Kaynak Ekle → Tarayıcı Kaynağı</strong> seçin, bu URL'yi yapıştırın. Boyut: <strong style={{ color: '#4ade80' }}>1920 × 1080</strong>.</div>
              </div>
            </div>

            {/* ── SECTION 4: Kart Sistemi ── */}
            <div style={{ marginBottom: '1.25rem', background: '#0a1a0f', border: '1px solid #14532d44', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
                <span style={{ background: '#22c55e', color: '#030a06', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>4</span>
                Kart Sistemi
              </div>
              <div style={{ paddingLeft: '1.6rem' }}>
                <div style={{ fontSize: '0.77rem', color: '#a7f3d0', marginBottom: '0.6rem' }}>İki kaynaktan kart açılır: <strong style={{ color: '#4ade80' }}>Beğeni</strong> ve <strong style={{ color: '#fbbf24' }}>Hediye</strong>.</div>

                {/* Beğeni */}
                <div style={{ marginBottom: '0.7rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.3rem' }}>❤️ Beğeni → Bronz Kart</div>
                  <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Varsayılan: <strong style={{ color: '#fff' }}>100 beğeni = 1 bronz kart</strong>. Ayarlar → Beğeni Eşiği kısmından değiştirilebilir.</div>
                </div>

                {/* Hediyeler tablo */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem' }}>🎁 Hediye → Jeton Miktarına Göre Kart Kalitesi</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.3rem' }}>
                    {[
                      { label: 'Bronz', range: '< 10 jeton', color: '#cd7f32', bg: '#cd7f3222' },
                      { label: 'Gümüş', range: '10 – 49 jeton', color: '#a8a9ad', bg: '#a8a9ad22' },
                      { label: 'Altın', range: '50 – 199 jeton', color: '#ffd700', bg: '#ffd70022' },
                      { label: 'Elite', range: '200+ jeton', color: '#a855f7', bg: '#a855f722' },
                    ].map(q => (
                      <div key={q.label} style={{ background: q.bg, border: `1px solid ${q.color}44`, borderRadius: '5px', padding: '0.4rem 0.5rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: q.color }}>{q.label}</div>
                        <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>{q.range}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.4rem' }}>Jeton eşikleri Ayarlar → Hediye Jeton Eşikleri kısmından özelleştirilebilir.</div>
                </div>
              </div>
            </div>

            {/* ── SECTION 5: Manuel Mod ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
                <span style={{ background: '#22c55e', color: '#030a06', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>5</span>
                Manuel Mod — Takım Atama
              </div>
              <div style={{ paddingLeft: '1.6rem', display: 'flex', flexDirection: 'column' as const, gap: '0.4rem' }}>
                {[
                  'Bir izleyici hediye gönderdiğinde veya beğeni eşiği dolduğunda ekranda kart belirir.',
                  'Bu panelde "Bekleyen Kart" bildirimi çıkar — kimin gönderdiği ve kart kalitesi görünür.',
                  '4 takım butonundan birine tıklayarak kartı o takıma atarsınız.',
                  'Takım ataması OBS oyun ekranına anında yansır.',
                  'Kart atanmadan yeni kart gelmez (kuyruk sistemi — kartlar sırayla işlenir).',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.77rem', color: '#a7f3d0', lineHeight: '1.5' }}>
                    <span style={{ color: '#22c55e', flexShrink: 0 }}>→</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 6: Ayarlar Modalı ── */}
            <div style={{ marginBottom: '1.25rem', background: '#0a1a0f', border: '1px solid #14532d44', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
                <span style={{ background: '#22c55e', color: '#030a06', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>6</span>
                Ayarlar Modalı (⚙️ butonu)
              </div>
              <div style={{ paddingLeft: '1.6rem', display: 'flex', flexDirection: 'column' as const, gap: '0.6rem' }}>
                {[
                  { label: 'Beğeni Eşiği', detail: 'Kaç beğeni 1 bronz kart açar. Varsayılan 100. Yayın büyüklüğünüze göre ayarlayın.' },
                  { label: 'Jeton Eşikleri', detail: 'Gümüş / Altın / Elite kalite için minimum jeton sayıları. Örn: Gümüş=10, Altın=50, Elite=200.' },
                  { label: 'Hediye Tetikleyici — Devre Dışı', detail: 'Hiçbir hediye kart açmaz. Sadece beğeni sistemi aktif kalır.' },
                  { label: 'Hediye Tetikleyici — Jeton Aralığı', detail: 'Her hediye kart açar; kaliteyi jeton miktarı belirler (varsayılan).' },
                  { label: 'Hediye Tetikleyici — Tekil Hediyeler', detail: 'Sadece seçtiğiniz hediyeler kart açar. Listeden hediye tıklayarak aktif/pasif yapın, ardından "Kaydet".' },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ade80', marginBottom: '0.15rem' }}>• {item.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', paddingLeft: '0.75rem' }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SECTION 7: Oyun Sonu ── */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#22c55e', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
                <span style={{ background: '#22c55e', color: '#030a06', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>7</span>
                Oyun Sonu
              </div>
              <div style={{ paddingLeft: '1.6rem', display: 'flex', flexDirection: 'column' as const, gap: '0.4rem' }}>
                {[
                  '4 takım × 11 oyuncu = toplam 44 kart açıldığında oyun otomatik biter.',
                  'Oyun ekranında final skoru görüntülenir ve Telegram\'a (lisans özelliğine göre) bildirim gönderilir.',
                  '"Oturumu Sonlandır" butonuyla oyunu istediğiniz zaman erken bitirebilirsiniz.',
                  'Takım puanı oyuncuların MC-RAT değerlerinin toplamıdır (bronz/gümüş/altın/elite derecelendirmesi değil).',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.77rem', color: '#a7f3d0', lineHeight: '1.5' }}>
                    <span style={{ color: '#22c55e', flexShrink: 0 }}>→</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer note */}
            <div style={{ marginTop: '1rem', padding: '0.65rem 0.85rem', background: '#030a06', border: '1px solid #14532d44', borderRadius: '6px', fontSize: '0.68rem', color: '#4b5563', lineHeight: '1.6' }}>
              💡 <strong style={{ color: '#166534' }}>İpucu:</strong> TikTok bağlantısı kurulamazsa sistem otomatik olarak <strong style={{ color: '#4ade80' }}>Demo Mod</strong>'a geçer ve her 3-5 saniyede sahte hediye/beğeni gönderir. Bu şekilde sistemi TikTok'a bağlanmadan test edebilirsiniz.
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
