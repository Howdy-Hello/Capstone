export type PlayerLevel = {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalXpForNextLevel: number;
  progress: number;
};

// Each level costs more than the previous one. The requirements follow a
// Fibonacci-style curve: 100, 150, 250, 400, 650, 1,050...
export function getXpRequirement(level: number): number {
  const targetLevel = Math.max(1, Math.floor(level));
  if (targetLevel === 1) return 100;
  if (targetLevel === 2) return 150;

  let previous = 100;
  let current = 150;
  for (let currentLevel = 3; currentLevel <= targetLevel; currentLevel += 1) {
    [previous, current] = [current, previous + current];
  }
  return current;
}

export function getTotalXpForLevel(level: number): number {
  const targetLevel = Math.max(1, Math.floor(level));
  let total = 0;
  for (let currentLevel = 1; currentLevel < targetLevel; currentLevel += 1) {
    total += getXpRequirement(currentLevel);
  }
  return total;
}

export function getLevelCashReward(level: number): number {
  const rewardLevel = Math.max(1, Math.floor(level));
  if (rewardLevel < 2) return 0;
  if (rewardLevel === 2) return 50;
  if (rewardLevel === 3) return 75;
  if (rewardLevel === 4) return 100;
  if (rewardLevel === 5) return 150;

  const baseReward = Math.min(300, 150 + (rewardLevel - 5) * 25);
  return baseReward + (rewardLevel % 5 === 0 ? 200 : 0);
}

export function getPlayerLevel(rawXp: number): PlayerLevel {
  const totalXp = Math.max(0, Math.floor(Number.isFinite(rawXp) ? rawXp : 0));
  let level = 1;
  let xpIntoLevel = totalXp;
  let xpForNextLevel = getXpRequirement(level);

  while (xpIntoLevel >= xpForNextLevel) {
    xpIntoLevel -= xpForNextLevel;
    level += 1;
    xpForNextLevel = getXpRequirement(level);
  }

  return {
    level,
    totalXp,
    xpIntoLevel,
    xpForNextLevel,
    totalXpForNextLevel: totalXp - xpIntoLevel + xpForNextLevel,
    progress: Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)),
  };
}
