import React, { useCallback, useMemo, useState } from "react";
import {
  Avatar, Badge, Box, Button, Checkbox, Chip, Divider, IconButton, InputAdornment,
  Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FlagIcon from "@mui/icons-material/Flag";
import InboxIcon from "@mui/icons-material/Inbox";
import InfoIcon from "@mui/icons-material/Info";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon from "@mui/icons-material/Search";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import SmartToyIcon from "@mui/icons-material/SmartToy";

import {
  InboxCategory, InboxMessage, markAllRead, markMessageRead,
  markNewsRead, markNewsReadBatch, newsReadKey, useInboxMessages, useReadNewsIds,
} from "../lib/inbox";
import { useGame } from "../context/GameContext";
import { MarketNews } from "../data/mockStocks";
import { D, MONO } from "../theme/design";
import { usePageTitle } from "../lib/usePageTitle";

const MotionPresence = AnimatePresence as React.FC<React.PropsWithChildren<{
  initial?: boolean; mode?: "sync" | "popLayout" | "wait";
}>>;

// News and in-game mail are two different sources with two different read
// stores, so the list works off one shape that either can be mapped into.
type MailFolder = InboxCategory | "news";
type MailItem = {
  id: string;
  folder: MailFolder;
  from: string;
  subject: string;
  preview: string;
  body: string;
  read: boolean;
  /** Real timestamp for messages; absent for seeded news, which only has a day. */
  sentAt: string | null;
  gameDay: number | null;
  news: MarketNews | null;
};

const FOLDERS: { id: MailFolder | "all"; label: string; icon: React.ReactNode }[] = [
  { id: "all",         label: "Inbox",       icon: <InboxIcon sx={{ fontSize: 17 }} /> },
  { id: "news",        label: "Market news", icon: <NewspaperIcon sx={{ fontSize: 17 }} /> },
  { id: "mission",     label: "Missions",    icon: <FlagIcon sx={{ fontSize: 17 }} /> },
  { id: "advisor",     label: "Advisor",     icon: <SmartToyIcon sx={{ fontSize: 17 }} /> },
  { id: "achievement", label: "Achievements",icon: <WorkspacePremiumIcon sx={{ fontSize: 17 }} /> },
  { id: "rival",       label: "Rival",       icon: <SportsMmaIcon sx={{ fontSize: 17 }} /> },
  { id: "bill",        label: "Billing",     icon: <ReceiptLongIcon sx={{ fontSize: 17 }} /> },
  { id: "level",       label: "Level ups",   icon: <MilitaryTechIcon sx={{ fontSize: 17 }} /> },
  { id: "system",      label: "System",      icon: <InfoIcon sx={{ fontSize: 17 }} /> },
];

// Read during render: applyDesignColors mutates the shared D singleton on a
// theme change, so a module-scope colour map would freeze at the import-time
// palette (which is what used to keep these chips dark on a light theme).
function folderColors(folder: MailFolder): { color: string; bg: string } {
  switch (folder) {
    case "news":        return { color: D.brandText, bg: D.brandBg };
    case "mission":     return { color: D.greenText, bg: D.greenBg };
    case "advisor":     return { color: D.brandText, bg: D.brandBg };
    case "bill":        return { color: D.redText,   bg: D.redBg };
    case "rival":       return { color: D.amber,     bg: D.amberBg };
    case "achievement": return { color: D.brandText, bg: D.brandBg };
    case "level":       return { color: D.brandText, bg: D.brandBg };
    default:            return { color: D.t2,        bg: D.overlay };
  }
}

function folderIcon(folder: MailFolder) {
  return FOLDERS.find((f) => f.id === folder)?.icon ?? <InfoIcon sx={{ fontSize: 17 }} />;
}

function folderLabel(folder: MailFolder) {
  return FOLDERS.find((f) => f.id === folder)?.label ?? "System";
}

function toneMeta(tone: MarketNews["marketTone"]) {
  if (tone === "Bullish") return { label: "Bullish", icon: <TrendingUpIcon sx={{ fontSize: 12 }} />, color: D.greenText, bg: D.greenBg };
  if (tone === "Bearish") return { label: "Bearish", icon: <TrendingDownIcon sx={{ fontSize: 12 }} />, color: D.redText, bg: D.redBg };
  return { label: "Unclear", icon: <HelpOutlineIcon sx={{ fontSize: 12 }} />, color: D.amber, bg: D.amberBg };
}

function timeLabel(item: MailItem) {
  if (item.sentAt) {
    return new Date(item.sentAt).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  }
  return item.gameDay !== null ? `Day ${item.gameDay}` : "";
}

function messageToMail(message: InboxMessage): MailItem {
  return {
    id: `msg:${message.id}`,
    folder: message.category,
    from: message.from,
    subject: message.subject,
    preview: message.body,
    body: message.body,
    read: message.read,
    sentAt: message.createdAt,
    gameDay: null,
    news: null,
  };
}

function newsToMail(news: MarketNews, read: boolean): MailItem {
  return {
    id: `news:${news.newsId}`,
    folder: "news",
    from: news.source,
    subject: news.headline,
    preview: news.body,
    body: news.body,
    read,
    sentAt: null,
    gameDay: news.gameDay,
    news,
  };
}

export default function Inbox() {
  usePageTitle("Inbox");
  const reduceMotion = useReducedMotion();
  const messages = useInboxMessages();
  const readNewsIds = useReadNewsIds();
  const { newsHistory, sessionId } = useGame();
  // News ids repeat across runs (news_CAI_5 exists in every run), so read
  // state is kept per run: otherwise "mark all read" in one run marked the
  // next run's different stories as read too.
  const readKey = useCallback((newsId: string) => newsReadKey(sessionId, newsId), [sessionId]);

  const [folder, setFolder] = useState<MailFolder | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // One merged, newest-first feed. Messages carry real timestamps and news only
  // a game day, so they are ordered within their own kind and news is
  // interleaved by day beneath the most recent messages.
  const allMail = useMemo<MailItem[]>(() => {
    const mail = messages.map(messageToMail);
    const news = newsHistory.map((n) => newsToMail(n, readNewsIds.has(readKey(n.newsId))));
    return [
      ...mail.sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? "")),
      ...news.sort((a, b) => (b.gameDay ?? 0) - (a.gameDay ?? 0)),
    ];
  }, [messages, newsHistory, readKey, readNewsIds]);

  const unreadByFolder = useMemo(() => {
    const counts = new Map<MailFolder | "all", number>();
    for (const item of allMail) {
      if (item.read) continue;
      counts.set("all", (counts.get("all") ?? 0) + 1);
      counts.set(item.folder, (counts.get(item.folder) ?? 0) + 1);
    }
    return counts;
  }, [allMail]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allMail.filter((item) => {
      if (folder !== "all" && item.folder !== folder) return false;
      if (!q) return true;
      return (
        item.subject.toLowerCase().includes(q)
        || item.from.toLowerCase().includes(q)
        || item.body.toLowerCase().includes(q)
      );
    });
  }, [allMail, folder, query]);

  const selected = useMemo(
    () => visible.find((item) => item.id === selectedId) ?? null,
    [visible, selectedId]
  );

  function openItem(item: MailItem) {
    setSelectedId(item.id);
    if (item.read) return;
    if (item.news) markNewsRead(readKey(item.news.newsId));
    else markMessageRead(item.id.replace(/^msg:/, ""));
  }

  function markEverythingRead() {
    markAllRead();
    markNewsReadBatch(newsHistory.map((n) => readKey(n.newsId)));
  }

  const totalUnread = unreadByFolder.get("all") ?? 0;
  const folderTitle = FOLDERS.find((item) => item.id === folder)?.label ?? "Inbox";

  return (
    <Box data-tour="inbox-page" sx={{ bgcolor: D.bg, minHeight: "100vh", p: { xs: 1, md: 2 } }}>
      <Box sx={{ maxWidth: 1600, mx: "auto", bgcolor: D.surface, border: `1px solid ${D.border}`, borderRadius: 3, overflow: "hidden", minHeight: { md: "calc(100vh - 110px)" } }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ height: 72, px: { xs: 2, md: 3 }, borderBottom: `1px solid ${D.border}` }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: { md: 218 }, flexShrink: 0 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: D.brand, display: "grid", placeItems: "center", color: "white" }}>
              <MailOutlineIcon sx={{ fontSize: 21 }} />
            </Box>
            <Box>
              <Typography component="h1" sx={{ fontWeight: 950, fontSize: 16, color: D.t1, lineHeight: 1.1 }}>StockPilot Mail</Typography>
              <Typography sx={{ fontSize: 10, color: D.t3, fontFamily: MONO }}>MARKET DESK</Typography>
            </Box>
          </Stack>
          <TextField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search news, people, or messages" size="small" inputProps={{ "aria-label": "Search mail" }}
            sx={{ flex: 1, maxWidth: 720, "& .MuiOutlinedInput-root": { bgcolor: D.elevated, borderRadius: 2.5, height: 46, "& fieldset": { borderColor: "transparent" }, "&:hover fieldset": { borderColor: D.borderHi }, "&.Mui-focused fieldset": { borderColor: D.brand }, "& input": { color: D.t1, fontSize: { xs: 16, sm: 13.5 } } } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: D.t3 }} /></InputAdornment> }} />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="More options"><IconButton sx={{ color: D.t3 }}><MoreVertIcon /></IconButton></Tooltip>
          <Avatar sx={{ width: 34, height: 34, bgcolor: D.brandBg, color: D.brandText, fontSize: 12, fontWeight: 900 }}>SP</Avatar>
        </Stack>

        <Box sx={{ display: "flex", alignItems: "stretch", minHeight: { md: "calc(100vh - 182px)" }, flexDirection: { xs: "column", md: "row" } }}>
          {/* Folder rail */}
          <Box sx={{ width: { xs: "100%", md: 242 }, flexShrink: 0, p: { xs: 1.25, md: 2 }, borderRight: { md: `1px solid ${D.border}` } }}>
            <Button fullWidth startIcon={<MarkEmailReadIcon />} onClick={markEverythingRead}
              sx={{ justifyContent: "flex-start", px: 2, py: 1.35, mb: 1.5, borderRadius: 2.5, bgcolor: D.brand, color: "white", textTransform: "none", fontWeight: 850, boxShadow: `0 8px 24px ${D.brandBg}`, "&:hover": { bgcolor: D.brandMid } }}>
              Mark all as read
            </Button>
            <Stack
              direction={{ xs: "row", md: "column" }}
              spacing={0.5}
              sx={{ overflowX: { xs: "auto", md: "visible" }, pb: { xs: 1, md: 0 } }}
            >
              {FOLDERS.map((f) => {
                const count = unreadByFolder.get(f.id) ?? 0;
                const active = folder === f.id;
                return (
                  <Button
                    key={f.id}
                    onClick={() => { setFolder(f.id); setSelectedId(null); }}
                    startIcon={f.icon}
                    aria-current={active ? "true" : undefined}
                    sx={{
                      justifyContent: { xs: "center", md: "flex-start" },
                      flexShrink: 0,
                      gap: 0.5,
                      px: 1.5, py: 1,
                      borderRadius: "0 18px 18px 0",
                      textTransform: "none",
                      fontWeight: active ? 900 : 700,
                      fontSize: 13,
                      color: active ? D.brandText : D.t2,
                      bgcolor: active ? D.brandBg : "transparent",
                      "&:hover": { bgcolor: active ? D.brandBg : D.overlay, color: active ? D.brandText : D.t1 },
                    }}
                  >
                    <Box component="span" sx={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{f.label}</Box>
                    {count > 0 && (
                      <Badge badgeContent={count} color="error"
                        sx={{ mr: 1, "& .MuiBadge-badge": { position: "static", transform: "none", fontSize: 9.5, height: 16, minWidth: 16 } }} />
                    )}
                  </Button>
                );
              })}
            </Stack>
            <Box sx={{ display: { xs: "none", md: "block" }, mt: 3, px: 1.5 }}>
              <Typography sx={{ fontSize: 10, color: D.t3, fontFamily: MONO, letterSpacing: 1, mb: 1.5 }}>MAIL SUMMARY</Typography>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: 12, color: D.t3 }}>Unread</Typography><Typography sx={{ fontSize: 12, color: D.t1, fontFamily: MONO }}>{totalUnread}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}><Typography sx={{ fontSize: 12, color: D.t3 }}>Total mail</Typography><Typography sx={{ fontSize: 12, color: D.t1, fontFamily: MONO }}>{allMail.length}</Typography></Stack>
            </Box>
          </Box>

          {/* List + reading pane */}
          <Box sx={{ flex: 1, minWidth: 0, width: "100%", display: "flex", alignItems: "stretch" }}>
            {/* List: hidden on small screens while a message is open */}
            <Box sx={{
              flex: 1, minWidth: 0,
              display: { xs: selected ? "none" : "block", lg: "block" },
              maxWidth: { lg: selected ? 510 : "none" },
              borderRight: selected ? { lg: `1px solid ${D.border}` } : undefined,
            }}>
              <Stack direction="row" alignItems="center" sx={{ px: 2, height: 54, borderBottom: `1px solid ${D.border}` }}>
                <Checkbox size="small" disabled sx={{ color: D.t4 }} />
                <Tooltip title="Refresh"><IconButton size="small" sx={{ color: D.t3 }}><AutorenewIcon sx={{ fontSize: 19 }} /></IconButton></Tooltip>
                <Typography sx={{ ml: 1, color: D.t1, fontWeight: 850, fontSize: 14 }}>{folderTitle}</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography sx={{ fontSize: 10.5, color: D.t3, fontFamily: MONO }}>{visible.length} messages</Typography>
                <IconButton size="small" disabled><ChevronLeftIcon sx={{ fontSize: 18 }} /></IconButton><IconButton size="small" disabled><ChevronRightIcon sx={{ fontSize: 18 }} /></IconButton>
              </Stack>
              <Box sx={{ bgcolor: D.surface, overflow: "hidden" }}>
                {visible.length === 0 ? (
                  <Box sx={{ p: 6, textAlign: "center" }}>
                    <InboxIcon sx={{ fontSize: 40, color: D.t4, mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 800, color: D.t2, mb: 0.5 }}>
                      {query ? "No mail matches that search." : "Nothing here yet."}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: D.t3 }}>
                      {query
                        ? "Try a different word, or clear the search."
                        : "Play a few days and headlines, missions and rival messages will land here."}
                    </Typography>
                  </Box>
                ) : (
                  <MotionPresence initial={false}>
                    {visible.map((item, index) => {
                      const meta = folderColors(item.folder);
                      const active = item.id === selectedId;
                      return (
                        <Box
                          key={item.id}
                          component={motion.div}
                          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.2) }}
                          onClick={() => openItem(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e: React.KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItem(item); }
                          }}
                          sx={{
                            display: "flex", gap: 0.75, alignItems: "center",
                            px: 1.25, py: 1.15,
                            cursor: "pointer",
                            borderBottom: `1px solid ${D.border}`,
                            borderLeft: `3px solid ${active ? D.brand : "transparent"}`,
                            bgcolor: active ? D.overlay : item.read ? "transparent" : D.brandBg,
                            transition: "background-color .12s ease",
                            "&:hover": { bgcolor: D.overlay },
                            "&:last-of-type": { borderBottom: "none" },
                          }}
                        >
                          <Checkbox size="small" onClick={(e) => e.stopPropagation()} sx={{ color: D.t4, p: .5 }} />
                          <IconButton size="small" onClick={(e) => e.stopPropagation()} aria-label="Star message" sx={{ color: D.t4, p: .5 }}><StarBorderIcon sx={{ fontSize: 18 }} /></IconButton>
                          <Box sx={{ width: 27, height: 27, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", bgcolor: meta.bg, color: meta.color }}>{folderIcon(item.folder)}</Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={1} alignItems="baseline">
                              <Typography noWrap sx={{ fontSize: 12.5, fontWeight: item.read ? 700 : 900, color: item.read ? D.t2 : D.t1, flex: 1 }}>
                                {item.from}
                              </Typography>
                              <Typography sx={{ fontSize: 10.5, color: D.t3, fontFamily: MONO, flexShrink: 0 }}>
                                {timeLabel(item)}
                              </Typography>
                            </Stack>
                            <Typography noWrap sx={{ fontSize: 13, fontWeight: item.read ? 600 : 900, color: item.read ? D.t2 : D.t1, mt: 0.15 }}>{item.subject}<Box component="span" sx={{ fontWeight: 500, color: D.t3 }}> — {item.preview}</Box></Typography>
                          </Box>

                          {!item.read && (
                            <Box sx={{ mt: 1, width: 8, height: 8, borderRadius: "50%", bgcolor: D.brand, flexShrink: 0 }} />
                          )}
                        </Box>
                      );
                    })}
                  </MotionPresence>
                )}
              </Box>
            </Box>

            {/* Reading pane */}
            {selected && (
              <Box
                component={motion.div}
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                sx={{
                  flex: 1, minWidth: 0, width: "100%",
                  bgcolor: D.surface, overflow: "hidden",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${D.border}` }}>
                  <Tooltip title="Back to list">
                    <IconButton onClick={() => setSelectedId(null)} aria-label="Back to mail list" size="small" sx={{ color: D.t3, "&:hover": { color: D.t1 } }}>
                      <ArrowBackIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Chip
                    size="small"
                    label={folderLabel(selected.folder)}
                    sx={{ bgcolor: folderColors(selected.folder).bg, color: folderColors(selected.folder).color, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 0.5 }}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO }}>{timeLabel(selected)}</Typography>
                </Stack>

                <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Typography sx={{ fontWeight: 950, fontSize: { xs: 20, md: 23 }, color: D.t1, lineHeight: 1.35, mb: 2 }}>
                    {selected.subject}
                  </Typography>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 3 }}><Avatar sx={{ width: 38, height: 38, bgcolor: folderColors(selected.folder).bg, color: folderColors(selected.folder).color, fontSize: 14, fontWeight: 900 }}>{selected.from.slice(0, 1).toUpperCase()}</Avatar><Box><Typography sx={{ color: D.t1, fontWeight: 800, fontSize: 13.5 }}>{selected.from}</Typography><Typography sx={{ fontSize: 11.5, color: D.t3 }}>to me{selected.gameDay !== null && ` · Day ${selected.gameDay}`}</Typography></Box></Stack>

                  {selected.news && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
                      <Chip size="small" icon={toneMeta(selected.news.marketTone).icon}
                        label={toneMeta(selected.news.marketTone).label}
                        sx={{ bgcolor: toneMeta(selected.news.marketTone).bg, color: toneMeta(selected.news.marketTone).color, fontWeight: 800, fontSize: 10.5, "& .MuiChip-icon": { color: "inherit" } }} />
                      <Chip size="small" label={selected.news.importance === "High" ? "High impact" : "Normal impact"}
                        sx={{ bgcolor: selected.news.importance === "High" ? D.redBg : D.overlay, color: selected.news.importance === "High" ? D.redText : D.t3, fontWeight: 800, fontSize: 10.5 }} />
                      {selected.news.isRumor && (
                        <Chip size="small" label="Unconfirmed"
                          sx={{ bgcolor: D.overlay, color: D.t3, fontWeight: 800, fontSize: 10.5 }} />
                      )}
                    </Stack>
                  )}

                  <Typography sx={{ fontSize: 14, color: D.t2, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                    {selected.body}
                  </Typography>

                  {selected.news && selected.news.relatedTickers.length > 0 && (
                    <>
                      <Divider sx={{ borderColor: D.border, my: 2.5 }} />
                      <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO, letterSpacing: 0.5, mb: 1 }}>
                        RELATED HOLDINGS
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selected.news.relatedTickers.map((ticker) => (
                          <Chip
                            key={ticker}
                            component={RouterLink}
                            to={`/stocks/${ticker}`}
                            clickable
                            size="small"
                            label={ticker}
                            sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 800, fontSize: 11, fontFamily: MONO, textDecoration: "none" }}
                          />
                        ))}
                      </Stack>
                    </>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
