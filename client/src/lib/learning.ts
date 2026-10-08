import { isMissingDbObject, supabase } from "./supabase";

export type LearningKind = "research" | "compare" | "risk" | "plan" | "wait" | "reflection";
export type LearningEntry = {
  id: string; session_id: string; game_day: number; kind: LearningKind;
  symbol: string | null; journal_id: string | null; decision: string; evidence: string; reflection: string; created_at: string;
};
export const LEARNING_CHANGED = "stockpilot:learning-changed";
export const learningPrompts: Record<LearningKind, { title: string; prompt: string }> = {
  research: { title: "Understand a business", prompt: "What does this company sell? Name one financial fact and one uncertainty." },
  compare: { title: "Compare two companies", prompt: "Name a meaningful difference. Why does it matter for your goal? A lower P/E or higher yield is not automatically better." },
  risk: { title: "Investigate risk", prompt: "What could go wrong? How would this stock affect your largest holding, sector exposure, and cash for bills?" },
  plan: { title: "Set your plan", prompt: "What is the money for, when do you need it, and what evidence would change your decision?" },
  wait: { title: "Make a decision to wait", prompt: "Why are you keeping cash or researching further? What evidence would make you reconsider?" },
  reflection: { title: "Review your decision", prompt: "What new evidence appeared? Did you follow your exit rule? Was your position appropriate? What part of the outcome could be luck?" },
};
export async function saveLearningEntry(entry: {
  sessionId: string; userId: string; gameDay: number; kind: LearningKind;
  symbol?: string; journalId?: string; decision: string; evidence: string; reflection?: string;
}) {
  if (entry.evidence.trim().length < 20) throw new Error("Add a specific fact and explain why it matters (at least 20 characters).");
  const { error } = await supabase.from("learning_entries").insert({
    user_id: entry.userId, session_id: entry.sessionId, game_day: entry.gameDay,
    kind: entry.kind, symbol: entry.symbol ?? null, journal_id: entry.journalId ?? null,
    decision: entry.decision, evidence: entry.evidence.trim().slice(0, 1000), reflection: (entry.reflection ?? "").trim().slice(0, 1000),
  });
  if (error && isMissingDbObject(error)) throw new Error("Learning notes aren't available yet. Your trades and progress still save.");
  if (error) throw new Error("Your note could not be saved. Keep it here and try again.");
  window.dispatchEvent(new Event(LEARNING_CHANGED));
}
