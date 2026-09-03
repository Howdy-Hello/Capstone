import { supabase } from "./supabase";

export type TradeJournalInput = {
  thesis: string;
  horizonDays: number;
  exitPlan: string;
};

export type TradeJournalEntry = {
  id: string;
  session_id: string;
  symbol: string;
  trade_type: "buy" | "sell";
  quantity: number;
  execution_price: number;
  game_day: number;
  thesis: string;
  horizon_days: number;
  exit_plan: string;
  reviewed_day: number | null;
  created_at: string;
};

export async function recordTradeJournalEntry(params: {
  sessionId: string;
  userId: string;
  symbol: string;
  tradeType: "buy" | "sell";
  quantity: number;
  executionPrice: number;
  gameDay: number;
  journal: TradeJournalInput;
}) {
  const { error } = await supabase.from("trade_journal_entries").insert({
    session_id: params.sessionId,
    user_id: params.userId,
    symbol: params.symbol,
    trade_type: params.tradeType,
    quantity: params.quantity,
    execution_price: params.executionPrice,
    game_day: params.gameDay,
    thesis: params.journal.thesis.trim().slice(0, 500),
    horizon_days: Math.min(365, Math.max(1, params.journal.horizonDays)),
    exit_plan: params.journal.exitPlan.trim().slice(0, 500),
  });
  return !error;
}
