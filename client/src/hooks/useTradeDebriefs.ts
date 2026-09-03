import { useEffect, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { addInboxMessage } from "../lib/inbox";
import { pushNotification } from "../lib/notifications";
import { supabase } from "../lib/supabase";
import { TradeJournalEntry } from "../lib/tradeJournal";

/** Delivers one delayed, outcome-based advisor review for each journaled trade. */
export function useTradeDebriefs() {
  const { user } = useAuth();
  const { gameDay, sessionId, getStock } = useGame();
  const processedRef = useRef("");

  useEffect(() => {
    if (!user || !sessionId || gameDay <= 1) return;
    const guard = `${sessionId}:${gameDay}`;
    if (processedRef.current === guard) return;
    processedRef.current = guard;

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("trade_journal_entries")
        .select("id, session_id, symbol, trade_type, quantity, execution_price, game_day, thesis, horizon_days, exit_plan, reviewed_day, created_at")
        .eq("session_id", sessionId)
        .is("reviewed_day", null)
        .lt("game_day", gameDay)
        .order("game_day", { ascending: true })
        .limit(25);
      if (cancelled || error || !data?.length) return;

      const due = (data as unknown as TradeJournalEntry[])
        .filter((entry) => entry.game_day + entry.horizon_days <= gameDay)
        .slice(0, 5);
      for (const raw of due) {
        const stock = getStock(raw.symbol);
        if (!stock) continue;
        const executionPrice = Number(raw.execution_price);
        const direction = raw.trade_type === "buy" ? 1 : -1;
        const outcomePct = executionPrice > 0
          ? direction * ((stock.currentPrice - executionPrice) / executionPrice) * 100
          : 0;
        const { error: updateError } = await supabase
          .from("trade_journal_entries")
          .update({ reviewed_day: gameDay })
          .eq("id", raw.id)
          .eq("user_id", user.id)
          .is("reviewed_day", null);
        if (updateError || cancelled) continue;

        const outcome = `${outcomePct >= 0 ? "+" : ""}${outcomePct.toFixed(1)}%`;
        const lesson = outcomePct > 2
          ? "The move has supported your decision so far. Check whether the original reasoning still holds before adding risk."
          : outcomePct < -2
            ? "The move has gone against your decision so far. Revisit the evidence and the condition that would prove the idea wrong."
            : "The price has not moved enough to confirm or reject the decision yet. Patience is part of the plan.";
        addInboxMessage(user.id, {
          id: `trade-debrief-${raw.id}`,
          from: "Your Advisor",
          subject: `Trade review: ${raw.symbol} ${outcome}`,
          body: [
            `On Day ${raw.game_day}, you ${raw.trade_type === "buy" ? "bought" : "sold"} ${raw.quantity} share${raw.quantity === 1 ? "" : "s"} at $${executionPrice.toFixed(2)}.`,
            raw.thesis ? `Your thesis: “${raw.thesis}”` : "You did not record a thesis for this trade.",
            raw.exit_plan ? `Your exit rule: “${raw.exit_plan}”` : "No exit rule was recorded.",
            `Current decision outcome: ${outcome}. ${lesson}`,
          ].join("\n\n"),
          category: "mission",
        });
        pushNotification({
          id: `trade-debrief-${raw.id}`,
          kind: "advisor",
          title: `Advisor reviewed ${raw.symbol}`,
          description: `${outcome} since your Day ${raw.game_day} ${raw.trade_type}.`,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [gameDay, getStock, sessionId, user]);
}
