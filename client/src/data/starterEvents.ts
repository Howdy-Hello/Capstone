import { NewsEvent } from "../types/gameTypes";

export const starterEvents: NewsEvent[] = [
  {
    id: "1",
    title: "AI Breakthrough Announced",
    description: "Tech companies rise after a major AI innovation.",
    affectedSymbols: ["NVT"],
    impact: 0.12
  },
  {
    id: "2",
    title: "Energy Prices Fall",
    description: "Renewable energy companies drop slightly after lower energy demand.",
    affectedSymbols: ["GVE"],
    impact: -0.08
  },
  {
    id: "3",
    title: "New Health Product Approved",
    description: "Healthcare companies rise after a successful product approval.",
    affectedSymbols: ["MCH"],
    impact: 0.1
  }
];