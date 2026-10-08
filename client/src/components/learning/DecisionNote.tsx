import { useState } from "react";
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useGame } from "../../context/GameContext";
import { useAuth } from "../../context/AuthContext";
import { LearningKind, learningPrompts, saveLearningEntry } from "../../lib/learning";
import { D } from "../../theme/design";

function DecisionNoteForm({ kind = "wait", symbol, journalId }: { kind?: LearningKind; symbol?: string; journalId?: string }) {
  const { user } = useAuth();
  const { sessionId, gameDay, loading } = useGame();
  const [decision, setDecision] = useState("wait");
  const [evidence, setEvidence] = useState("");
  const [reflection, setReflection] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const prompt = learningPrompts[kind];
  const save = async () => {
    if (pending || !user || !sessionId) return;
    setPending(true); setStatus(null);
    try {
      await saveLearningEntry({ sessionId, userId: user.id, gameDay, kind, symbol, journalId, decision, evidence, reflection });
      setStatus({ ok: true, message: "Saved to your learning journal. Recording a reasoned decision counts as progress; no trade is required." });
      setEvidence(""); setReflection("");
    } catch (error) { setStatus({ ok: false, message: error instanceof Error ? error.message : "Could not save. Try again." }); }
    finally { setPending(false); }
  };
  return <Box className="learning" component="form" onSubmit={event => { event.preventDefault(); void save(); }} sx={{ color: D.t1 }}>
    <Typography sx={{ fontWeight: 900, mb: .5 }}>{prompt.title}{symbol ? ` · ${symbol}` : ""}</Typography>
    <Typography sx={{ color: D.t2, fontSize: 13, mb: 2 }}>{prompt.prompt}</Typography>
    <Stack spacing={2}>
      <TextField select label="My decision" value={decision} onChange={e => setDecision(e.target.value)} disabled={pending} fullWidth size="small">
        <MenuItem value="wait">Wait / keep researching</MenuItem><MenuItem value="avoid">Avoid this investment</MenuItem>
        {kind !== "wait" && <MenuItem value="consider">Consider a small position</MenuItem>}<MenuItem value="keep">Keep my current plan</MenuItem>{kind !== "wait" && <MenuItem value="reduce">Reduce / exit a position</MenuItem>}
      </TextField>
      <TextField label={kind === "reflection" ? "New evidence and how I followed my plan" : "My evidence and reason"} helperText="Use at least 20 characters: name a fact and a risk, and connect them to your goal. Notes record practice, not an automatic grade." multiline minRows={3} fullWidth value={evidence} onChange={e => { setEvidence(e.target.value); setStatus(null); }} disabled={pending} inputProps={{ maxLength: 1000 }} />
      {kind === "reflection" && <TextField helperText="Write at least 20 characters." label="Position size and what may have been luck" multiline minRows={2} fullWidth value={reflection} onChange={e => setReflection(e.target.value)} disabled={pending} inputProps={{ maxLength: 1000 }} />}
      {status && <Alert severity={status.ok ? "success" : "error"}>{status.message}</Alert>}
      <Button type="submit" variant="contained" disabled={pending || loading || !sessionId || evidence.trim().length < 20 || (kind === "reflection" && reflection.trim().length < 20)} sx={{ alignSelf: "flex-start", textTransform: "none" }}>{pending ? "Saving…" : "Save learning note"}</Button>
    </Stack>
  </Box>;
}

export default function DecisionNote(props: { kind?: LearningKind; symbol?: string; journalId?: string }) {
  const { sessionId, gameDay } = useGame();
  return <DecisionNoteForm key={`${sessionId}:${gameDay}:${props.kind}:${props.symbol}:${props.journalId}`} {...props} />;
}
