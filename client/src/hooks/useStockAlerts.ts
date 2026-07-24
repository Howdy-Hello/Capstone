import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { supabase } from "../lib/supabase";
import { pushNotification } from "../lib/notifications";
import { money, pct } from "../theme/design";

export type AlertCondition = "price_above" | "price_below" | "pct_change_up" | "pct_change_down";

export type StockAlert = {
  id: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  createdAt: string;
};

export function describeAlert(alert: Pick<StockAlert, "condition" | "threshold">) {
  switch (alert.condition) {
    case "price_above": return `Price above ${money(alert.threshold)}`;
    case "price_below": return `Price below ${money(alert.threshold)}`;
    case "pct_change_up": return `Up ${alert.threshold}%+ today`;
    case "pct_change_down": return `Down ${alert.threshold}%+ today`;
    default: return "";
  }
}

export function useStockAlerts() {
  const { user } = useAuth();
  const { stocks, gameDay } = useGame();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setAlerts([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_stock_alerts")
      .select("id, symbol, condition, threshold, created_at")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error || !data) return;
    setAlerts(data.map((row: any) => ({
      id: row.id,
      symbol: row.symbol,
      condition: row.condition as AlertCondition,
      threshold: Number(row.threshold),
      createdAt: row.created_at,
    })));
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const createAlert = useCallback(async (symbol: string, condition: AlertCondition, threshold: number) => {
    if (!user || !Number.isFinite(threshold) || threshold < 0) return false;
    const { error } = await supabase.from("user_stock_alerts").insert({
      user_id: user.id, symbol, condition, threshold,
    });
    if (error) return false;
    await refresh();
    return true;
  }, [user, refresh]);

  const deleteAlert = useCallback(async (id: string) => {
    if (!user) return;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("user_stock_alerts").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  // Watch today's prices; any alert whose condition is now met fires a
  // notification and is marked inactive both locally and in Supabase.
  useEffect(() => {
    if (!user || alerts.length === 0) return;
    const bySymbol = new Map(stocks.map((s) => [s.symbol, s]));

    const triggered = alerts.filter((alert) => {
      const stock = bySymbol.get(alert.symbol);
      if (!stock) return false;
      switch (alert.condition) {
        case "price_above": return stock.currentPrice >= alert.threshold;
        case "price_below": return stock.currentPrice <= alert.threshold;
        case "pct_change_up": return stock.dayChangePercent >= alert.threshold;
        case "pct_change_down": return stock.dayChangePercent <= -Math.abs(alert.threshold);
        default: return false;
      }
    });

    if (triggered.length === 0) return;

    setAlerts((prev) => prev.filter((a) => !triggered.some((t) => t.id === a.id)));

    triggered.forEach((alert) => {
      const stock = bySymbol.get(alert.symbol);
      pushNotification({
        kind: "alert",
        title: `${alert.symbol} alert triggered`,
        description: stock
          ? `${describeAlert(alert)} — now ${money(stock.currentPrice)} (${pct(stock.dayChangePercent)}).`
          : describeAlert(alert),
      });
    });

    void supabase
      .from("user_stock_alerts")
      .update({ active: false, triggered_at: new Date().toISOString() })
      .in("id", triggered.map((a) => a.id))
      .eq("user_id", user.id)
      .then(() => {});
    // gameDay is included so the check re-runs on day advance even if the
    // `stocks` array reference happens to be memoized identically.
  }, [alerts, stocks, gameDay, user]);

  const alertsForSymbol = useMemo(() => {
    const map = new Map<string, StockAlert[]>();
    alerts.forEach((alert) => {
      const list = map.get(alert.symbol) ?? [];
      list.push(alert);
      map.set(alert.symbol, list);
    });
    return map;
  }, [alerts]);

  return { alerts, alertsForSymbol, loading, createAlert, deleteAlert };
}
