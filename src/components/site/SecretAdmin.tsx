import { BrandMark } from "@/components/site/Brand";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useActiveCountry, useActiveCurrency } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clapperboard, KeyRound, LockKeyhole, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The knock: twenty taps on the mark, inside five seconds. */
const REQUIRED_TAPS = 20;
const WINDOW_MS = 5000;
/** Feedback starts here, so the gesture is findable but stays quiet. */
const FEEDBACK_AFTER = 6;
/** The word. Client-side only: a curtain, never a vault. */
const PASSWORD = "YoBro";

type Stage = "idle" | "locked" | "open";

/**
 * The hidden backstage console. Nothing renders until someone taps the
 * Memorius mark twenty times inside five seconds — then the door asks for the
 * word before it opens. The tap count is kept at the document level so it
 * works from the header, the mobile menu or the footer, and survives the
 * navigation that tapping the mark itself causes.
 */
export function SecretAdmin() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<Stage>("idle");
  const [taps, setTaps] = useState(0);
  const stamps = useRef<number[]>([]);
  const fadeTimer = useRef<number | null>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target === null || target.closest("[data-memo-brand]") === null) {
        return;
      }

      const now = Date.now();
      stamps.current = [...stamps.current, now].filter(
        (stamp) => now - stamp <= WINDOW_MS,
      );
      const count = stamps.current.length;

      if (count >= REQUIRED_TAPS) {
        stamps.current = [];
        if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
        setTaps(0);
        setStage("locked");
        return;
      }

      setTaps(count);
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(() => {
        setTaps(0);
        stamps.current = [];
      }, 1600);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (stage === "idle") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStage("idle");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);

  return (
    <>
      <AnimatePresence>
        {stage === "idle" && taps >= FEEDBACK_AFTER && (
          <motion.div
            key="memo-taps"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed bottom-5 left-4 z-[80] flex items-center gap-2 rounded-full border border-brand-line bg-card px-3 py-1.5 text-[10px] tracking-[0.1em] text-muted-foreground uppercase shadow-lift"
            aria-hidden
          >
            <span className="size-1.5 rounded-full bg-brand" />
            Backstage {taps}/{REQUIRED_TAPS}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === "locked" && (
          <PasswordGate
            key="memo-gate"
            reduced={Boolean(reduced)}
            onClose={() => setStage("idle")}
            onUnlock={() => {
              setStage("open");
              toast("Backstage unlocked");
            }}
          />
        )}
        {stage === "open" && (
          <Backstage
            key="memo-console"
            reduced={Boolean(reduced)}
            onClose={() => setStage("idle")}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** The word, asked for. The wrong one shakes the door; the right one opens it. */
function PasswordGate(props: { reduced: boolean; onClose: () => void; onUnlock: () => void }) {
  const { reduced, onClose, onUnlock } = props;
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const wrong = attempts > 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim() === PASSWORD) {
      onUnlock();
      return;
    }
    setAttempts((previous) => previous + 1);
    setValue("");
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Remounts on a wrong guess, so the shake and the focus play again. */}
      <motion.div
        key={attempts}
        initial={
          reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 10 }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : wrong
              ? { opacity: 1, scale: 1, y: 0, x: [0, -9, 9, -5, 5, 0] }
              : { opacity: 1, scale: 1, y: 0 }
        }
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="w-[min(22rem,calc(100vw-2rem))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-xl border border-border bg-card p-5 shadow-panel">
          <div className="flex items-center gap-3">
            <span className="icon-chip size-9">
              <LockKeyhole className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[15px] tracking-[-0.015em]">
                Backstage
              </p>
              <p className="text-[11px] text-muted-foreground">
                Twenty taps on the mark. Now the word.
              </p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-4 space-y-2.5">
            <input
              type="password"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (attempts > 0) setAttempts(0);
              }}
              placeholder="Password"
              autoFocus
              aria-label="Backstage password"
              aria-invalid={wrong}
              className="h-9 w-full rounded-full border border-border bg-background px-3.5 text-[13px] outline-none transition-colors focus-visible:border-brand/50"
            />
            {wrong && (
              <p className="text-[11px] text-destructive">
                That is not the word. Try again.
              </p>
            )}
            <Button type="submit" size="sm" className="w-full rounded-full">
              <KeyRound className="size-3.5" />
              Unlock
            </Button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Tile(props: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background px-3 py-2.5",
        props.wide && "col-span-2",
      )}
    >
      <p className="label-eyebrow text-[9px] text-muted-foreground">
        {props.label}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium">{props.children}</p>
    </div>
  );
}

/**
 * The console itself. Public queries only — the same figures a visitor can
 * already find — plus fast doors to the pages that do check who you are.
 */
function Backstage(props: { reduced: boolean; onClose: () => void }) {
  const { reduced, onClose } = props;
  const fests = useQuery(api.fests.list);
  const campaigns = useQuery(api.campaigns.live);
  const status = useQuery(api.assistant.status);
  const country = useActiveCountry();
  const currency = useActiveCurrency();

  const programmes = fests?.length ?? null;
  const events = fests?.reduce((sum, fest) => sum + fest.eventCount, 0) ?? null;
  const seats = fests?.reduce((sum, fest) => sum + fest.seatsTaken, 0) ?? null;
  const capacity =
    fests?.reduce((sum, fest) => sum + fest.capacity, 0) ?? null;
  const fill =
    seats !== null && capacity !== null && capacity > 0
      ? Math.min(100, Math.round((seats / capacity) * 100))
      : 0;

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        initial={
          reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }
        }
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 340, damping: 27 }}
        className="w-[min(30rem,calc(100vw-2rem))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="max-h-[min(36rem,calc(100vh-4rem))] overflow-hidden rounded-xl border border-border bg-card shadow-panel">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <BrandMark animated={false} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[14px] tracking-[-0.015em]">
                Backstage
              </p>
              <p className="text-[11px] text-muted-foreground">
                Memorius admin console
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close the console"
              onClick={onClose}
              className="rounded-full text-muted-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="max-h-[calc(min(36rem,calc(100vh-4rem))-4.25rem)] space-y-4 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Tile label="Model">
                {status === undefined
                  ? "…"
                  : status.configured
                    ? (status.provider ?? "Configured")
                    : "Catalogue mode"}
              </Tile>
              <Tile label="Market">
                {country.flag} {country.code} · {currency.code}
              </Tile>
              <Tile label="Programmes">{programmes ?? "…"}</Tile>
              <Tile label="Events on the bill">{events ?? "…"}</Tile>
              <Tile label="Seats claimed" wide>
                {seats === null || capacity === null
                  ? "…"
                  : `${seats} of ${capacity}`}
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-soft"
                    style={{ width: `${fill}%` }}
                  />
                </span>
              </Tile>
            </div>

            <div>
              <p className="label-eyebrow text-[9px] text-muted-foreground">
                Live promo codes
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {campaigns === undefined ? null : campaigns.length === 0 ? (
                  <span className="text-[12px] text-muted-foreground">
                    None running
                  </span>
                ) : (
                  campaigns.map((campaign) => (
                    <span key={campaign._id} className="chip chip-tinted">
                      {campaign.code}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="label-eyebrow text-[9px] text-muted-foreground">
                Fast doors
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  ["/admin", "Admin (signed in)"],
                  ["/dashboard", "Dashboard"],
                  ["/events", "Events"],
                  ["/programmes", "Programmes"],
                  ["/contact", "Contact"],
                ].map(([to, label]) => (
                  <Link key={to} to={to} onClick={onClose} className="chip">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => window.location.assign("/?intro=1")}
                className="chip hover:border-foreground/25 hover:text-foreground"
              >
                <Clapperboard className="size-3" />
                Replay the opening
              </button>
              <p className="text-right text-[10px] leading-4 text-muted-foreground">
                A client-side curtain, not a vault —
                <br />
                the real console still checks who you are.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
