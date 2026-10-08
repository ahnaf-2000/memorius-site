import { Float, FloatingObjects, Magnetic } from "@/components/site/LiveMotion";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, CornerUpLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

const EASE = [0.16, 1, 0.3, 1] as const;
const RETURN_SECONDS = 3;

type ReturnTarget =
  | { kind: "path"; path: string }
  | { kind: "back" }
  | { kind: "home" };

/**
 * Where the visitor came from, in order of how much the answer can be trusted.
 *
 * A guard can hand us the path it replaced, the browser can hand us a referrer
 * when it was one of ours, and failing both we walk history back a step. If
 * this really is the first page of the visit, the only honest answer is home.
 */
function resolveReturnTarget(pathname: string, state: unknown): ReturnTarget {
  if (typeof state === "object" && state !== null) {
    const from = (state as { from?: unknown }).from;
    if (typeof from === "string" && from !== pathname) {
      return { kind: "path", path: from };
    }
  }

  if (typeof document !== "undefined" && document.referrer !== "") {
    try {
      const url = new URL(document.referrer);
      if (url.origin === window.location.origin && url.pathname !== pathname) {
        return { kind: "path", path: `${url.pathname}${url.search}` };
      }
    } catch {
      // An unparseable referrer is simply no referrer.
    }
  }

  // React Router stamps every entry it pushes with `idx`, counting from the
  // start of the visit. A non-zero idx therefore means the step behind us was
  // one of ours — so walking back keeps the visitor on the site instead of
  // dropping them out to whatever tab or page happened to be open before.
  if (typeof window !== "undefined") {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    if (typeof idx === "number" && idx > 0) {
      return { kind: "back" };
    }
  }
  return { kind: "home" };
}

/**
 * The page that does not exist.
 *
 * Written on purpose without the usual apology theatre: the mistake is the
 * site's, the visitor did nothing wrong, and the most useful thing we can do
 * is keep their afternoon moving. So the page says so in one breath, holds
 * four floating numerals that never quite settle, and walks them back to where
 * they were after three seconds — unless they press Escape, in which case it
 * stops counting and lets them read.
 */
export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const reduced = useReducedMotion() ?? false;

  const [target] = useState<ReturnTarget>(() =>
    resolveReturnTarget(location.pathname, location.state),
  );
  const [seconds, setSeconds] = useState(RETURN_SECONDS);
  const [cancelled, setCancelled] = useState(false);

  const goBack = useCallback(() => {
    if (target.kind === "path") {
      // Replace, so the dead link is not left behind in the history.
      navigate(target.path, { replace: true });
    } else if (target.kind === "back") {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate, target]);

  // The three-second return: one tick a second, then the door.
  useEffect(() => {
    if (cancelled) return;
    if (seconds <= 0) {
      goBack();
      return;
    }
    const timer = window.setTimeout(
      () => setSeconds((value) => value - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cancelled, goBack, seconds]);

  // Escape holds the page still, for anyone who wants to read it.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCancelled(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const countdown =
    target.kind === "home"
      ? t("notFound.returningHome", { n: Math.max(seconds, 0) })
      : t("notFound.returning", { n: Math.max(seconds, 0) });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="relative flex flex-1 items-center overflow-hidden">
        <div
          aria-hidden="true"
          className="glow-soft pointer-events-none absolute inset-x-0 top-0 h-96"
        />
        <FloatingObjects />

        <div className="relative mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8 sm:py-28">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="label-eyebrow text-brand"
          >
            {t("notFound.eyebrow")}
          </motion.p>

          {/* Three numerals, each drifting on its own slow clock. */}
          <div className="mt-8 flex items-end justify-center gap-2 sm:gap-4">
            {"404".split("").map((digit, index) => (
              <Float
                key={`${digit}-${index}`}
                y={7 + index * 2}
                duration={8 + index * 2.5}
                delay={-index * 1.7}
              >
                <motion.span
                  initial={
                    reduced
                      ? { opacity: 0 }
                      : { opacity: 0, y: 26, scale: 0.96 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: reduced ? 0.2 : 0.9,
                    delay: 0.05 + index * 0.12,
                    ease: EASE,
                  }}
                  className="font-display block text-[64px] leading-none tabular-nums sm:text-[92px]"
                >
                  {digit}
                </motion.span>
              </Float>
            ))}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
            className="mx-auto mt-8 max-w-xl text-[22px] leading-[1.3] font-light tracking-[-0.014em] text-balance sm:text-[26px]"
          >
            {t("notFound.title")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
            className="mx-auto mt-4 max-w-lg text-[14px] leading-7 text-muted-foreground"
          >
            {t("notFound.lead")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.58, ease: EASE }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Magnetic>
              <Button
                type="button"
                size="lg"
                className="sheen h-11 gap-2 rounded-full px-6 text-[14px]"
                onClick={goBack}
              >
                <CornerUpLeft className="size-4" />
                {t("notFound.back")}
              </Button>
            </Magnetic>
            <Magnetic pull={0.08}>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 gap-2 rounded-full border-border px-6 text-[14px] shadow-none"
              >
                <Link to="/events">
                  <Compass className="size-4" />
                  {t("notFound.explore")}
                </Link>
              </Button>
            </Magnetic>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
            className="mt-6"
          >
            <Link
              to="/"
              className="link-quiet text-[12px] text-muted-foreground"
            >
              {t("notFound.home")}
            </Link>
          </motion.div>

          {/* The countdown: a ring draining at the speed of the return. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: EASE }}
            className="mt-12 flex flex-col items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <span className="flex items-center gap-3">
              <span className="relative grid size-8 place-items-center">
                <svg
                  viewBox="0 0 36 36"
                  className="absolute inset-0 -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="2.5"
                  />
                  {!cancelled && !reduced && (
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="var(--brand)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray="1"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: 1 }}
                      transition={{ duration: RETURN_SECONDS, ease: "linear" }}
                    />
                  )}
                  {cancelled && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="2.5"
                      strokeDasharray="1 4"
                      pathLength={1}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <span className="relative text-[11px] tabular-nums">
                  {cancelled ? "—" : Math.max(seconds, 0)}
                </span>
              </span>
              <span className="text-[13px] text-muted-foreground">
                {cancelled ? t("notFound.cancelled") : countdown}
              </span>
            </span>
            {!cancelled && (
              <span className="text-[11px] text-muted-foreground/80">
                {t("notFound.hold")}
              </span>
            )}
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
