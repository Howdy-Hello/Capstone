import { getNewsUpToGameDay } from "./mockStocks";

const runs = Array.from({ length: 48 }, (_, index) => getNewsUpToGameDay(30, `CLUES${index}`));
const reports = runs.flat();

test("rumours disclose their unconfirmed evidence in the article itself", () => {
  const rumours = reports.filter(item => item.isRumor);
  expect(rumours.length).toBeGreaterThan(0);
  for (const item of rumours) {
    expect(item.body).toMatch(/unnamed|anonymous/i);
    expect(item.body).toMatch(/neither.*confirmed/i);
  }
});

test("generated articles retain the event being reported instead of unrelated sector copy", () => {
  const clues: Record<string, RegExp> = {
    earnings: /earnings release|raised its forecast/,
    contract: /signed multi-year customer contract/,
    product: /product update|recall notice/,
    partnership: /discussing a partnership/,
    analyst: /brokerage research note/,
    capital: /company filing/,
    regulatory: /regulatory decision|regulator's public notice/,
    lawsuit: /court filing/,
    supply: /supplier delays/,
    macro: /economic data/,
    rumor: /anonymous online post/,
    management: /executive is leaving/,
  };
  for (const [category, clue] of Object.entries(clues)) {
    const matching = reports.filter(item => item.newsId.startsWith("news_") && item.category === category);
    expect(matching.length).toBeGreaterThan(0);
    for (const item of matching) expect(item.body).toMatch(clue);
  }
});

test("follow-ups restate the original claim and day without requiring another article", () => {
  let checked = 0;
  for (const run of runs) {
    for (const item of run.filter(report => report.followUpTo)) {
      const original = run.find(report => report.newsId === item.followUpTo);
      expect(original).toBeDefined();
      expect(item.body).toContain(original!.headline);
      expect(item.body).toContain(`Day ${original!.gameDay}`);
      expect(item.body).toMatch(/statement now confirms|statement now disputes/);
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(0);
});

test("each setback replaces the resolution account rather than appending a contradiction", () => {
  const endings = reports.filter(item => item.newsId.endsWith("_setback"));
  expect(new Set(endings.map(item => item.arcKey)).size).toBe(10);
  for (const item of endings) {
    const resolution = reports.find(report => report.newsId === item.newsId.replace(/_setback$/, ""));
    expect(resolution).toBeDefined();
    expect(item.headline).not.toContain(resolution!.headline);
    expect(item.body).not.toContain(resolution!.body);
    expect(item.body).not.toContain("New evidence challenges the expected resolution");
    expect(item.body.length).toBeGreaterThan(150);
  }
});
