import { EventList, EventListSkeleton } from "@/components/site/EventList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ELIGIBILITY_LEVELS,
  EVENT_CATEGORIES,
  OPEN_ELIGIBILITY,
} from "@/lib/categories";
import { pluralize } from "@/lib/format";
import {
  fromLocalAmount,
  toLocalAmount,
  useActiveCurrency,
} from "@/lib/pricing";
import type { EventListItem, SeatState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";

/** The availability buckets a customer actually shops by. */
const AVAILABILITY: { id: "any" | SeatState; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "open", label: "Open" },
  { id: "few", label: "Almost full" },
  { id: "full", label: "Waiting list" },
  { id: "closed", label: "Booking closed" },
  { id: "past", label: "Finished" },
];

/**
 * The catalogue: every event, filtered on keystroke.
 *
 * Search and filtering both run on the client, because the catalogue is small
 * and a customer should never wait on a round-trip to see a result appear. The
 * filters are deliberately additive — categories, eligibility, availability and
 * a price range all narrow the same list at once, and every one of them can be
 * cleared in a single press.
 *
 * `/` jumps into the field; ⌘K belongs to the global search in the header.
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
  const [categories, setCategories] = useState<string[]>([]);
  const [eligibility, setEligibility] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"any" | SeatState>("any");
  const [priceRange, setPriceRange] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [includePast, setIncludePast] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currency = useActiveCurrency();

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

  /**
   * The chips are the canonical lists, narrowed to what this catalogue actually
   * holds — plus anything filed before the lists existed, so nothing a business
   * stored can become unreachable.
   */
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>((items ?? []).map((item) => item.category));
    const known = EVENT_CATEGORIES.filter((category) => seen.has(category));
    const knownSet = new Set<string>(known);
    const extra = Array.from(seen)
      .filter((category) => !knownSet.has(category))
      .sort();
    return [...known, ...extra];
  }, [items]);

  const eligibilityOptions = useMemo(() => {
    const seen = new Set<string>((items ?? []).map((item) => item.eligibility));
    const known = ELIGIBILITY_LEVELS.filter((level) => seen.has(level));
    const knownSet = new Set<string>(known);
    const extra = Array.from(seen)
      .filter((level) => !knownSet.has(level))
      .sort();
    return [...known, ...extra];
  }, [items]);

  /** The widest range the catalogue holds, in base minor units. */
  const priceBounds = useMemo(() => {
    const prices = (items ?? []).map((item) => item.price);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [items]);

  // A free catalogue has nothing to slide between, so the range control says so
  // rather than pretending to move.
  const priceIsFixed = priceBounds.min === priceBounds.max;

  const activeRange = priceRange ?? priceBounds;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items ?? []).filter((event) => {
      if (!includePast && event.state === "past") return false;
      if (categories.length > 0 && !categories.includes(event.category)) {
        return false;
      }
      if (
        eligibility.length > 0 &&
        !eligibility.includes(event.eligibility)
      ) {
        return false;
      }
      if (availability !== "any" && event.state !== availability) return false;
      if (priceRange !== null) {
        if (event.price < priceRange.min || event.price > priceRange.max) {
          return false;
        }
      }
      if (needle === "") return true;
      return [
        event.title,
        event.venue,
        event.category,
        event.eligibility,
        event.host ?? "",
        event.summary ?? "",
        event.festName,
        event.organization,
        ...event.specialGuests,
        event.chiefGuest ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [
    items,
    query,
    categories,
    eligibility,
    availability,
    priceRange,
    includePast,
  ]);

  const visible = limit === undefined ? filtered : filtered.slice(0, limit);
  const programmeCount = new Set(filtered.map((event) => event.festId)).size;
  const filteredOut = limit !== undefined && filtered.length > visible.length;

  const activeCount =
    categories.length +
    eligibility.length +
    (availability === "any" ? 0 : 1) +
    (priceRange === null ? 0 : 1);
  const isFiltering =
    query.trim() !== "" || activeCount > 0 || includePast;

  const reset = () => {
    setQuery("");
    setCategories([]);
    setEligibility([]);
    setAvailability("any");
    setPriceRange(null);
    setIncludePast(false);
  };

  /** Base minor units as the visitor's own major figure, for the inputs. */
  function localValue(minorUnits: number) {
    return Math.round(toLocalAmount(minorUnits, currency));
  }

  /** A typed figure back into base minor units, never below zero. */
  function fromLocal(value: string, fallback: number) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, fromLocalAmount(parsed, currency));
  }

  function toggle(
    list: string[],
    setList: (next: string[]) => void,
    value: string,
  ) {
    setList(
      list.includes(value)
        ? list.filter((entry) => entry !== value)
        : [...list, value],
    );
    // A range that was typed for one slice of the catalogue is meaningless once
    // the slice changes, so the price filter resets with the rest.
    setPriceRange(null);
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search events, programmes, venues or guests"
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
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors",
            open || activeCount > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="tabular-nums">({activeCount})</span>
          )}
        </button>

        {categoryOptions.slice(0, 6).map((category) => {
          const on = categories.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(categories, setCategories, category)}
              aria-pressed={on}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12px] tracking-[-0.005em] transition-colors",
                on
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
              )}
            >
              {category}
            </button>
          );
        })}
        {categoryOptions.length > 6 && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            +{categoryOptions.length - 6} more
          </button>
        )}

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

      {open && (
        <div className="animate-rise mt-4 space-y-6 rounded-lg border border-border bg-card px-5 py-5">
          <div>
            <p className="label-eyebrow">Category</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryOptions.map((category) => {
                const on = categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggle(categories, setCategories, category)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] transition-colors",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="label-eyebrow">Who may attend</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {eligibilityOptions.map((level) => {
                const on = eligibility.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggle(eligibility, setEligibility, level)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] transition-colors",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {level}
                  </button>
                );
              })}
              {eligibilityOptions.includes(OPEN_ELIGIBILITY) === false && (
                <button
                  type="button"
                  onClick={() =>
                    toggle(eligibility, setEligibility, OPEN_ELIGIBILITY)
                  }
                  aria-pressed={eligibility.includes(OPEN_ELIGIBILITY)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[12px] transition-colors",
                    eligibility.includes(OPEN_ELIGIBILITY)
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                  )}
                >
                  {OPEN_ELIGIBILITY}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="label-eyebrow">Ticket availability</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {AVAILABILITY.map((option) => {
                const on = availability === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setAvailability(option.id);
                      setPriceRange(null);
                    }}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[12px] transition-colors",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="label-eyebrow">
              Ticket price per place ({currency.currency})
            </p>
            {priceIsFixed ? (
              <p className="mt-3 rounded-md border border-dashed border-border px-4 py-3 text-[12px] leading-5 text-muted-foreground">
                Every place in the catalogue is free, so there is no price to
                filter between. The range control appears the moment an event
                carries a price.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <label className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    From
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={localValue(activeRange.min)}
                      onChange={(event) =>
                        setPriceRange({
                          min: fromLocal(event.target.value, activeRange.min),
                          max: activeRange.max,
                        })
                      }
                      className="h-9 w-28 bg-background shadow-none tabular-nums"
                    />
                    <input
                      type="range"
                      aria-label="Lowest ticket price"
                      min={localValue(priceBounds.min)}
                      max={localValue(priceBounds.max)}
                      value={localValue(activeRange.min)}
                      onChange={(event) =>
                        setPriceRange({
                          min: fromLocal(event.target.value, priceBounds.min),
                          max: Math.max(
                            fromLocal(event.target.value, priceBounds.min),
                            activeRange.max,
                          ),
                        })
                      }
                      style={{ accentColor: "var(--foreground)" }}
                      className="w-40"
                    />
                  </label>
                  <label className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    To
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={localValue(activeRange.max)}
                      onChange={(event) =>
                        setPriceRange({
                          min: activeRange.min,
                          max: fromLocal(event.target.value, activeRange.max),
                        })
                      }
                      className="h-9 w-28 bg-background shadow-none tabular-nums"
                    />
                    <input
                      type="range"
                      aria-label="Highest ticket price"
                      min={localValue(priceBounds.min)}
                      max={localValue(priceBounds.max)}
                      value={localValue(activeRange.max)}
                      onChange={(event) =>
                        setPriceRange({
                          min: Math.min(
                            fromLocal(event.target.value, priceBounds.max),
                            activeRange.min,
                          ),
                          max: fromLocal(event.target.value, priceBounds.max),
                        })
                      }
                      style={{ accentColor: "var(--foreground)" }}
                      className="w-40"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  Type the range or drag it — both move the same figure. Prices
                  are quoted in {currency.currency}, the currency you chose.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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
              "Try another category, a different eligibility, or a wider price range — or reset the filters to see everything."}
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
