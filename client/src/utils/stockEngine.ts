import { Stock, NewsEvent, PortfolioItem } from "../types/gameTypes";

export function updateStockPrices(stocks: Stock[]): Stock[] {
  return stocks.map((stock) => {
    const randomChange = (Math.random() * 2 - 1) * stock.volatility;
    const newPrice = stock.price + stock.price * randomChange;

    return {
      ...stock,
      previousPrice: stock.price,
      price: Math.max(1, Number(newPrice.toFixed(2)))
    };
  });
}

export function applyNewsEvent(stocks: Stock[], event: NewsEvent): Stock[] {
  return stocks.map((stock) => {
    if (event.affectedSymbols.includes(stock.symbol)) {
      const newPrice = stock.price + stock.price * event.impact;

      return {
        ...stock,
        previousPrice: stock.price,
        price: Math.max(1, Number(newPrice.toFixed(2)))
      };
    }

    return stock;
  });
}

export function calculatePortfolioValue(
  portfolio: PortfolioItem[],
  stocks: Stock[]
): number {
  return portfolio.reduce((total, item) => {
    const stock = stocks.find((s) => s.symbol === item.symbol);
    return total + (stock ? stock.price * item.shares : 0);
  }, 0);
}