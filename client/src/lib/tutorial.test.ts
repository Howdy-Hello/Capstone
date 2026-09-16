import { getTutorialProgress, updateTutorialProgress } from "./tutorial";

describe("tutorial progress", () => {
  beforeEach(() => localStorage.clear());

  it("starts unfinished and preserves progress across updates", () => {
    expect(getTutorialProgress("player-1")).toEqual({ prompted: false, uiComplete: false, gameComplete: false, advancedComplete: false });
    updateTutorialProgress("player-1", { prompted: true, uiComplete: true });
    updateTutorialProgress("player-1", { gameComplete: true, advancedComplete: true });
    expect(getTutorialProgress("player-1")).toEqual({ prompted: true, uiComplete: true, gameComplete: true, advancedComplete: true });
  });
});
