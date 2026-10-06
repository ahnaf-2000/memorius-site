import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { dayParts, formatTimeRange, priceLabel } from "@/lib/format";
import type { EventListItem, ProgrammeListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { CalendarRange, Search, Ticket } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

interface Result {
  key: string;
  kind: "event" | "programme";
  title: string;
  detail: string;
  trailing: string;
  href: string;
}

/**
 * One field over the whole catalogue. Both lists are already reactive
 * subscriptions, so the palette filters what the page has and a customer never
 * waits on a round-trip to see a match appear.
 */
export function SearchPalette({
  trigger,
}: {
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const events = useQuery(api.events.list);
  const programmes = useQuery(api.fests.list);

  /** Every open starts from an empty field, so the last search never lingers. */
  function openPalette() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLowerCase();
    const matches = (fields: (string | null | undefined)[]) =>
      needle === "" ||
      fields.filter(Boolean).join(" ").toLowerCase().includes(needle);

    const eventRows: Result[] = ((events ?? []) as EventListItem[])
      .filter((event) =>
        matches([
          event.title,
          event.category,
          event.venue,
          event.summary,
          event.festName,
          event.organization,
        ]),
      )
      .slice(0, 8)
      .map((event) => {
        const parts = dayParts(event.startTime);
        return {
          key: `event-${event._id}`,
          kind: "event" as const,
          title: event.title,
          detail: `${event.festName} · ${parts.day} ${parts.month} · ${formatTimeRange(
            event.startTime,
            event.endTime,
          )}`,
          trailing: priceLabel(event.price),
          href: `/events/${event.slug}`,
        };
      });

    const programmeRows: Result[] = ((programmes ?? []) as ProgrammeListItem[])
      .filter((programme) =>
        matches([
          programme.name,
          programme.organization,
          programme.summary,
          programme.venue,
        ]),
      )
      .slice(0, 5)
      .map((programme) => ({
        key: `programme-${programme._id}`,
        kind: "programme" as const,
        title: programme.name,
        detail: `${programme.organization} · ${
          programme.eventCount ?? 0
        } events`,
        trailing: programme.venue ?? "",
        href: `/programmes/${programme.slug}`,
      }));

    return [...eventRows, ...programmeRows];
  }, [events, programmes, query]);

  const selected = results[Math.min(active, Math.max(0, results.length - 1))];

  function go(result: Result | undefined) {
    if (result === undefined) return;
    setOpen(false);
    navigate(result.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      go(selected);
    }
  }

  const defaultTrigger = (
    <button
      type="button"
      onClick={openPalette}
      className="group flex h-9 w-full items-center gap-2.5 rounded-full border border-border bg-card px-3.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground sm:w-64"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">Search the catalogue</span>
      <span className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] tracking-[0.08em] sm:block">
        ⌘K
      </span>
    </button>
  );

  return (
    <>
      {trigger ? trigger(openPalette) : defaultTrigger}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) openPalette();
          else setOpen(false);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="top-[14%] max-w-xl translate-y-0 gap-0 overflow-hidden border-border p-0 shadow-lg sm:max-w-xl"
        >
          <DialogTitle className="sr-only">
            Search the catalogue
          </DialogTitle>

          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search events, programmes or venues"
              aria-label="Search the catalogue"
              className="h-14 flex-1 bg-transparent text-[15px] tracking-[-0.01em] outline-none placeholder:text-muted-foreground"
            />
            <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] tracking-[0.08em] text-muted-foreground">
              ESC
            </span>
          </div>

          <div className="max-h-[52vh] overflow-y-auto py-2">
            {events === undefined ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                Loading the catalogue…
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                Nothing in the catalogue matches “{query.trim()}”.
              </p>
            ) : (
              results.map((result, index) => (
                <button
                  key={result.key}
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(result)}
                  className={cn(
                    "flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors",
                    index === active ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground">
                    {result.kind === "event" ? (
                      <Ticket className="size-3.5" />
                    ) : (
                      <CalendarRange className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium tracking-[-0.01em]">
                      {result.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                      {result.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                    {result.trailing}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
            <span>↑ ↓ to move · Enter to open</span>
            <span>
              {results.length === 1
                ? "1 result"
                : `${results.length} results`}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
