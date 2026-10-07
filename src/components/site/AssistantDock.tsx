import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { ChatTurn } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAction, useQuery } from "convex/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Loader2,
  MessagesSquare,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

const EASE = [0.16, 1, 0.3, 1] as const;

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
];

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

  const configured = status?.configured ?? false;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: reduced ? 0 : 0.32, ease: EASE }}
            className="fixed right-4 bottom-24 z-50 flex max-h-[min(34rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-panel"
            role="dialog"
            aria-label="Memorius assistant"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <span className="icon-chip size-9">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium tracking-[-0.012em]">
                  Memo, your assistant
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {status === undefined
                    ? "Connecting…"
                    : configured
                      ? `Answering with ${status.provider}`
                      : "Catalogue mode — no model key yet"}
                </p>
              </div>
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
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {turns.map((turn, index) => (
                <div
                  key={index}
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
                </div>
              ))}
              {pending && (
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Reading the catalogue…
                </div>
              )}
              <div ref={endRef} />
            </div>

            {turns.length <= 2 && (
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="chip hover:border-foreground/25 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
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

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close the assistant" : "Ask the assistant"}
        whileHover={reduced ? undefined : { scale: 1.03 }}
        whileTap={reduced ? undefined : { scale: 0.97 }}
        className={cn(
          "fixed right-4 bottom-5 z-50 flex items-center gap-2 rounded-full border px-4 py-3 text-[13px] shadow-lift transition-colors",
          open
            ? "border-foreground/20 bg-foreground text-background"
            : "border-brand-line bg-card text-foreground hover:border-brand",
        )}
      >
        {open ? (
          <X className="size-4" />
        ) : (
          <MessagesSquare className="size-4 text-brand" />
        )}
        <span className="hidden sm:inline">{open ? "Close" : "Ask Memo"}</span>
        {!open && !configured && status !== undefined && (
          <span className="hidden items-center gap-1 text-[10px] tracking-[0.1em] text-muted-foreground uppercase sm:flex">
            <ArrowUpRight className="size-3" />
            basic
          </span>
        )}
      </motion.button>
    </>
  );
}
