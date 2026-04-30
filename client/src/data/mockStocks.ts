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
  | "operations";

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
};

export type OpeningStoryDay = {
  gameDay: number;
  title: string;
  summary: string;
  rising: string[];
  falling: string[];
  playerHint: string;
};

export const SEASON_LENGTH = 30;
export const STORY_DAYS = 3;

export const openingStoryDays: OpeningStoryDay[] = [
  {
    gameDay: 1,
    title: "Day 1: Tech confidence returns",
    summary:
      "The market opens with optimism around AI software and cybersecurity. Travel stocks start weak because fuel and weather concerns pressure airlines.",
    rising: ["NVT", "CYB", "RBT", "PAP"],
    falling: ["SKY", "MIN", "OMG"],
    playerHint:
      "Growth stocks start strong, but high-risk names can reverse quickly. Watch the tech names before buying too aggressively.",
  },
  {
    gameDay: 2,
    title: "Day 2: Defensive money rotates in",
    summary:
      "Healthcare, utilities, grocery, and education stocks receive buying interest. Energy and airlines weaken as demand and fuel concerns return.",
    rising: ["MCH", "AQL", "FDM", "EDU", "HOM"],
    falling: ["GVE", "SKY", "MIN"],
    playerHint:
      "Defensive stocks may be safer when the market looks mixed. Look at margins, debt, and dividend yield before deciding.",
  },
  {
    gameDay: 3,
    title: "Day 3: Risk appetite comes back",
    summary:
      "Investors return to higher-growth stocks after strong product and partnership rumors. Luxury and media stocks underperform after valuation concerns.",
    rising: ["CYB", "RBT", "NVT", "GVE", "PAP"],
    falling: ["LUX", "OMG", "URB", "HOM"],
    playerHint:
      "Momentum is improving, but some stocks may already be expensive. Compare price movement with P/E ratio and revenue growth.",
  },
];

export function getOpeningStoryDays() {
  return openingStoryDays;
}

export const mockStockCompanies: StockCompany[] = [
  {
    stockId: "stock_nvt",
    symbol: "NVT",
    name: "NovaTech",
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
    symbol: "HOM",
    name: "HomeBase Realty",
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
];

const hardcodedFirstThreeDayCloses: Record<string, Record<number, number>> = {
  NVT: { 1: 104.8, 2: 106.95, 3: 112.65 },
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
  LUX: { 1: 147.4, 2: 149.1, 3: 144.8 },
  MIN: { 1: 70.55, 2: 68.9, 3: 69.3 },
  HOM: { 1: 51.2, 2: 52.55, 3: 51.65 },
  EDU: { 1: 37.35, 2: 39.15, 3: 40.05 },
};

const hardcodedOpeningNews: MarketNews[] = [
  {
    newsId: "story_day1_nvt_ai_demand",
    gameDay: 1,
    source: "MarketWatch Daily",
    headline: "NovaTech jumps as AI software demand improves",
    body:
      "Investors buy NovaTech after enterprise customers increase spending on AI workflow tools.",
    importance: "High",
    marketTone: "Bullish",
    relatedTickers: ["NVT"],
    expectedImpact: 0.06,
    actualImpact: 0.048,
    isAccurate: true,
    isRumor: false,
    category: "product",
  },
  {
    newsId: "story_day1_cyb_security_spending",
    gameDay: 1,
    source: "Sector Brief",
    headline: "CyberFort rallies as cybersecurity spending rises",
    body:
      "Cybersecurity budgets are expected to rise after several large enterprise security upgrades.",
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
    source: "Airline Market Brief",
    headline: "SkyBridge falls as fuel costs pressure airline margins",
    body:
      "Higher fuel costs and weather disruption reduce confidence in airline profit margins.",
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
    newsId: "story_day2_mch_product_approval",
    gameDay: 2,
    source: "Health Finance Wire",
    headline: "MediCore rises after new diagnostic product approval",
    body:
      "MediCore gains after receiving product approval that may improve long-term sales.",
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
    source: "Infrastructure Daily",
    headline: "AquaLife wins city water infrastructure contract",
    body:
      "AquaLife receives a public infrastructure contract, improving revenue visibility.",
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
    source: "Global Energy Brief",
    headline: "GreenVolt slips as renewable demand forecast weakens",
    body:
      "Analysts lower near-term demand expectations for renewable energy storage projects.",
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
    newsId: "story_day3_rbt_factory_contract",
    gameDay: 3,
    source: "Automation Wire",
    headline: "RoboWorks wins warehouse automation deal",
    body:
      "RoboWorks rallies after signing a major automation deal with a logistics operator.",
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
    source: "Phone Viewer",
    headline: "PineApple gains ahead of product cycle optimism",
    body:
      "Investors expect stronger device demand after early signs of a successful product cycle.",
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
    source: "Media Market Desk",
    headline: "OmniMedia weakens after content cost concerns",
    body:
      "Rising content costs create margin concerns for the streaming media company.",
    importance: "Medium",
    marketTone: "Bearish",
    relatedTickers: ["OMG"],
    expectedImpact: -0.035,
    actualImpact: -0.034,
    isAccurate: true,
    isRumor: false,
    category: "operations",
  },
];

const newsSources = [
  "MarketWatch Daily",
  "Investor Pulse",
  "Sector Brief",
  "Finance Wire",
  "Street Rumors",
  "Global Market Desk",
  "Trading Terminal",
];

const bullishTemplates = [
  {
    category: "earnings" as EventCategory,
    importance: "High" as Importance,
    headline: "reports stronger-than-expected earnings",
    body: "The company beat expectations after stronger demand and improved operating performance.",
    impactMin: 0.035,
    impactMax: 0.09,
    isRumor: false,
  },
  {
    category: "contract" as EventCategory,
    importance: "High" as Importance,
    headline: "wins a major new contract",
    body: "Investors reacted positively after the company announced a contract that may increase future revenue.",
    impactMin: 0.025,
    impactMax: 0.075,
    isRumor: false,
  },
  {
    category: "product" as EventCategory,
    importance: "Medium" as Importance,
    headline: "sees strong demand after product update",
    body: "The latest product update improved investor confidence and raised expectations for future growth.",
    impactMin: 0.015,
    impactMax: 0.055,
    isRumor: false,
  },
  {
    category: "partnership" as EventCategory,
    importance: "Medium" as Importance,
    headline: "is reportedly close to a strategic partnership",
    body: "Sources suggest the company may announce a partnership soon, though confirmation is still pending.",
    impactMin: 0.01,
    impactMax: 0.045,
    isRumor: true,
  },
];

const bearishTemplates = [
  {
    category: "lawsuit" as EventCategory,
    importance: "High" as Importance,
    headline: "faces pressure after legal concerns emerge",
    body: "Investors became cautious after reports of a legal issue that may affect near-term confidence.",
    impactMin: -0.095,
    impactMax: -0.035,
    isRumor: false,
  },
  {
    category: "supply" as EventCategory,
    importance: "High" as Importance,
    headline: "warns of short-term supply delays",
    body: "The company may face shipment delays that could reduce short-term revenue expectations.",
    impactMin: -0.075,
    impactMax: -0.025,
    isRumor: false,
  },
  {
    category: "macro" as EventCategory,
    importance: "Medium" as Importance,
    headline: "falls as sector outlook weakens",
    body: "Analysts lowered expectations for the sector, creating selling pressure across related stocks.",
    impactMin: -0.055,
    impactMax: -0.015,
    isRumor: false,
  },
  {
    category: "rumor" as EventCategory,
    importance: "Medium" as Importance,
    headline: "drops after an unconfirmed negative report",
    body: "A rumor created uncertainty, but the company has not released an official statement.",
    impactMin: -0.045,
    impactMax: -0.01,
    isRumor: true,
  },
];

function hashString(input: string) {
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: string) {
  const hash = hashString(seed);
  return (hash % 1_000_000) / 1_000_000;
}

function seededRange(seed: string, min: number, max: number) {
  return min + seededRandom(seed) * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function getSectorDrift(sector: string, gameDay: number) {
  const sectorWave = Math.sin((gameDay + hashString(sector) % 11) / 8) * 0.004;
  const sectorShock = seededRange(`sector-${sector}-${gameDay}`, -0.004, 0.004);

  return sectorWave + sectorShock;
}

function getMarketDrift(gameDay: number) {
  const longTermBias = 0.0007;
  const cycle = Math.sin(gameDay / 14) * 0.003;
  const randomMarketShock = seededRange(`market-${gameDay}`, -0.006, 0.006);

  return longTermBias + cycle + randomMarketShock;
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

function getEventTemplate(company: StockCompany, gameDay: number) {
  const eventRoll = seededRandom(`event-roll-${company.symbol}-${gameDay}`);

  const riskBoost =
    company.riskLevel === "High" ? 0.1 : company.riskLevel === "Medium" ? 0.05 : 0;

  const eventChance = 0.14 + riskBoost;

  if (eventRoll > eventChance) return null;

  const toneRoll = seededRandom(`event-tone-${company.symbol}-${gameDay}`);
  const isBullish = toneRoll >= 0.48;

  const templates = isBullish ? bullishTemplates : bearishTemplates;

  const index = Math.floor(
    seededRandom(`event-template-${company.symbol}-${gameDay}`) * templates.length
  );

  return templates[index];
}

function generateEventForCompany(
  company: StockCompany,
  gameDay: number
): MarketNews | null {
  if (gameDay <= STORY_DAYS) {
    return getHardcodedOpeningNewsForCompany(company, gameDay);
  }

  const template = getEventTemplate(company, gameDay);

  if (!template) return null;

  const sourceIndex = Math.floor(
    seededRandom(`source-${company.symbol}-${gameDay}`) * newsSources.length
  );

  const actualImpact = seededRange(
    `impact-${company.symbol}-${gameDay}`,
    template.impactMin,
    template.impactMax
  );

  const expectedImpact = actualImpact * seededRange(
    `expected-${company.symbol}-${gameDay}`,
    0.8,
    1.25
  );

  const marketTone: MarketTone = actualImpact >= 0 ? "Bullish" : "Bearish";

  return {
    newsId: `news_${company.symbol.toLowerCase()}_${gameDay}`,
    gameDay,
    source: newsSources[sourceIndex],
    headline: `${company.name} ${template.headline}`,
    body: template.body,
    importance: template.importance,
    marketTone,
    relatedTickers: [company.symbol],
    expectedImpact: round2(expectedImpact),
    actualImpact: round2(actualImpact),
    isAccurate: !template.isRumor || seededRandom(`accuracy-${company.symbol}-${gameDay}`) > 0.35,
    isRumor: template.isRumor,
    category: template.category,
  };
}

function getEventImpact(company: StockCompany, gameDay: number) {
  const event = generateEventForCompany(company, gameDay);
  return event?.actualImpact ?? 0;
}

function generateVolume(
  company: StockCompany,
  dailyReturn: number,
  eventImpact: number,
  gameDay: number
) {
  const baseVolume =
    company.riskLevel === "High"
      ? 1_200_000
      : company.riskLevel === "Medium"
      ? 850_000
      : 600_000;

  const activityBoost = Math.abs(dailyReturn) * 12;
  const eventBoost = Math.abs(eventImpact) > 0 ? 0.35 : 0;
  const randomBoost = seededRange(`volume-${company.symbol}-${gameDay}`, -0.12, 0.22);

  return Math.round(baseVolume * (1 + activityBoost + eventBoost + randomBoost));
}

function generateHardcodedOpeningPricePoint(
  company: StockCompany,
  previousClose: number,
  gameDay: number
): StockPriceHistory | null {
  const hardcodedClose = hardcodedFirstThreeDayCloses[company.symbol]?.[gameDay];

  if (!hardcodedClose) return null;

  const openPrice = previousClose;
  const closePrice = hardcodedClose;
  const dailyReturn = (closePrice - openPrice) / openPrice;
  const event = generateEventForCompany(company, gameDay);
  const eventImpact = event?.actualImpact ?? 0;

  const intradayRange =
    Math.abs(dailyReturn) * 0.35 +
    company.volatility * seededRange(`story-range-${company.symbol}-${gameDay}`, 0.18, 0.38);

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
    volume: generateVolume(company, dailyReturn, eventImpact, gameDay),
    change: round2(closePrice - openPrice),
    changePercent: round2(dailyReturn * 100),
    eventImpact: round2(eventImpact),
    eventId: event?.newsId,
  };
}

function generateNextPricePoint(
  company: StockCompany,
  previousClose: number,
  gameDay: number
): StockPriceHistory {
  const hardcoded = generateHardcodedOpeningPricePoint(
    company,
    previousClose,
    gameDay
  );

  if (hardcoded) return hardcoded;

  const marketDrift = getMarketDrift(gameDay);
  const sectorDrift = getSectorDrift(company.sector, gameDay);
  const randomShock =
    seededRange(`shock-${company.symbol}-${gameDay}`, -1, 1) * company.volatility;
  const eventImpact = getEventImpact(company, gameDay);

  let dailyReturn =
    marketDrift +
    sectorDrift +
    company.trendBias +
    randomShock +
    eventImpact;

  dailyReturn = clamp(dailyReturn, -0.15, 0.15);

  const openPrice = previousClose;
  const closePrice = Math.max(1, openPrice * (1 + dailyReturn));

  const intradayRange =
    Math.abs(dailyReturn) * 0.45 +
    company.volatility * seededRange(`range-${company.symbol}-${gameDay}`, 0.18, 0.5);

  const highPrice = Math.max(openPrice, closePrice) * (1 + intradayRange);
  const lowPrice = Math.min(openPrice, closePrice) * (1 - intradayRange * 0.8);

  const event = generateEventForCompany(company, gameDay);

  return {
    priceId: `price_${company.symbol.toLowerCase()}_${gameDay}`,
    stockId: company.stockId,
    symbol: company.symbol,
    gameDay,
    openPrice: round2(openPrice),
    highPrice: round2(highPrice),
    lowPrice: round2(Math.max(1, lowPrice)),
    closePrice: round2(closePrice),
    volume: generateVolume(company, dailyReturn, eventImpact, gameDay),
    change: round2(closePrice - openPrice),
    changePercent: round2(dailyReturn * 100),
    eventImpact: round2(eventImpact),
    eventId: event?.newsId,
  };
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
  gameDay: number
): StockPriceHistory[] {
  const company = getCompanyBySymbol(symbol);
  const safeGameDay = normalizeGameDay(gameDay);

  if (!company) return [];

  const history: StockPriceHistory[] = [];
  let previousClose = company.startingPrice;

  for (let day = 1; day <= safeGameDay; day += 1) {
    const point = generateNextPricePoint(company, previousClose, day);
    history.push(point);
    previousClose = point.closePrice;
  }

  return history;
}

export function getStockBySymbolForGameDay(
  symbol: string,
  gameDay: number
): Stock | undefined {
  const company = getCompanyBySymbol(symbol);

  if (!company) return undefined;

  const safeGameDay = normalizeGameDay(gameDay);
  const history = getStockHistoryBySymbol(symbol, safeGameDay);
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

export function getStocksForGameDay(gameDay: number): Stock[] {
  const safeGameDay = normalizeGameDay(gameDay);

  return mockStockCompanies
    .filter((company) => company.isActive)
    .map((company) => getStockBySymbolForGameDay(company.symbol, safeGameDay))
    .filter(Boolean) as Stock[];
}

export function getNewsForGameDay(gameDay: number): MarketNews[] {
  const safeGameDay = normalizeGameDay(gameDay);

  if (safeGameDay <= STORY_DAYS) {
    return hardcodedOpeningNews.filter((news) => news.gameDay === safeGameDay);
  }

  return mockStockCompanies
    .map((company) => generateEventForCompany(company, safeGameDay))
    .filter(Boolean) as MarketNews[];
}

export function getNewsUpToGameDay(gameDay: number): MarketNews[] {
  const safeGameDay = normalizeGameDay(gameDay);
  const news: MarketNews[] = [];

  for (let day = 1; day <= safeGameDay; day += 1) {
    news.push(...getNewsForGameDay(day));
  }

  return news;
}

export function getRelatedNewsBySymbol(
  symbol: string,
  gameDay: number
): MarketNews[] {
  const safeGameDay = normalizeGameDay(gameDay);

  return getNewsUpToGameDay(safeGameDay).filter((news) =>
    news.relatedTickers.some(
      (ticker) => ticker.toLowerCase() === symbol.toLowerCase()
    )
  );
}

export function getSeasonDay(gameDay: number) {
  const safeGameDay = normalizeGameDay(gameDay);
  return ((safeGameDay - 1) % SEASON_LENGTH) + 1;
}