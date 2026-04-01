import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Users, Zap, Trophy, BarChart3, Lock } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">Kadrokur</span>
          </div>
          <div className="flex gap-4 items-center">
            {isAuthenticated ? (
              <>
                <span className="text-slate-300">{user?.name}</span>
                <Button onClick={() => navigate("/profile")} variant="outline" size="sm">
                  Profil
                </Button>
                <Button onClick={logout} variant="ghost" size="sm">
                  Çıkış
                </Button>
              </>
            ) : (
              <Button onClick={() => (window.location.href = getLoginUrl())} size="sm">
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          TikTok Live Futbol Kartları Oyunu
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Canlı yayınlarında izleyicilerin hediye göndermesi ve beğenmeleriyle futbolcu kartları açın. 4 takımın kadrolarını tamamlayın ve final skorlarını Telegram'da paylaşın!
        </p>
        <div className="flex gap-4 justify-center">
          {isAuthenticated ? (
            <>
              <Button size="lg" onClick={() => navigate("/profile")}>
                Profil Sayfasına Git
              </Button>
              <Button size="lg" variant="outline">
                <a href="/broadcaster-panel.html" target="_blank" rel="noopener noreferrer">
                  Yayıncı Paneli
                </a>
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={() => (window.location.href = getLoginUrl())}>
              Başlamak İçin Giriş Yap
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">Özellikler</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Zap className="w-8 h-8 text-yellow-500 mb-2" />
              <CardTitle className="text-white">TikTok Live Entegrasyonu</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              Canlı yayında beğeni, hediye ve yorumları gerçek zamanlı olarak yakalayın. Hediye değerine göre farklı kalitede kartlar açın.
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Users className="w-8 h-8 text-blue-500 mb-2" />
              <CardTitle className="text-white">4 Takım Kadrosu</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              550+ futbolcudan rastgele seçilen oyuncularla 4 takımın kadrolarını tamamlayın. Manuel veya otomatik takım seçimi modu.
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Trophy className="w-8 h-8 text-amber-500 mb-2" />
              <CardTitle className="text-white">Kart Kaliteleri</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              Bronz, Gümüş, Altın ve Elit olmak üzere 4 farklı kart kalitesi. Hediye tier sistemi ile otomatik kalite belirleme.
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Gamepad2 className="w-8 h-8 text-purple-500 mb-2" />
              <CardTitle className="text-white">OBS Uyumluluğu</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              1920x1080 optimize oyun ekranı. OBS Browser Source ile doğrudan yayın yapın. Smooth animasyonlar ve gerçek zamanlı güncellemeler.
            </CardContent>
          </Card>

          {/* Feature 5 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-green-500 mb-2" />
              <CardTitle className="text-white">Admin Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              Session history, istatistikler, lisans yönetimi ve veri dışa aktarma. Grafikler ve analitikler ile detaylı raporlar.
            </CardContent>
          </Card>

          {/* Feature 6 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Lock className="w-8 h-8 text-red-500 mb-2" />
              <CardTitle className="text-white">Lisans Sistemi</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-300">
              4 paket türü (Basic, Pro, Premium, Unlimited). Özellik kısıtlamaları ve multi-session yönetimi. Telegram bot entegrasyonu.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">Lisans Paketleri</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Basic */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Basic</CardTitle>
              <CardDescription>Başlangıç Paketi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-white">Ücretsiz</div>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>✅ Oyun Oynama</li>
                <li>❌ Telegram Bot</li>
                <li>❌ Otomatik Mod</li>
                <li>❌ Analytics</li>
              </ul>
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className="bg-blue-900 border-blue-700">
            <CardHeader>
              <CardTitle className="text-white">Pro</CardTitle>
              <CardDescription className="text-blue-200">Popüler</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-white">$9.99/ay</div>
              <ul className="space-y-2 text-blue-100 text-sm">
                <li>✅ Oyun Oynama</li>
                <li>✅ Telegram Bot</li>
                <li>✅ Otomatik Mod</li>
                <li>❌ Analytics</li>
              </ul>
            </CardContent>
          </Card>

          {/* Premium */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Premium</CardTitle>
              <CardDescription>Profesyonel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-white">$19.99/ay</div>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>✅ Oyun Oynama</li>
                <li>✅ Telegram Bot</li>
                <li>✅ Otomatik Mod</li>
                <li>✅ Analytics</li>
              </ul>
            </CardContent>
          </Card>

          {/* Unlimited */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Unlimited</CardTitle>
              <CardDescription>Sınırsız</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold text-white">$49.99/ay</div>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>✅ Tüm Özellikler</li>
                <li>✅ Sınırsız Oturumlar</li>
                <li>✅ Öncelikli Destek</li>
                <li>✅ API Erişimi</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">Hemen Başlayın</h2>
        <p className="text-xl text-slate-300 mb-8">
          TikTok canlı yayınlarınızda futbol kartları oyununu başlatın ve izleyicilerinizi eğlenin!
        </p>
        {isAuthenticated ? (
          <Button size="lg" onClick={() => navigate("/profile")}>
            Profil Sayfasına Git
          </Button>
        ) : (
          <Button size="lg" onClick={() => (window.location.href = getLoginUrl())}>
            Giriş Yap ve Başla
          </Button>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400">
          <p>© 2026 Kadrokur - TikTok Live Futbol Kartları Oyunu</p>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <a href="/README.md" className="hover:text-white transition">
              Dokümantasyon
            </a>
            <a href="#" className="hover:text-white transition">
              Destek
            </a>
            <a href="#" className="hover:text-white transition">
              Gizlilik Politikası
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
