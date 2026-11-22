import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Line } from "recharts";
import { getStockHistoryBySymbol, mockStockCompanies, Stock } from "../data/mockStocks";
import { D } from "../theme/design";
import WatchlistWidget from "./WatchlistWidget";

jest.mock("react-router-dom", () => {
  const React = require("react");
  return { Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a ref={ref} href={to} {...props} />) };
}, { virtual: true });

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => children,
  LineChart: ({ children }: any) => children,
  YAxis: () => null,
  Line: jest.fn(() => null),
}));

test.each([
  [2, D.green, [100, 90]],
  [-2, D.red, [90, 100]],
  [0, D.t3, [90, 100]],
  [-0.001, D.t3, [100, 90]],
])("a %s%% daily change colors the watchlist line independently of its history", (dayChangePercent, color, closes) => {
  const stock: Stock = {
    ...mockStockCompanies[0], currentPrice: 100, previousPrice: 100,
    dayChange: 0, dayChangePercent, volume: 0, eventImpact: 0,
  };
  const history = getStockHistoryBySymbol(stock.symbol, 2).map((price, i) => ({ ...price, closePrice: closes[i] }));
  (Line as unknown as jest.Mock).mockClear();

  renderToStaticMarkup(<WatchlistWidget stocks={[stock]} getHistory={() => history} />);

  expect((Line as unknown as jest.Mock).mock.calls[0][0].stroke).toBe(color);
});
