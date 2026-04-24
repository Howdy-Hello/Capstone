import { Stock } from "../types/gameTypes";

export const starterStocks: Stock[] = [
  {
    id: "1",
    name: "NovaTech",
    symbol: "NVT",
    price: 120,
    previousPrice: 120,
    volatility: 0.05,
    description: "A technology company inspired by real-life software and AI companies."
  },
  {
    id: "2",
    name: "GreenVolt Energy",
    symbol: "GVE",
    price: 75,
    previousPrice: 75,
    volatility: 0.04,
    description: "A renewable energy company affected by climate policies and energy demand."
  },
  {
    id: "3",
    name: "MediCore Health",
    symbol: "MCH",
    price: 95,
    previousPrice: 95,
    volatility: 0.03,
    description: "A healthcare company affected by medical breakthroughs and government funding."
  }
];