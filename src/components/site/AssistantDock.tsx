import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ChatTurn } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessagesSquare, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The brand palette orbiting once: the shared flourish of the whole dock. */
const RING =
  "conic-gradient(from 0deg, var(--brand), var(--warm), var(--plum), var(--brand))";

const OPENING: ChatTurn = {
  role: "assistant",
  content:
    "Hello — I am Memo, the assistant here. Ask me what is on, what a place costs in your currency, how the shop works, how to sponsor an event, or how payments are handled.",
  meta: null,
};

const SUGGESTIONS = [
  "What's on next?",
  "How much are the workshops?",
  "How do I pay with bKash?",
  "Can my company sponsor?",
  "Draft an invitation for the next one",
  "What does the platform report say?",
];

/**
 * The launcher is never hidden and never still: it breathes with the page,
 * its brand ring turns slowly, its live dot pings. Memo is always on, and
 * the launcher should look like it.
 */
function Launcher(props: {
  open: boolean;
  reduced: boolean;
  onToggle: () => void;
}) {
  const { open, reduced, onToggle } = props;
  return (
    <motion.div
      className="relative"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
    >
      <motion.div
        className="relative"
        animate={reduced || open ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {!reduced && !open && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border border-brand/50"
            animate={{ scale: [1, 1.4], opacity: [0.55, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <motion.button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Close the assistant" : "Ask the assistant"}
          whileHover={reduced ? undefined : { scale: 1.04 }}
          whileTap={reduced ? undefined : { scale: 0.95 }}
          className={cn(
            "relative flex items-center gap-2 rounded-full border px-4 py-3 text-[13px] shadow-lift transition-colors",
            open
              ? "border-foreground/20 bg-foreground text-background"
              : "border-brand-line bg-card text-foreground hover:border-brand",
          )}
        >
          <span className="relative flex size-6 items-center justify-center">
            {!reduced && !open && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full opacity-50 blur-[3px]"
                style={{ background: RING }}
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              />
            )}
            {open ? (
              <X className="relative size-4" />
            ) : (
              <MessagesSquare className="relative size-4 text-brand" />
            )}
          </span>
          <span className="hidden sm:inline">
            {open ? "Close" : "Ask Memo"}
          </span>
          {!open && (
            <span className="absolute -top-1 -right-1 flex size-3">
              {!reduced && (
                <motion.span
                  aria-hidden
                  className="tone-open absolute size-full rounded-full"
                  animate={{ scale: [1, 2.2], opacity: [0.55, 0] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              )}
              <span className="tone-open relative size-3 rounded-full ring-2 ring-background" />
            </span>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Anything on the site can open the assistant, and optionally hand it a
 * question to ask on the spot:
 * window.dispatchEvent(new CustomEvent(MEMO_OPEN_EVENT, { detail: { question } }))
 */
export const MEMO_OPEN_EVENT = "memorius:memo-open";

type MemoOpenDetail = { question?: string };

/**
 * The assistant, available on every page. It answers from the live catalogue,
 * with a model behind it when a key is configured and a rule-based reply when
 * one is not, so it is never simply unavailable.
 */
export function AssistantDock() {
  const reduced = useReducedMotion();
  const status = useQuery(api.assistant.status);
  const ask = useAction(api.assistant.ask);

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([OPENING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, turns.length, pending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(question: string) {
    const text = question.trim();
    if (text.length < 2 || pending) return;

    const history = turns
      .slice(1)
      .slice(-6)
      .map((turn) => ({ role: turn.role, content: turn.content }));

    setTurns((previous) => [...previous, { role: "user", content: text }]);
    setDraft("");
    setPending(true);
    try {
      const result = await ask({ question: text, history });
      setTurns((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.reply,
          meta: result.configured
            ? (result.provider ?? "model")
            : "Catalogue mode",
        },
      ]);
    } catch {
      setTurns((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I could not reach the assistant just now. The catalogue at /events has everything that is on sale, and the programme pages explain each season.",
          meta: null,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  // The page can open the dock, and ask the question it wants answered. The
  // latest send closure is kept in a ref so the listener is subscribed once.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<MemoOpenDetail>).detail;
      setOpen(true);
      if (detail?.question !== undefined) void sendRef.current(detail.question);
    };
    window.addEventListener(MEMO_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(MEMO_OPEN_EVENT, onOpen);
  }, []);

  const configured = status?.configured ?? false;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="memo-panel"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.95 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: "spring", stiffness: 340, damping: 27 }
            }
            className="fixed right-4 bottom-24 z-50 flex max-h-[min(34rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-xl border border-border bg-card shadow-panel"
            role="dialog"
            aria-label="Memorius assistant"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <span className="relative flex size-9 shrink-0 items-center justify-center">
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ background: RING }}
                  animate={reduced ? undefined : { rotate: 360 }}
                  transition={{
                    duration: pending ? 1.3 : 9,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <span className="absolute inset-[2px] rounded-full bg-card" />
                <Sparkles className="relative size-4 text-brand" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium tracking-[-0.012em]">
                  Memo, your assistant
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {pending
                    ? "Thinking…"
                    : status === undefined
                      ? "Connecting…"
                      : configured
                        ? `Answering with ${status.provider}`
                        : "Catalogue mode — no model key yet"}
                </p>
              </div>
              <motion.span
                whileHover={reduced ? undefined : { rotate: 90 }}
                className="rounded-full"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close assistant"
                  onClick={() => setOpen(false)}
                  className="rounded-full text-muted-foreground"
                >
                  <X className="size-4" />
                </Button>
              </motion.span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {turns.map((turn, index) => (
                <motion.div
                  key={index}
                  initial={
                    reduced
                      ? { opacity: 0 }
                      : { opacity: 0, y: 10, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.35,
                    ease: EASE,
                    delay: Math.min(index * 0.06, 0.3),
                  }}
                  className={cn(
                    "flex",
                    turn.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-lg px-3.5 py-2.5 text-[12.5px] leading-6 whitespace-pre-line",
                      turn.role === "user"
                        ? "bg-foreground text-background"
                        : "border border-border bg-background text-foreground",
                    )}
                  >
                    {turn.content}
                    {turn.meta !== null && turn.meta !== undefined && (
                      <span className="mt-2 block text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                        {turn.meta}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              <AnimatePresence>
                {pending && (
                  <motion.div
                    key="memo-typing"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }
                    }
                    transition={{ duration: 0.3, ease: EASE }}
                    className="flex items-center gap-2"
                  >
                    <span className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2.5">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className={cn(
                            "size-1.5 rounded-full bg-brand",
                            reduced && "opacity-50",
                          )}
                          animate={
                            reduced
                              ? undefined
                              : { y: [0, -4, 0], opacity: [0.35, 1, 0.35] }
                          }
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: dot * 0.15,
                          }}
                        />
                      ))}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Reading the catalogue…
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={endRef} />
            </div>

            {turns.length <= 2 && (
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                {SUGGESTIONS.map((suggestion, index) => (
                  <motion.button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      ease: EASE,
                      delay: 0.15 + index * 0.06,
                    }}
                    whileHover={reduced ? undefined : { y: -2 }}
                    whileTap={reduced ? undefined : { scale: 0.96 }}
                    className="chip hover:border-foreground/25 hover:text-foreground"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
              className="flex items-center gap-2 border-t border-border px-3 py-3"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about events, prices, payments…"
                aria-label="Ask the assistant"
                className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background px-3.5 text-[13px] outline-none transition-colors focus-visible:border-foreground/25"
              />
              <Button
                type="submit"
                size="icon-sm"
                aria-label="Send"
                disabled={pending || draft.trim().length < 2}
                className="rounded-full"
              >
                <Send className="size-3.5" />
              </Button>
            </form>

            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
              <Link
                to="/events"
                onClick={() => setOpen(false)}
                className="link-quiet"
              >
                Browse every event
              </Link>
              <Link
                to="/report"
                onClick={() => setOpen(false)}
                className="link-quiet"
              >
                Platform report
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="link-quiet"
              >
                My bookings
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed chrome: out of the printed sheet, on every screen. */}
      <div className="fixed right-4 bottom-5 z-50">
        <Launcher
          open={open}
          reduced={Boolean(reduced)}
          onToggle={() => setOpen((value) => !value)}
        />
      </div>
    </>
  );
}
