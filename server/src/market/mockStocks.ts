// GENERATED from client/src/data/mockStocks.ts by scripts/sync-market-engine.cjs.
// Do not edit here -- edit the client file and re-run the script.
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
    headline: "Closed Ai jumps as AI software demand improves",
    body:
      "Closed Ai says enterprise customers are expanding AI workflow subscriptions after a stronger pilot-conversion quarter. Traders are watching whether new contracts can offset high research spending.",
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
    headline: "CyberFort rallies as cybersecurity spending rises",
    body:
      "A sector survey shows security budgets rising after several large companies approved cloud-protection upgrades. CyberFort may benefit because most of its revenue comes from recurring enterprise contracts.",
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
    headline: "SkyBridge falls as fuel costs pressure airline margins",
    body:
      "Jet fuel prices moved higher while winter weather delayed several major routes. Investors worry SkyBridge may need to discount fares even as operating costs rise.",
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
    headline: "Inter Corporation gains after server-chip order report",
    body:
      "Component suppliers say Inter Corporation increased production reservations for its next AI accelerator. The report improves confidence in near-term chip demand, although capacity constraints remain a risk.",
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
    headline: "FreightFlex slips as port delays slow shipments",
    body:
      "FreightFlex warned customers that port congestion and driver shortages could extend delivery times. The update raises concern that contract penalties may weigh on quarterly margins.",
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
    headline: "Closed Ai drops as major customer pauses rollout",
    body:
      "Closed Ai's largest enterprise customer paused a planned expansion while it reviews costs and data controls. The original contracts remain active, but the delay weakens the near-term growth case that lifted the shares yesterday.",
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
    headline: "MediCore rises after new diagnostic product approval",
    body:
      "MediCore received approval for a diagnostic scanner aimed at regional clinics. The product may improve long-term sales, but investors are still watching launch costs and hospital purchasing cycles.",
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
      "AquaLife won a multi-year city water infrastructure contract that adds predictable project revenue. The deal also gives the company a stronger reference customer for future municipal bids.",
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
    headline: "GreenVolt slips as renewable demand forecast weakens",
    body:
      "Analysts lowered near-term demand expectations for renewable energy storage projects after utilities delayed purchasing decisions. GreenVolt may still grow long term, but traders are reacting to slower order timing.",
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
    headline: "AgriPure rises after private-label grocery deal",
    body:
      "AgriPure signed a supply agreement with a national grocery chain for frozen meals and pantry staples. The contract is not flashy, but it may support steady volume during a cautious consumer market.",
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
    headline: "SolarDawn dips after grid-connection delay",
    body:
      "SolarDawn disclosed that two utility-scale projects are waiting longer for grid-connection approval. The assets are still expected to proceed, but delayed revenue recognition may pressure the stock.",
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
    headline: "Closed Ai stabilizes after independent controls audit",
    body:
      "An independent review found no material data-control failures in Closed Ai's platform. The update does not immediately restore the paused rollout, but it reduces one risk behind yesterday's selloff.",
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
      "RoboWorks signed a warehouse automation deal with a large logistics operator. The contract includes robotic picking systems and maintenance services, giving investors more confidence in recurring revenue.",
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
    headline: "PineApple gains ahead of product cycle optimism",
    body:
      "Supplier checks point to stronger device demand ahead of PineApple's next product cycle. Investors are also watching whether premium pricing can hold if consumer spending weakens.",
    importance: "Medium",
    marketTone: "Bullish",
    relatedTickers: ["PAP"],
    expectedImpact: 0.04,
    actualImpact: 0.032,
    isAccurate: true,
    isRumor: false,
    category: "product",
  },
  {
    newsId: "story_day3_omg_content_costs",
    gameDay: 3,
    source: NEWS_PUBLISHERS.cynTimes,
    headline: "OmniMedia weakens after content cost concerns",
    body:
      "Analysts warned that rising content costs may pressure OmniMedia's margins. Subscriber growth remains positive, but investors worry that more spending is needed to compete for major releases.",
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
    headline: "Mount. Para Pictures slides as production costs rise",
    body:
      "Mount. Para Pictures reported higher production and marketing costs for its upcoming release slate. Strong audience interest could still support ticket sales, but investors are concerned about pressure on studio margins.",
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
    headline: "BioCloud climbs after early trial data improves",
    body:
      "BioCloud released early-stage therapy data showing stronger patient response rates than its prior study. The trial is still small, so traders are balancing optimism with biotech execution risk.",
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
    headline: "SolarDawn rebounds on tax-credit clarification",
    body:
      "A new policy clarification suggests SolarDawn's delayed projects may still qualify for clean-energy credits. The update reduces some financing concern after yesterday's grid-connection delay.",
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
    headline: "FreightFlex falls after retail shipment warning",
    body:
      "Several retail customers lowered shipment volume forecasts for the next month. FreightFlex may need to run its network with lower utilization, which can pressure profit margins.",
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
      "Refinery issues and shipping delays raised concern that fuel supplies could tighten over the next several weeks. Energy names attracted buyers, while airlines and freight operators came under pressure from higher expected operating costs.",
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
      "Gas prices climbed across several regions as summer travel demand met tighter fuel supply. Travel shares weakened, delivery companies warned about route costs, and consumer names slipped as households prepared for higher weekly expenses.",
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
      "Airlines warned that sustained fuel increases could force higher ticket prices or weaker margins. Investors marked down SkyBridge sharply while fuel-sensitive logistics firms stayed volatile.",
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
      "Freight and delivery companies added temporary fuel surcharges to protect margins. The move may help profits later, but customers pushed back and retailers warned that shipping costs could weigh on demand.",
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
      "Officials discussed emergency fuel reserves and temporary tax relief to slow the rise in gas prices. Energy stocks cooled as traders priced in policy pressure, while travel and consumer shares recovered part of their losses.",
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
      "Fuel prices stabilized as supply improved and emergency measures reduced market anxiety. Travel and logistics shares rebounded, but energy names gave back some earlier gains as the spike faded.",
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
      "A payment network breach at several retailers pushed boards to accelerate security reviews. Cybersecurity vendors gained as investors expected emergency software spending, while consumer and banking names slipped on fraud and remediation risk.",
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
      "Retailers, banks, and media platforms began signing short-cycle cybersecurity contracts after the breach widened. CyberFort and Closed Ai benefited from demand for monitoring tools, while OmniMedia faced scrutiny over account-protection costs.",
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
      "Investigators said the payment breach appeared contained, reducing the risk of a broader consumer pullback. Retail and banking shares recovered some losses, while cybersecurity stocks cooled after a sharp run-up.",
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
      "Inflation came in above forecasts, raising expectations that borrowing costs could stay elevated. Banks gained on higher rate assumptions, while real estate, solar projects, and expensive growth stocks sold off.",
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
      "Mortgage applications and home-tour traffic weakened after rate expectations moved higher. Century 22 fell on rental-growth concerns, while defensive utilities and grocery stocks held up better than the broader market.",
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
      "Officials suggested they could pause further tightening if inflation continues to moderate. Real estate and solar shares bounced as financing fears eased, while banks gave back part of their rate-driven gains.",
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
      "BioCloud released encouraging trial data for a targeted therapy platform, lifting healthcare risk appetite. Medical device supplier MediCore rose in sympathy as investors looked for follow-on diagnostic demand.",
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
      "Regulators requested additional detail on patient selection and monitoring in BioCloud's trial. The request did not stop the program, but traders marked down biotech risk and rotated toward steadier healthcare revenue.",
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
      "BioCloud announced partner funding to support the next phase of its trial program. The deal reduced dilution concerns, helped MediCore on diagnostics expectations, and lifted risk appetite across smaller growth names.",
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
    relatedTickers, expectedImpact: 0, actualImpact: 0, isAccurate: true, isRumor: false,
    category, impactByTicker,
  };
}

const consumerSlowdownStoryNews = [
  arcEvent("arc_consumer_day7_spending", 7, "Household spending loses momentum", "Card and retail data point to more cautious discretionary spending, pressuring premium brands while staples remain steadier.", "macro", { LUX: -0.035, FDM: 0.012, AGR: 0.01 }),
  arcEvent("arc_consumer_day12_discounting", 12, "Retailers turn to discounts as demand softens", "Promotions may protect sales volumes but put margins at risk across consumer businesses.", "operations", { LUX: -0.04, FDM: -0.012, AGR: -0.008 }),
];
const supplyChainStoryNews = [
  arcEvent("arc_supply_day9_delays", 9, "Port congestion disrupts component deliveries", "Manufacturers and freight operators warn that delayed inputs could push revenue into later periods.", "supply", { ITC: -0.034, PAP: -0.022, FRX: 0.018 }),
  arcEvent("arc_supply_day15_normalizes", 15, "Shipping backlogs begin to clear", "Improving delivery times ease production risk and reduce emergency freight costs.", "supply", { ITC: 0.03, PAP: 0.02, FRX: -0.012 }),
];
const takeoverStoryNews = [
  arcEvent("arc_takeover_day11_report", 11, "Takeover talks emerge around OmniMedia", "Sources say a larger entertainment group is studying a bid, though no agreement has been announced.", "merger", { OMG: 0.045, HLW: 0.012 }, NEWS_PUBLISHERS.reddot),
  arcEvent("arc_takeover_day17_update", 17, "OmniMedia board opens formal deal talks", "The board confirmed discussions while warning that financing and regulatory review could still derail a transaction.", "merger", { OMG: 0.055, HLW: -0.012 }, NEWS_PUBLISHERS.officialWire),
];
const laborStrikeStoryNews = [
  arcEvent("arc_labor_day8_vote", 8, "Transport workers authorize strike action", "Airline and freight unions authorize leaders to call a strike if negotiations fail.", "labor", { SKY: -0.028, FRX: -0.022 }),
  arcEvent("arc_labor_day14_talks", 14, "Contract talks enter final mediation", "A last round of mediation lowers immediate disruption risk but leaves wage pressure unresolved.", "labor", { SKY: 0.02, FRX: 0.018 }),
];
const regulationStoryNews = [
  arcEvent("arc_regulation_day10_proposal", 10, "Officials propose tighter digital-platform rules", "The proposal could raise compliance costs for technology and media firms if adopted.", "regulatory", { CAI: -0.02, OMG: -0.025, CYB: 0.012 }),
  arcEvent("arc_regulation_day23_revision", 23, "Revised technology rules narrow compliance burden", "Lawmakers removed several costly provisions while retaining stronger security requirements.", "regulatory", { CAI: 0.018, OMG: 0.015, CYB: 0.01 }),
];
const weatherStoryNews = [
  arcEvent("arc_weather_day6_warning", 6, "Severe weather threatens travel and power networks", "Forecasts raise cancellation risk for airlines while increasing demand for resilient utilities.", "macro", { SKY: -0.032, AQL: 0.015, GVE: 0.012 }),
  arcEvent("arc_weather_day9_damage", 9, "Storm damage disrupts routes and local infrastructure", "Initial assessments show transport delays but manageable utility damage.", "operations", { SKY: -0.025, FRX: -0.018, AQL: 0.02 }),
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
      "The company beat analyst expectations after stronger customer demand and better operating discipline. Traders are watching whether management can repeat the performance next quarter.",
    impactMin: 0.035,
    impactMax: 0.09,
    isRumor: false,
  },
  {
    category: "contract" as EventCategory,
    importance: "High" as Importance,
    headline: "wins a major new contract",
    body:
      "Investors reacted positively after the company announced a multi-year contract that may increase future revenue visibility. The market is still weighing the cost of delivering the project.",
    impactMin: 0.025,
    impactMax: 0.075,
    isRumor: false,
  },
  {
    category: "product" as EventCategory,
    importance: "Medium" as Importance,
    headline: "sees strong demand after product update",
    body:
      "The latest product update improved investor confidence after early customers reported better performance and reliability. Strong adoption could support revenue growth if supply and service costs stay controlled.",
    impactMin: 0.015,
    impactMax: 0.055,
    isRumor: false,
  },
  {
    category: "partnership" as EventCategory,
    importance: "Medium" as Importance,
    headline: "is reportedly close to a strategic partnership",
    body:
      "Sources suggest the company may announce a strategic partnership soon. The report is not confirmed, so traders may react quickly if the company denies or delays the announcement.",
    impactMin: 0.01,
    impactMax: 0.045,
    isRumor: true,
  },
  {
    category: "earnings" as EventCategory,
    importance: "High" as Importance,
    headline: "raises full-year guidance",
    body:
      "Management lifted its revenue and profit outlook for the year, citing durable demand and improving margins. Guidance raises often matter more than a single quarter because they reset expectations for several periods ahead.",
    impactMin: 0.03,
    impactMax: 0.08,
    isRumor: false,
  },
  {
    category: "analyst" as EventCategory,
    importance: "Medium" as Importance,
    headline: "receives an analyst upgrade to Buy",
    body:
      "A major brokerage upgraded the stock, arguing the market underappreciates the company's growth runway. Upgrades can attract momentum buyers, though the move fades if fundamentals don't follow.",
    impactMin: 0.012,
    impactMax: 0.05,
    isRumor: false,
  },
  {
    category: "capital" as EventCategory,
    importance: "Medium" as Importance,
    headline: "announces a share buyback and dividend increase",
    body:
      "The board approved a buyback and a higher dividend, signalling confidence in cash flow. Returning capital can support the share price, but it also means less cash reinvested in growth.",
    impactMin: 0.01,
    impactMax: 0.04,
    isRumor: false,
  },
  {
    category: "regulatory" as EventCategory,
    importance: "High" as Importance,
    headline: "wins regulatory approval for a key product",
    body:
      "Regulators cleared a flagship product, removing a major overhang and opening a new revenue line. Approval-driven moves can be large because the outcome was previously uncertain.",
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
      "Investors became cautious after reports of a legal issue that may create settlement costs, management distraction, or reputational damage. The company has not yet provided detailed financial guidance.",
    impactMin: -0.095,
    impactMax: -0.035,
    isRumor: false,
  },
  {
    category: "supply" as EventCategory,
    importance: "High" as Importance,
    headline: "warns of short-term supply delays",
    body:
      "The company warned that supplier delays may push some shipments into a later quarter. Demand has not disappeared, but delayed deliveries can still reduce near-term revenue expectations.",
    impactMin: -0.075,
    impactMax: -0.025,
    isRumor: false,
  },
  {
    category: "macro" as EventCategory,
    importance: "Medium" as Importance,
    headline: "falls as sector outlook weakens",
    body:
      "Analysts lowered expectations for the broader sector after new economic data suggested slower demand. The company may remain volatile until investors see whether its own results can resist the trend.",
    impactMin: -0.055,
    impactMax: -0.015,
    isRumor: false,
  },
  {
    category: "rumor" as EventCategory,
    importance: "Medium" as Importance,
    headline: "drops after an unconfirmed negative report",
    body:
      "An unconfirmed report created uncertainty around the company's near-term outlook. Because management has not released an official statement, the move may reverse if the rumor proves exaggerated.",
    impactMin: -0.045,
    impactMax: -0.01,
    isRumor: true,
  },
  {
    category: "earnings" as EventCategory,
    importance: "High" as Importance,
    headline: "misses earnings and cuts guidance",
    body:
      "The company missed estimates and lowered its outlook, a combination the market treats harshly because it questions both execution and the forward story. Recovery usually depends on the next quarter's results.",
    impactMin: -0.1,
    impactMax: -0.04,
    isRumor: false,
  },
  {
    category: "regulatory" as EventCategory,
    importance: "High" as Importance,
    headline: "faces a regulatory investigation",
    body:
      "Regulators opened an investigation into the company's practices. Even before any finding, the uncertainty and potential fines can weigh on the stock until the scope becomes clearer.",
    impactMin: -0.085,
    impactMax: -0.03,
    isRumor: false,
  },
  {
    category: "product" as EventCategory,
    importance: "High" as Importance,
    headline: "issues a product recall over safety concerns",
    body:
      "A recall raises direct costs and reputational risk. The market weighs whether it's a contained, one-off issue or a sign of deeper quality problems.",
    impactMin: -0.08,
    impactMax: -0.025,
    isRumor: false,
  },
  {
    category: "management" as EventCategory,
    importance: "Medium" as Importance,
    headline: "slides after a surprise executive departure",
    body:
      "A senior leader is leaving unexpectedly. Departures can spook investors when they suggest internal disagreement or trouble that isn't yet public.",
    impactMin: -0.05,
    impactMax: -0.015,
    isRumor: false,
  },
  {
    category: "capital" as EventCategory,
    importance: "Medium" as Importance,
    headline: "falls after announcing a dilutive share sale",
    body:
      "The company plans to raise capital by issuing new shares, diluting existing holders. It shores up the balance sheet but signals the business needs cash on hand.",
    impactMin: -0.055,
    impactMax: -0.02,
    isRumor: false,
  },
];

const sectorEventCopy: Partial<Record<string, {
  bullish: Array<{ headline: string; body: string }>;
  bearish: Array<{ headline: string; body: string }>;
}>> = {
  Technology: {
    bullish: [
      { headline: "reports accelerating enterprise adoption", body: "Customer usage and recurring software demand improved, strengthening expectations for future revenue." },
      { headline: "unveils a more efficient platform", body: "Early benchmarks suggest the new platform could improve performance while lowering customer operating costs." },
    ],
    bearish: [
      { headline: "investigates a service outage", body: "A service disruption raised reliability concerns and may trigger customer credits or delayed deployments." },
      { headline: "faces tighter component availability", body: "Limited supply may constrain shipments even though underlying customer demand remains intact." },
    ],
  },
  Healthcare: {
    bullish: [
      { headline: "reports encouraging clinical evidence", body: "New patient data improved confidence in the program, though larger studies are still required." },
      { headline: "wins clearance for a medical product", body: "Regulatory clearance removes a key uncertainty and allows commercial launch preparations to begin." },
    ],
    bearish: [
      { headline: "pauses enrollment after a safety review", body: "The review may delay development while investigators determine whether the issue is isolated." },
      { headline: "receives additional regulator questions", body: "The request extends the review timeline and increases uncertainty around approval." },
    ],
  },
  Finance: {
    bullish: [{ headline: "reports improving credit quality", body: "Lower delinquencies reduced expected loan losses and supported the earnings outlook." }],
    bearish: [{ headline: "raises provisions for loan losses", body: "Management increased reserves as borrowers showed more financial stress." }],
  },
  Travel: {
    bullish: [{ headline: "sees stronger booking demand", body: "Forward bookings improved while capacity discipline supported ticket pricing." }],
    bearish: [{ headline: "warns of higher fuel and route costs", body: "Operating costs rose faster than fares, putting near-term margins under pressure." }],
  },
  Industrials: {
    bullish: [{ headline: "expands its order backlog", body: "New customer orders improved factory visibility and future service revenue." }],
    bearish: [{ headline: "faces production and delivery delays", body: "Parts shortages and logistics problems may postpone customer acceptance and revenue." }],
  },
  Consumer: {
    bullish: [{ headline: "gains market share as demand improves", body: "Sales data show stronger customer traffic and resilient pricing." }],
    bearish: [{ headline: "turns to promotions as demand cools", body: "Discounting may support volume but creates new pressure on profit margins." }],
  },
  Communication: {
    bullish: [{ headline: "draws a larger audience for new releases", body: "Engagement and advertising demand improved around the latest content slate." }],
    bearish: [{ headline: "faces rising content and subscriber costs", body: "Higher spending may be needed to defend audience share in a competitive market." }],
  },
  Energy: {
    bullish: [{ headline: "adds a major project to its development pipeline", body: "The project expands future capacity, subject to financing and connection timelines." }],
    bearish: [{ headline: "reports a permitting setback", body: "A delayed permit pushes expected construction and revenue milestones further out." }],
  },
};

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
      headline: `${event.headline} — expected resolution falters`,
      body: `${event.body} New evidence challenges the expected resolution, reversing part of the market's earlier assumption.`,
      marketTone: "Unclear" as MarketTone,
      impactByTicker,
      arcKey,
      branch,
    };
  });
}

function getSelectedStoryArcDefinitions(marketSeed?: string | null) {
  const seedCode = normalizeMarketSeed(marketSeed);
  const arcCount = 2 + Math.floor(seededRandom("story-arc-count", seedCode) * 3);

  return [...storyArcDefinitions]
    .sort((a, b) => {
      const scoreA =
        seededRandom(`story-arc-rank-${a.arcKey}`, seedCode) * a.selectionWeight;
      const scoreB =
        seededRandom(`story-arc-rank-${b.arcKey}`, seedCode) * b.selectionWeight;

      return scoreB - scoreA;
    })
    .slice(0, arcCount)
    .map((arc) => ({ ...arc, events: branchArcEvents(arc.arcKey, arc.events, seedCode) }));
}

export function getSelectedStoryArcKeys(marketSeed?: string | null) {
  return getSelectedStoryArcDefinitions(marketSeed).map((arc) => arc.arcKey);
}

function getStoryArcNewsForGameDay(gameDay: number, marketSeed?: string | null) {
  return getSelectedStoryArcDefinitions(marketSeed)
    .flatMap((arc) => arc.events)
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
    ? "Quarterly results beat analyst expectations on both revenue and profit, with management pointing to strong underlying demand."
    : outcome === "miss"
    ? "Quarterly results fell short of analyst expectations, with management citing softer demand and margin pressure."
    : "Quarterly results landed roughly in line with analyst expectations, with no major surprises on revenue or profit.";

  return {
    newsId: `news_earnings_${company.symbol.toLowerCase()}_${gameDay}`,
    gameDay,
    source: NEWS_PUBLISHERS.officialWire,
    headline,
    body,
    importance: outcome === "meet" ? "Medium" : "High",
    marketTone: actualImpact >= 0 ? "Bullish" : "Bearish",
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
  const sectorPool = sectorEventCopy[company.sector]?.[actualImpact >= 0 ? "bullish" : "bearish"];
  const sectorCopy = sectorPool?.[
    Math.floor(seededRandom(`sector-copy-${company.symbol}-${gameDay}`, marketSeed) * sectorPool.length)
  ];

  return {
    newsId: `news_${company.symbol.toLowerCase()}_${gameDay}`,
    gameDay,
    source: getNewsSource(company, template, gameDay, marketSeed),
    headline: `${company.name} ${sectorCopy?.headline ?? template.headline}`,
    body: sectorCopy?.body ?? template.body,
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
  if (seededRandom(`follow-up-roll-${company.symbol}-${gameDay}`, marketSeed) > 0.55) return null;

  const confirmed = original.isAccurate && seededRandom(`follow-up-outcome-${company.symbol}-${gameDay}`, marketSeed) > 0.25;
  const originalImpact = original.impactByTicker?.[company.symbol]?.actualImpact ?? original.actualImpact;
  const actualImpact = originalImpact * (confirmed ? 0.45 : -0.75);
  return {
    newsId: `followup_${original.newsId}_${gameDay}`,
    gameDay,
    source: NEWS_PUBLISHERS.officialWire,
    headline: confirmed
      ? `${company.name} confirms key details in developing report`
      : `${company.name} challenges earlier report as facts change`,
    body: confirmed
      ? "An official update supports the central claim in yesterday's report, although execution risk remains."
      : "The company supplied new evidence that contradicts the earlier account, increasing the chance of a price reversal.",
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
