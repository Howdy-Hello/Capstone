export type RiskLevel = "Low" | "Medium" | "High";
export type MarketTone = "Bullish" | "Bearish" | "Unclear";
export type Importance = "Low" | "Medium" | "High";
export type AnalystRating = "Strong Buy" | "Buy" | "Hold" | "Sell";

export type EventCategory =
  | "earnings"
  | "product"
  | "contract"
  | "lawsuit"
  | "supply"
  | "macro"
  | "rumor"
  | "partnership"
  | "operations"
  | "analyst"
  | "capital"
  | "management"
  | "regulatory"
  | "merger"
  | "labor";

export type NewsConfidence = "Low" | "Medium" | "High";
export type NewsHorizon = "Next session" | "Multi-day";

export type Fundamentals = {
  peRatio: number;
  eps: number;
  revenueGrowth: number;
  profitMargin: number;
  debtToEquity: number;
  dividendYield: number;
  analystRating: AnalystRating;
};

export type StockCompany = {
  stockId: string;
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  description: string;
  startingPrice: number;
  volatility: number;
  trendBias: number;
  riskLevel: RiskLevel;
  isActive: boolean;
  fundamentals: Fundamentals;
};

export type Stock = StockCompany & {
  currentPrice: number;
  previousPrice: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
  eventImpact: number;
};

export type StockPriceHistory = {
  priceId: string;
  stockId: string;
  symbol: string;
  gameDay: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
  change: number;
  changePercent: number;
  eventImpact: number;
  eventId?: string;
};

export type MarketNews = {
  newsId: string;
  gameDay: number;
  source: string;
  headline: string;
  body: string;
  importance: Importance;
  marketTone: MarketTone;
  relatedTickers: string[];
  expectedImpact: number;
  actualImpact: number;
  isAccurate: boolean;
  isRumor: boolean;
  category: EventCategory;
  confidence?: NewsConfidence;
  horizon?: NewsHorizon;
  affectedSectors?: string[];
  arcKey?: string;
  followUpTo?: string;
  branch?: string;
  impactByTicker?: Record<string, {
    expectedImpact: number;
    actualImpact: number;
  }>;
};

export type MarketEventSeedImpact = {
  symbol: string;
  expectedImpact: number;
  actualImpact: number;
};

export type MarketEventSeed = {
  eventKey: string;
  gameDay: number;
  source: string;
  headline: string;
  body: string;
  importance: Importance;
  marketTone: MarketTone;
  category: EventCategory;
  isAccurate: boolean;
  isRumor: boolean;
  arcKey?: string;
  confidence?: NewsConfidence;
  horizon?: NewsHorizon;
  affectedSectors?: string[];
  followUpTo?: string;
  branch?: string;
  impacts: MarketEventSeedImpact[];
};

export type ThirtyDayMarketSeed = {
  schemaVersion: 1;
  gameMode: "limited_30";
  seedCode: string;
  generatedDays: 30;
  storyArcs: string[];
  stocks: StockCompany[];
  prices: StockPriceHistory[];
  events: MarketEventSeed[];
};

export type OpeningStoryDay = {
  gameDay: number;
  title: string;
  summary: string;
  rising: string[];
  falling: string[];
  playerHint: string;
};

export const NEWS_PUBLISHERS = {
  cynTimes: "The CYN Times",
  techInsider: "Tech Insider",
  expedition: "Expedition",
  reddot: "Reddot",
  officialWire: "Company Filing Wire",
  sectorLedger: "Sector Ledger",
  marketPulse: "Market Pulse",
} as const;

// News-credibility mechanic. Reputable outlets report confirmed facts; the rumor
// mill (Reddot) is often first but unreliable. Players learn to weight headlines
// by their source instead of trading every one.
export const PUBLISHER_RELIABILITY: Record<string, number> = {
  [NEWS_PUBLISHERS.cynTimes]: 90,
  [NEWS_PUBLISHERS.techInsider]: 82,
  [NEWS_PUBLISHERS.expedition]: 78,
  [NEWS_PUBLISHERS.reddot]: 44,
  [NEWS_PUBLISHERS.officialWire]: 96,
  [NEWS_PUBLISHERS.sectorLedger]: 86,
  [NEWS_PUBLISHERS.marketPulse]: 72,
};

export type CredibilityRating = "high" | "medium" | "low";

export type NewsCredibility = {
  score: number; // 0–100 estimated reliability of the report
  label: string;
  rating: CredibilityRating;
};

export function getPublisherReliability(source: string): number {
  return PUBLISHER_RELIABILITY[source] ?? 65;
}

// An up-front estimate from OBSERVABLE signals only (source, rumor flag,
// importance) — never from `isAccurate`, which is the hidden truth the player
// discovers through price action.
export function getNewsCredibility(news: MarketNews): NewsCredibility {
  let score = getPublisherReliability(news.source);
  if (news.isRumor) score -= 28;
  if (news.category === "rumor") score -= 8;
  if (news.importance === "High") score += 6;
  else if (news.importance === "Low") score -= 5;

  score = Math.max(8, Math.min(98, Math.round(score)));
  const rating: CredibilityRating = score >= 72 ? "high" : score >= 48 ? "medium" : "low";
  const label = news.isRumor
    ? score >= 50 ? "Developing" : "Speculative"
    : score >= 80 ? "Verified"
    : score >= 60 ? "Reliable"
    : "Unverified";

  return { score, label, rating };
}

export const STORY_DAYS = 3;
export const DEFAULT_MARKET_SEED = "STOCKPILOT";
export const MARKET_SEED_LENGTH = 6;
export const MARKET_SEED_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MARKET_SEED_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MARKET_SEED_NUMBERS = "23456789";

export const openingStoryDays: OpeningStoryDay[] = [
  {
    gameDay: 1,
    title: "Day 1: Tech confidence returns",
    summary:
      "The market opens with optimism around AI software and cybersecurity. Travel stocks start weak because fuel and weather concerns pressure airlines.",
    rising: ["CAI", "CYB", "RBT", "PAP", "ITC"],
    falling: ["SKY", "MIN", "OMG", "FRX"],
    playerHint:
      "Growth stocks start strong, but high-risk names can reverse quickly. Watch the tech names before buying too aggressively.",
  },
  {
    gameDay: 2,
    title: "Day 2: Defensive money rotates in",
    summary:
      "Healthcare, utilities, grocery, and education stocks receive buying interest. A major customer pause also reverses the early optimism around Closed Ai.",
    rising: ["MCH", "AQL", "FDM", "EDU", "C22", "AGR"],
    falling: ["CAI", "GVE", "SKY", "MIN", "SLD"],
    playerHint:
      "Defensive stocks may be safer when the market looks mixed. Look at margins, debt, and dividend yield before deciding.",
  },
  {
    gameDay: 3,
    title: "Day 3: Risk appetite comes back",
    summary:
      "Investors return to higher-growth stocks after strong product and partnership rumors. Luxury and media stocks underperform after valuation concerns.",
    rising: ["CYB", "RBT", "CAI", "GVE", "PAP", "BCL", "SLD"],
    falling: ["LUX", "OMG", "HLW", "URB", "C22", "FRX"],
    playerHint:
      "Momentum is improving, but some stocks may already be expensive. Compare price movement with P/E ratio and revenue growth.",
  },
];

export function getOpeningStoryDays() {
  return openingStoryDays;
}

export const mockStockCompanies: StockCompany[] = [
  {
    stockId: "stock_cai",
    symbol: "CAI",
    name: "Closed Ai",
    sector: "Technology",
    industry: "AI Software",
    description:
      "Fast-growing artificial intelligence software company with strong enterprise demand.",
    startingPrice: 100,
    volatility: 0.035,
    trendBias: 0.0014,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 38.5,
      eps: 3.12,
      revenueGrowth: 24.8,
      profitMargin: 18.4,
      debtToEquity: 0.42,
      dividendYield: 0,
      analystRating: "Buy",
    },
  },
  {
    stockId: "stock_gve",
    symbol: "GVE",
    name: "GreenVolt Energy",
    sector: "Energy",
    industry: "Renewable Energy",
    description:
      "Renewable energy company focused on battery storage and solar infrastructure.",
    startingPrice: 75,
    volatility: 0.03,
    trendBias: 0.0006,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 27.2,
      eps: 2.41,
      revenueGrowth: 16.3,
      profitMargin: 11.7,
      debtToEquity: 0.86,
      dividendYield: 1.1,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_mch",
    symbol: "MCH",
    name: "MediCore Health",
    sector: "Healthcare",
    industry: "Medical Devices",
    description:
      "Healthcare company developing medical devices and diagnostic products.",
    startingPrice: 95,
    volatility: 0.026,
    trendBias: 0.0008,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 24.9,
      eps: 3.82,
      revenueGrowth: 11.4,
      profitMargin: 16.2,
      debtToEquity: 0.51,
      dividendYield: 0.8,
      analystRating: "Buy",
    },
  },
  {
    stockId: "stock_urb",
    symbol: "URB",
    name: "UrbanBank",
    sector: "Finance",
    industry: "Banking",
    description:
      "Regional bank affected by interest rates, loan demand, and economic confidence.",
    startingPrice: 55,
    volatility: 0.018,
    trendBias: 0.0004,
    riskLevel: "Low",
    isActive: true,
    fundamentals: {
      peRatio: 12.8,
      eps: 4.31,
      revenueGrowth: 5.7,
      profitMargin: 22.1,
      debtToEquity: 1.35,
      dividendYield: 3.2,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_pap",
    symbol: "PAP",
    name: "PineApple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics",
    description:
      "Premium consumer electronics company with strong brand loyalty and product cycles.",
    startingPrice: 200,
    volatility: 0.038,
    trendBias: 0.001,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 31.4,
      eps: 6.28,
      revenueGrowth: 13.9,
      profitMargin: 21.8,
      debtToEquity: 0.31,
      dividendYield: 0.6,
      analystRating: "Buy",
    },
  },
  {
    stockId: "stock_aql",
    symbol: "AQL",
    name: "AquaLife Systems",
    sector: "Utilities",
    industry: "Water Infrastructure",
    description:
      "Water purification and infrastructure company serving cities, factories, and public utilities.",
    startingPrice: 42,
    volatility: 0.017,
    trendBias: 0.0005,
    riskLevel: "Low",
    isActive: true,
    fundamentals: {
      peRatio: 18.6,
      eps: 2.26,
      revenueGrowth: 6.4,
      profitMargin: 12.6,
      debtToEquity: 0.72,
      dividendYield: 2.7,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_fdm",
    symbol: "FDM",
    name: "FoodMart Global",
    sector: "Consumer",
    industry: "Retail Grocery",
    description:
      "Large grocery and consumer staples chain with stable revenue and defensive demand.",
    startingPrice: 68,
    volatility: 0.015,
    trendBias: 0.0004,
    riskLevel: "Low",
    isActive: true,
    fundamentals: {
      peRatio: 19.3,
      eps: 3.52,
      revenueGrowth: 4.9,
      profitMargin: 7.4,
      debtToEquity: 0.64,
      dividendYield: 2.4,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_sky",
    symbol: "SKY",
    name: "SkyBridge Airlines",
    sector: "Travel",
    industry: "Airlines",
    description:
      "Airline company affected by fuel costs, tourism demand, weather disruption, and economic cycles.",
    startingPrice: 88,
    volatility: 0.041,
    trendBias: -0.0001,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 17.8,
      eps: 2.14,
      revenueGrowth: 8.8,
      profitMargin: 4.6,
      debtToEquity: 1.92,
      dividendYield: 0,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_cyb",
    symbol: "CYB",
    name: "CyberFort Systems",
    sector: "Technology",
    industry: "Cybersecurity",
    description:
      "Cybersecurity platform protecting enterprise networks, payments, and cloud systems.",
    startingPrice: 132,
    volatility: 0.034,
    trendBias: 0.0012,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 42.6,
      eps: 2.84,
      revenueGrowth: 28.1,
      profitMargin: 15.9,
      debtToEquity: 0.28,
      dividendYield: 0,
      analystRating: "Strong Buy",
    },
  },
  {
    stockId: "stock_rbt",
    symbol: "RBT",
    name: "RoboWorks Automation",
    sector: "Industrials",
    industry: "Robotics",
    description:
      "Automation and robotics company serving factories, warehouses, and logistics operators.",
    startingPrice: 118,
    volatility: 0.032,
    trendBias: 0.001,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 29.7,
      eps: 3.44,
      revenueGrowth: 18.6,
      profitMargin: 13.8,
      debtToEquity: 0.58,
      dividendYield: 0.4,
      analystRating: "Buy",
    },
  },
  {
    stockId: "stock_omg",
    symbol: "OMG",
    name: "OmniMedia Group",
    sector: "Communication",
    industry: "Streaming Media",
    description:
      "Streaming and digital media company competing for subscribers, content rights, and advertising revenue.",
    startingPrice: 64,
    volatility: 0.036,
    trendBias: 0.0002,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 34.1,
      eps: 1.76,
      revenueGrowth: 10.9,
      profitMargin: 8.2,
      debtToEquity: 1.18,
      dividendYield: 0,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_hlw",
    symbol: "HLW",
    name: "Mount. Para Pictures",
    sector: "Communication",
    industry: "Movie Studio",
    description:
      "Film and television studio whose performance depends on box-office releases, production costs, licensing, and streaming partnerships.",
    startingPrice: 72,
    volatility: 0.041,
    trendBias: 0.0004,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 28.6,
      eps: 2.31,
      revenueGrowth: 8.7,
      profitMargin: 7.4,
      debtToEquity: 1.26,
      dividendYield: 0,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_lux",
    symbol: "LUX",
    name: "LuxeWear Holdings",
    sector: "Consumer",
    industry: "Luxury Apparel",
    description:
      "Luxury fashion and accessories company driven by brand power and premium consumer spending.",
    startingPrice: 146,
    volatility: 0.027,
    trendBias: 0.0007,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 25.4,
      eps: 5.22,
      revenueGrowth: 9.6,
      profitMargin: 19.5,
      debtToEquity: 0.46,
      dividendYield: 1.3,
      analystRating: "Buy",
    },
  },
  {
    stockId: "stock_min",
    symbol: "MIN",
    name: "TerraMine Resources",
    sector: "Materials",
    industry: "Mining",
    description:
      "Mining company exposed to commodity cycles, infrastructure demand, and global supply conditions.",
    startingPrice: 73,
    volatility: 0.039,
    trendBias: 0.0001,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 10.9,
      eps: 6.18,
      revenueGrowth: 3.7,
      profitMargin: 14.2,
      debtToEquity: 0.97,
      dividendYield: 3.6,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_hom",
    symbol: "C22",
    name: "Century 22",
    sector: "Real Estate",
    industry: "Residential REIT",
    description:
      "Residential real estate trust focused on rental housing, property income, and interest-rate sensitivity.",
    startingPrice: 51,
    volatility: 0.021,
    trendBias: 0.0003,
    riskLevel: "Low",
    isActive: true,
    fundamentals: {
      peRatio: 15.7,
      eps: 2.94,
      revenueGrowth: 4.3,
      profitMargin: 24.8,
      debtToEquity: 1.54,
      dividendYield: 4.1,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_edu",
    symbol: "EDU",
    name: "EduSpark Learning",
    sector: "Education",
    industry: "Online Learning",
    description:
      "Digital education platform offering online courses, tutoring tools, and career certification programs.",
    startingPrice: 37,
    volatility: 0.028,
    trendBias: 0.0009,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 22.5,
      eps: 1.38,
      revenueGrowth: 17.2,
      profitMargin: 10.3,
      debtToEquity: 0.39,
      dividendYield: 0,
      analystRating: "Buy",
    },
  },
  {
    stockId: "stock_itc",
    symbol: "ITC",
    name: "Inter Corporation",
    sector: "Technology",
    industry: "Semiconductors",
    description:
      "Chip designer building processors for AI servers, edge devices, and high-performance computing clusters.",
    startingPrice: 164,
    volatility: 0.043,
    trendBias: 0.0013,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 46.8,
      eps: 3.57,
      revenueGrowth: 31.6,
      profitMargin: 20.4,
      debtToEquity: 0.34,
      dividendYield: 0,
      analystRating: "Strong Buy",
    },
  },
  {
    stockId: "stock_bcl",
    symbol: "BCL",
    name: "BioCloud Labs",
    sector: "Healthcare",
    industry: "Biotechnology",
    description:
      "Biotechnology company using cloud-based research tools to develop targeted therapies and diagnostics.",
    startingPrice: 58,
    volatility: 0.045,
    trendBias: 0.0009,
    riskLevel: "High",
    isActive: true,
    fundamentals: {
      peRatio: 0,
      eps: -0.82,
      revenueGrowth: 22.7,
      profitMargin: -8.6,
      debtToEquity: 0.67,
      dividendYield: 0,
      analystRating: "Buy",
    },
  },
  {
    stockId: "stock_frx",
    symbol: "FRX",
    name: "FreightFlex Logistics",
    sector: "Industrials",
    industry: "Freight Logistics",
    description:
      "Shipping and freight network operator sensitive to fuel costs, port delays, labor availability, and retail demand.",
    startingPrice: 84,
    volatility: 0.029,
    trendBias: 0.0002,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 16.5,
      eps: 4.74,
      revenueGrowth: 7.8,
      profitMargin: 6.9,
      debtToEquity: 1.08,
      dividendYield: 1.6,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_agr",
    symbol: "AGR",
    name: "AgriPure Foods",
    sector: "Consumer",
    industry: "Packaged Foods",
    description:
      "Packaged food producer with stable grocery demand, commodity-cost exposure, and expanding private-label contracts.",
    startingPrice: 49,
    volatility: 0.018,
    trendBias: 0.0004,
    riskLevel: "Low",
    isActive: true,
    fundamentals: {
      peRatio: 17.2,
      eps: 2.78,
      revenueGrowth: 5.6,
      profitMargin: 9.1,
      debtToEquity: 0.59,
      dividendYield: 2.9,
      analystRating: "Hold",
    },
  },
  {
    stockId: "stock_sld",
    symbol: "SLD",
    name: "SolarDawn Infrastructure",
    sector: "Energy",
    industry: "Solar Infrastructure",
    description:
      "Utility-scale solar developer whose projects depend on grid approvals, panel costs, tax credits, and financing rates.",
    startingPrice: 62,
    volatility: 0.033,
    trendBias: 0.0007,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 28.9,
      eps: 1.95,
      revenueGrowth: 19.4,
      profitMargin: 8.7,
      debtToEquity: 1.21,
      dividendYield: 0.5,
      analystRating: "Buy",
    },
  },
];

const hardcodedFirstThreeDayCloses: Record<string, Record<number, number>> = {
  CAI: { 1: 104.8, 2: 99.95, 3: 102.1 },
  GVE: { 1: 75.6, 2: 73.85, 3: 77.9 },
  MCH: { 1: 95.9, 2: 100.45, 3: 99.1 },
  URB: { 1: 55.45, 2: 56.25, 3: 55.4 },
  PAP: { 1: 207.8, 2: 210.1, 3: 216.75 },
  AQL: { 1: 42.4, 2: 43.85, 3: 44.05 },
  FDM: { 1: 68.55, 2: 70.15, 3: 70.35 },
  SKY: { 1: 84.1, 2: 81.85, 3: 83.2 },
  CYB: { 1: 138.8, 2: 141.25, 3: 150.4 },
  RBT: { 1: 121.75, 2: 122.3, 3: 129.6 },
  OMG: { 1: 62.2, 2: 63.1, 3: 60.95 },
  HLW: { 1: 73.15, 2: 74.05, 3: 69.8 },
  LUX: { 1: 147.4, 2: 149.1, 3: 144.8 },
  MIN: { 1: 70.55, 2: 68.9, 3: 69.3 },
  C22: { 1: 51.2, 2: 52.55, 3: 51.65 },
  EDU: { 1: 37.35, 2: 39.15, 3: 40.05 },
  ITC: { 1: 171.4, 2: 173.25, 3: 181.9 },
  BCL: { 1: 57.2, 2: 59.05, 3: 63.4 },
  FRX: { 1: 81.3, 2: 80.6, 3: 78.95 },
  AGR: { 1: 49.45, 2: 50.85, 3: 51.15 },
  SLD: { 1: 62.35, 2: 60.8, 3: 64.2 },
};

const hardcodedOpeningNews: MarketNews[] = [
  {
    newsId: "story_day1_cai_ai_demand",
    gameDay: 1,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "Closed Ai reports more paying AI software customers",
    body:
      "Closed Ai's company update says more businesses are paying for its software after trial periods, and existing customers are buying larger subscriptions. That could add regular sales income. Research spending remains high, so more customers will not necessarily mean more profit.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["CAI"],
    expectedImpact: 0.06,
    actualImpact: 0.048,
    isAccurate: true,
    isRumor: false,
    category: "product",
  },
  {
    newsId: "story_day1_cyb_security_spending",
    gameDay: 1,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "Company survey points to larger cybersecurity budgets",
    body:
      "A survey of business customers reports larger budgets for protecting cloud software. CyberFort sells security subscriptions and could gain new or larger contracts. Budgets are spending plans, however; customers still need to choose suppliers and sign orders.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["CYB"],
    expectedImpact: 0.055,
    actualImpact: 0.052,
    isAccurate: true,
    isRumor: false,
    category: "macro",
  },
  {
    newsId: "story_day1_sky_fuel_pressure",
    gameDay: 1,
    source: NEWS_PUBLISHERS.expedition,
    headline: "SkyBridge faces higher fuel bills and weather delays",
    body:
      "Fuel-price reports show jet fuel becoming more expensive, while weather delays affect several SkyBridge routes. Fuel and disruption costs could leave less profit from each ticket. Raising fares might cover some costs, but could also discourage customers from flying.",
    importance: "High",
    marketTone: "Bearish",
    relatedTickers: ["SKY"],
    expectedImpact: -0.055,
    actualImpact: -0.044,
    isAccurate: true,
    isRumor: false,
    category: "macro",
  },
  {
    newsId: "story_day1_itc_chip_orders",
    gameDay: 1,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "Suppliers report larger Inter Corporation chip orders",
    body:
      "Component suppliers say Inter Corporation has reserved more factory capacity for its next AI chip. This suggests the company expects more customer orders. Reservations are not completed sales, and shortages or production delays could still limit deliveries.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["ITC"],
    expectedImpact: 0.052,
    actualImpact: 0.045,
    isAccurate: true,
    isRumor: false,
    category: "supply",
  },
  {
    newsId: "story_day1_frx_port_delays",
    gameDay: 1,
    source: NEWS_PUBLISHERS.expedition,
    headline: "FreightFlex warns customers of delivery delays",
    body:
      "FreightFlex's customer notice warns that busy ports and driver shortages could delay deliveries. Missed delivery deadlines may trigger penalties, leaving less profit from its contracts. The size of the cost depends on how long the delays last.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["FRX"],
    expectedImpact: -0.038,
    actualImpact: -0.032,
    isAccurate: true,
    isRumor: false,
    category: "operations",
  },
  {
    newsId: "story_day2_cai_customer_pause",
    gameDay: 2,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Closed Ai's largest customer pauses a planned expansion",
    body:
      "Closed Ai confirms that its largest business customer has paused a planned expansion to review costs and data protection. Existing subscriptions remain active, but expected new sales may arrive later. This weakens yesterday's growth story without cancelling all of the customer's business.",
    importance: "High",
    marketTone: "Bearish",
    relatedTickers: ["CAI"],
    expectedImpact: -0.065,
    actualImpact: -0.046,
    isAccurate: true,
    isRumor: false,
    category: "contract",
  },
  {
    newsId: "story_day2_mch_product_approval",
    gameDay: 2,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "MediCore receives approval for a new diagnostic scanner",
    body:
      "A regulatory approval allows MediCore to sell a diagnostic scanner to regional clinics. The product could create new sales, but clinics have not yet placed enough orders to establish demand. Launch costs will also affect how much profit MediCore earns.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["MCH"],
    expectedImpact: 0.065,
    actualImpact: 0.047,
    isAccurate: true,
    isRumor: false,
    category: "product",
  },
  {
    newsId: "story_day2_aql_city_contract",
    gameDay: 2,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "AquaLife wins city water infrastructure contract",
    body:
      "A city contract announcement names AquaLife as the supplier for a multi-year water project. The signed deal adds expected sales and could help it win other city contracts. Equipment and labour costs will determine how much of that income becomes profit.",
    importance: "Medium",
    marketTone: "Bullish",
    relatedTickers: ["AQL"],
    expectedImpact: 0.04,
    actualImpact: 0.034,
    isAccurate: true,
    isRumor: false,
    category: "contract",
  },
  {
    newsId: "story_day2_gve_demand_warning",
    gameDay: 2,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Utility customers delay GreenVolt project purchases",
    body:
      "Utility customers have delayed decisions on energy-storage projects, prompting analysts to lower GreenVolt sales forecasts. Fewer immediate orders could reduce income while development costs continue. The customers have delayed purchases rather than ruled out future projects.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["GVE"],
    expectedImpact: -0.035,
    actualImpact: -0.023,
    isAccurate: true,
    isRumor: false,
    category: "macro",
  },
  {
    newsId: "story_day2_agr_grocery_contract",
    gameDay: 2,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "AgriPure signs a grocery-chain supply agreement",
    body:
      "AgriPure announced a signed agreement to supply frozen meals and pantry staples to a national grocery chain. Regular food orders could support steadier sales while shoppers cut optional purchases. Ingredient and delivery costs will still affect profit.",
    importance: "Medium",
    marketTone: "Bullish",
    relatedTickers: ["AGR"],
    expectedImpact: 0.028,
    actualImpact: 0.029,
    isAccurate: true,
    isRumor: false,
    category: "contract",
  },
  {
    newsId: "story_day2_sld_grid_delay",
    gameDay: 2,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "SolarDawn projects wait longer for grid approval",
    body:
      "SolarDawn disclosed approval delays for connecting two large projects to the electricity grid. Until connected, the projects cannot begin their planned power sales, while financing costs may continue. The projects are delayed, not cancelled; watch for a revised connection date.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["SLD"],
    expectedImpact: -0.031,
    actualImpact: -0.025,
    isAccurate: true,
    isRumor: false,
    category: "operations",
  },
  {
    newsId: "story_day3_cai_audit_update",
    gameDay: 3,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "Independent review finds no major Closed Ai data-control failures",
    body:
      "An independent review found no major data-protection failures in Closed Ai's platform. That addresses one concern behind the customer pause reported yesterday. The customer has not restarted its expansion, so the review improves the evidence without restoring the delayed sales yet.",
    importance: "Medium",
    marketTone: "Bullish",
    relatedTickers: ["CAI"],
    expectedImpact: 0.025,
    actualImpact: 0.022,
    isAccurate: true,
    isRumor: false,
    category: "operations",
  },
  {
    newsId: "story_day3_rbt_factory_contract",
    gameDay: 3,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "RoboWorks wins warehouse automation deal",
    body:
      "RoboWorks announced a signed contract to supply warehouse robots and ongoing maintenance to a large delivery operator. Equipment sales could add income now and maintenance could add regular income later. Installation costs and delivery deadlines remain important.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["RBT"],
    expectedImpact: 0.055,
    actualImpact: 0.06,
    isAccurate: true,
    isRumor: false,
    category: "contract",
  },
  {
    newsId: "story_day3_pap_product_cycle",
    gameDay: 3,
    source: NEWS_PUBLISHERS.reddot,
    headline: "Unnamed suppliers suggest stronger PineApple device demand",
    body:
      "Unnamed suppliers claim orders are increasing ahead of PineApple's next device launch. Neither PineApple nor the suppliers have publicly confirmed the order figures. More demand could help sales if the report is true, but high prices may deter customers whose household budgets are tight.",
    importance: "Medium",
    marketTone: "Bullish",
    relatedTickers: ["PAP"],
    expectedImpact: 0.04,
    actualImpact: 0.032,
    isAccurate: true,
    isRumor: true,
    category: "product",
  },
  {
    newsId: "story_day3_omg_content_costs",
    gameDay: 3,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "OmniMedia faces higher costs for films and programmes",
    body:
      "Analysts reviewing OmniMedia's spending plans warn that producing and buying programmes is becoming more expensive. Subscriber numbers are still growing, but extra spending may consume that additional income. Watch whether subscription sales grow faster than content costs.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["OMG"],
    expectedImpact: -0.035,
    actualImpact: -0.034,
    isAccurate: true,
    isRumor: false,
    category: "operations",
  },
  {
    newsId: "story_day3_hlw_production_costs",
    gameDay: 3,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Mount. Para Pictures reports higher film-production costs",
    body:
      "Mount. Para Pictures reports higher filming and advertising costs for upcoming releases. It will need stronger ticket sales to keep the same profit. Audience interest is encouraging, but interest before release does not guarantee enough paying viewers.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["HLW"],
    expectedImpact: -0.049,
    actualImpact: -0.057,
    isAccurate: true,
    isRumor: false,
    category: "operations",
  },
  {
    newsId: "story_day3_bcl_trial_update",
    gameDay: 3,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "BioCloud reports encouraging results from a small trial",
    body:
      "BioCloud's study release reports more patients responding to its experimental treatment than in an earlier trial. This supports further research, but the study is small and does not establish that the therapy will succeed in larger trials or receive approval. Future treatment sales remain uncertain.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["BCL"],
    expectedImpact: 0.071,
    actualImpact: 0.093,
    isAccurate: true,
    isRumor: false,
    category: "product",
  },
  {
    newsId: "story_day3_sld_tax_credit_report",
    gameDay: 3,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Policy clarification may preserve SolarDawn tax credits",
    body:
      "A published policy clarification suggests SolarDawn's delayed projects may still qualify for clean-energy tax credits. Keeping that support could reduce the amount the company must finance itself. The grid-connection delays reported yesterday remain unresolved, and eligibility still needs confirmation.",
    importance: "Medium",
    marketTone: "Bullish",
    relatedTickers: ["SLD"],
    expectedImpact: 0.047,
    actualImpact: 0.056,
    isAccurate: true,
    isRumor: false,
    category: "macro",
  },
  {
    newsId: "story_day3_frx_retail_volume_warning",
    gameDay: 3,
    source: NEWS_PUBLISHERS.expedition,
    headline: "Retail customers lower FreightFlex shipment forecasts",
    body:
      "Several retail customers lowered the number of deliveries they expect to need next month. FreightFlex could earn less while still paying for warehouses, vehicles, and staff. Finding replacement customers or reducing costs could soften the impact.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["FRX"],
    expectedImpact: -0.042,
    actualImpact: -0.021,
    isAccurate: true,
    isRumor: false,
    category: "macro",
  },
];

const gasPriceStoryNews: MarketNews[] = [
  {
    newsId: "arc_gas_day4_supply_warning",
    gameDay: 4,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Oil supply warning pushes fuel markets higher",
    body:
      "Fuel distributors report refinery problems and shipping delays that could limit supply for several weeks. Higher fuel prices increase airline and freight costs. GreenVolt and SolarDawn could attract customers seeking alternatives, but new energy projects take time to deliver.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["GVE", "SLD", "SKY", "FRX"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      GVE: { expectedImpact: 0.026, actualImpact: 0.025 },
      SLD: { expectedImpact: 0.019, actualImpact: 0.018 },
      SKY: { expectedImpact: -0.028, actualImpact: -0.025 },
      FRX: { expectedImpact: -0.017, actualImpact: -0.015 },
    },
  },
  {
    newsId: "arc_gas_day6_pump_prices_climb",
    gameDay: 6,
    source: NEWS_PUBLISHERS.expedition,
    headline: "Drivers face higher gas prices as travel demand grows",
    body:
      "Fuel-price surveys show higher prices as travel demand meets limited supply. SkyBridge and FreightFlex would spend more running their routes. Households may cut clothing and other purchases to cover fuel bills, while demand for alternative energy could help GreenVolt and SolarDawn.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["GVE", "SLD", "SKY", "FRX", "LUX", "FDM", "AGR"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      GVE: { expectedImpact: 0.037, actualImpact: 0.035 },
      SLD: { expectedImpact: 0.027, actualImpact: 0.025 },
      SKY: { expectedImpact: -0.049, actualImpact: -0.045 },
      FRX: { expectedImpact: -0.034, actualImpact: -0.03 },
      LUX: { expectedImpact: -0.02, actualImpact: -0.018 },
      FDM: { expectedImpact: -0.009, actualImpact: -0.008 },
      AGR: { expectedImpact: -0.007, actualImpact: -0.006 },
    },
  },
  {
    newsId: "arc_gas_day8_airline_pressure",
    gameDay: 8,
    source: NEWS_PUBLISHERS.expedition,
    headline: "Fuel costs put pressure on travel companies",
    body:
      "Airlines warn that higher fuel bills will consume more ticket revenue unless fares rise. Higher fares could also discourage travel. SkyBridge faces the clearest cost pressure, FreightFlex faces a similar delivery-cost problem, and alternative-energy suppliers may benefit if customers seek cheaper options.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["SKY", "FRX", "GVE"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      SKY: { expectedImpact: -0.069, actualImpact: -0.065 },
      FRX: { expectedImpact: -0.028, actualImpact: -0.025 },
      GVE: { expectedImpact: 0.022, actualImpact: 0.02 },
    },
  },
  {
    newsId: "arc_gas_day10_delivery_surcharges",
    gameDay: 10,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Delivery firms add fuel surcharges as gas prices rise",
    body:
      "Delivery companies announced extra fuel charges, but customer contracts limit how quickly they can recover higher costs. FreightFlex may still keep less profit per delivery. FoodMart, AgriPure, and LuxeWear also face higher shipping bills and may lose sales if they pass the cost to customers.",
    importance: "Medium",
    marketTone: "Unclear",
    relatedTickers: ["FRX", "FDM", "AGR", "LUX"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "operations",
    impactByTicker: {
      FRX: { expectedImpact: -0.031, actualImpact: -0.028 },
      FDM: { expectedImpact: -0.016, actualImpact: -0.014 },
      AGR: { expectedImpact: -0.014, actualImpact: -0.012 },
      LUX: { expectedImpact: -0.023, actualImpact: -0.02 },
    },
  },
  {
    newsId: "arc_gas_day13_government_response",
    gameDay: 13,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Officials weigh emergency measures to cool gas prices",
    body:
      "Officials are considering releasing fuel reserves and temporarily cutting fuel taxes. If adopted, the measures could lower SkyBridge and FreightFlex operating costs and leave households more spending money. Cheaper fuel could also reduce interest in GreenVolt and SolarDawn alternatives. The measures have not been approved.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["GVE", "SLD", "SKY", "FRX", "LUX"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      GVE: { expectedImpact: -0.028, actualImpact: -0.025 },
      SLD: { expectedImpact: -0.02, actualImpact: -0.018 },
      SKY: { expectedImpact: 0.032, actualImpact: 0.03 },
      FRX: { expectedImpact: 0.02, actualImpact: 0.018 },
      LUX: { expectedImpact: 0.014, actualImpact: 0.012 },
    },
  },
  {
    newsId: "arc_gas_day16_prices_ease",
    gameDay: 16,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Gas prices begin to ease after weeks of pressure",
    body:
      "Fuel-price surveys and distributor reports show supplies improving and pump prices easing. SkyBridge and FreightFlex could spend less on fuel, while households would have more room for food and clothing purchases. Cheaper fuel may weaken demand for GreenVolt and SolarDawn alternatives. Continued supply recovery remains important.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["SKY", "FRX", "LUX", "FDM", "AGR", "GVE", "SLD"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      SKY: { expectedImpact: 0.048, actualImpact: 0.045 },
      FRX: { expectedImpact: 0.032, actualImpact: 0.03 },
      LUX: { expectedImpact: 0.02, actualImpact: 0.018 },
      FDM: { expectedImpact: 0.011, actualImpact: 0.01 },
      AGR: { expectedImpact: 0.011, actualImpact: 0.01 },
      GVE: { expectedImpact: -0.022, actualImpact: -0.02 },
      SLD: { expectedImpact: -0.014, actualImpact: -0.012 },
    },
  },
];

const cyberBreachStoryNews: MarketNews[] = [
  {
    newsId: "arc_cyber_day18_payment_breach",
    gameDay: 18,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "Payment breach raises cybersecurity spending expectations",
    body:
      "Retailers confirmed a payment-network breach and began security reviews. FoodMart, LuxeWear, and UrbanBank could face refunds, fraud losses, and repair costs. CyberFort could receive more security-software orders, although reviews do not automatically turn into signed contracts.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["CYB", "FDM", "URB", "LUX"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "operations",
    impactByTicker: {
      CYB: { expectedImpact: 0.052, actualImpact: 0.05 },
      FDM: { expectedImpact: -0.021, actualImpact: -0.019 },
      URB: { expectedImpact: -0.016, actualImpact: -0.014 },
      LUX: { expectedImpact: -0.013, actualImpact: -0.012 },
    },
  },
  {
    newsId: "arc_cyber_day20_security_contracts",
    gameDay: 20,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "Companies rush to sign new security contracts",
    body:
      "Company announcements confirm new security contracts after the payment breach widened. CyberFort and Closed Ai may gain sales from monitoring tools. OmniMedia and UrbanBank face additional account-protection costs. Watch whether software suppliers can deliver the work profitably and affected firms can limit further damage.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["CYB", "CAI", "OMG", "URB"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "contract",
    impactByTicker: {
      CYB: { expectedImpact: 0.064, actualImpact: 0.06 },
      CAI: { expectedImpact: 0.029, actualImpact: 0.027 },
      OMG: { expectedImpact: -0.026, actualImpact: -0.024 },
      URB: { expectedImpact: -0.012, actualImpact: -0.01 },
    },
  },
  {
    newsId: "arc_cyber_day24_breach_contained",
    gameDay: 24,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Breach fallout eases as firms report containment",
    body:
      "Investigators report that the payment breach appears contained. FoodMart, LuxeWear, and UrbanBank may face fewer additional losses and less disruption to customer spending. CyberFort and Closed Ai could receive fewer emergency orders than previously expected. Firms still need to disclose the final cost of repairs.",
    importance: "Medium",
    marketTone: "Unclear",
    relatedTickers: ["FDM", "URB", "LUX", "CYB", "CAI"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "operations",
    impactByTicker: {
      FDM: { expectedImpact: 0.022, actualImpact: 0.02 },
      URB: { expectedImpact: 0.018, actualImpact: 0.016 },
      LUX: { expectedImpact: 0.016, actualImpact: 0.014 },
      CYB: { expectedImpact: -0.031, actualImpact: -0.028 },
      CAI: { expectedImpact: -0.012, actualImpact: -0.01 },
    },
  },
];

const rateCycleStoryNews: MarketNews[] = [
  {
    newsId: "arc_rates_day19_inflation_hot",
    gameDay: 19,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Hot inflation data pressures rate-sensitive stocks",
    body:
      "The latest inflation release is above forecasts, making an early interest-rate cut less likely. Higher borrowing costs can make Century 22 property and SolarDawn projects harder to finance, and leave PineApple and Inter Corporation customers less money for purchases. UrbanBank may earn more interest on loans, but could also face more missed repayments.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["URB", "C22", "SLD", "PAP", "ITC"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      URB: { expectedImpact: 0.03, actualImpact: 0.028 },
      C22: { expectedImpact: -0.041, actualImpact: -0.038 },
      SLD: { expectedImpact: -0.032, actualImpact: -0.03 },
      PAP: { expectedImpact: -0.022, actualImpact: -0.02 },
      ITC: { expectedImpact: -0.026, actualImpact: -0.024 },
    },
  },
  {
    newsId: "arc_rates_day22_mortgage_slowdown",
    gameDay: 22,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Mortgage demand slows as financing costs bite",
    body:
      "Mortgage and housing-visit data show weaker demand as financing costs rise. Slower property activity could reduce Century 22 growth and UrbanBank lending revenue. FoodMart groceries and AquaLife water services may retain steadier demand because households still need essentials. These businesses remain exposed to their own costs.",
    importance: "Medium",
    marketTone: "Unclear",
    relatedTickers: ["C22", "AQL", "FDM", "URB"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      C22: { expectedImpact: -0.048, actualImpact: -0.045 },
      AQL: { expectedImpact: 0.015, actualImpact: 0.014 },
      FDM: { expectedImpact: 0.012, actualImpact: 0.011 },
      URB: { expectedImpact: -0.011, actualImpact: -0.01 },
    },
  },
  {
    newsId: "arc_rates_day27_policy_pause",
    gameDay: 27,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Policy makers signal patience after growth cools",
    body:
      "Officials say they could pause further rate increases if inflation keeps slowing. That would ease financing concerns for Century 22 and SolarDawn and spending pressure on technology customers. UrbanBank might earn less extra interest than previously expected. A pause has not yet been promised.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["C22", "SLD", "PAP", "ITC", "URB"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      C22: { expectedImpact: 0.046, actualImpact: 0.043 },
      SLD: { expectedImpact: 0.035, actualImpact: 0.033 },
      PAP: { expectedImpact: 0.02, actualImpact: 0.018 },
      ITC: { expectedImpact: 0.023, actualImpact: 0.021 },
      URB: { expectedImpact: -0.021, actualImpact: -0.019 },
    },
  },
];

const healthcareTrialStoryNews: MarketNews[] = [
  {
    newsId: "arc_health_day21_trial_success",
    gameDay: 21,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Medical trial data lifts health innovation stocks",
    body:
      "BioCloud's trial release reports encouraging patient results for a new therapy. Success in larger studies could create future sales for BioCloud and diagnostic orders for MediCore. EduSpark may attract interest in its health-training services if development expands. The therapy is not approved, and larger trials could produce different results.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["BCL", "MCH", "EDU"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "product",
    impactByTicker: {
      BCL: { expectedImpact: 0.083, actualImpact: 0.078 },
      MCH: { expectedImpact: 0.026, actualImpact: 0.024 },
      EDU: { expectedImpact: 0.01, actualImpact: 0.009 },
    },
  },
  {
    newsId: "arc_health_day25_review_questions",
    gameDay: 25,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "Regulators ask follow-up questions on trial design",
    body:
      "Regulators have asked BioCloud for more detail about patient selection and monitoring. Answering could take time and add research costs, although the trial has not been stopped. MediCore may receive more diagnostic-monitoring work, while AquaLife's water-service income is less tied to trial approvals.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["BCL", "MCH", "AQL"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "macro",
    impactByTicker: {
      BCL: { expectedImpact: -0.061, actualImpact: -0.057 },
      MCH: { expectedImpact: 0.016, actualImpact: 0.014 },
      AQL: { expectedImpact: 0.009, actualImpact: 0.008 },
    },
  },
  {
    newsId: "arc_health_day29_partner_funding",
    gameDay: 29,
    source: NEWS_PUBLISHERS.techInsider,
    headline: "BioCloud secures partner funding for next trial phase",
    body:
      "BioCloud announced a funding agreement for its next trial phase. This reduces the immediate need to sell more shares, which would shrink existing investors' ownership percentage. MediCore may gain diagnostic work, with possible training and software demand for EduSpark and Closed Ai. Funding does not guarantee a successful trial.",
    importance: "High",
    marketTone: "Unclear",
    relatedTickers: ["BCL", "MCH", "EDU", "CAI"],
    expectedImpact: 0,
    actualImpact: 0,
    isAccurate: true,
    isRumor: false,
    category: "partnership",
    impactByTicker: {
      BCL: { expectedImpact: 0.067, actualImpact: 0.063 },
      MCH: { expectedImpact: 0.024, actualImpact: 0.022 },
      EDU: { expectedImpact: 0.018, actualImpact: 0.016 },
      CAI: { expectedImpact: 0.014, actualImpact: 0.012 },
    },
  },
];

function arcEvent(
  newsId: string, gameDay: number, headline: string, body: string,
  category: EventCategory, impacts: Record<string, number>, source: string = NEWS_PUBLISHERS.marketPulse
): MarketNews {
  const relatedTickers = Object.keys(impacts);
  const impactByTicker = Object.fromEntries(relatedTickers.map((symbol) => [symbol, {
    expectedImpact: impacts[symbol], actualImpact: impacts[symbol] * 0.9,
  }]));
  return {
    newsId, gameDay, source, headline, body, importance: "High", marketTone: "Unclear",
    relatedTickers, expectedImpact: 0, actualImpact: 0, isAccurate: true, isRumor: source === NEWS_PUBLISHERS.reddot,
    category, impactByTicker,
  };
}

const consumerSlowdownStoryNews = [
  arcEvent("arc_consumer_day7_spending", 7, "Household spending loses momentum", "Card and retail data show households cutting optional purchases. LuxeWear could sell less clothing, while FoodMart and AgriPure may retain customers buying essential food. Essential demand is steadier, but higher costs could still reduce profits.", "macro", { LUX: -0.035, FDM: 0.012, AGR: 0.01 }),
  arcEvent("arc_consumer_day12_discounting", 12, "Retailers turn to discounts as demand softens", "Retailers announced price cuts to attract cautious shoppers. LuxeWear, FoodMart, and AgriPure may sell more units but keep less profit from each sale. Watch whether additional customers make up for the lower selling prices.", "operations", { LUX: -0.04, FDM: -0.012, AGR: -0.008 }),
];
const supplyChainStoryNews = [
  arcEvent("arc_supply_day9_delays", 9, "Port congestion disrupts component deliveries", "Port operators report longer delivery queues. Inter Corporation and PineApple may receive parts later, delaying finished-product sales. FreightFlex may charge more for scarce shipping capacity, though extra handling costs could reduce that benefit.", "supply", { ITC: -0.034, PAP: -0.022, FRX: 0.018 }),
  arcEvent("arc_supply_day15_normalizes", 15, "Shipping backlogs begin to clear", "Port reports show delivery queues shrinking. Inter Corporation and PineApple could finish orders sooner and spend less on emergency shipping. FreightFlex may lose some of the extra fees it earned when capacity was scarce. Watch whether the improvement lasts.", "supply", { ITC: 0.03, PAP: 0.02, FRX: -0.012 }),
];
const takeoverStoryNews = [
  arcEvent("arc_takeover_day11_report", 11, "Takeover talks emerge around OmniMedia", "Unnamed sources claim a larger entertainment group is considering buying OmniMedia. Neither company has confirmed the report, and no price or financed offer has been announced. A buyer might pay a premium, while speculation could spread to rival Mount. Para Pictures. Talks alone do not create a deal.", "merger", { OMG: 0.045, HLW: 0.012 }, NEWS_PUBLISHERS.reddot),
  arcEvent("arc_takeover_day17_update", 17, "OmniMedia board opens formal deal talks", "OmniMedia's board confirmed deal discussions, strengthening the evidence behind the earlier rumour. A completed deal could bring a payment to shareholders and create a stronger rival for Mount. Para Pictures. Financing and regulatory approval remain unresolved; there is no completed sale.", "merger", { OMG: 0.055, HLW: -0.012 }, NEWS_PUBLISHERS.officialWire),
];
const laborStrikeStoryNews = [
  arcEvent("arc_labor_day8_vote", 8, "Transport workers authorize strike action", "Union voting results authorize leaders to call a strike if negotiations fail. Cancelled SkyBridge flights and delayed FreightFlex deliveries could reduce sales while some costs continue. A vote authorizes a strike; it does not mean one has begun.", "labor", { SKY: -0.028, FRX: -0.022 }),
  arcEvent("arc_labor_day14_talks", 14, "Contract talks enter final mediation", "Union and company statements confirm another round of talks with a mediator. Continuing negotiations reduce the immediate chance of cancelled flights and deliveries, helping SkyBridge and FreightFlex keep serving customers. No agreement is signed, and higher wages could still raise costs.", "labor", { SKY: 0.02, FRX: 0.018 }),
];
const regulationStoryNews = [
  arcEvent("arc_regulation_day10_proposal", 10, "Officials propose tighter digital-platform rules", "The published proposal would require more data controls and reporting from digital platforms. Closed Ai and OmniMedia may need extra staff and software, while CyberFort could sell more security tools. The rules are proposed, not enacted; the final requirements may change.", "regulatory", { CAI: -0.02, OMG: -0.025, CYB: 0.012 }),
  arcEvent("arc_regulation_day23_revision", 23, "Revised technology rules narrow compliance burden", "Lawmakers removed several expensive reporting requirements but kept stronger security rules. Closed Ai and OmniMedia would face less extra spending than under the earlier draft. CyberFort may still receive security orders. The proposal needs final approval before companies know their obligations.", "regulatory", { CAI: 0.018, OMG: 0.015, CYB: 0.01 }),
];
const weatherStoryNews = [
  arcEvent("arc_weather_day6_warning", 6, "Severe weather threatens travel and power networks", "Weather forecasts warn of severe conditions that could cancel SkyBridge flights. AquaLife and GreenVolt may receive more requests for resilient water and energy services. Forecasts can change, and any extra orders must be weighed against damage to their own equipment.", "macro", { SKY: -0.032, AQL: 0.015, GVE: 0.012 }),
  arcEvent("arc_weather_day9_damage", 9, "Storm damage disrupts routes and local infrastructure", "Initial local assessments report closed transport routes but manageable damage to utility equipment. SkyBridge and FreightFlex may lose sales while routes are blocked. AquaLife could receive emergency water-system repair orders. The full repair timeline and costs remain unknown.", "operations", { SKY: -0.025, FRX: -0.018, AQL: 0.02 }),
];

const storyArcDefinitions = [
  {
    arcKey: "gas_prices",
    selectionWeight: 0.72,
    events: gasPriceStoryNews,
  },
  {
    arcKey: "cyber_breach",
    selectionWeight: 0.58,
    events: cyberBreachStoryNews,
  },
  {
    arcKey: "rate_cycle",
    selectionWeight: 0.58,
    events: rateCycleStoryNews,
  },
  {
    arcKey: "healthcare_trial",
    selectionWeight: 0.58,
    events: healthcareTrialStoryNews,
  },
  { arcKey: "consumer_slowdown", selectionWeight: 0.5, events: consumerSlowdownStoryNews },
  { arcKey: "supply_chain", selectionWeight: 0.52, events: supplyChainStoryNews },
  { arcKey: "takeover", selectionWeight: 0.42, events: takeoverStoryNews },
  { arcKey: "labor_strike", selectionWeight: 0.44, events: laborStrikeStoryNews },
  { arcKey: "industry_regulation", selectionWeight: 0.48, events: regulationStoryNews },
  { arcKey: "extreme_weather", selectionWeight: 0.46, events: weatherStoryNews },
];

const bullishTemplates = [
  {
    category: "earnings" as EventCategory,
    importance: "High" as Importance,
    headline: "reports stronger-than-expected earnings",
    body:
      "The company's earnings release reports sales and profit above analyst forecasts. More customer orders and better cost control helped. The next question is whether demand will last beyond this quarter.",
    impactMin: 0.035,
    impactMax: 0.09,
    isRumor: false,
  },
  {
    category: "contract" as EventCategory,
    importance: "High" as Importance,
    headline: "wins a major new contract",
    body:
      "A company announcement confirms a signed multi-year customer contract. It adds expected sales over several years, but hiring, equipment, and delivery costs could reduce how much profit the company keeps.",
    impactMin: 0.025,
    impactMax: 0.075,
    isRumor: false,
  },
  {
    category: "product" as EventCategory,
    importance: "Medium" as Importance,
    headline: "sees strong demand after product update",
    body:
      "The company reports more orders after a product update, and early customers describe better reliability. More sales could help earnings, but the company still needs to deliver the orders without a large rise in costs.",
    impactMin: 0.015,
    impactMax: 0.055,
    isRumor: false,
  },
  {
    category: "partnership" as EventCategory,
    importance: "Medium" as Importance,
    headline: "is reportedly close to a strategic partnership",
    body:
      "Unnamed sources claim the company is discussing a partnership that could bring new customers. Neither company has confirmed the talks or announced a signed deal. Sales would benefit only if an agreement is reached and produces new business.",
    impactMin: 0.01,
    impactMax: 0.045,
    isRumor: true,
  },
  {
    category: "earnings" as EventCategory,
    importance: "High" as Importance,
    headline: "raises full-year guidance",
    body:
      "In its company update, management raised its forecast for annual sales and profit because orders are stronger and costs are better controlled. This is a forecast, not money already earned; weaker demand could still cause the company to miss it.",
    impactMin: 0.03,
    impactMax: 0.08,
    isRumor: false,
  },
  {
    category: "analyst" as EventCategory,
    importance: "Medium" as Importance,
    headline: "receives an analyst upgrade to Buy",
    body:
      "A brokerage research note changed its recommendation to Buy, arguing that future sales could grow faster than investors expect. This is the analyst's opinion, not a new customer order or a company promise. Check whether later sales and profit support the argument.",
    impactMin: 0.012,
    impactMax: 0.05,
    isRumor: false,
  },
  {
    category: "capital" as EventCategory,
    importance: "Medium" as Importance,
    headline: "announces a share buyback and dividend increase",
    body:
      "A company filing says the board approved purchases of its own shares and a larger cash payment to shareholders. Fewer shares can increase each remaining share's portion of earnings, but the spending leaves less cash for expansion or unexpected costs.",
    impactMin: 0.01,
    impactMax: 0.04,
    isRumor: false,
  },
  {
    category: "regulatory" as EventCategory,
    importance: "High" as Importance,
    headline: "wins regulatory approval for a key product",
    body:
      "A published regulatory decision allows the company to sell a key product. This removes an approval barrier and creates a possible new source of sales. Launch costs, customer demand, and competing products will still determine whether it earns a profit.",
    impactMin: 0.035,
    impactMax: 0.085,
    isRumor: false,
  },
];

const bearishTemplates = [
  {
    category: "lawsuit" as EventCategory,
    importance: "High" as Importance,
    headline: "faces pressure after legal concerns emerge",
    body:
      "A court filing describes a legal claim against the company. A settlement or legal defence could cost money and distract management, but the filing is an allegation, not a finding that the company is liable. The possible financial cost is not yet known.",
    impactMin: -0.095,
    impactMax: -0.035,
    isRumor: false,
  },
  {
    category: "supply" as EventCategory,
    importance: "High" as Importance,
    headline: "warns of short-term supply delays",
    body:
      "A company update warns that supplier delays will push some customer deliveries into a later quarter. The orders have not been cancelled, but the company may receive payment later and face extra delivery costs. Watch for a revised delivery schedule.",
    impactMin: -0.075,
    impactMax: -0.025,
    isRumor: false,
  },
  {
    category: "macro" as EventCategory,
    importance: "Medium" as Importance,
    headline: "faces weaker demand across its sector",
    body:
      "New economic data show customers spending less across the company's industry. Analysts have lowered their sales forecasts as a result. This company could lose orders too, although its own next sales report may show it is holding up better than competitors.",
    impactMin: -0.055,
    impactMax: -0.015,
    isRumor: false,
  },
  {
    category: "rumor" as EventCategory,
    importance: "Medium" as Importance,
    headline: "faces unconfirmed claims of a major order cancellation",
    body:
      "An anonymous online post claims that a major customer cancelled an order. Neither the company nor the customer has confirmed the claim, and the post supplies no documents. A cancellation could reduce sales if true; look for a company statement or independent reporting before treating it as fact.",
    impactMin: -0.045,
    impactMax: -0.01,
    isRumor: true,
  },
  {
    category: "earnings" as EventCategory,
    importance: "High" as Importance,
    headline: "misses earnings and cuts guidance",
    body:
      "The company's earnings release reports profit below analyst forecasts, and management now expects lower sales for the year. That weakens both the recent results and the future outlook. Watch whether demand recovers or costs fall in the next update.",
    impactMin: -0.1,
    impactMax: -0.04,
    isRumor: false,
  },
  {
    category: "regulatory" as EventCategory,
    importance: "High" as Importance,
    headline: "faces a regulatory investigation",
    body:
      "A regulator's public notice confirms an investigation into the company's practices. Legal costs, possible fines, or operating restrictions could reduce profit. No wrongdoing has been established yet, so the scope and eventual findings matter.",
    impactMin: -0.085,
    impactMax: -0.03,
    isRumor: false,
  },
  {
    category: "product" as EventCategory,
    importance: "High" as Importance,
    headline: "issues a product recall over safety concerns",
    body:
      "A company recall notice asks customers to return a product over safety concerns. Refunds and repairs will cost money, and some customers may delay new purchases. The key uncertainty is whether the problem affects one batch or a wider range of products.",
    impactMin: -0.08,
    impactMax: -0.025,
    isRumor: false,
  },
  {
    category: "management" as EventCategory,
    importance: "Medium" as Importance,
    headline: "announces an unexpected executive departure",
    body:
      "A company announcement says a senior executive is leaving earlier than planned, without a permanent replacement named. The gap could delay decisions and projects. The announcement does not establish financial trouble; watch for a replacement and a clearer explanation.",
    impactMin: -0.05,
    impactMax: -0.015,
    isRumor: false,
  },
  {
    category: "capital" as EventCategory,
    importance: "Medium" as Importance,
    headline: "plans to raise cash by issuing more shares",
    body:
      "A company filing proposes selling new shares to raise cash. The cash could help pay debts or fund operations, but existing investors would own a smaller percentage of the company. Whether the tradeoff helps them depends on the sale price and how the money is used.",
    impactMin: -0.055,
    impactMax: -0.02,
    isRumor: false,
  },
];

export function hashString(input: string) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function normalizeMarketSeed(seed?: string | null) {
  const cleaned = String(seed ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return cleaned || DEFAULT_MARKET_SEED;
}

export function generateMarketSeedCode(length = MARKET_SEED_LENGTH) {
  const safeLength = Math.max(2, length);
  const values = new Uint32Array(safeLength);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < safeLength; index += 1) {
      values[index] = Math.floor(Math.random() * MARKET_SEED_ALPHABET.length);
    }
  }

  const seed = Array.from(values, (value) => (
    MARKET_SEED_ALPHABET[value % MARKET_SEED_ALPHABET.length]
  ));

  if (!seed.some((char) => MARKET_SEED_NUMBERS.includes(char))) {
    seed[1] = MARKET_SEED_NUMBERS[values[1] % MARKET_SEED_NUMBERS.length];
  }

  if (!seed.some((char) => MARKET_SEED_LETTERS.includes(char))) {
    seed[0] = MARKET_SEED_LETTERS[values[0] % MARKET_SEED_LETTERS.length];
  }

  return seed.join("");
}

export function seededRandom(seed: string, marketSeed?: string | null) {
  const seedCode = normalizeMarketSeed(marketSeed);
  const hash = hashString(`${seedCode}:${seed}`);
  return (hash % 1_000_000) / 1_000_000;
}

export function seededRange(seed: string, min: number, max: number, marketSeed?: string | null) {
  return min + seededRandom(seed, marketSeed) * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function getArcKey(newsId: string) {
  if (newsId.startsWith("arc_gas_")) return "gas_prices";
  if (newsId.startsWith("arc_cyber_")) return "cyber_breach";
  if (newsId.startsWith("arc_rates_")) return "rate_cycle";
  if (newsId.startsWith("arc_health_")) return "healthcare_trial";
  if (newsId.startsWith("arc_consumer_")) return "consumer_slowdown";
  if (newsId.startsWith("arc_supply_")) return "supply_chain";
  if (newsId.startsWith("arc_takeover_")) return "takeover";
  if (newsId.startsWith("arc_labor_")) return "labor_strike";
  if (newsId.startsWith("arc_regulation_")) return "industry_regulation";
  if (newsId.startsWith("arc_weather_")) return "extreme_weather";
  if (newsId.startsWith("story_day")) return "opening_tutorial";
  return undefined;
}

const storyArcSetbacks: Record<string, { headline: string; body: string }> = {
  gas_prices: {
    headline: "Fuel relief stalls as supply problems return",
    body: "Fuel distributors report renewed refinery delays, interrupting the expected fall in gas prices. Airlines and freight companies still face high fuel bills, while households have less money for other purchases. Energy suppliers may retain some pricing power. Watch whether deliveries actually recover.",
  },
  cyber_breach: {
    headline: "New breach evidence challenges earlier containment claims",
    body: "Investigators found additional affected payment accounts after firms reported that the breach was contained. Retailers and banks may face more fraud losses and repair costs. CyberFort and Closed Ai could see further demand for security tools, but new contracts are not guaranteed.",
  },
  rate_cycle: {
    headline: "Officials keep further rate increases on the table",
    body: "A new policy statement says inflation remains too high to promise a pause in rate increases. Borrowing costs could stay elevated for Century 22, SolarDawn, PineApple, and Inter Corporation. UrbanBank may earn more interest on loans, although borrowers could also struggle to repay them.",
  },
  healthcare_trial: {
    headline: "BioCloud partner delays funding for next trial phase",
    body: "BioCloud says its partner has delayed the planned funding while it reviews trial requirements. The company may need to issue more shares or postpone research. MediCore could receive fewer diagnostic orders, and other smaller growth companies may face more cautious investors. The trial has not been cancelled.",
  },
  consumer_slowdown: {
    headline: "Retail sales improve without another round of discounts",
    body: "New retailer sales reports show customer demand recovering while selling prices hold steadier than expected. That reduces the pressure to cut prices at LuxeWear, FoodMart, and AgriPure. Keeping more of each sale could help profits, but one update does not establish a lasting recovery.",
  },
  supply_chain: {
    headline: "Fresh port delays interrupt the expected shipping recovery",
    body: "Port operators report new delays after an initial improvement in delivery times. Inter Corporation and PineApple may wait longer for parts and customer payments. FreightFlex could collect higher fees for scarce shipping capacity, although extra handling costs could absorb some of that revenue.",
  },
  takeover: {
    headline: "OmniMedia deal talks stall over financing",
    body: "OmniMedia's board says discussions have stalled because the buyer has not secured financing. The hoped-for takeover payment is now less likely, although talks have not formally ended. Rival Mount. Para Pictures may face less pressure from a combined competitor. Watch for a financed offer rather than another report of talks.",
  },
  labor_strike: {
    headline: "Transport mediation ends without an agreement",
    body: "Union and company statements confirm that the latest talks ended without a deal. A strike could cancel SkyBridge flights and delay FreightFlex deliveries, reducing sales while some operating costs continue. Workers have not yet announced a strike date.",
  },
  industry_regulation: {
    headline: "Lawmakers restore costly technology requirements",
    body: "A revised proposal restores compliance and security requirements that had been removed. Closed Ai and OmniMedia may need to spend more to meet them. CyberFort also faces implementation costs under this version, which could outweigh new security sales. The proposal still needs final approval.",
  },
  extreme_weather: {
    headline: "Transport routes reopen as storm repair demand eases",
    body: "Transport operators report faster-than-expected repairs and fewer continuing closures. SkyBridge and FreightFlex can resume more flights and deliveries, reducing lost sales. AquaLife may receive fewer emergency repair orders than expected. Further weather damage could still disrupt the recovery.",
  },
};

function branchArcEvents(arcKey: string, events: MarketNews[], marketSeed?: string | null) {
  const branch = seededRandom(`story-arc-branch-${arcKey}`, marketSeed) < 0.5 ? "resolution" : "setback";
  if (branch === "resolution" || events.length === 0) {
    return events.map((event) => ({ ...event, arcKey, branch }));
  }
  const finalIndex = events.length - 1;
  return events.map((event, index) => {
    if (index !== finalIndex) return { ...event, arcKey, branch };
    const impactByTicker = event.impactByTicker && Object.fromEntries(
      Object.entries(event.impactByTicker).map(([symbol, impact]) => [symbol, {
        expectedImpact: -impact.expectedImpact,
        actualImpact: -impact.actualImpact,
      }])
    );
    return {
      ...event,
      newsId: `${event.newsId}_setback`,
      ...storyArcSetbacks[arcKey],
      marketTone: "Unclear" as MarketTone,
      impactByTicker,
      arcKey,
      branch,
    };
  });
}

/**
 * Story arcs run in 30-day seasons. Season 0 (days 1-30) is the original
 * selection and must never change: 30-day runs and every run's first month
 * depend on it. Infinite runs used to get no arcs at all after day 30, so each
 * later season picks its own arcs, skipping the previous season's arcs so the
 * same storyline never runs twice in a row.
 */
export const STORY_ARC_SEASON_DAYS = 30;

function rankStoryArcs(seedCode: string, salt: string) {
  const arcCount = 2 + Math.floor(seededRandom(`story-arc-count${salt}`, seedCode) * 3);
  const ranked = [...storyArcDefinitions].sort((a, b) => {
    const scoreA = seededRandom(`story-arc-rank-${a.arcKey}${salt}`, seedCode) * a.selectionWeight;
    const scoreB = seededRandom(`story-arc-rank-${b.arcKey}${salt}`, seedCode) * b.selectionWeight;
    return scoreB - scoreA;
  });
  return { arcCount, ranked };
}

// Each season's picks depend on the one before, so they are worked out in
// order and kept per seed.
const seasonArcKeyCache = new Map<string, string[][]>();

function seasonArcKeys(seedCode: string, season: number): string[] {
  let seasons = seasonArcKeyCache.get(seedCode);
  if (!seasons) {
    if (seasonArcKeyCache.size >= 500) seasonArcKeyCache.clear();
    const { arcCount, ranked } = rankStoryArcs(seedCode, "");
    seasons = [ranked.slice(0, arcCount).map((arc) => arc.arcKey)];
    seasonArcKeyCache.set(seedCode, seasons);
  }
  while (seasons.length <= season) {
    const previous = new Set(seasons[seasons.length - 1]);
    const { arcCount, ranked } = rankStoryArcs(seedCode, `-season${seasons.length}`);
    seasons.push(ranked.filter((arc) => !previous.has(arc.arcKey)).slice(0, arcCount).map((arc) => arc.arcKey));
  }
  return seasons[season];
}

// Selection runs for every company on every generated day; cache it.
const storyArcSeasonCache = new Map<string, MarketNews[]>();
const STORY_ARC_SEASON_CACHE_LIMIT = 2_000;

function getSeasonStoryArcEvents(marketSeed: string | null | undefined, season: number): MarketNews[] {
  const seedCode = normalizeMarketSeed(marketSeed);
  const cacheKey = `${seedCode}:${season}`;
  const cached = storyArcSeasonCache.get(cacheKey);
  if (cached) return cached;

  let events: MarketNews[];
  if (season === 0) {
    events = getSelectedStoryArcDefinitions(seedCode).flatMap((arc) => arc.events);
  } else {
    const salt = `-season${season}`;
    const offset = season * STORY_ARC_SEASON_DAYS;
    events = seasonArcKeys(seedCode, season)
      .map((arcKey) => storyArcDefinitions.find((arc) => arc.arcKey === arcKey)!)
      .flatMap((arc) => branchArcEvents(arc.arcKey, arc.events, `${seedCode}${salt}`))
      .map((event) => ({ ...event, newsId: `${event.newsId}_s${season}`, gameDay: event.gameDay + offset }));
  }

  if (storyArcSeasonCache.size >= STORY_ARC_SEASON_CACHE_LIMIT) storyArcSeasonCache.clear();
  storyArcSeasonCache.set(cacheKey, events);
  return events;
}

function getSelectedStoryArcDefinitions(marketSeed?: string | null) {
  const seedCode = normalizeMarketSeed(marketSeed);
  const { arcCount, ranked } = rankStoryArcs(seedCode, "");

  return ranked
    .slice(0, arcCount)
    .map((arc) => ({ ...arc, events: branchArcEvents(arc.arcKey, arc.events, seedCode) }));
}

/** The arcs of the first season (days 1-30). */
export function getSelectedStoryArcKeys(marketSeed?: string | null) {
  return getSelectedStoryArcDefinitions(marketSeed).map((arc) => arc.arcKey);
}

function getStoryArcNewsForGameDay(gameDay: number, marketSeed?: string | null) {
  const season = Math.floor((normalizeGameDay(gameDay) - 1) / STORY_ARC_SEASON_DAYS);
  return getSeasonStoryArcEvents(marketSeed, season)
    .filter((news) => news.gameDay === gameDay);
}

function uniqueMarketNews(newsItems: MarketNews[]) {
  const seen = new Set<string>();

  return newsItems.filter((news) => {
    if (seen.has(news.newsId)) return false;
    seen.add(news.newsId);
    return true;
  });
}

function uniqueMarketEventSeeds(seeds: MarketEventSeed[]) {
  const seen = new Set<string>();

  return seeds.filter((seed) => {
    if (seen.has(seed.eventKey)) return false;
    seen.add(seed.eventKey);
    return true;
  });
}

function getImpactForTicker(news: MarketNews, symbol: string) {
  const tickerImpact = news.impactByTicker?.[symbol];

  return {
    symbol,
    expectedImpact: tickerImpact?.expectedImpact ?? news.expectedImpact,
    actualImpact: tickerImpact?.actualImpact ?? news.actualImpact,
  };
}

export function marketNewsToSeed(news: MarketNews): MarketEventSeed {
  const enriched = enrichMarketNews(news);
  return {
    eventKey: news.newsId,
    gameDay: news.gameDay,
    source: news.source,
    headline: news.headline,
    body: news.body,
    importance: news.importance,
    marketTone: news.marketTone,
    category: news.category,
    isAccurate: news.isAccurate,
    isRumor: news.isRumor,
    arcKey: enriched.arcKey,
    confidence: enriched.confidence,
    horizon: enriched.horizon,
    affectedSectors: enriched.affectedSectors,
    followUpTo: enriched.followUpTo,
    branch: enriched.branch,
    impacts: news.relatedTickers.map((symbol) => getImpactForTicker(news, symbol)),
  };
}

export function marketNewsFromSeed(seed: MarketEventSeed): MarketNews {
  const impactByTicker = seed.impacts.reduce<NonNullable<MarketNews["impactByTicker"]>>(
    (impacts, impact) => ({
      ...impacts,
      [impact.symbol]: {
        expectedImpact: impact.expectedImpact,
        actualImpact: impact.actualImpact,
      },
    }),
    {}
  );

  return {
    newsId: seed.eventKey,
    gameDay: seed.gameDay,
    source: seed.source,
    headline: seed.headline,
    body: seed.body,
    importance: seed.importance,
    marketTone: seed.marketTone,
    relatedTickers: seed.impacts.map((impact) => impact.symbol),
    expectedImpact: seed.impacts[0]?.expectedImpact ?? 0,
    actualImpact: seed.impacts[0]?.actualImpact ?? 0,
    isAccurate: seed.isAccurate,
    isRumor: seed.isRumor,
    category: seed.category,
    impactByTicker,
    confidence: seed.confidence,
    horizon: seed.horizon,
    affectedSectors: seed.affectedSectors,
    arcKey: seed.arcKey,
    followUpTo: seed.followUpTo,
    branch: seed.branch,
  };
}

function getSectorDrift(sector: string, gameDay: number, marketSeed?: string | null) {
  const sectorWave = Math.sin((gameDay + hashString(sector) % 11) / 8) * 0.004;
  const sectorShock = seededRange(`sector-${sector}-${gameDay}`, -0.004, 0.004, marketSeed);

  return sectorWave + sectorShock;
}

function getMarketDrift(gameDay: number, marketSeed?: string | null) {
  const longTermBias = 0.0007;
  const cycle = Math.sin(gameDay / 14) * 0.003;
  const randomMarketShock = seededRange(`market-${gameDay}`, -0.006, 0.006, marketSeed);

  return longTermBias + cycle + randomMarketShock;
}

// Volatility clustering: a big move yesterday makes a big move today more
// likely (real markets don't reset to calm the day after a shock). We
// recompute yesterday's shock+event magnitude deterministically rather than
// threading actual return history through the call chain.
function getVolatilityClusterMultiplier(
  company: StockCompany,
  gameDay: number,
  marketSeed?: string | null
) {
  if (gameDay <= STORY_DAYS + 1) return 1;

  const priorShock = Math.abs(
    seededRange(`shock-${company.symbol}-${gameDay - 1}`, -1, 1, marketSeed)
  );
  const priorEventImpact = Math.abs(getEventImpact(company, gameDay - 2, marketSeed));
  const priorIntensity = clamp(priorShock + priorEventImpact / Math.max(company.volatility, 0.01), 0, 2);

  return clamp(0.75 + priorIntensity * 0.5, 0.75, 1.75);
}

// Earnings calendar: each company reports on a fixed, staggered ~3-week cycle
// (so the whole market doesn't report on the same day) with a real
// beat/meet/miss distribution and a next-day "post-earnings drift" — a
// smaller same-direction continuation, mirroring the real-world effect where
// the market keeps digesting a surprise for a day or two after the print.
const EARNINGS_CYCLE_DAYS = 21;

function getEarningsOffset(company: StockCompany, marketSeed?: string | null) {
  return Math.floor(seededRandom(`earnings-offset-${company.symbol}`, marketSeed) * EARNINGS_CYCLE_DAYS);
}

function isEarningsDay(company: StockCompany, gameDay: number, marketSeed?: string | null) {
  if (gameDay <= STORY_DAYS) return false;
  const offset = getEarningsOffset(company, marketSeed);
  return (gameDay - STORY_DAYS - 1 - offset) % EARNINGS_CYCLE_DAYS === 0;
}

function generateEarningsEvent(
  company: StockCompany,
  gameDay: number,
  marketSeed?: string | null
): MarketNews {
  const surpriseRoll = seededRandom(`earnings-surprise-${company.symbol}-${gameDay}`, marketSeed);
  // Roughly mirrors real-world earnings-surprise rates: beats are most common,
  // in-line prints are a real minority, misses are the tail risk.
  const outcome: "beat" | "meet" | "miss" =
    surpriseRoll < 0.58 ? "beat" : surpriseRoll < 0.75 ? "meet" : "miss";

  const magnitude = seededRange(
    `earnings-magnitude-${company.symbol}-${gameDay}`,
    outcome === "meet" ? 0.005 : 0.05,
    outcome === "meet" ? 0.02 : 0.11,
    marketSeed
  );
  const actualImpact = outcome === "miss" ? -magnitude : magnitude;
  const expectedImpact = actualImpact * seededRange(
    `earnings-expected-${company.symbol}-${gameDay}`,
    0.5,
    0.9,
    marketSeed
  );

  const headline = outcome === "beat"
    ? `${company.name} tops quarterly earnings estimates`
    : outcome === "miss"
    ? `${company.name} misses quarterly earnings estimates`
    : `${company.name} reports in-line quarterly results`;

  const body = outcome === "beat"
    ? "The company's earnings release reports sales and profit above analyst forecasts. Management attributes the improvement to stronger customer demand. Check whether orders remain strong and whether the extra sales cover the company's costs."
    : outcome === "miss"
    ? "The company's earnings release reports sales and profit below analyst forecasts. Management says customers bought less and costs consumed more of each sale. A recovery would need stronger demand or better cost control."
    : "The company's earnings release reports sales and profit close to analyst forecasts. There is little new information to change the outlook. Future orders and costs still matter; matching forecasts does not promise a flat share price.";

  return {
    newsId: `news_earnings_${company.symbol.toLowerCase()}_${gameDay}`,
    gameDay,
    source: NEWS_PUBLISHERS.officialWire,
    headline,
    body,
    importance: outcome === "meet" ? "Medium" : "High",
    // An in-line print says little either way; calling it Bullish misread it.
    marketTone: outcome === "meet" ? "Unclear" : actualImpact >= 0 ? "Bullish" : "Bearish",
    relatedTickers: [company.symbol],
    expectedImpact: round2(expectedImpact),
    actualImpact: round2(actualImpact),
    isAccurate: true,
    isRumor: false,
    category: "earnings",
  };
}

function getHardcodedOpeningNewsForCompany(
  company: StockCompany,
  gameDay: number
): MarketNews | null {
  return (
    hardcodedOpeningNews.find(
      (news) =>
        news.gameDay === gameDay &&
        news.relatedTickers.some((ticker) => ticker === company.symbol)
    ) ?? null
  );
}

function getStoryArcNewsForCompany(
  company: StockCompany,
  gameDay: number,
  marketSeed?: string | null
): MarketNews | null {
  return (
    getStoryArcNewsForGameDay(gameDay, marketSeed).find(
      (news) =>
        news.relatedTickers.some((ticker) => ticker === company.symbol)
    ) ?? null
  );
}

function getEventTemplate(
  company: StockCompany,
  gameDay: number,
  marketSeed?: string | null
) {
  const eventRoll = seededRandom(`event-roll-${company.symbol}-${gameDay}`, marketSeed);

  const riskBoost =
    company.riskLevel === "High" ? 0.1 : company.riskLevel === "Medium" ? 0.05 : 0;

  const eventChance = 0.14 + riskBoost;

  if (eventRoll > eventChance) return null;

  const toneRoll = seededRandom(`event-tone-${company.symbol}-${gameDay}`, marketSeed);
  const isBullish = toneRoll >= 0.48;

  const templates = isBullish ? bullishTemplates : bearishTemplates;

  const index = Math.floor(
    seededRandom(`event-template-${company.symbol}-${gameDay}`, marketSeed) * templates.length
  );

  return templates[index];
}

function getNewsSource(
  company: StockCompany,
  event: { isRumor: boolean },
  gameDay: number,
  marketSeed?: string | null
) {
  if (event.isRumor) return NEWS_PUBLISHERS.reddot;

  if (company.sector === "Technology") {
    return seededRandom(`publisher-tech-${company.symbol}-${gameDay}`, marketSeed) < 0.5
      ? NEWS_PUBLISHERS.techInsider : NEWS_PUBLISHERS.sectorLedger;
  }

  if (
    company.sector === "Travel"
    || company.industry === "Airlines"
    || company.industry === "Freight Logistics"
  ) {
    return NEWS_PUBLISHERS.expedition;
  }

  const reddotRoll = seededRandom(
    `publisher-reddot-${company.symbol}-${gameDay}`,
    marketSeed
  );

  return reddotRoll < 0.12
    ? NEWS_PUBLISHERS.reddot
    : NEWS_PUBLISHERS.cynTimes;
}

function generateEventForCompany(
  company: StockCompany,
  gameDay: number,
  marketSeed?: string | null
): MarketNews | null {
  if (gameDay <= STORY_DAYS) {
    return getHardcodedOpeningNewsForCompany(company, gameDay);
  }

  const storyArcEvent = getStoryArcNewsForCompany(company, gameDay, marketSeed);

  if (storyArcEvent) return storyArcEvent;

  if (isEarningsDay(company, gameDay, marketSeed)) {
    return generateEarningsEvent(company, gameDay, marketSeed);
  }

  const template = getEventTemplate(company, gameDay, marketSeed);

  if (!template) return null;

  const actualImpact = seededRange(
    `impact-${company.symbol}-${gameDay}`,
    template.impactMin,
    template.impactMax,
    marketSeed
  );

  const expectedImpact = actualImpact * seededRange(
    `expected-${company.symbol}-${gameDay}`,
    0.8,
    1.25,
    marketSeed
  );

  const marketTone: MarketTone = actualImpact >= 0 ? "Bullish" : "Bearish";
  return {
    newsId: `news_${company.symbol.toLowerCase()}_${gameDay}`,
    gameDay,
    source: getNewsSource(company, template, gameDay, marketSeed),
    headline: `${company.name} ${template.headline}`,
    body: template.body,
    importance: template.importance,
    marketTone,
    relatedTickers: [company.symbol],
    expectedImpact: round2(expectedImpact),
    actualImpact: round2(actualImpact),
    isAccurate: !template.isRumor || seededRandom(`accuracy-${company.symbol}-${gameDay}`, marketSeed) > 0.35,
    isRumor: template.isRumor,
    category: template.category,
  };
}

function generateFollowUpForCompany(
  company: StockCompany,
  gameDay: number,
  marketSeed?: string | null
): MarketNews | null {
  if (gameDay <= STORY_DAYS + 1) return null;
  const original = generateEventForCompany(company, gameDay - 1, marketSeed);
  if (!original?.newsId.startsWith("news_")) return null;
  if (!["rumor", "regulatory", "lawsuit", "supply", "product", "partnership", "contract", "labor", "merger"].includes(original.category)) return null;
  // A rumour is always settled the next day, so a false one can't move the
  // price for good the way a true one does. Other reports get a follow-up
  // only sometimes.
  if (!original.isRumor && seededRandom(`follow-up-roll-${company.symbol}-${gameDay}`, marketSeed) > 0.55) return null;

  // The follow-up tells the hidden truth: true reports are confirmed and false
  // ones disputed. (Before, a quarter of true reports were "disputed" and their
  // move reversed, while false rumours often went unanswered.)
  const confirmed = original.isAccurate;
  const originalImpact = original.impactByTicker?.[company.symbol]?.actualImpact ?? original.actualImpact;
  // A disputed claim gives back the whole move it caused.
  const actualImpact = originalImpact * (confirmed ? 0.45 : -1);
  return {
    newsId: `followup_${original.newsId}_${gameDay}`,
    gameDay,
    source: NEWS_PUBLISHERS.officialWire,
    headline: confirmed
      ? `${company.name} confirms the Day ${original.gameDay} report`
      : `${company.name} disputes the Day ${original.gameDay} report`,
    body: confirmed
      ? `The Day ${original.gameDay} report was: “${original.headline}”. A company statement now confirms the central claim. This strengthens the evidence behind that report, but the size and timing of its effect on sales or costs remain uncertain.`
      : `The Day ${original.gameDay} report was: “${original.headline}”. A company statement now disputes that claim and supplies information contradicting the earlier account. The business impact described in that report may therefore be smaller than first thought.`,
    importance: original.importance,
    marketTone: actualImpact >= 0 ? "Bullish" : "Bearish",
    relatedTickers: [company.symbol],
    expectedImpact: actualImpact,
    actualImpact,
    isAccurate: true,
    isRumor: false,
    category: original.category,
    followUpTo: original.newsId,
  };
}

function getEventImpact(company: StockCompany, gameDay: number, marketSeed?: string | null) {
  if (gameDay < 1) return 0;
  // Every story-arc event naming the ticker moves it: two arcs can land on the
  // same stock the same day, and the feed shows both.
  const arcEvents = gameDay > STORY_DAYS
    ? getStoryArcNewsForGameDay(gameDay, marketSeed)
        .filter((news) => news.relatedTickers.includes(company.symbol))
    : [];
  const eventImpact = arcEvents.length > 0
    ? arcEvents.reduce((sum, news) => (
        sum + (news.impactByTicker?.[company.symbol]?.actualImpact ?? news.actualImpact)
      ), 0)
    : (() => {
        const event = generateEventForCompany(company, gameDay, marketSeed);
        return event?.impactByTicker?.[company.symbol]?.actualImpact ?? event?.actualImpact ?? 0;
      })();
  const followUp = generateFollowUpForCompany(company, gameDay, marketSeed);
  return eventImpact + (followUp?.actualImpact ?? 0);
}

function generateVolume(
  company: StockCompany,
  dailyReturn: number,
  eventImpact: number,
  gameDay: number,
  marketSeed?: string | null
) {
  const baseVolume =
    company.riskLevel === "High"
      ? 1_200_000
      : company.riskLevel === "Medium"
      ? 850_000
      : 600_000;

  const activityBoost = Math.abs(dailyReturn) * 12;
  const eventBoost = Math.abs(eventImpact) > 0 ? 0.35 : 0;
  const randomBoost = seededRange(`volume-${company.symbol}-${gameDay}`, -0.12, 0.22, marketSeed);

  return Math.round(baseVolume * (1 + activityBoost + eventBoost + randomBoost));
}

function generateHardcodedOpeningPricePoint(
  company: StockCompany,
  previousClose: number,
  gameDay: number,
  marketSeed?: string | null
): StockPriceHistory | null {
  // News is published after the close and moves the following session.
  const hardcodedClose = gameDay === 1
    ? company.startingPrice
    : hardcodedFirstThreeDayCloses[company.symbol]?.[gameDay - 1];

  if (!hardcodedClose) return null;

  const openPrice = previousClose;
  const closePrice = hardcodedClose;
  const dailyReturn = (closePrice - openPrice) / openPrice;
  const event = gameDay > 1 ? generateEventForCompany(company, gameDay - 1, marketSeed) : null;
  const eventImpact = event?.impactByTicker?.[company.symbol]?.actualImpact ?? event?.actualImpact ?? 0;

  const intradayRange =
    Math.abs(dailyReturn) * 0.35 +
    company.volatility * seededRange(`story-range-${company.symbol}-${gameDay}`, 0.18, 0.38, marketSeed);

  const highPrice = Math.max(openPrice, closePrice) * (1 + intradayRange);
  const lowPrice = Math.min(openPrice, closePrice) * (1 - intradayRange * 0.7);

  return {
    priceId: `price_${company.symbol.toLowerCase()}_${gameDay}`,
    stockId: company.stockId,
    symbol: company.symbol,
    gameDay,
    openPrice: round2(openPrice),
    highPrice: round2(highPrice),
    lowPrice: round2(Math.max(1, lowPrice)),
    closePrice: round2(closePrice),
    volume: generateVolume(company, dailyReturn, eventImpact, gameDay, marketSeed),
    change: round2(closePrice - openPrice),
    changePercent: round2(dailyReturn * 100),
    eventImpact: round2(eventImpact),
    eventId: event?.newsId,
  };
}

function generateNextPricePoint(
  company: StockCompany,
  previousClose: number,
  gameDay: number,
  marketSeed?: string | null
): StockPriceHistory {
  const hardcoded = generateHardcodedOpeningPricePoint(
    company,
    previousClose,
    gameDay,
    marketSeed
  );

  if (hardcoded) return hardcoded;

  const marketDrift = getMarketDrift(gameDay, marketSeed);
  const sectorDrift = getSectorDrift(company.sector, gameDay, marketSeed);
  const clusterMultiplier = getVolatilityClusterMultiplier(company, gameDay, marketSeed);
  const randomShock =
    seededRange(`shock-${company.symbol}-${gameDay}`, -1, 1, marketSeed)
    * company.volatility
    * clusterMultiplier;
  const eventImpact = getEventImpact(company, gameDay - 1, marketSeed);
  // Post-earnings drift: the market keeps digesting yesterday's surprise today.
  const postEarningsDrift = isEarningsDay(company, gameDay - 2, marketSeed)
    ? getEventImpact(company, gameDay - 2, marketSeed) * 0.15
    : 0;

  let dailyReturn =
    marketDrift +
    sectorDrift +
    company.trendBias +
    randomShock +
    eventImpact +
    postEarningsDrift;

  dailyReturn = clamp(dailyReturn, -0.15, 0.15);

  const openPrice = previousClose;
  const closePrice = Math.max(1, openPrice * (1 + dailyReturn));

  const intradayRange =
    Math.abs(dailyReturn) * 0.45 +
    company.volatility * seededRange(`range-${company.symbol}-${gameDay}`, 0.18, 0.5, marketSeed);

  const highPrice = Math.max(openPrice, closePrice) * (1 + intradayRange);
  const lowPrice = Math.min(openPrice, closePrice) * (1 - intradayRange * 0.8);

  const event = gameDay > 1 ? generateEventForCompany(company, gameDay - 1, marketSeed) : null;

  return {
    priceId: `price_${company.symbol.toLowerCase()}_${gameDay}`,
    stockId: company.stockId,
    symbol: company.symbol,
    gameDay,
    openPrice: round2(openPrice),
    highPrice: round2(highPrice),
    lowPrice: round2(Math.max(1, lowPrice)),
    closePrice: round2(closePrice),
    volume: generateVolume(company, dailyReturn, eventImpact, gameDay, marketSeed),
    change: round2(closePrice - openPrice),
    changePercent: round2(dailyReturn * 100),
    eventImpact: round2(eventImpact),
    eventId: event?.newsId,
  };
}

// Template headlines as they read before the evidence-and-uncertainty rewrite,
// index-aligned with [...bullishTemplates, ...bearishTemplates]. The infinite
// script in market_events was seeded with this wording.
const LEGACY_TEMPLATE_HEADLINES = [
  "reports stronger-than-expected earnings",
  "wins a major new contract",
  "sees strong demand after product update",
  "is reportedly close to a strategic partnership",
  "raises full-year guidance",
  "receives an analyst upgrade to Buy",
  "announces a share buyback and dividend increase",
  "wins regulatory approval for a key product",
  "faces pressure after legal concerns emerge",
  "warns of short-term supply delays",
  "falls as sector outlook weakens",
  "drops after an unconfirmed negative report",
  "misses earnings and cuts guidance",
  "faces a regulatory investigation",
  "issues a product recall over safety concerns",
  "slides after a surprise executive departure",
  "falls after announcing a dilutive share sale",
];

let scriptedCopyById: Map<string, { headline: string; body: string }> | null = null;

/**
 * Current wording for a story in the shared infinite script (market_events).
 * The database rows keep the old copy, so engine-1 infinite runs would show
 * it for their first 30 days; the story keys and template headlines identify
 * which current story each row is. Unknown rows keep their own text.
 */
export function currentScriptedCopy(eventKey: string, headline: string, body: string) {
  if (!scriptedCopyById) {
    scriptedCopyById = new Map();
    for (const news of [...hardcodedOpeningNews, ...storyArcDefinitions.flatMap((arc) => arc.events)]) {
      scriptedCopyById.set(news.newsId, { headline: news.headline, body: news.body });
    }
  }
  const scripted = scriptedCopyById.get(eventKey);
  if (scripted) return scripted;

  if (eventKey.startsWith("news_")) {
    const templates = [...bullishTemplates, ...bearishTemplates];
    const index = LEGACY_TEMPLATE_HEADLINES.findIndex((legacy) => headline.endsWith(` ${legacy}`));
    const template = templates[index];
    if (template) {
      const company = headline.slice(0, headline.length - LEGACY_TEMPLATE_HEADLINES[index].length - 1);
      return { headline: `${company} ${template.headline}`, body: template.body };
    }
  }
  return { headline, body };
}

export function enrichMarketNews(news: MarketNews): MarketNews {
  const credibility = getNewsCredibility(news).score;
  const arcKey = news.arcKey ?? getArcKey(news.newsId);
  const affectedSectors = Array.from(new Set(news.relatedTickers
    .map((symbol) => getCompanyBySymbol(symbol)?.sector)
    .filter((sector): sector is string => Boolean(sector))));
  const horizon: NewsHorizon = arcKey || ["macro", "supply", "regulatory", "labor"].includes(news.category)
    ? "Multi-day"
    : "Next session";
  const confidence: NewsConfidence = credibility >= 80 && !news.isRumor
    ? "High"
    : credibility >= 55 ? "Medium" : "Low";

  return { ...news, confidence, horizon, affectedSectors, arcKey };
}

export function normalizeGameDay(gameDay: number) {
  if (Number.isNaN(gameDay)) return 1;
  if (gameDay < 1) return 1;
  return Math.floor(gameDay);
}

export function getCompanyBySymbol(symbol: string) {
  return mockStockCompanies.find(
    (company) => company.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

export function getStockHistoryBySymbol(
  symbol: string,
  gameDay: number,
  marketSeed?: string | null
): StockPriceHistory[] {
  const company = getCompanyBySymbol(symbol);
  const safeGameDay = normalizeGameDay(gameDay);

  if (!company) return [];

  const history: StockPriceHistory[] = [];
  let previousClose = company.startingPrice;

  for (let day = 1; day <= safeGameDay; day += 1) {
    const point = generateNextPricePoint(company, previousClose, day, marketSeed);
    history.push(point);
    previousClose = point.closePrice;
  }

  return history;
}

export function getStockBySymbolForGameDay(
  symbol: string,
  gameDay: number,
  marketSeed?: string | null
): Stock | undefined {
  const company = getCompanyBySymbol(symbol);

  if (!company) return undefined;

  const safeGameDay = normalizeGameDay(gameDay);
  const history = getStockHistoryBySymbol(symbol, safeGameDay, marketSeed);
  const today = history[history.length - 1];
  const yesterday = history[history.length - 2];

  const previousPrice = yesterday?.closePrice ?? company.startingPrice;
  const currentPrice = today?.closePrice ?? company.startingPrice;
  const dayChange = currentPrice - previousPrice;
  const dayChangePercent = (dayChange / previousPrice) * 100;

  return {
    ...company,
    currentPrice: round2(currentPrice),
    previousPrice: round2(previousPrice),
    dayChange: round2(dayChange),
    dayChangePercent: round2(dayChangePercent),
    volume: today?.volume ?? 0,
    eventImpact: today?.eventImpact ?? 0,
  };
}

export function getStocksForGameDay(gameDay: number, marketSeed?: string | null): Stock[] {
  const safeGameDay = normalizeGameDay(gameDay);

  return mockStockCompanies
    .filter((company) => company.isActive)
    .map((company) => getStockBySymbolForGameDay(company.symbol, safeGameDay, marketSeed))
    .filter(Boolean) as Stock[];
}

export function getNewsForGameDay(gameDay: number, marketSeed?: string | null): MarketNews[] {
  const safeGameDay = normalizeGameDay(gameDay);

  if (safeGameDay <= STORY_DAYS) {
    return hardcodedOpeningNews.filter((news) => news.gameDay === safeGameDay).map(enrichMarketNews);
  }

  const arcNews = getStoryArcNewsForGameDay(safeGameDay, marketSeed);
  const generatedNews = mockStockCompanies
    .map((company) => generateEventForCompany(company, safeGameDay, marketSeed))
    .filter((news): news is MarketNews => Boolean(news))
    .filter((news) => !arcNews.some((storyNews) => storyNews.newsId === news.newsId));
  const followUps = mockStockCompanies
    .map((company) => generateFollowUpForCompany(company, safeGameDay, marketSeed))
    .filter((news): news is MarketNews => Boolean(news));

  return uniqueMarketNews([...arcNews, ...generatedNews, ...followUps]).map(enrichMarketNews);
}

export function getMarketEventSeedsForGameDay(
  gameDay: number,
  marketSeed?: string | null
): MarketEventSeed[] {
  return getNewsForGameDay(gameDay, marketSeed).map(marketNewsToSeed);
}

export function getNewsUpToGameDay(gameDay: number, marketSeed?: string | null): MarketNews[] {
  const safeGameDay = normalizeGameDay(gameDay);
  const news: MarketNews[] = [];

  for (let day = 1; day <= safeGameDay; day += 1) {
    news.push(...getNewsForGameDay(day, marketSeed));
  }

  return news;
}

export function getMarketEventSeedsUpToGameDay(
  gameDay: number,
  marketSeed?: string | null
): MarketEventSeed[] {
  const safeGameDay = normalizeGameDay(gameDay);
  const seeds: MarketEventSeed[] = [];

  for (let day = 1; day <= safeGameDay; day += 1) {
    seeds.push(...getMarketEventSeedsForGameDay(day, marketSeed));
  }

  return uniqueMarketEventSeeds(seeds);
}

export function getThirtyDayMarketEventSeeds(marketSeed?: string | null) {
  return getMarketEventSeedsUpToGameDay(30, marketSeed);
}

export function generateThirtyDayMarketSeed(marketSeed?: string | null): ThirtyDayMarketSeed {
  const seedCode = normalizeMarketSeed(marketSeed);
  const stocks = mockStockCompanies.filter((company) => company.isActive);

  return {
    schemaVersion: 1,
    gameMode: "limited_30",
    seedCode,
    generatedDays: 30,
    storyArcs: getSelectedStoryArcKeys(seedCode),
    stocks,
    prices: stocks.flatMap((company) => (
      getStockHistoryBySymbol(company.symbol, 30, seedCode)
    )),
    events: getThirtyDayMarketEventSeeds(seedCode),
  };
}

export function getRelatedNewsBySymbol(
  symbol: string,
  gameDay: number,
  marketSeed?: string | null
): MarketNews[] {
  const safeGameDay = normalizeGameDay(gameDay);

  return getNewsUpToGameDay(safeGameDay, marketSeed).filter((news) =>
    news.relatedTickers.some(
      (ticker) => ticker.toLowerCase() === symbol.toLowerCase()
    )
  );
}
