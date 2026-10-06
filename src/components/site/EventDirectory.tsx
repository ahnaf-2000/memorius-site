import { EventList, EventListSkeleton } from "@/components/site/EventList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pluralize } from "@/lib/format";
import type { EventListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";

const ALL = "All";

/**
 * The catalogue: every event, filtered on keystroke.
 *
 * Search runs on the client because the catalogue is small and a customer
 * should never wait on a round-trip to see a result appear. `/` jumps into the
 * field; ⌘K belongs to the global search in the header.
 */
export function EventDirectory({
  items,
  limit,
  showProgramme = true,
  moreHref,
  emptyNote,
}: {
  items: EventListItem[] | undefined;
  limit?: number;
  showProgramme?: boolean;
  moreHref?: string;
  emptyNote?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [includePast, setIncludePast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target !== null &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items ?? []) seen.add(item.category);
    return [ALL, ...Array.from(seen).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items ?? []).filter((event) => {
      if (!includePast && event.state === "past") return false;
      if (category !== ALL && event.category !== category) return false;
      if (needle === "") return true;
      return [
        event.title,
        event.venue,
        event.category,
        event.summary ?? "",
        event.festName,
        event.organization,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [items, query, category, includePast]);

  const visible = limit === undefined ? filtered : filtered.slice(0, limit);
  const programmeCount = new Set(filtered.map((event) => event.festId)).size;
  const filteredOut = limit !== undefined && filtered.length > visible.length;
  const isFiltering = query.trim() !== "" || category !== ALL || includePast;

  const reset = () => {
    setQuery("");
    setCategory(ALL);
    setIncludePast(false);
  };

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search events, programmes or venues"
          aria-label="Search the catalogue"
          className="h-12 rounded-lg border-border bg-card pr-20 pl-11 text-[14px] shadow-none focus-visible:border-foreground/25 focus-visible:ring-0"
        />
        <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
          {query !== "" ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <span className="hidden items-center rounded border border-border px-1.5 py-0.5 text-[10px] tracking-[0.08em] text-muted-foreground sm:flex">
              /
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {categories.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setCategory(option)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12px] tracking-[-0.005em] transition-colors",
              option === category
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIncludePast((value) => !value)}
          className={cn(
            "ml-auto rounded-full px-3 py-1.5 text-[12px] transition-colors",
            includePast
              ? "text-foreground underline decoration-border underline-offset-4"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {includePast ? "Showing past events" : "Include past events"}
        </button>
      </div>

      <div className="mt-7 flex items-baseline justify-between border-b border-border pb-3">
        <p className="text-[11px] tracking-[0.06em] text-muted-foreground uppercase">
          {items === undefined
            ? "Loading the catalogue"
            : `${pluralize(filtered.length, "event")} · ${pluralize(
                programmeCount,
                "programme",
              )}`}
        </p>
        {isFiltering && items !== undefined && (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset filters
          </button>
        )}
      </div>

      {items === undefined ? (
        <EventListSkeleton rows={limit ?? 5} />
      ) : visible.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[15px] font-medium tracking-[-0.012em]">
            Nothing in the catalogue matches that
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-6 text-muted-foreground">
            {emptyNote ??
              "Try another programme, venue or category — or reset the filters to see everything."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6 rounded-full px-4 shadow-none"
            onClick={reset}
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <EventList items={visible} showProgramme={showProgramme} />
      )}

      {filteredOut && moreHref !== undefined && (
        <div className="border-b border-border py-6">
          <Button
            asChild
            variant="ghost"
            className="group h-9 gap-2 rounded-full px-4 text-[13px]"
          >
            <Link to={moreHref}>
              See all {filtered.length} events
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
