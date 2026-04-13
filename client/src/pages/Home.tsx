export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#080c09', color: '#F8F6F3', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* NAV */
        .hp-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 1.25rem 2.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(212,175,55,0.1); background: rgba(8,12,9,0.88); backdrop-filter: blur(14px); }
        .hp-logo-text { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.35rem; font-weight: 700; letter-spacing: 0.2em; color: #F8F6F3; text-transform: uppercase; }
        .hp-logo-dot { display: inline-block; width: 5px; height: 5px; background: #D4AF37; border-radius: 50%; margin-left: 3px; vertical-align: middle; position: relative; top: -2px; }
        .hp-nav-btn { padding: 0.55rem 1.4rem; background: transparent; border: 1px solid #D4AF37; color: #D4AF37; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; text-decoration: none; transition: background 0.2s, color 0.2s; }
        .hp-nav-btn:hover { background: #D4AF37; color: #080c09; }

        /* HERO */
        .hp-hero { min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 9rem 2rem 6rem; position: relative; overflow: hidden; }
        .hp-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 55% 45% at 50% 38%, rgba(212,175,55,0.05) 0%, transparent 70%); pointer-events: none; }
        .hp-hero-eyebrow { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase; margin-bottom: 2rem; }
        .hp-hero-h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(3.2rem, 7.5vw, 5.8rem); font-weight: 700; line-height: 1.04; color: #F8F6F3; margin-bottom: 1.75rem; }
        .hp-hero-h1 em { font-style: italic; color: #D4AF37; }
        .hp-hero-line { width: 48px; height: 1px; background: #D4AF37; margin: 0 auto 1.75rem; }
        .hp-hero-sub { font-size: 0.95rem; font-weight: 300; color: #6b7a6b; line-height: 1.75; max-width: 480px; margin: 0 auto 2.75rem; }
        .hp-hero-btns { display: flex; gap: 0.85rem; justify-content: center; flex-wrap: wrap; }
        .hp-btn-gold { padding: 0.78rem 2.2rem; background: #D4AF37; border: 1px solid #D4AF37; color: #080c09; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; text-decoration: none; transition: background 0.2s, color 0.2s; }
        .hp-btn-gold:hover { background: transparent; color: #D4AF37; }
        .hp-btn-ghost { padding: 0.78rem 2.2rem; background: transparent; border: 1px solid rgba(248,246,243,0.15); color: #6b7a6b; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; text-decoration: none; transition: border-color 0.2s, color 0.2s; }
        .hp-btn-ghost:hover { border-color: rgba(248,246,243,0.4); color: #F8F6F3; }

        /* STATEMENT */
        .hp-statement { background: #030504; padding: 7rem 2rem; text-align: center; border-top: 1px solid rgba(212,175,55,0.08); border-bottom: 1px solid rgba(212,175,55,0.08); }
        .hp-statement-text { font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(1.75rem, 4vw, 2.9rem); font-weight: 600; font-style: italic; color: #F8F6F3; max-width: 680px; margin: 0 auto 1.25rem; line-height: 1.35; }
        .hp-statement-attr { font-size: 0.65rem; letter-spacing: 0.22em; color: #D4AF37; text-transform: uppercase; font-weight: 600; }

        /* STATS */
        .hp-stats-bar { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid rgba(212,175,55,0.1); border-bottom: 1px solid rgba(212,175,55,0.1); }
        .hp-stat-item { padding: 3rem 1.5rem; text-align: center; border-right: 1px solid rgba(212,175,55,0.1); }
        .hp-stat-item:last-child { border-right: none; }
        .hp-stat-num { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 3.2rem; font-weight: 700; color: #D4AF37; line-height: 1; margin-bottom: 0.6rem; }
        .hp-stat-label { font-size: 0.62rem; letter-spacing: 0.22em; color: #3d4d3d; text-transform: uppercase; font-weight: 600; }

        /* SECTIONS */
        .hp-section { max-width: 1100px; margin: 0 auto; padding: 7rem 2rem; }
        .hp-section-eyebrow { font-size: 0.65rem; letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 1.1rem; }
        .hp-section-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(1.9rem, 4vw, 2.75rem); font-weight: 700; color: #F8F6F3; line-height: 1.15; margin-bottom: 3.5rem; }

        /* FEATURES GRID */
        .hp-features-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: rgba(212,175,55,0.08); outline: 1px solid rgba(212,175,55,0.08); }
        .hp-feature-item { background: #080c09; padding: 2.5rem; transition: background 0.2s; }
        .hp-feature-item:hover { background: #0c130d; }
        .hp-feature-num { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 2rem; font-weight: 700; color: rgba(212,175,55,0.2); line-height: 1; margin-bottom: 1.25rem; }
        .hp-feature-title { font-size: 0.72rem; font-weight: 700; color: #c4bfb8; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.75rem; }
        .hp-feature-desc { font-size: 0.82rem; color: #3d4d3d; line-height: 1.7; font-weight: 400; }

        /* PRICING GRID */
        .hp-pricing-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: rgba(212,175,55,0.08); outline: 1px solid rgba(212,175,55,0.08); }
        .hp-plan-item { background: #080c09; padding: 2.5rem 1.75rem; position: relative; transition: background 0.2s; }
        .hp-plan-item.featured { background: #0c130d; border-top: 2px solid #D4AF37; }
        .hp-plan-item:hover { background: #0c130d; }
        .hp-plan-badge { font-size: 0.58rem; letter-spacing: 0.18em; color: #D4AF37; text-transform: uppercase; font-weight: 700; margin-bottom: 1rem; }
        .hp-plan-label { font-size: 0.62rem; letter-spacing: 0.2em; color: #4d5c4d; text-transform: uppercase; font-weight: 600; margin-bottom: 1rem; }
        .hp-plan-price { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 2.6rem; font-weight: 700; color: #F8F6F3; line-height: 1; margin-bottom: 0.3rem; }
        .hp-plan-period { font-size: 0.65rem; color: #3d4d3d; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 1.75rem; }
        .hp-plan-divider { height: 1px; background: rgba(212,175,55,0.1); margin-bottom: 1.5rem; }
        .hp-plan-feature { font-size: 0.78rem; color: #2e3d2e; margin-bottom: 0.6rem; padding-left: 1.1rem; position: relative; }
        .hp-plan-feature::before { content: '—'; position: absolute; left: 0; color: #2e3d2e; font-size: 0.7rem; }
        .hp-plan-feature.on { color: #7a8a7a; }
        .hp-plan-feature.on::before { content: '✦'; color: #D4AF37; font-size: 0.55rem; top: 3px; }

        /* CONTACT */
        .hp-contact-wrap { border: 1px solid rgba(212,175,55,0.14); padding: 5rem 3rem; text-align: center; max-width: 600px; margin: 0 auto; }
        .hp-contact-eyebrow { font-size: 0.63rem; letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 1.5rem; }
        .hp-contact-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 2.1rem; font-weight: 700; color: #F8F6F3; margin-bottom: 0.6rem; }
        .hp-contact-sub { font-size: 0.8rem; color: #3d4d3d; margin-bottom: 2.5rem; letter-spacing: 0.04em; }
        .hp-contact-links { display: flex; gap: 0.85rem; justify-content: center; flex-wrap: wrap; }
        .hp-contact-link { padding: 0.65rem 1.5rem; border: 1px solid rgba(212,175,55,0.25); color: #D4AF37; font-size: 0.73rem; font-weight: 500; letter-spacing: 0.1em; text-decoration: none; text-transform: uppercase; transition: background 0.2s, color 0.2s, border-color 0.2s; }
        .hp-contact-link:hover { background: #D4AF37; color: #080c09; border-color: #D4AF37; }

        /* FOOTER */
        .hp-footer { border-top: 1px solid rgba(212,175,55,0.08); padding: 2.5rem; text-align: center; }
        .hp-footer-logo { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 0.95rem; font-weight: 700; letter-spacing: 0.22em; color: rgba(248,246,243,0.2); text-transform: uppercase; margin-bottom: 1.25rem; }
        .hp-footer-links { display: flex; justify-content: center; gap: 2.25rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .hp-footer-link { font-size: 0.67rem; letter-spacing: 0.12em; color: #2e3d2e; text-decoration: none; text-transform: uppercase; transition: color 0.15s; }
        .hp-footer-link:hover { color: #D4AF37; }
        .hp-footer-copy { font-size: 0.65rem; color: #1e2a1e; letter-spacing: 0.08em; text-transform: uppercase; }

        @media (max-width: 900px) {
          .hp-nav { padding: 1rem 1.25rem; }
          .hp-features-grid { grid-template-columns: repeat(2,1fr); }
          .hp-pricing-grid { grid-template-columns: 1fr 1fr; }
          .hp-stats-bar { grid-template-columns: 1fr 1fr; }
          .hp-stat-item:nth-child(2) { border-right: none; }
          .hp-stat-item:nth-child(3),
          .hp-stat-item:nth-child(4) { border-top: 1px solid rgba(212,175,55,0.1); }
        }
        @media (max-width: 600px) {
          .hp-features-grid, .hp-pricing-grid { grid-template-columns: 1fr; }
          .hp-stats-bar { grid-template-columns: 1fr 1fr; }
          .hp-section { padding: 4rem 1.25rem; }
          .hp-contact-wrap { padding: 3rem 1.25rem; }
          .hp-hero { padding: 7rem 1.25rem 4rem; }
        }
      `}</style>

      {/* NAV */}
      <nav className="hp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.svg" alt="Kadrokur" style={{ width: '32px', height: 'auto' }} />
          <span className="hp-logo-text">Kadrokur<span className="hp-logo-dot" /></span>
        </div>
        <a href="/broadcaster" className="hp-nav-btn">Paneli Aç</a>
      </nav>

      {/* HERO */}
      <section className="hp-hero">
        <div>
          <div className="hp-hero-eyebrow">TikTok Live × Futbol Kartları</div>
          {/* LOGO */}
          <div style={{ marginBottom: '2rem' }}>
            <img src="/logo.svg" alt="Kadrokur Logo" style={{ width: '140px', height: 'auto', filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.3))' }} />
          </div>
          <h1 className="hp-hero-h1">
            Canlı Yayında<br />
            <em>Kadro Kur</em>
          </h1>
          <div className="hp-hero-line" />
          <p className="hp-hero-sub">
            İzleyicilerin beğeni ve hediyesiyle futbolcu kartları açılır,
            4 takımın kadrosu tamamlanır. Yayın boyunca gerçek zamanlı heyecan.
          </p>
          <div className="hp-hero-btns">
            <a href="/broadcaster" className="hp-btn-gold">Yayıncı Paneli</a>
            <a href="/game-screen.html" target="_blank" rel="noopener noreferrer" className="hp-btn-ghost">Oyun Ekranı</a>
          </div>
        </div>
      </section>

      {/* GAME PREVIEW */}
      <section style={{ background: '#030504', padding: '5rem 2rem', borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
        <div className="hp-section">
          <div className="hp-section-eyebrow">Oyun İçi Görünüm</div>
          <h2 className="hp-section-title">4 Takım, 44 Kart,<br />1 Kazanan</h2>
        </div>
        {/* Card Preview */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem' }}>
          <style>{`
            .hp-card-preview { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; }
            .hp-preview-card { position: relative; }
            .hp-card-outer { position: relative; width: 100%; aspect-ratio: 3/4; background: linear-gradient(145deg, #1a1f1a, #0d0f0d); border-radius: 12px; padding: 4px; }
            .hp-card-inner { width: 100%; height: 100%; background: linear-gradient(180deg, #1e251e 0%, #141914 100%); border-radius: 10px; overflow: hidden; position: relative; }
            .hp-card-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.3; }
            .hp-card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%); }
            .hp-card-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem; }
            .hp-card-rating { position: absolute; top: 8px; right: 8px; font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 700; }
            .hp-card-pos { position: absolute; top: 8px; left: 8px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 3px; }
            .hp-card-name { font-size: 0.85rem; font-weight: 700; color: #F8F6F3; margin-bottom: 0.15rem; }
            .hp-card-nation { font-size: 0.6rem; color: #6b7a6b; }
            .hp-team-label { font-size: 0.55rem; letter-spacing: 0.15em; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; text-align: center; }
            /* Quality colors */
            .hp-card-bronze .hp-card-outer { border-color: #cd7f32; box-shadow: 0 0 20px rgba(205,127,50,0.2); }
            .hp-card-bronze .hp-card-rating { color: #cd7f32; }
            .hp-card-bronze .hp-card-pos { background: rgba(205,127,50,0.2); color: #cd7f32; }
            .hp-card-silver .hp-card-outer { border-color: #c0c0c0; box-shadow: 0 0 20px rgba(192,192,192,0.25); }
            .hp-card-silver .hp-card-rating { color: #c0c0c0; }
            .hp-card-silver .hp-card-pos { background: rgba(192,192,192,0.2); color: #c0c0c0; }
            .hp-card-gold .hp-card-outer { border-color: #ffd700; box-shadow: 0 0 30px rgba(255,215,0,0.3); }
            .hp-card-gold .hp-card-rating { color: #ffd700; }
            .hp-card-gold .hp-card-pos { background: rgba(255,215,0,0.2); color: #ffd700; }
            .hp-card-elite .hp-card-outer { border-color: #e31c23; box-shadow: 0 0 40px rgba(227,28,35,0.4); animation: eliteGlow 2s ease-in-out infinite; }
            .hp-card-elite .hp-card-rating { color: #e31c23; }
            .hp-card-elite .hp-card-pos { background: rgba(227,28,35,0.2); color: #e31c23; }
            @keyframes eliteGlow {
              0%, 100% { box-shadow: 0 0 40px rgba(227,28,35,0.4); }
              50% { box-shadow: 0 0 60px rgba(227,28,35,0.7); }
            }
            @media (max-width: 768px) {
              .hp-card-preview { grid-template-columns: repeat(2,1fr); }
            }
          `}</style>
          <div className="hp-card-preview">
            {/* Bronze */}
            <div className="hp-preview-card hp-card-bronze">
              <div className="hp-team-label">TAKIM 1</div>
              <div className="hp-card-outer">
                <div className="hp-card-inner">
                  <div className="hp-card-bg" style={{ backgroundImage: 'linear-gradient(135deg, #2a1f1a 0%, #1a1510 100%)' }} />
                  <div className="hp-card-overlay" />
                  <div className="hp-card-pos">FW</div>
                  <div className="hp-card-rating">67</div>
                  <div className="hp-card-content">
                    <div className="hp-card-name">Ahmet Yılmaz</div>
                    <div className="hp-card-nation">🇹🇷 Türkiye</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Silver */}
            <div className="hp-preview-card hp-card-silver">
              <div className="hp-team-label">TAKIM 2</div>
              <div className="hp-card-outer">
                <div className="hp-card-inner">
                  <div className="hp-card-bg" style={{ backgroundImage: 'linear-gradient(135deg, #2a2a35 0%, #1a1a25 100%)' }} />
                  <div className="hp-card-overlay" />
                  <div className="hp-card-pos">MF</div>
                  <div className="hp-card-rating">78</div>
                  <div className="hp-card-content">
                    <div className="hp-card-name">Mehmet Demir</div>
                    <div className="hp-card-nation">🇹🇷 Türkiye</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Gold */}
            <div className="hp-preview-card hp-card-gold">
              <div className="hp-team-label">TAKIM 3</div>
              <div className="hp-card-outer">
                <div className="hp-card-inner">
                  <div className="hp-card-bg" style={{ backgroundImage: 'linear-gradient(135deg, #352a1a 0%, #251a0a 100%)' }} />
                  <div className="hp-card-overlay" />
                  <div className="hp-card-pos">GK</div>
                  <div className="hp-card-rating">88</div>
                  <div className="hp-card-content">
                    <div className="hp-card-name">Ali Şahin</div>
                    <div className="hp-card-nation">🇹🇷 Türkiye</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Elite */}
            <div className="hp-preview-card hp-card-elite">
              <div className="hp-team-label">TAKIM 4</div>
              <div className="hp-card-outer">
                <div className="hp-card-inner">
                  <div className="hp-card-bg" style={{ backgroundImage: 'linear-gradient(135deg, #351a1a 0%, #250a0a 100%)' }} />
                  <div className="hp-card-overlay" />
                  <div className="hp-card-pos">ST</div>
                  <div className="hp-card-rating">99</div>
                  <div className="hp-card-content">
                    <div className="hp-card-name">Arda Güler</div>
                    <div className="hp-card-nation">🇪🇸 İspanya</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="hp-statement">
        <p className="hp-statement-text">"44 kart açılana kadar yayın kapanmıyor, izleyici sabırsızlanıyor."</p>
        <div className="hp-statement-attr">TikTok yayıncılarından geri bildirim</div>
      </section>

      {/* STATS */}
      <div className="hp-stats-bar">
        <div className="hp-stat-item">
          <div className="hp-stat-num">435</div>
          <div className="hp-stat-label">Futbolcu Kartı</div>
        </div>
        <div className="hp-stat-item">
          <div className="hp-stat-num">44</div>
          <div className="hp-stat-label">Toplam Kart</div>
        </div>
        <div className="hp-stat-item">
          <div className="hp-stat-num">4</div>
          <div className="hp-stat-label">Takım</div>
        </div>
        <div className="hp-stat-item">
          <div className="hp-stat-num">RT</div>
          <div className="hp-stat-label">Gerçek Zamanlı</div>
        </div>
      </div>

      {/* FEATURES */}
      <section>
        <div className="hp-section">
          <div className="hp-section-eyebrow">Nasıl Çalışır</div>
          <h2 className="hp-section-title">Birkaç tıkla kur,<br />yayında oyna</h2>
          <div className="hp-features-grid">
            <div className="hp-feature-item">
              <div className="hp-feature-num">01</div>
              <div className="hp-feature-title">TikTok Live Bağlantısı</div>
              <div className="hp-feature-desc">Kullanıcı adını gir, bağlan. Yayındaki beğeni, hediye ve yorumlar otomatik yakalanır.</div>
            </div>
            <div className="hp-feature-item">
              <div className="hp-feature-num">02</div>
              <div className="hp-feature-title">Jeton → Kart Kalitesi</div>
              <div className="hp-feature-desc">Gönderilen hediyenin jeton değerine göre Bronz, Gümüş, Altın veya Elite kart açılır. Eşikler ayarlanabilir.</div>
            </div>
            <div className="hp-feature-item">
              <div className="hp-feature-num">03</div>
              <div className="hp-feature-title">Beğeni ile Bronz Kart</div>
              <div className="hp-feature-desc">Ayarladığın beğeni sayısına ulaşıldığında otomatik bronz kart açılır. Eşik değeri değiştirilebilir.</div>
            </div>
            <div className="hp-feature-item">
              <div className="hp-feature-num">04</div>
              <div className="hp-feature-title">44 Kart = Oyun Biter</div>
              <div className="hp-feature-desc">Toplam 44 kart açıldığında oyun otomatik biter. Kazanan takım gösterilir, Telegram'a sonuç gönderilir.</div>
            </div>
            <div className="hp-feature-item">
              <div className="hp-feature-num">05</div>
              <div className="hp-feature-title">Otomatik Mod (!1-!4)</div>
              <div className="hp-feature-desc">İzleyiciler yorumda !1, !2, !3, !4 yazarak takım seçebilir. Yayıncı onayı gerekmez.</div>
            </div>
            <div className="hp-feature-item">
              <div className="hp-feature-num">06</div>
              <div className="hp-feature-title">Demo Modu</div>
              <div className="hp-feature-desc">TikTok bağlantısı başarısız olursa otomatik demo moduna geçer. Test için ideal.</div>
            </div>
            <div className="hp-feature-item">
              <div className="hp-feature-num">07</div>
              <div className="hp-feature-title">OBS Browser Source</div>
              <div className="hp-feature-desc">1920×1080 optimize oyun ekranı. OBS'e direkt Browser Source olarak ekle, yayında göster.</div>
            </div>
            <div className="hp-feature-item">
              <div className="hp-feature-num">08</div>
              <div className="hp-feature-title">Telegram Sonuç Paylaşımı</div>
              <div className="hp-feature-desc">Oyun bittiğinde final ekranının ekran görüntüsü otomatik olarak Telegram grubuna gönderilir.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ borderTop: '1px solid rgba(212,175,55,0.07)' }}>
        <div className="hp-section">
          <div className="hp-contact-wrap">
            <div className="hp-contact-eyebrow">İletişim</div>
            <h3 className="hp-contact-title">Lisans veya destek için</h3>
            <p className="hp-contact-sub">Kurucu · Luana</p>
            <div className="hp-contact-links">
              <a href="https://t.me/luanamobile" target="_blank" rel="noopener noreferrer" className="hp-contact-link">Telegram @luanamobile</a>
              <a href="https://luanawork.com" target="_blank" rel="noopener noreferrer" className="hp-contact-link">luanawork.com</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="hp-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <img src="/logo.svg" alt="Kadrokur" style={{ width: '28px', height: 'auto' }} />
          <span className="hp-footer-logo">Kadrokur</span>
        </div>
        <div className="hp-footer-links">
        </div>
        <div className="hp-footer-copy">© 2026 Kadrokur · TikTok Live Futbol Kartları Oyunu</div>
      </footer>
    </div>
  );
}
