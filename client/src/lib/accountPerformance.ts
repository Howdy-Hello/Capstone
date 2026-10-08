export type AccountFlow = { kind: "opening" | "living_cost" | "advisor" | "reward"; amount: number | string; game_day: number };
export function accountPerformance(netWorth: number, flows: AccountFlow[]) {
  const opening = flows.find(flow => flow.kind === "opening");
  if (!opening) return null;
  const start = Number(opening.amount);
  const livingCosts = -flows.filter(f => f.kind === "living_cost").reduce((n, f) => n + Number(f.amount), 0);
  const advisorCosts = -flows.filter(f => f.kind === "advisor").reduce((n, f) => n + Number(f.amount), 0);
  const rewards = flows.filter(f => f.kind === "reward").reduce((n, f) => n + Number(f.amount), 0);
  const investmentGain = netWorth - start + livingCosts + advisorCosts - rewards;
  return { start, startDay: opening.game_day, livingCosts, advisorCosts, rewards, investmentGain, netChange: netWorth - start };
}
