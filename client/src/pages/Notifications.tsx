import React from "react";
import {
  Box, Button, Chip, Container, Divider, Stack, Typography,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InsightsIcon from "@mui/icons-material/Insights";
import { clearNotificationHistory, markNotificationsSeen, useNotificationHistory } from "../lib/notifications";
import { clearAnalyticsEvents, useAnalyticsEvents } from "../lib/analytics";
import { D, CARD, MONO } from "../theme/design";

function timeLabel(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function Notifications() {
  const notifications = useNotificationHistory();

  // Opening the list is what clears the header badge. Runs on every visit, not
  // just the first mount, so returning to the page after new arrivals clears
  // them too; markNotificationsSeen is a no-op when nothing has changed.
  React.useEffect(() => {
    markNotificationsSeen();
  }, [notifications]);
  const analytics = useAnalyticsEvents();

  return (
    <Box sx={{ bgcolor: D.bg, minHeight: "100vh" }}>
      <Box sx={{ bgcolor: D.surface, borderBottom: `1px solid ${D.border}` }}>
        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
          <Chip label="ACTIVITY" size="small"
            sx={{ bgcolor: D.brandBg, color: D.brandText, border: `1px solid ${D.brandBd}`, fontWeight: 900, fontSize: 10, fontFamily: MONO, letterSpacing: 1, mb: 1 }} />
          <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 950, color: D.t1, letterSpacing: -1 }}>
            Notifications & Activity
          </Typography>
          <Typography sx={{ fontSize: 13, color: D.t2, mt: 0.5 }}>
            Recent alerts, gameplay notices, and local diagnostic events from this browser.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }}
              sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <NotificationsActiveIcon sx={{ color: D.brandText, fontSize: 18 }} />
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Notification History</Typography>
              </Stack>
              <Button size="small" startIcon={<DeleteOutlineIcon />} onClick={clearNotificationHistory}
                disabled={notifications.length === 0}
                sx={{ color: D.t3, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.redText, borderColor: D.redBd, bgcolor: D.redBg } }}>
                Clear
              </Button>
            </Stack>
            <Box sx={{ p: 2.5 }}>
              {notifications.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: D.t3 }}>No notifications recorded yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {notifications.map((item) => (
                    <Box key={item.id} sx={{ p: 1.7, borderRadius: 2, bgcolor: D.elevated, border: `1px solid ${D.border}` }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.6 }}>
                        <Chip size="small" label={item.kind.toUpperCase()} sx={{ bgcolor: D.overlay, color: D.brandText, fontWeight: 900, fontSize: 10, fontFamily: MONO }} />
                        <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO }}>{timeLabel(item.createdAt)}</Typography>
                      </Stack>
                      <Typography sx={{ fontWeight: 850, fontSize: 13.5, color: D.t1 }}>{item.title}</Typography>
                      {item.description && <Typography sx={{ fontSize: 12.5, color: D.t3, mt: 0.3 }}>{item.description}</Typography>}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          <Box sx={{ ...CARD, p: 0, overflow: "hidden" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: "center" }}
              sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${D.border}` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InsightsIcon sx={{ color: D.greenText, fontSize: 18 }} />
                <Typography sx={{ fontWeight: 900, fontSize: 16, color: D.t1 }}>Local Analytics Log</Typography>
              </Stack>
              <Button size="small" startIcon={<DeleteOutlineIcon />} onClick={clearAnalyticsEvents}
                disabled={analytics.length === 0}
                sx={{ color: D.t3, border: `1px solid ${D.border}`, fontWeight: 700, textTransform: "none", borderRadius: 1.5, "&:hover": { color: D.redText, borderColor: D.redBd, bgcolor: D.redBg } }}>
                Clear
              </Button>
            </Stack>
            <Box sx={{ p: 2.5 }}>
              {analytics.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: D.t3 }}>No local analytics events recorded yet.</Typography>
              ) : (
                <Stack divider={<Divider sx={{ borderColor: D.border }} />} spacing={1.2}>
                  {analytics.slice(0, 40).map((item) => (
                    <Stack key={item.id} direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: D.t1 }}>{item.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: D.t3, fontFamily: MONO }}>{timeLabel(item.createdAt)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
