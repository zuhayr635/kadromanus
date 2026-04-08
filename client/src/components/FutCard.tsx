/**
 * FIFA Ultimate Team (FUT) Style Football Card Component
 *
 * Authentic FUT card design with shield shape, holographic effects,
 * and quality-specific styling.
 *
 * Usage:
 *   <FutCard player={playerData} size="normal" />
 */

import { cn } from "@/lib/utils";

interface Player {
  name: string;
  team: string;
  nation?: string;
  position: string;
  overall: number;
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
  diving?: number;
  handling?: number;
  kicking?: number;
  positioning?: number;
  reflexes?: number;
  imageUrl?: string;
  faceImageUrl?: string;
  cardQuality: "bronze" | "silver" | "gold" | "elite";
}

interface FutCardProps {
  player: Player;
  size?: "small" | "normal" | "large";
  showAnimation?: boolean;
  className?: string;
}

const qualityConfig = {
  bronze: {
    bg: "linear-gradient(145deg, #8B5E3C 0%, #CD7F32 30%, #8B5E3C 70%, #6B4226 100%)",
    border: "#CD7F32",
    text: "#FFF8E7",
    accent: "#FFE4B5",
    glow: "0 4px 20px rgba(205, 127, 50, 0.3)",
    statBg: "rgba(0,0,0,0.25)",
    statHigh: "#FFD700",
    statMid: "#CD7F32",
    statLow: "#8B5E3C",
  },
  silver: {
    bg: "linear-gradient(145deg, #708090 0%, #C0C0C0 30%, #D8D8D8 50%, #A9A9A9 70%, #708090 100%)",
    border: "#C0C0C0",
    text: "#1a1a2e",
    accent: "#2d2d44",
    glow: "0 4px 20px rgba(192, 192, 192, 0.4)",
    statBg: "rgba(0,0,0,0.15)",
    statHigh: "#2d2d44",
    statMid: "#555577",
    statLow: "#888899",
  },
  gold: {
    bg: "linear-gradient(145deg, #B8860B 0%, #FFD700 25%, #FFF8DC 50%, #FFD700 75%, #B8860B 100%)",
    border: "#FFD700",
    text: "#1a0a00",
    accent: "#3d1f00",
    glow: "0 4px 30px rgba(255, 215, 0, 0.5)",
    statBg: "rgba(0,0,0,0.2)",
    statHigh: "#8B4513",
    statMid: "#B8860B",
    statLow: "#DAA520",
  },
  elite: {
    bg: "linear-gradient(145deg, #4B0082 0%, #8B008B 25%, #DA70D6 50%, #8B008B 75%, #4B0082 100%)",
    border: "#DA70D6",
    text: "#FFF0F5",
    accent: "#FF69B4",
    glow: "0 4px 40px rgba(218, 112, 214, 0.6)",
    statBg: "rgba(0,0,0,0.3)",
    statHigh: "#FF69B4",
    statMid: "#DA70D6",
    statLow: "#8B008B",
  },
};

const sizeMap = {
  small: { w: 160, h: 220, text: "10px", overall: "24px", name: "11px", statLabel: "8px", statValue: "10px" },
  normal: { w: 220, h: 308, text: "11px", overall: "34px", name: "13px", statLabel: "9px", statValue: "12px" },
  large: { w: 280, h: 392, text: "13px", overall: "44px", name: "16px", statLabel: "11px", statValue: "14px" },
};

function getStatColor(value: number, config: typeof qualityConfig.bronze) {
  if (value >= 85) return config.statHigh;
  if (value >= 70) return config.statMid;
  return config.statLow;
}

export function FutCard({ player, size = "normal", showAnimation = true, className }: FutCardProps) {
  const config = qualityConfig[player.cardQuality];
  const isGK = player.position === "GK";
  const s = sizeMap[size];

  const stats = isGK
    ? [
        { label: "DIV", value: player.diving ?? 0 },
        { label: "HAN", value: player.handling ?? 0 },
        { label: "KIC", value: player.kicking ?? 0 },
        { label: "REF", value: player.reflexes ?? 0 },
        { label: "SPD", value: player.pace ?? 0 },
        { label: "POS", value: player.positioning ?? 0 },
      ]
    : [
        { label: "PAC", value: player.pace ?? 0 },
        { label: "SHO", value: player.shooting ?? 0 },
        { label: "PAS", value: player.passing ?? 0 },
        { label: "DRI", value: player.dribbling ?? 0 },
        { label: "DEF", value: player.defending ?? 0 },
        { label: "PHY", value: player.physical ?? 0 },
      ];

  return (
    <div
      className={cn(
        "relative fut-card-outer",
        showAnimation && "fut-card-reveal",
        className
      )}
      style={{
        width: s.w,
        height: s.h,
        filter: `drop-shadow(${config.glow})`,
      }}
    >
      {/* Shield clip container */}
      <div
        className="absolute inset-0 fut-card-shield"
        style={{
          background: config.bg,
          border: `2px solid ${config.border}`,
          borderRadius: "12px 12px 50% 50% / 12px 12px 30% 30%",
        }}
      >
        {/* Diagonal pattern overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)",
            borderRadius: "inherit",
          }}
        />

        {/* Holographic effect (elite only) */}
        {player.cardQuality === "elite" && (
          <div
            className="absolute inset-0 fut-holographic"
            style={{
              background: "linear-gradient(120deg, transparent 0%, rgba(255,0,255,0.15) 20%, rgba(0,255,255,0.15) 40%, rgba(255,255,0,0.1) 60%, rgba(255,0,255,0.15) 80%, transparent 100%)",
              backgroundSize: "200% 200%",
              borderRadius: "inherit",
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* Shine effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)",
            borderRadius: "inherit",
          }}
        />

        {/* Card content */}
        <div className="relative z-10 h-full flex flex-col" style={{ padding: s.w * 0.08 }}>
          {/* Header: Overall + Position + Nation */}
          <div className="flex items-start justify-between" style={{ marginBottom: 4 }}>
            <div className="flex flex-col items-center" style={{ lineHeight: 1 }}>
              <span
                className="font-black"
                style={{
                  fontSize: s.overall,
                  color: config.text,
                  textShadow: `0 2px 4px rgba(0,0,0,0.3)`,
                }}
              >
                {player.overall}
              </span>
              <span
                className="font-bold"
                style={{
                  fontSize: s.text,
                  color: config.text,
                  letterSpacing: "0.05em",
                }}
              >
                {player.position}
              </span>
            </div>

            {/* Nation / Team badges */}
            <div className="flex flex-col gap-1 items-end">
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 3,
                  padding: "2px 6px",
                  fontSize: s.statLabel,
                  fontWeight: 700,
                  color: config.text,
                  letterSpacing: "0.05em",
                }}
              >
                {player.nation?.slice(0, 3).toUpperCase() || "???"}
              </div>
              <div
                style={{
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 3,
                  padding: "2px 6px",
                  fontSize: s.statLabel,
                  fontWeight: 600,
                  color: config.accent,
                  letterSpacing: "0.03em",
                }}
              >
                {player.team?.slice(0, 8).toUpperCase() || "CLUB"}
              </div>
            </div>
          </div>

          {/* Player Face */}
          <div className="flex-1 flex items-center justify-center" style={{ minHeight: 0 }}>
            <div
              style={{
                width: s.w * 0.55,
                height: s.w * 0.55,
                borderRadius: "50%",
                overflow: "hidden",
                border: `2px solid ${config.border}`,
                boxShadow: `0 0 15px ${config.border}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <img
                src={player.faceImageUrl || player.imageUrl}
                alt={player.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=${config.border.slice(1)}&color=fff&size=128&bold=true`;
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          </div>

          {/* Player Name */}
          <div
            className="text-center font-bold truncate"
            style={{
              fontSize: s.name,
              color: config.text,
              padding: "4px 2px",
              textShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          >
            {player.name}
          </div>

          {/* Stats Grid (2 columns x 3 rows) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              marginTop: 4,
            }}
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between"
                style={{
                  background: config.statBg,
                  borderRadius: 3,
                  padding: "2px 5px",
                }}
              >
                <span
                  className="font-bold"
                  style={{
                    fontSize: s.statLabel,
                    color: config.text,
                    opacity: 0.8,
                  }}
                >
                  {stat.label}
                </span>
                <span
                  className="font-black"
                  style={{
                    fontSize: s.statValue,
                    color: getStatColor(stat.value, config),
                  }}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>

          {/* Quality badge */}
          <div className="flex justify-center" style={{ marginTop: 4 }}>
            <div
              className="font-black uppercase"
              style={{
                fontSize: s.statLabel,
                color: config.text,
                background: "rgba(0,0,0,0.25)",
                padding: "1px 8px",
                borderRadius: 2,
                letterSpacing: "0.15em",
              }}
            >
              {player.cardQuality}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Card Reveal Animation Component
 */
export function FutCardReveal({ player, delay = 0 }: { player: Player; delay?: number }) {
  return (
    <div
      className="fut-card-reveal-wrapper"
      style={{
        animation: `futCardRevealIn 0.5s ease-out ${delay}ms both`,
      }}
    >
      <FutCard player={player} showAnimation={false} />
    </div>
  );
}

/**
 * Pack of Cards (for opening animation)
 */
export function FutCardPack({
  players,
  onRevealComplete,
}: {
  players: Player[];
  onRevealComplete?: () => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {players.map((player, index) => (
        <FutCardReveal key={player.name} player={player} delay={index * 150} />
      ))}
    </div>
  );
}
