export type TutorialProgress = {
  prompted: boolean;
  uiComplete: boolean;
  gameComplete: boolean;
  advancedComplete: boolean;
};

export type TutorialCourse = "ui" | "game" | "advanced";
export const TUTORIAL_START_EVENT = "stockpilot:start-tutorial";
export const TUTORIAL_REQUEST_KEY = "stockpilot-tutorial-request";

const emptyProgress: TutorialProgress = { prompted: false, uiComplete: false, gameComplete: false, advancedComplete: false };

function key(userId: string) {
  return `stockpilot-tutorial-${userId}`;
}

export function getTutorialProgress(userId: string): TutorialProgress {
  try { return { ...emptyProgress, ...JSON.parse(localStorage.getItem(key(userId)) ?? "{}") }; }
  catch { return emptyProgress; }
}

export function updateTutorialProgress(userId: string, next: Partial<TutorialProgress>) {
  const progress = { ...getTutorialProgress(userId), ...next };
  localStorage.setItem(key(userId), JSON.stringify(progress));
  return progress;
}

export function requestTutorial(course: TutorialCourse) {
  sessionStorage.setItem(TUTORIAL_REQUEST_KEY, course);
  window.dispatchEvent(new CustomEvent<TutorialCourse>(TUTORIAL_START_EVENT, { detail: course }));
}
