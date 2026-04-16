import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SecurityIcon from "@mui/icons-material/Security";
import SpeedIcon from "@mui/icons-material/Speed";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AnimationIcon from "@mui/icons-material/Animation";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import StarIcon from "@mui/icons-material/Star";
import BoltIcon from "@mui/icons-material/Bolt";
import HubIcon from "@mui/icons-material/Hub";
import ShieldIcon from "@mui/icons-material/Shield";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Section: React.FC<React.PropsWithChildren<{ id: string; bg?: string }>> = ({
  id,
  bg,
  children,
}) => (
  <Box
    id={id}
    component="section"
    sx={{
      minHeight: "100svh",
      display: "grid",
      alignContent: "center",
      position: "relative",
      bgcolor: bg || "transparent",
      py: { xs: 6, md: 10 },
      overflow: "clip",
    }}
  >
    {children}
  </Box>
);

/**
 * Enterprise-friendly typing hook:
 * - supports reduced-motion
 * - cursor blink
 * - loops (optional)
 */
function useTypewriter(opts: {
  text: string;
  startDelayMs?: number;
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
  loop?: boolean;
  enabled?: boolean;
}) {
  const {
    text,
    startDelayMs = 350,
    typeMs = 22,
    deleteMs = 12,
    holdMs = 1200,
    loop = true,
    enabled = true,
  } = opts;

  const [out, setOut] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOut(text);
      return;
    }

    let alive = true;
    let t: number | undefined;

    const sleep = (ms: number) =>
      new Promise<void>((r) => {
        t = window.setTimeout(() => r(), ms);
      });

    const run = async () => {
      await sleep(startDelayMs);

      // typing
      for (let i = 1; i <= text.length && alive; i++) {
        setOut(text.slice(0, i));
        await sleep(typeMs);
      }

      // hold
      await sleep(holdMs);

      if (!loop || !alive) return;

      // deleting
      setIsDeleting(true);
      for (let i = text.length - 1; i >= 0 && alive; i--) {
        setOut(text.slice(0, i));
        await sleep(deleteMs);
      }
      setIsDeleting(false);

      // pause before restart
      await sleep(250);

      if (alive) run();
    };

    run();

    return () => {
      alive = false;
      if (t) window.clearTimeout(t);
    };
  }, [text, startDelayMs, typeMs, deleteMs, holdMs, loop, enabled]);

  return { text: out, isDeleting };
}

type FloatingIconSpec = {
  key: string;
  Icon: React.ElementType;
  top: string;
  left: string;
  size: number; // px
  hue: "primary" | "secondary";
  delay: number; // seconds
};

const HeroFloatingIcon: React.FC<{
  spec: FloatingIconSpec;
  reduced: boolean;
}> = ({ spec, reduced }) => {
  const { Icon, top, left, size, hue, delay } = spec;

  return (
    <MotionBox
      aria-hidden
      sx={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: "999px",
        display: { xs: "none", md: "grid" },
        placeItems: "center",
        backdropFilter: "blur(10px)",
        backgroundColor: (t) =>
          hue === "primary"
            ? `${t.palette.primary.main}14`
            : `${t.palette.secondary.main}14`,
        border: (t) => `1px solid ${t.palette.divider}`,
        boxShadow: 6,
        cursor: "grab",
        userSelect: "none",
      }}
      drag={!reduced}
      dragElastic={0.25}
      dragMomentum={false}
      whileHover={
        reduced
          ? undefined
          : {
              scale: 1.12,
              rotate: 4,
              transition: { type: "spring", stiffness: 260, damping: 16 },
            }
      }
      whileTap={reduced ? undefined : { scale: 0.98, cursor: "grabbing" }}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={
        reduced
          ? { opacity: 1, y: 0, scale: 1 }
          : {
              opacity: 1,
              y: [0, -10, 0],
              rotate: [0, 2, 0],
              scale: [1, 1.02, 1],
            }
      }
      transition={
        reduced
          ? { duration: 0.35 }
          : {
              duration: 3.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }
      }
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: (t) =>
            hue === "primary" ? t.palette.primary.main : t.palette.secondary.main,
        }}
      >
        <Icon sx={{ fontSize: Math.max(20, Math.floor(size * 0.46)) }} />
      </Box>
    </MotionBox>
  );
};

const Home: React.FC = () => {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  // Responsive scaling signals
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));

  const deviceScale = isXs ? 1.0 : isSm ? 1.03 : isMdUp ? 1.06 : isLgUp ? 1.08 : 1.04;

  // ✅ FIX: proper ref typing for Box (MUI can infer unknown without this)
  const heroRef = useRef<HTMLDivElement | null>(null);
  const setHeroRef = useCallback((node: HTMLDivElement | null) => {
    heroRef.current = node;
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // subtle parallax & fade as you scroll past hero
  const heroTitleY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -22]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0.35]);

  // Typing headline line
  const typed = useTypewriter({
    text: "Build fast. Ship pretty. Scale with confidence.",
    enabled: !reducedMotion,
    loop: true,
    typeMs: 18,
    deleteMs: 10,
    holdMs: 1100,
    startDelayMs: 350,
  });

  const features = useMemo(
    () => [
      {
        icon: <SpeedIcon />,
        title: "Performance-first",
        desc: "No CSS bloat. Pure MUI with fast initial render and lean bundles.",
      },
      {
        icon: <AutoFixHighIcon />,
        title: "Beautiful by default",
        desc: "Consistent typography, spacing, and subtle motion out of the box.",
      },
      {
        icon: <VerifiedUserIcon />,
        title: "Secure Auth",
        desc: "Login/Signup ready for JWT or cookie sessions with sane defaults.",
      },
      {
        icon: <AnimationIcon />,
        title: "Smooth Motion",
        desc: "Framer Motion transitions that feel premium—not distracting.",
      },
    ],
    []
  );

  const testimonials = useMemo(
    () => [
      {
        name: "Ari Putra",
        role: "Tech Lead, FinX",
        quote:
          "Mernbase cut our kickoff time from days to hours. Clean structure and zero yak shaving.",
      },
      {
        name: "Siti Rahma",
        role: "Founder, EduLabs",
        quote: "The auth flow is production-ready. We shipped MVP without fighting tooling.",
      },
      {
        name: "Daniel Tan",
        role: "PM, Growthify",
        quote: "Design feels enterprise-grade. Stakeholders were impressed from sprint one.",
      },
    ],
    []
  );

  const floatingIcons: FloatingIconSpec[] = useMemo(
    () => [
      { key: "bolt", Icon: BoltIcon, top: "18%", left: "10%", size: 64, hue: "secondary", delay: 0.1 },
      { key: "hub", Icon: HubIcon, top: "12%", left: "82%", size: 72, hue: "primary", delay: 0.3 },
      { key: "shield", Icon: ShieldIcon, top: "62%", left: "8%", size: 76, hue: "primary", delay: 0.2 },
      { key: "cloud", Icon: CloudDoneIcon, top: "68%", left: "86%", size: 64, hue: "secondary", delay: 0.4 },
    ],
    []
  );

  const baseCardSx = useMemo(
    () => ({
      height: "100%",
      borderRadius: 3,
      border: (t: any) => `1px solid ${t.palette.divider}`,
      transition: "transform 180ms ease, box-shadow 180ms ease",
      willChange: "transform",
    }),
    []
  );

  return (
    <Box
      sx={{
        background: `radial-gradient(1200px 600px at -10% -10%, ${theme.palette.primary.light}15, transparent 60%),
                     radial-gradient(1200px 600px at 110% 110%, ${theme.palette.secondary.light}15, transparent 60%)`,
      }}
    >
      {/* HERO */}
      <Section id="hero">
        <Container>
          <Box
            component="div"
            ref={setHeroRef}
            sx={{
              position: "relative",
              borderRadius: { xs: 4, md: 6 },
              px: { xs: 2, md: 6 },
              py: { xs: 6, md: 8 },
              border: (t) => `1px solid ${t.palette.divider}`,
              backgroundColor: "background.paper",
              boxShadow: 10,
              overflow: "hidden",
            }}
          >
            {/* Animated glow wash */}
            <MotionBox
              aria-hidden
              sx={{
                position: "absolute",
                inset: -40,
                background: `radial-gradient(600px 300px at 20% 20%, ${theme.palette.primary.main}14, transparent 55%),
                             radial-gradient(520px 280px at 80% 10%, ${theme.palette.secondary.main}12, transparent 55%),
                             radial-gradient(620px 320px at 80% 90%, ${theme.palette.primary.main}10, transparent 55%)`,
                pointerEvents: "none",
              }}
              initial={{ opacity: 0.65, scale: 1.02 }}
              animate={
                reducedMotion
                  ? { opacity: 0.65, scale: 1.02 }
                  : { opacity: [0.55, 0.85, 0.6], scale: [1.02, 1.05, 1.02] }
              }
              transition={
                reducedMotion
                  ? { duration: 0.01 }
                  : { duration: 6.5, repeat: Infinity, ease: "easeInOut" }
              }
            />

            {/* Floating interactive icons */}
            {floatingIcons.map((spec) => (
              <HeroFloatingIcon key={spec.key} spec={spec} reduced={!!reducedMotion} />
            ))}

            <MotionBox
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              sx={{ textAlign: "center", position: "relative" }}
            >
              <MotionBox style={{ y: heroTitleY, opacity: heroOpacity }}>
                <Typography
                  variant="h2"
                  fontWeight={900}
                  sx={{
                    lineHeight: 1.05,
                    fontSize: {
                      xs: "clamp(2.05rem, 6.2vw, 3.1rem)",
                      md: "clamp(2.6rem, 3.8vw, 3.5rem)",
                    },
                    letterSpacing: -0.6,
                  }}
                >
                  {reducedMotion ? (
                    <>
                      Build fast. Ship pretty. <br /> Scale with confidence.
                    </>
                  ) : (
                    <>
                      <Box component="span" sx={{ whiteSpace: "pre-wrap" }}>
                        {typed.text}
                      </Box>
                      <Box
                        component="span"
                        aria-hidden
                        sx={{
                          display: "inline-block",
                          width: "0.55ch",
                          ml: 0.3,
                          opacity: 0.9,
                          transform: "translateY(2px)",
                          animation: "blink 1s step-end infinite",
                          "@keyframes blink": {
                            "0%, 45%": { opacity: 0.9 },
                            "50%, 100%": { opacity: 0.1 },
                          },
                        }}
                      >
                        |
                      </Box>
                      <br />
                      <Box component="span" sx={{ opacity: 0.95 }}>
                        Scale with confidence.
                      </Box>
                    </>
                  )}
                </Typography>

                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{
                    mt: 2,
                    mb: 4,
                    maxWidth: 860,
                    mx: "auto",
                    fontSize: { xs: "1.0rem", md: "1.15rem" },
                  }}
                >
                  Mernbase — a professional MERN boilerplate with secure auth and clean UI.
                </Typography>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  justifyContent="center"
                  sx={{ alignItems: "center" }}
                >
                  <MotionBox whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={reducedMotion ? undefined : { scale: 0.99 }}>
                    <Button
                      size="large"
                      variant="contained"
                      component={RouterLink}
                      to="/auth?mode=signup"
                      endIcon={<RocketLaunchIcon />}
                      sx={{
                        px: 3,
                        py: 1.25,
                        borderRadius: 3,
                        boxShadow: 6,
                      }}
                    >
                      Get started
                    </Button>
                  </MotionBox>

                  <MotionBox whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={reducedMotion ? undefined : { scale: 0.99 }}>
                    <Button
                      size="large"
                      variant="outlined"
                      component={RouterLink}
                      to="/auth?mode=login"
                      endIcon={<SecurityIcon />}
                      sx={{ px: 3, py: 1.25, borderRadius: 3 }}
                    >
                      Log in
                    </Button>
                  </MotionBox>
                </Stack>

                <MotionBox
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                >
                  <Button
                    variant="text"
                    onClick={() => scrollTo("features")}
                    sx={{ mt: 6, color: "text.secondary" }}
                    endIcon={<ArrowDownwardIcon />}
                  >
                    Explore features
                  </Button>
                </MotionBox>
              </MotionBox>
            </MotionBox>
          </Box>
        </Container>
      </Section>

      {/* FEATURES */}
      <Section id="features">
        <Container>
          <MotionBox
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 18 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ mb: 4 }}>
              Features
            </Typography>
          </MotionBox>

          <Grid container spacing={3} alignItems="stretch">
            {features.map((f, i) => (
              <Grid key={f.title} item xs={12} sm={6} md={3}>
                <MotionCard
                  whileInView={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 18 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  elevation={3}
                  sx={{
                    ...baseCardSx,
                    transform: `scale(${deviceScale})`,
                    transformOrigin: "center",
                    "&:hover": reducedMotion
                      ? undefined
                      : {
                          transform: `scale(${deviceScale * 1.045})`,
                          boxShadow: 12,
                        },
                    "@media (prefers-reduced-motion: reduce)": {
                      transition: "none",
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Box sx={{ fontSize: 36, mb: 1.5, color: "primary.main" }}>{f.icon}</Box>
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      gutterBottom
                      sx={{
                        fontSize: { xs: "1.05rem", md: "1.1rem" },
                        letterSpacing: -0.2,
                      }}
                    >
                      {f.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.92rem", md: "0.95rem" } }}>
                      {f.desc}
                    </Typography>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>

          <Stack alignItems="center">
            <MotionBox
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 10 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45 }}
            >
              <Button
                variant="text"
                onClick={() => scrollTo("testimonials")}
                sx={{ mt: 6, color: "text.secondary" }}
                endIcon={<ArrowDownwardIcon />}
              >
                See what teams say
              </Button>
            </MotionBox>
          </Stack>
        </Container>
      </Section>

      {/* TESTIMONIALS */}
      <Section id="testimonials" bg="background.default">
        <Container>
          <MotionBox
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 18 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <Typography variant="h3" fontWeight={800} textAlign="center" sx={{ mb: 4 }}>
              Loved by builders
            </Typography>
          </MotionBox>

          <Grid container spacing={3}>
            {testimonials.map((t, i) => (
              <Grid item xs={12} md={4} key={t.name}>
                <MotionCard
                  whileInView={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 18 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: i * 0.06 }}
                  elevation={2}
                  sx={{
                    ...baseCardSx,
                    "&:hover": reducedMotion
                      ? undefined
                      : {
                          transform: "translateY(-6px)",
                          boxShadow: 10,
                        },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <StarIcon key={idx} fontSize="small" color="warning" />
                      ))}
                    </Stack>

                    <Typography
                      variant="body1"
                      sx={{
                        mb: 2,
                        fontSize: { xs: "0.98rem", md: "1.02rem" },
                        lineHeight: 1.6,
                      }}
                    >
                      “{t.quote}”
                    </Typography>

                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: "primary.main" }}>{t.name[0]}</Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800}>
                          {t.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.role}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>

          <Stack alignItems="center">
            <MotionBox
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 10 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45 }}
            >
              <Button
                variant="text"
                onClick={() => scrollTo("cta")}
                sx={{ mt: 6, color: "text.secondary" }}
                endIcon={<ArrowDownwardIcon />}
              >
                Get started now
              </Button>
            </MotionBox>
          </Stack>
        </Container>
      </Section>

      {/* FINAL CTA */}
      <Section id="cta">
        <Container>
          <MotionBox
            whileInView={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.985 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            sx={{
              textAlign: "center",
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              border: (t) => `1px solid ${t.palette.divider}`,
              boxShadow: 3,
              backgroundColor: "background.paper",
              maxWidth: 960,
              mx: "auto",
            }}
          >
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{
                mb: 2,
                fontSize: {
                  xs: "clamp(1.8rem, 5.6vw, 2.4rem)",
                  md: "clamp(2.0rem, 3.4vw, 2.6rem)",
                },
              }}
            >
              Kickstart your stack with Mernbase
            </Typography>

            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 4, fontSize: { xs: "1.0rem", md: "1.15rem" } }}
            >
              Production-ready boilerplate, secure auth, elegant UI. Plug in your API and ship.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
              <MotionBox whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={reducedMotion ? undefined : { scale: 0.99 }}>
                <Button
                  size="large"
                  variant="contained"
                  component={RouterLink}
                  to="/auth?mode=signup"
                  endIcon={<RocketLaunchIcon />}
                  sx={{ px: 3, py: 1.25, borderRadius: 3, boxShadow: 6 }}
                >
                  Create account
                </Button>
              </MotionBox>

              <MotionBox whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={reducedMotion ? undefined : { scale: 0.99 }}>
                <Button
                  size="large"
                  variant="outlined"
                  component={RouterLink}
                  to="/dashboard"
                  sx={{ px: 3, py: 1.25, borderRadius: 3 }}
                >
                  View dashboard
                </Button>
              </MotionBox>
            </Stack>
          </MotionBox>
        </Container>
      </Section>
    </Box>
  );
};

export default Home;
