import { NewsEvent } from "../types/gameTypes";

export const starterEvents: NewsEvent[] = [
  {
    id: "1",
    title: "AI Breakthrough Announced",
    description:
      "Closed Ai and related technology companies rise after stronger enterprise demand for AI workflow tools.",
    affectedSymbols: ["CAI"],
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
  },
  {
    id: "4",
    title: "Chip Orders Accelerate",
    description:
      "Inter Corporation receives stronger server-chip order indications as data-center customers expand AI capacity.",
    affectedSymbols: ["ITC"],
    impact: 0.09
  },
  {
    id: "5",
    title: "Early Biotech Trial Data Improves",
    description:
      "BioCloud reports promising early therapy data, creating optimism but leaving investors aware of trial risk.",
    affectedSymbols: ["BCL"],
    impact: 0.11
  },
  {
    id: "6",
    title: "Port Delays Pressure Freight",
    description:
      "FreightFlex faces shipment delays and possible contract penalties after congestion slows key routes.",
    affectedSymbols: ["FRX"],
    impact: -0.07
  },
  {
    id: "7",
    title: "Grocery Supply Deal Signed",
    description:
      "AgriPure wins a private-label grocery contract that may support steady volume during cautious consumer spending.",
    affectedSymbols: ["AGR"],
    impact: 0.05
  },
  {
    id: "8",
    title: "Solar Project Approvals Delayed",
    description:
      "SolarDawn falls after grid-connection approvals take longer than expected, delaying revenue from two projects.",
    affectedSymbols: ["SLD"],
    impact: -0.06
  }
];
