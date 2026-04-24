export type Stock = {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previousPrice: number;
  volatility: number;
  description: string;
};

export type NewsEvent = {
  id: string;
  title: string;
  description: string;
  affectedSymbols: string[];
  impact: number; // positive or negative percentage
};

export type PortfolioItem = {
  symbol: string;
  shares: number;
};

export type Player = {
  cash: number;
  portfolio: PortfolioItem[];
  netWorth: number;
};