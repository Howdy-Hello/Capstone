import { getNewsForGameDay, MarketNews } from "./mockStocks";

const SEEDS = Array.from({ length: 40 }, (_, index) => `RUMOUR${index}`);

function followUpFor(rumour: MarketNews, seed: string) {
  return getNewsForGameDay(rumour.gameDay + 1, seed).find((item) => item.followUpTo === rumour.newsId);
}

test("every rumour is settled the next day by its hidden truth", () => {
  let falseRumours = 0;
  for (const seed of SEEDS) {
    for (let day = 4; day <= 59; day += 1) {
      for (const rumour of getNewsForGameDay(day, seed).filter((item) => item.isRumor && item.newsId.startsWith("news_"))) {
        const followUp = followUpFor(rumour, seed);
        expect(followUp).toBeDefined();
        expect(followUp!.headline).toMatch(rumour.isAccurate ? /confirms/ : /disputes/);
        if (!rumour.isAccurate) {
          falseRumours += 1;
          // The dispute gives back the whole move the false claim caused.
          expect(followUp!.actualImpact).toBeCloseTo(-rumour.actualImpact, 10);
        }
      }
    }
  }
  expect(falseRumours).toBeGreaterThan(0);
});

test("a true report is never disputed", () => {
  for (const seed of SEEDS) {
    for (let day = 5; day <= 60; day += 1) {
      for (const followUp of getNewsForGameDay(day, seed).filter((item) => item.followUpTo)) {
        const original = getNewsForGameDay(day - 1, seed).find((item) => item.newsId === followUp.followUpTo)!;
        expect(followUp.headline.includes("disputes")).toBe(!original.isAccurate);
      }
    }
  }
});
