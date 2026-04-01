import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2, Play, Square, Settings, Users, Zap, Trophy, Eye } from 'lucide-react';
import { trpc } from '@/lib/trpc';

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
        alert('✅ Oturum başarıyla başlatıldı!');
      } else {
        alert('❌ Hata: ' + result.message);
      }
    } catch (error) {
      alert('❌ Oturum başlatılamadı: ' + (error as Error).message);
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
        alert('✅ Oturum sona erdirildi');
      }
    } catch (error) {
      alert('❌ Oturum sonlandırılamadı');
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
        alert(`✅ Mod ${modeValue === 'manual' ? 'Manuel' : 'Otomatik'} olarak ayarlandı`);
      }
    } catch (error) {
      alert('❌ Mod değiştirilemedi');
    }
  };

  const handleTeamNameChange = (index: number, value: string) => {
    const newNames = [...teamNames];
    newNames[index] = value;
    setTeamNames(newNames);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-10 h-10 text-blue-500" />
            <h1 className="text-4xl font-bold text-white">Yayıncı Paneli</h1>
          </div>
          <p className="text-slate-400">TikTok canlı yayınlarında futbol kartları oyunu yönetin</p>
        </div>

        {/* Status Bar */}
        <div className="mb-8 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${sessionActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-white font-semibold">
                {sessionActive ? '🟢 Oturum Aktif' : '🔴 Oturum Kapalı'}
              </span>
            </div>
            {sessionActive && (
              <span className="text-slate-300 text-sm">
                Yayıncı: <strong>{tiktokUsername}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lisans Bilgileri */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Lisans Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Lisans Anahtarı
                  </label>
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="HIRA-XXXXXXXXXXXXX"
                    disabled={sessionActive}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    TikTok Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={tiktokUsername}
                    onChange={(e) => setTiktokUsername(e.target.value)}
                    placeholder="@tiktok_adınız"
                    disabled={sessionActive}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  {!sessionActive ? (
                    <Button
                      onClick={handleStartSession}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Oturum Başlat
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStopSession}
                      className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Oturum Durdur
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Takım Ayarları */}
            {sessionActive && (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Takım Adları
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Oyunda gösterilecek takım adlarını özelleştirin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {teamNames.map((name, idx) => (
                      <div key={idx}>
                        <label className="block text-slate-300 text-sm font-semibold mb-2">
                          Takım {idx + 1}
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mod Seçimi */}
            {sessionActive && (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-500" />
                    Takım Seçim Modu
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manuel veya otomatik takım seçimi yapın
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleModeChange('manual')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedMode === 'manual'
                          ? 'bg-blue-500/20 border-blue-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-white font-semibold mb-1">📋 Manuel Mod</div>
                      <div className="text-slate-400 text-sm">Panelden takım seçin</div>
                    </button>

                    <button
                      onClick={() => handleModeChange('auto')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedMode === 'auto'
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-white font-semibold mb-1">🤖 Otomatik Mod</div>
                      <div className="text-slate-400 text-sm">Chat komutlarıyla (!1, !2)</div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - İstatistikler ve Kısayollar */}
          <div className="space-y-6">
            {/* İstatistikler */}
            {sessionActive && (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    İstatistikler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-700/30 p-3 rounded-lg">
                    <div className="text-slate-400 text-sm">Açılan Kartlar</div>
                    <div className="text-2xl font-bold text-white">{stats.cardsOpened}</div>
                  </div>
                  <div className="bg-slate-700/30 p-3 rounded-lg">
                    <div className="text-slate-400 text-sm">Katılımcılar</div>
                    <div className="text-2xl font-bold text-white">{stats.participants}</div>
                  </div>
                  <div className="bg-slate-700/30 p-3 rounded-lg">
                    <div className="text-slate-400 text-sm">Toplam Beğeni</div>
                    <div className="text-2xl font-bold text-white">{stats.totalLikes}</div>
                  </div>
                  <div className="bg-slate-700/30 p-3 rounded-lg">
                    <div className="text-slate-400 text-sm">Toplam Hediye</div>
                    <div className="text-2xl font-bold text-white">{stats.totalGifts}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Kısayollar */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-500" />
                  Hızlı Erişim
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href="/game-screen.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-300 text-center font-semibold transition-all"
                >
                  🎮 Oyun Ekranı
                </a>
                <a
                  href="/license-panel.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-300 text-center font-semibold transition-all"
                >
                  🔑 Lisans Paneli
                </a>
                <a
                  href="/admin-dashboard.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 rounded-lg text-orange-300 text-center font-semibold transition-all"
                >
                  ⚙️ Admin Paneli
                </a>
              </CardContent>
            </Card>

            {/* Bilgiler */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-sm">ℹ️ Bilgi</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-400 text-sm space-y-2">
                <p>
                  <strong>Manuel Mod:</strong> Panelden takım seçin
                </p>
                <p>
                  <strong>Otomatik Mod:</strong> Sohbetde !1, !2, !3, !4 yazın
                </p>
                <p>
                  <strong>OBS:</strong> /game-screen.html'i Browser Source olarak ekleyin
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
