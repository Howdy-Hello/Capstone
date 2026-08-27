import React, { useState } from "react";
import { Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import DraftsOutlinedIcon from "@mui/icons-material/DraftsOutlined";
import FlagIcon from "@mui/icons-material/Flag";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import InfoIcon from "@mui/icons-material/Info";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { InboxCategory, InboxMessage, markAllRead, markMessageRead, useInboxMessages } from "../lib/inbox";
import { D, CARD, MONO } from "../theme/design";

const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{ initial?: boolean; mode?: "sync" | "popLayout" | "wait" }>>;

// Icons and labels are theme-independent, so they stay at module scope.
const CATEGORY_META: Record<InboxCategory, { icon: React.ReactNode; label: string }> = {
  mission:     { icon: <FlagIcon sx={{ fontSize: 16 }} />,              label: "Mission" },
  bill:        { icon: <ReceiptLongIcon sx={{ fontSize: 16 }} />,       label: "Billing" },
  rival:       { icon: <SportsMmaIcon sx={{ fontSize: 16 }} />,         label: "Rival" },
  achievement: { icon: <WorkspacePremiumIcon sx={{ fontSize: 16 }} />,  label: "Achievement" },
  level:       { icon: <MilitaryTechIcon sx={{ fontSize: 16 }} />,      label: "Level Up" },
  system:      { icon: <InfoIcon sx={{ fontSize: 16 }} />,              label: "System" },
};

// Read during render: `applyDesignColors` mutates the shared `D` singleton when
// the theme changes, so a module-scope capture freezes the colours at whatever
// `D` held at import time -- before ThemeProvider hydrates.
function categoryColors(category: InboxCategory): { color: string; bg: string } {
  switch (category) {
    case "mission":     return { color: D.greenText, bg: D.greenBg };
    case "bill":        return { color: D.redText,   bg: D.redBg };
    case "rival":       return { color: "#F59E0B",   bg: "rgba(245,158,11,0.1)" };
    case "achievement": return { color: D.brandText, bg: D.brandBg };
    case "level":       return { color: D.brandText, bg: D.brandBg };
    default:            return { color: D.t2,        bg: D.overlay };
  }
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function MessageRow({ message, expanded, onToggle }: { message: InboxMessage; expanded: boolean; onToggle: () => void }) {
  const meta = { ...CATEGORY_META[message.category], ...categoryColors(message.category) };
  return (
    <Box
      component={motion.div}
      layout
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      sx={{
        p: 2, borderRadius: 2, bgcolor: message.read ? D.elevated : D.overlay,
        border: `1px solid ${message.read ? D.border : D.brandBd}`,
        cursor: "pointer", transition: "border-color 140ms, background-color 140ms",
        "&:hover": { borderColor: D.borderHi },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: meta.bg, color: meta.color, display: "grid", placeItems: "center", flexShrink: 0 }}>
          {meta.icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: meta.color, fontFamily: MONO }}>{message.from}</Typography>
            <Typography sx={{ fontSize: 10.5, color: D.t3, fontFamily: MONO, flexShrink: 0 }}>{formatTimestamp(message.createdAt)}</Typography>
          </Stack>
          <Typography sx={{ fontSize: 13.5, fontWeight: message.read ? 700 : 900, color: D.t1, mt: 0.3 }}>
            {!message.read && (
              <Box component="span" sx={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", bgcolor: D.brandText, mr: 1 }} />
            )}
            {message.subject}
          </Typography>
          <MotionPresence initial={false}>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: "hidden" }}>
                <Typography sx={{ fontSize: 12.5, color: D.t2, lineHeight: 1.6, mt: 1 }}>{message.body}</Typography>
              </motion.div>
            )}
          </MotionPresence>
        </Box>
      </Stack>
    </Box>
  );
}

export default function Inbox() {
  const reduceMotion = useReducedMotion();
  const messages = useInboxMessages();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const unreadCount = messages.filter((m) => !m.read).length;

  const handleToggle = (message: InboxMessage) => {
    const nextId = expandedId === message.id ? null : message.id;
    setExpandedId(nextId);
    if (!message.read) markMessageRead(message.id);
  };

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 } }}>
          <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <DraftsOutlinedIcon sx={{ color: D.brandText, fontSize: 22 }} />
                  <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 950, color: D.t1, letterSpacing: -0.6 }}>Inbox</Typography>
                  {unreadCount > 0 && (
                    <Chip label={unreadCount} size="small" sx={{ bgcolor: D.brand, color: "#fff", fontWeight: 900, fontSize: 11 }} />
                  )}
                </Stack>
                <Typography sx={{ fontSize: 13, color: D.t2 }}>
                  Messages from missions, rent, your rival, achievements, and level-ups.
                </Typography>
              </Box>
              {unreadCount > 0 && (
                <Button onClick={() => markAllRead()} startIcon={<MarkEmailReadIcon />}
                  sx={{ color: D.t2, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.t1, borderColor: D.borderHi, bgcolor: D.overlay } }}>
                  Mark all read
                </Button>
              )}
            </Stack>
          </motion.div>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {messages.length === 0 ? (
          <Box sx={{ ...CARD, p: 5, textAlign: "center" }}>
            <MailOutlineIcon sx={{ fontSize: 40, color: D.t3, mb: 1.5 }} />
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: D.t2, mb: 0.5 }}>No messages yet</Typography>
            <Typography sx={{ fontSize: 13, color: D.t3 }}>
              Complete missions, pay bills, and unlock achievements — updates will show up here.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.2}>
            <MotionPresence initial={false}>
              {messages.map((message) => (
                <MessageRow key={message.id} message={message} expanded={expandedId === message.id}
                  onToggle={() => handleToggle(message)} />
              ))}
            </MotionPresence>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
