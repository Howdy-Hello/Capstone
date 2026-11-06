import React from "react";
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { D, readableOn } from "../theme/design";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  /** Dialog body. */
  children: React.ReactNode;
  confirmLabel: string;
  /** Defaults to "Cancel". */
  cancelLabel?: string;
  /** "danger" gives the confirm button the red destructive style. */
  tone?: "danger" | "primary";
  /** Disables every action and shows a spinner on confirm. */
  pending?: boolean;
  /** An extra way out, e.g. "Save first". */
  secondaryAction?: { label: string; onClick: () => void };
  onConfirm: () => void;
  /** Cancel, Escape, the backdrop and the close icon. */
  onClose: () => void;
};

// Styled like the Delete Save dialog on Save & Load, so every confirmation in
// the app looks the same.
export default function ConfirmDialog({
  open, title, children, confirmLabel, cancelLabel = "Cancel", tone = "primary", pending = false,
  secondaryAction, onConfirm, onClose,
}: ConfirmDialogProps) {
  const titleId = React.useId();
  const bodyId = React.useId();
  const danger = tone === "danger";

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="xs" fullWidth
      aria-labelledby={titleId} aria-describedby={bodyId}
      PaperProps={{ sx: { bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3 } }}>
      <DialogTitle component="div" sx={{ bgcolor: D.elevated, borderBottom: `1px solid ${D.border}`, p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Typography id={titleId} component="h2" sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>{title}</Typography>
          <IconButton size="small" aria-label="Close" disabled={pending} onClick={onClose} sx={{ color: D.t3 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent id={bodyId} sx={{ bgcolor: D.bg, p: 2.5, "&&": { pt: 2.5 } }}>
        <Typography component="div" sx={{ fontSize: 14, color: D.t2, lineHeight: 1.6 }}>{children}</Typography>
      </DialogContent>
      <DialogActions sx={{ bgcolor: D.elevated, borderTop: `1px solid ${D.border}`, p: 2, gap: 1, flexWrap: "wrap" }}>
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} disabled={pending}
            sx={{ mr: "auto", color: D.brandText, fontWeight: 800, textTransform: "none", borderRadius: 1.5, "&:hover": { bgcolor: D.brandBg } }}>
            {secondaryAction.label}
          </Button>
        )}
        <Button onClick={onClose} disabled={pending}
          sx={{ color: D.t3, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, bgcolor: D.overlay } }}>
          {cancelLabel}
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={pending}
          startIcon={pending ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : undefined}
          sx={{
            bgcolor: danger ? D.red : D.brand, color: readableOn(danger ? D.red : D.brand), fontWeight: 800, textTransform: "none", borderRadius: 1.5, boxShadow: "none",
            "&:hover": { bgcolor: danger ? "#DC2626" : D.brandMid, boxShadow: "none" },
            "&.Mui-disabled": { bgcolor: D.overlay, color: D.t3 },
          }}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
