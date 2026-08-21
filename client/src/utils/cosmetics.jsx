import { Crown, Flame, Gem, Sparkles, Award, ShieldCheck, Coins, Layers, Star, Zap, Shield } from 'lucide-react';

export const COSMETIC_FRAMES = {
  frame_default: {
    id: 'frame_default',
    name: 'Classic Slate',
    rarity: 'COMMON',
    avatarClass: 'bg-brand-gradient text-white ring-1 ring-slate-700 shadow-md',
  },
  frame_neon_cyan: {
    id: 'frame_neon_cyan',
    name: 'Cyberpunk Overdrive',
    rarity: 'RARE',
    avatarClass: 'bg-cyan-950 text-cyan-200 border-2 border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(34,211,238,0.7)] animate-pulse',
  },
  frame_emerald_luck: {
    id: 'frame_emerald_luck',
    name: 'Emerald Dynasty',
    rarity: 'RARE',
    avatarClass: 'bg-emerald-950 text-emerald-200 border-2 border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.7)]',
  },
  frame_gold_royale: {
    id: 'frame_gold_royale',
    name: '24K High Roller Crown',
    rarity: 'EPIC',
    avatarClass: 'bg-gradient-to-br from-amber-500 to-yellow-600 text-slate-950 font-black border-2 border-yellow-200 ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.85)]',
  },
  frame_dragon_inferno: {
    id: 'frame_dragon_inferno',
    name: 'Dragonfire Inferno',
    rarity: 'EPIC',
    avatarClass: 'bg-gradient-to-br from-red-600 via-orange-600 to-amber-600 text-white font-black border-2 border-orange-300 ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse',
  },
  frame_diamond_mythic: {
    id: 'frame_diamond_mythic',
    name: 'Cosmic Prism Diamond',
    rarity: 'LEGENDARY',
    avatarClass: 'bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-500 text-white font-black border-2 border-cyan-200 ring-2 ring-fuchsia-400 shadow-[0_0_35px_rgba(192,132,252,0.95)] animate-pulse',
  },
  frame_void_eclipse: {
    id: 'frame_void_eclipse',
    name: 'Void Eclipse Sovereign (1 Lakh)',
    rarity: 'MYTHIC',
    avatarClass: 'bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-fuchsia-200 font-black border-2 border-fuchsia-400 ring-4 ring-indigo-500/80 shadow-[0_0_40px_rgba(217,70,239,1)] animate-pulse',
  },
  frame_celestial_god: {
    id: 'frame_celestial_god',
    name: 'Celestial Godmode (2.5 Lakh)',
    rarity: 'MYTHIC',
    avatarClass: 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 text-slate-950 font-black border-2 border-white ring-4 ring-yellow-300 shadow-[0_0_45px_rgba(253,224,71,1)] animate-pulse',
  },
  frame_infinite_multiverse: {
    id: 'frame_infinite_multiverse',
    name: 'Infinite Omnipotent (5 Lakh)',
    rarity: 'MYTHIC',
    avatarClass: 'bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-amber-400 text-slate-950 font-black border-2 border-white ring-4 ring-cyan-300 shadow-[0_0_55px_rgba(45,212,191,1)] animate-pulse',
  },
};

export const COSMETIC_TITLES = {
  title_novice: {
    id: 'title_novice',
    name: 'Standard Player',
    badgeText: null,
    badgeClass: '',
    icon: null,
  },
  title_card_shark: {
    id: 'title_card_shark',
    name: 'CARD SHARK',
    badgeText: 'CARD SHARK',
    badgeClass: 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.35)]',
    icon: Layers,
  },
  title_high_roller: {
    id: 'title_high_roller',
    name: 'HIGH ROLLER',
    badgeText: 'HIGH ROLLER',
    badgeClass: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)]',
    icon: Coins,
  },
  title_apex_predator: {
    id: 'title_apex_predator',
    name: 'APEX PREDATOR',
    badgeText: 'APEX PREDATOR',
    badgeClass: 'bg-gradient-to-r from-red-600/35 to-rose-600/35 text-rose-300 border-red-500/70 shadow-[0_0_15px_rgba(244,63,94,0.45)]',
    icon: Flame,
  },
  title_casino_whale: {
    id: 'title_casino_whale',
    name: 'CASINO WHALE',
    badgeText: 'CASINO WHALE',
    badgeClass: 'bg-gradient-to-r from-cyan-500/35 to-blue-600/35 text-cyan-200 border-cyan-400/70 shadow-[0_0_15px_rgba(34,211,238,0.45)]',
    icon: Gem,
  },
  title_grandmaster: {
    id: 'title_grandmaster',
    name: 'GRANDMASTER',
    badgeText: 'GRANDMASTER',
    badgeClass: 'bg-gradient-to-r from-purple-600/40 via-fuchsia-500/40 to-amber-500/40 text-amber-200 border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.6)]',
    icon: Crown,
  },
  title_platform_sovereign: {
    id: 'title_platform_sovereign',
    name: 'PLATFORM SOVEREIGN',
    badgeText: 'SOVEREIGN 100K',
    badgeClass: 'bg-gradient-to-r from-yellow-500/45 via-amber-400/45 to-yellow-600/45 text-yellow-100 border-yellow-300 shadow-[0_0_25px_rgba(253,224,71,0.8)] ring-1 ring-yellow-400/60',
    icon: Sparkles,
  },
  title_immortal_billionaire: {
    id: 'title_immortal_billionaire',
    name: 'IMMORTAL BILLIONAIRE',
    badgeText: 'IMMORTAL VIP',
    badgeClass: 'bg-gradient-to-r from-fuchsia-600/45 via-purple-600/45 to-cyan-500/45 text-fuchsia-100 border-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.9)] ring-1 ring-fuchsia-400/70',
    icon: Award,
  },
  title_casino_overlord: {
    id: 'title_casino_overlord',
    name: 'HOUSE OVERLORD',
    badgeText: 'HOUSE OVERLORD',
    badgeClass: 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-slate-950 border-white shadow-[0_0_35px_rgba(251,191,36,1)] ring-2 ring-amber-300',
    icon: ShieldCheck,
  },
};

export const getEquippedFrame = (frameId) => {
  return COSMETIC_FRAMES[frameId] || COSMETIC_FRAMES.frame_default;
};

export const getEquippedTitle = (titleId) => {
  return COSMETIC_TITLES[titleId] || COSMETIC_TITLES.title_novice;
};

// ── Reusable Component: TitleBadge ───────────────────────────────────────────
export const TitleBadge = ({ titleId, className = '' }) => {
  const title = getEquippedTitle(titleId);
  if (!title || !title.badgeText) return null;

  const Icon = title.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${
        title.badgeClass
      } ${className}`}
    >
      {Icon && <Icon size={10} className="shrink-0 animate-pulse" />}
      <span>{title.badgeText}</span>
    </span>
  );
};
