import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function base(size: number, props: React.SVGProps<SVGSVGElement>): React.SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
    "aria-hidden": "true",
    focusable: "false",
  };
}

export function FirstTradeIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M8 3v4m0 10v4" />
      <rect x="5" y="7" width="6" height="10" rx="1" fill="currentColor" fillOpacity={0.25} />
      <path d="M15 16V6m-3 3 3-3 3 3" />
    </svg>
  );
}

export function RiskTakerIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="12" cy="12" r="1" fill="currentColor" fillOpacity={0.25} />
      <circle cx="16" cy="16" r="1" />
    </svg>
  );
}

export function ActiveTraderIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M4 10V8a3 3 0 0 1 3-3h13m-4-2 4 2-4 3" />
      <path d="M20 14v2a3 3 0 0 1-3 3H4m4-3-4 3 4 2" />
      <path d="M9 10v4m4-4h2v4h-2z" />
    </svg>
  );
}

export function DiversifiedIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M10.5 5.5a7.5 7.5 0 1 0 7.13 5.18L10.5 13Z" />
      <path d="M12.5 11V3.5a7.5 7.5 0 0 1 7.13 5.18Z" fill="currentColor" fillOpacity={0.25} />
      <path d="m10.5 13 4.41 6.07M10.5 13l-4.41 6.07M10.5 13l-7.13-2.32" />
    </svg>
  );
}

export function SectorScoutIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
      <path d="m15.5 8.5-2 5-3-3Z" fill="currentColor" fillOpacity={0.25} />
      <path d="M12 3v2m9 7h-2m-7 9v-2M3 12h2" />
    </svg>
  );
}

export function WatchlistBuilderIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M3 8s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
      <circle cx="12" cy="8" r="2" fill="currentColor" fillOpacity={0.25} />
      <path d="M5 17h1m3 0h10M5 21h1m3 0h10" />
    </svg>
  );
}

export function CashBuilderIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <ellipse cx="16" cy="6" rx="4" ry="2" fill="currentColor" fillOpacity={0.25} />
      <path d="M12 6v13c0 1.1 1.8 2 4 2s4-.9 4-2V6" />
      <path d="M12 10c0 1.1 1.8 2 4 2s4-.9 4-2m-8 4c0 1.1 1.8 2 4 2s4-.9 4-2" />
      <ellipse cx="7" cy="14" rx="4" ry="2" />
      <path d="M3 14v5c0 1.1 1.8 2 4 2s4-.9 4-2v-5" />
    </svg>
  );
}

export function MarketRegularIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4m8-4v4M4 10h16" />
      <path d="m8 15 3 3 5-5" />
    </svg>
  );
}

export function ClosingBellIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M6 11a6 6 0 0 1 12 0v3l2 3H4l2-3Z" />
      <path d="M10 20a2.5 2.5 0 0 0 4 0M12 3v2" />
      <path d="M3 6 4 4m16 0 1 2" />
    </svg>
  );
}

export function SmartInvestorIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M9 17c0-3-4-3.5-4-7a7 7 0 0 1 14 0c0 3.5-4 4-4 7Z" />
      <path d="m8 12 3-3 2 2 3-4m-3 0h3v3" />
      <path d="M9 20h6m-5 1h4" />
    </svg>
  );
}

export function CashDisciplineIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z" />
      <circle cx="12" cy="11" r="3.5" fill="currentColor" fillOpacity={0.25} />
      <path d="M12 9.5v3" />
    </svg>
  );
}

export function HotStreakIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M8 21c-3 0-5-2-5-5 0-2 1.5-4 3-5-.5 2 1 3 2 3 2-3 0-7 2-11 0 4 3 5 4 8" />
      <path d="M10 21v-4h3v4" />
      <path d="M14 21v-7h3v7" />
      <path d="M18 21V11h3v10Z" fill="currentColor" fillOpacity={0.25} />
    </svg>
  );
}

export function MarketMasterIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M5 17 3 6l5 4 4-7 4 7 5-4-2 11Z" />
      <path d="m8 15 3-3 2 2 3-3" />
      <path d="M6 20h12" />
    </svg>
  );
}

export const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<IconProps>> = {
  first_trade: FirstTradeIcon,
  risk_taker: RiskTakerIcon,
  active_trader: ActiveTraderIcon,
  diversified: DiversifiedIcon,
  sector_scout: SectorScoutIcon,
  watchlist_builder: WatchlistBuilderIcon,
  cash_builder: CashBuilderIcon,
  market_regular: MarketRegularIcon,
  closing_bell: ClosingBellIcon,
  smart_investor: SmartInvestorIcon,
  cash_discipline: CashDisciplineIcon,
  hot_streak: HotStreakIcon,
  market_master: MarketMasterIcon,
};
