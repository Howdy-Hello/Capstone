import { useState } from "react";
import { starterStocks } from "../data/starterStocks";
import { starterEvents } from "../data/starterEvents";
import { Stock, Player, NewsEvent } from "../types/gameTypes";
import { updateStockPrices, applyNewsEvent, calculatePortfolioValue } from "../utils/stockEngine";

export default function Game() {
  const [stocks, setStocks] = useState<Stock[]>(starterStocks);
  const [currentEvent, setCurrentEvent] = useState<NewsEvent | null>(null);

  const [player, setPlayer] = useState<Player>({
    cash: 10000,
    portfolio: [],
    netWorth: 10000
  });

  function nextDay() {
    let updatedStocks = updateStockPrices(stocks);

    const randomEvent =
      Math.random() > 0.5
        ? starterEvents[Math.floor(Math.random() * starterEvents.length)]
        : null;

    if (randomEvent) {
      updatedStocks = applyNewsEvent(updatedStocks, randomEvent);
      setCurrentEvent(randomEvent);
    } else {
      setCurrentEvent(null);
    }

    const portfolioValue = calculatePortfolioValue(player.portfolio, updatedStocks);

    setStocks(updatedStocks);
    setPlayer({
      ...player,
      netWorth: Number((player.cash + portfolioValue).toFixed(2))
    });
  }

  function buyStock(symbol: string) {
    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock || player.cash < stock.price) return;

    const existingItem = player.portfolio.find((item) => item.symbol === symbol);

    let updatedPortfolio;

    if (existingItem) {
      updatedPortfolio = player.portfolio.map((item) =>
        item.symbol === symbol
          ? { ...item, shares: item.shares + 1 }
          : item
      );
    } else {
      updatedPortfolio = [...player.portfolio, { symbol, shares: 1 }];
    }

    setPlayer({
      ...player,
      cash: Number((player.cash - stock.price).toFixed(2)),
      portfolio: updatedPortfolio
    });
  }

  function sellStock(symbol: string) {
    const stock = stocks.find((s) => s.symbol === symbol);
    const ownedStock = player.portfolio.find((item) => item.symbol === symbol);

    if (!stock || !ownedStock || ownedStock.shares <= 0) return;

    const updatedPortfolio = player.portfolio
      .map((item) =>
        item.symbol === symbol
          ? { ...item, shares: item.shares - 1 }
          : item
      )
      .filter((item) => item.shares > 0);

    setPlayer({
      ...player,
      cash: Number((player.cash + stock.price).toFixed(2)),
      portfolio: updatedPortfolio
    });
  }

  return (
    <main>
      <h1>Stock Market Simulator</h1>

      <section>
        <h2>Player Stats</h2>
        <p>Cash: ${player.cash}</p>
        <p>Net Worth: ${player.netWorth}</p>
      </section>

      {currentEvent && (
        <section>
          <h2>Breaking News</h2>
          <h3>{currentEvent.title}</h3>
          <p>{currentEvent.description}</p>
        </section>
      )}

      <section>
        <h2>Market</h2>

        {stocks.map((stock) => {
          const change = stock.price - stock.previousPrice;
          const isUp = change >= 0;

          return (
            <div key={stock.id}>
              <h3>
                {stock.name} ({stock.symbol})
              </h3>
              <p>{stock.description}</p>
              <p>
                Price: ${stock.price}{" "}
                <span style={{ color: isUp ? "green" : "red" }}>
                  {isUp ? "▲" : "▼"} {change.toFixed(2)}
                </span>
              </p>

              <button onClick={() => buyStock(stock.symbol)}>Buy</button>
              <button onClick={() => sellStock(stock.symbol)}>Sell</button>
            </div>
          );
        })}
      </section>

      <section>
        <h2>Portfolio</h2>

        {player.portfolio.length === 0 ? (
          <p>You do not own any stocks yet.</p>
        ) : (
          player.portfolio.map((item) => (
            <p key={item.symbol}>
              {item.symbol}: {item.shares} shares
            </p>
          ))
        )}
      </section>

      <button onClick={nextDay}>Next Day</button>
    </main>
  );
}