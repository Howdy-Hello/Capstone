import { currentScriptedCopy, getNewsForGameDay, getSelectedStoryArcKeys, STORY_ARC_SEASON_DAYS } from "./mockStocks";
import { generateSessionNews, sanitizeNews, withCurrentCopy } from "./sessionMarket";
import { mapDatabaseEvent } from "./infiniteMarket";

const SEEDS = Array.from({ length: 24 }, (_, index) => `SEASON${index}`);

function arcKeysForSeason(seed: string, season: number) {
  const keys = new Set<string>();
  for (let day = season * STORY_ARC_SEASON_DAYS + 1; day <= (season + 1) * STORY_ARC_SEASON_DAYS; day += 1) {
    for (const news of getNewsForGameDay(day, seed)) {
      if (news.arcKey && news.arcKey !== "opening_tutorial") keys.add(news.arcKey);
    }
  }
  return keys;
}

test("infinite runs keep getting story arcs after day 30", () => {
  for (const seed of SEEDS) {
    for (let season = 1; season <= 3; season += 1) {
      expect(arcKeysForSeason(seed, season).size).toBeGreaterThanOrEqual(2);
    }
  }
});

test("a later season never repeats the previous season's storylines", () => {
  for (const seed of SEEDS) {
    for (let season = 1; season <= 4; season += 1) {
      const previous = arcKeysForSeason(seed, season - 1);
      for (const key of Array.from(arcKeysForSeason(seed, season))) expect(previous.has(key)).toBe(false);
    }
  }
});

test("the first season is still the selection 30-day runs were built on", () => {
  for (const seed of SEEDS) {
    expect(Array.from(arcKeysForSeason(seed, 0)).sort()).toEqual(getSelectedStoryArcKeys(seed).slice().sort());
  }
});

test("later-season stories have their own ids and land inside their season", () => {
  const seen = new Set<string>();
  for (let day = 1; day <= 120; day += 1) {
    for (const news of getNewsForGameDay(day, "SEASONIDS")) {
      expect(seen.has(news.newsId)).toBe(false);
      seen.add(news.newsId);
      if (news.arcKey && day > STORY_ARC_SEASON_DAYS) expect(news.newsId).toMatch(/_s\d+$/);
    }
  }
});

test("the shared infinite script shows the rewritten wording", () => {
  const legacy = currentScriptedCopy(
    "news_agr_5",
    "AgriPure Foods faces pressure after legal concerns emerge",
    "Investors became cautious after reports of a legal issue."
  );
  expect(legacy.headline).toBe("AgriPure Foods faces pressure after legal concerns emerge");
  expect(legacy.body).toMatch(/court filing/);

  const renamed = currentScriptedCopy("news_lux_4", "LuxeWear drops after an unconfirmed negative report", "old");
  expect(renamed.headline).toBe("LuxeWear faces unconfirmed claims of a major order cancellation");

  const story = currentScriptedCopy("story_day1_cai_ai_demand", "Closed Ai jumps as AI software demand improves", "old");
  expect(story.body).not.toBe("old");

  const mapped = mapDatabaseEvent({
    id: 1, event_key: "news_frx_12", game_day: 12, source: "Expedition",
    headline: "FreightFlex falls as sector outlook weakens", body: "old body",
    importance: "Medium", category: "macro", is_accurate: true, is_rumor: false,
    event_stock_impacts: [],
  });
  expect(mapped.headline).toBe("FreightFlex faces weaker demand across its sector");
});

test("current stories come back from the copy refresh unchanged", () => {
  for (let day = 1; day <= 60; day += 1) {
    const news = getNewsForGameDay(day, "COPYSAFE");
    expect(withCurrentCopy(news)).toEqual(news);
  }
});

test("stored news never says how a story arc ends", () => {
  for (let day = 1; day <= 60; day += 1) {
    const stored = generateSessionNews({ mode: "infinite", seed: "BRANCHES", day, script: { stocks: [], prices: [], events: [] } })
      .map(sanitizeNews);
    for (const item of stored) expect(item.branch).toBeUndefined();
  }
});
