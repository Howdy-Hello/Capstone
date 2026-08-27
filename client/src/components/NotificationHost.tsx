import React, { useEffect } from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import FlagIcon from "@mui/icons-material/Flag";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import InfoIcon from "@mui/icons-material/Info";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AppNotification, dismissNotification, NotificationKind, useNotificationQueue } from "../lib/notifications";
import { D, MONO } from "../theme/design";

// Framer Motion 11 predates React 19's stricter JSX return type.
const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{ initial?: boolean }>>;

const MAX_VISIBLE = 4;
const DEFAULT_DURATION_MS = 5000;

// Labels and icons are theme-independent, so they stay at module scope.
const KIND_META: Record<NotificationKind, { label: string; icon: React.ReactNode }> = {
  alert:   { label: "PRICE ALERT",   icon: <NotificationsActiveIcon sx={{ fontSize: 16 }} /> },
  mission: { label: "MISSION",       icon: <FlagIcon sx={{ fontSize: 16 }} /> },
  bill:    { label: "BILL DUE",      icon: <ReceiptLongIcon sx={{ fontSize: 16 }} /> },
  rival:   { label: "RIVAL TRADER",  icon: <SportsMmaIcon sx={{ fontSize: 16 }} /> },
  advisor: { label: "ADVISOR",       icon: <SmartToyIcon sx={{ fontSize: 16 }} /> },
  info:    { label: "NOTICE",        icon: <InfoIcon sx={{ fontSize: 16 }} /> },
};

// Colours must be read during render. `applyDesignColors` mutates the shared
// `D` singleton when the player picks a theme, but a module-scope object
// captures whatever `D` held at import time -- before ThemeProvider hydrates --
// so these chips kept their dark-theme colours forever, on every reload, no
// matter which theme was selected.
function kindColors(kind: NotificationKind): { color: string; bg: string } {
  switch (kind) {
    case "alert":   return { color: D.brandText, bg: D.brandBg };
    case "mission": return { color: D.greenText, bg: D.greenBg };
    case "bill":    return { color: D.redText,   bg: D.redBg };
    case "rival":   return { color: "#F59E0B",   bg: "rgba(245,158,11,0.1)" };
    case "advisor": return { color: D.brandText, bg: D.brandBg };
    default:        return { color: D.t2,        bg: D.overlay };
  }
}

function ToastItem({ notification }: { notification: AppNotification }) {
  const reduceMotion = useReducedMotion();
  const meta = { ...KIND_META[notification.kind], ...kindColors(notification.kind) };

  useEffect(() => {
    const timeout = window.setTimeout(
      () => dismissNotification(notification.id),
      notification.durationMs ?? DEFAULT_DURATION_MS
    );
    return () => window.clearTimeout(timeout);
  }, [notification.id, notification.durationMs]);

  return (
    <motion.div
      layout
      initial={reduceMotion ? undefined : { opacity: 0, x: 24, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, x: 24, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <Box sx={{
        width: { xs: "calc(100vw - 32px)", sm: 320 }, p: 1.75, borderRadius: 2,
        bgcolor: D.elevated, border: `1px solid ${D.border}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}>
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <Box sx={{
            width: 30, height: 30, borderRadius: 1.5, flexShrink: 0,
            bgcolor: meta.bg, color: meta.color, display: "grid", placeItems: "center",
          }}>
            {meta.icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: meta.color, fontFamily: MONO, letterSpacing: 0.6, mb: 0.3 }}>
              {meta.label}
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1, lineHeight: 1.3 }}>
              {notification.title}
            </Typography>
            {notification.description && (
              <Typography sx={{ fontSize: 11.5, color: D.t3, lineHeight: 1.4, mt: 0.3 }}>
                {notification.description}
              </Typography>
            )}
          </Box>
          <IconButton size="small" aria-label={`Dismiss ${notification.title}`} onClick={() => dismissNotification(notification.id)}
            sx={{ color: D.t3, p: 0.3, "&:hover": { color: D.t1 } }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>
      </Box>
    </motion.div>
  );
}

export default function NotificationHost() {
  const queue = useNotificationQueue();
  const visible = queue.slice(0, MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <Box sx={{
      position: "fixed", bottom: 16, right: 16, left: { xs: 16, sm: "auto" }, zIndex: 1400,
      display: "flex", flexDirection: "column-reverse", gap: 1,
      pointerEvents: "none",
    }}>
      <MotionPresence initial={false}>
        {visible.map((notification) => (
          <Box key={notification.id} sx={{ pointerEvents: "auto" }}>
            <ToastItem notification={notification} />
          </Box>
        ))}
      </MotionPresence>
    </Box>
  );
}
