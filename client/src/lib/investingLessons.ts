export function projectInvestment(start: number, monthly: number, years: number, annualReturn: number, annualFee: number) {
  let balance = start;
  const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) * Math.pow(1 - annualFee / 100, 1 / 12) - 1;
  const points = [{ year: 0, contributed: start, balance }];
  for (let month = 1; month <= years * 12; month++) {
    balance = balance * (1 + monthlyRate) + monthly;
    if (month % 12 === 0) points.push({ year: month / 12, contributed: start + monthly * month, balance });
  }
  return points;
}
export function practiceOrder(type: "market" | "limit" | "stop", nextPrice: number, threshold: number) {
  if (type === "limit" && nextPrice > threshold) return { filled: false, price: null, text: "Buy limit unfilled: no available price was at or below your limit." };
  if (type === "stop" && nextPrice > threshold) return { filled: false, price: null, text: "Sell stop not triggered: the price stayed above your stop." };
  return { filled: true, price: nextPrice, text: type === "stop" ? "Sell stop triggered and became a market order. A price gap means the fill can be below your stop." : type === "limit" ? "Buy limit filled at an available price within your limit." : "Market buy filled at the available price, which can differ from the displayed quote." };
}
