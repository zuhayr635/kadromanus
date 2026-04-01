import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const { user, isAuthenticated } = useAuth();
  const { data: sessions, isLoading } = trpc.admin.getAllSessions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Giriş Gerekli</CardTitle>
            <CardDescription>Profil sayfasını görmek için giriş yapınız.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  // Kullanıcının oyunlarını filtrele
  const userSessions = sessions?.filter((s) => s.broadcasterName === user?.name) || [];

  // İstatistikleri hesapla
  const totalGames = userSessions.length;
  const totalCards = userSessions.reduce((sum, s) => sum + (s.totalCardsOpened || 0), 0);
  const totalParticipants = userSessions.reduce((sum, s) => sum + (s.totalParticipants || 0), 0);
  const totalDuration = userSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const averageDuration = totalGames > 0 ? Math.floor(totalDuration / totalGames) : 0;

  // Grafik verileri
  const gameStatsData = userSessions.map((s, idx) => ({
    name: `Oyun ${idx + 1}`,
    kartlar: s.totalCardsOpened || 0,
    katılımcılar: s.totalParticipants || 0,
  }));

  const durationData = userSessions.map((s, idx) => ({
    name: `Oyun ${idx + 1}`,
    süre: Math.floor((s.duration || 0) / 60),
  }));

  const statusData = [
    { name: "Tamamlanan", value: userSessions.filter((s) => s.status === "completed").length },
    { name: "Devam Eden", value: userSessions.filter((s) => s.status === "active").length },
    { name: "İptal Edilen", value: userSessions.filter((s) => s.status === "cancelled").length },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#ef4444"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Profil</h1>
          <p className="text-slate-600 mt-2">Hoş geldiniz, {user?.name}!</p>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Toplam Oyun</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{totalGames}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Açılan Kartlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{totalCards}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Katılımcılar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{totalParticipants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Ort. Oyun Süresi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{averageDuration}s</div>
            </CardContent>
          </Card>
        </div>

        {/* Grafikler */}
        <Tabs defaultValue="stats" className="mb-8">
          <TabsList>
            <TabsTrigger value="stats">İstatistikler</TabsTrigger>
            <TabsTrigger value="history">Oyun Geçmişi</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            {/* Kart ve Katılımcı Grafiği */}
            <Card>
              <CardHeader>
                <CardTitle>Oyun Başına Kart ve Katılımcılar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gameStatsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="kartlar" fill="#3b82f6" name="Kartlar" />
                    <Bar dataKey="katılımcılar" fill="#10b981" name="Katılımcılar" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Oyun Süresi Grafiği */}
            <Card>
              <CardHeader>
                <CardTitle>Oyun Süreleri (dakika)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={durationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="süre" stroke="#8b5cf6" name="Süre (dakika)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Oyun Durumu Dağılımı */}
            <Card>
              <CardHeader>
                <CardTitle>Oyun Durumu Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Oyun Geçmişi</CardTitle>
                <CardDescription>Son oyunlarınız ve detayları</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Oyun ID</th>
                        <th className="text-left py-2 px-4">Tarih</th>
                        <th className="text-left py-2 px-4">Kartlar</th>
                        <th className="text-left py-2 px-4">Katılımcılar</th>
                        <th className="text-left py-2 px-4">Süre</th>
                        <th className="text-left py-2 px-4">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSessions.map((session) => (
                        <tr key={session.sessionId} className="border-b hover:bg-slate-50">
                          <td className="py-2 px-4 font-mono text-xs">{session.sessionId.substring(0, 8)}</td>
                          <td className="py-2 px-4">{new Date(session.startedAt).toLocaleDateString("tr-TR")}</td>
                          <td className="py-2 px-4">{session.totalCardsOpened || 0}</td>
                          <td className="py-2 px-4">{session.totalParticipants || 0}</td>
                          <td className="py-2 px-4">{Math.floor((session.duration || 0) / 60)}m</td>
                          <td className="py-2 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                session.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : session.status === "active"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {session.status === "completed"
                                ? "Tamamlandı"
                                : session.status === "active"
                                  ? "Devam Ediyor"
                                  : "İptal Edildi"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
