import { Brand } from "@/components/site/Brand";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { award } from "@/lib/keepsakes";
import { formatMoney } from "@/lib/format";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Download, Printer, Sparkles } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Amounts are held in minor units and printed in the visitor's market. */
function money(minorUnits: number) {
  return formatMoney(minorUnits);
}

/**
 * The platform report.
 *
 * One page, every aggregate figure the product holds: what is on and how it is
 * filling, where the money arrived from, what sponsorship has pledged, which
 * promotions are running and how the room rated what it attended. It is built
 * from the same pass the assistant is grounded on, so the document, the
 * assistant and the pages can never quote different numbers to each other.
 *
 * Nothing personal is in it — no names, emails or booking references.
 */
export default function Report() {
  const reduced = useReducedMotion();
  const stats = useQuery(api.insights.overview);
  const loading = stats === undefined;

  // Reading the report is one of the keepsakes; the tray keeps the record.
  useEffect(() => {
    award("journey:report");
  }, []);

  const generated =
    stats === undefined
      ? ""
      : new Date(stats.generatedAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

  /** The whole report as a spreadsheet, for anyone who wants to keep it. */
  function downloadCsv() {
    if (stats === undefined) return;
    const rows: string[][] = [
      ["Memorius platform report", generated],
      [],
      ["Measure", "Value"],
      ["Programmes", String(stats.programmes.count)],
      ["Events published", String(stats.events.published)],
      ["Events still to come", String(stats.events.upcoming)],
      ["Events finished", String(stats.events.finished)],
      ["Open for booking", String(stats.events.openForBooking)],
      ["Capacity, upcoming", String(stats.events.capacity)],
      ["Places booked, upcoming", String(stats.events.booked)],
      ["Places still open", String(stats.events.placesLeft)],
      ["Occupancy, %", String(stats.events.occupancy)],
      ["Places sold", String(stats.money.placesSold)],
      ["Awaiting settlement", String(stats.money.awaitingSettlement)],
      ["Places collected", money(stats.money.ticketsCollected)],
      ["Shop collected", money(stats.money.shopCollected)],
      ["Shop orders", String(stats.money.orders)],
      ["Shop items", String(stats.money.shopItems)],
      ["Average place", money(stats.money.averageTicket)],
      ["Sponsors pledged", money(stats.money.sponsorsPledged)],
      ["Sponsors collected", money(stats.money.sponsorsCollected)],
      ["Reviews", String(stats.reviews.count)],
      ["Average rating", String(stats.reviews.average ?? "")],
      [],
      ["Demand", "Programme", "Start", "Booked", "Capacity", "Fill %", "Price"],
      ...stats.demand.map((row) => [
        row.title,
        row.programme,
        new Date(row.startTime).toISOString().slice(0, 10),
        String(row.booked),
        String(row.capacity),
        String(row.fill),
        money(row.price),
      ]),
      [],
      ["Category", "Events", "Capacity", "Booked", "Fill %"],
      ...stats.categories.map((row) => [
        row.name,
        String(row.events),
        String(row.capacity),
        String(row.booked),
        String(row.fill),
      ]),
      [],
      ["Rail", "Payments"],
      ...stats.rails.map((row) => [row.method, String(row.count)]),
      [],
      ["Sponsorship tier", "Pledges", "Value"],
      ...stats.sponsorship.tiers.map((row) => [
        row.tier,
        String(row.count),
        money(row.amount),
      ]),
      [],
      ["Promotion", "Title", "Scope", "On", "Ends", "Uses left"],
      ...stats.promotions.map((row) => [
        row.code,
        row.title,
        row.scope,
        row.scopeName,
        new Date(row.endsAt).toISOString().slice(0, 10),
        row.remaining === null ? "" : String(row.remaining),
      ]),
      [],
      ["Event", "Reviews", "Average"],
      ...stats.reviews.rated.map((row) => [
        row.title,
        String(row.reviews),
        String(row.average ?? ""),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${(cell ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `memorius-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="no-print">
        <SiteHeader />
      </div>

      <main className="print-page flex-1">
        <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
          {/* Controls, kept out of the printed sheet. */}
          <div className="no-print flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to the site
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-10 gap-2 rounded-full px-5 text-[13px] shadow-none"
                onClick={downloadCsv}
                disabled={loading}
              >
                <Download className="size-3.5" />
                Download as CSV
              </Button>
              <Button
                type="button"
                size="lg"
                className="sheen h-10 gap-2 rounded-full px-5 text-[13px]"
                onClick={() => window.print()}
                disabled={loading}
              >
                <Printer className="size-3.5" />
                Print or save as PDF
              </Button>
            </div>
          </div>

          <motion.article
            initial={reduced === true ? undefined : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="print-sheet mt-8 rounded-xl border border-border bg-card p-7 shadow-hairline sm:p-10"
          >
            <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-7">
              <div>
                <p className="label-eyebrow text-brand">Platform report</p>
                <h1 className="mt-3 font-display text-[24px] leading-[1.2] tracking-[-0.008em] sm:text-[30px]">
                  The whole platform, measured.
                </h1>
                <p className="mt-4 max-w-xl text-[13px] leading-6 text-muted-foreground">
                  Every figure the product holds, read live from the same
                  records the catalogue, the console and the assistant use.
                  Aggregate only: no customer name, email or reference appears
                  anywhere in this document.
                </p>
              </div>
              <div className="text-right">
                <Brand />
                <p className="mt-3 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  {loading ? "Reading the records…" : `Generated ${generated}`}
                </p>
              </div>
            </header>

            {loading ? (
              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div key={index}>
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="mt-3 h-3 w-28" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Headline figures */}
                <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3">
                  <Figure
                    value={String(stats.programmes.count)}
                    label="Programmes"
                  />
                  <Figure
                    value={String(stats.events.upcoming)}
                    label="Events still to come"
                  />
                  <Figure
                    value={String(stats.events.finished)}
                    label="Events finished"
                  />
                  <Figure
                    value={String(stats.money.placesSold)}
                    label="Places sold"
                  />
                  <Figure
                    value={String(stats.events.placesLeft)}
                    label="Places still open"
                  />
                  <Figure
                    value={`${stats.events.occupancy}%`}
                    label="Occupancy"
                  />
                  <Figure
                    value={money(stats.money.collected)}
                    label="Collected so far"
                  />
                  <Figure
                    value={money(stats.money.averageTicket)}
                    label="Average place"
                  />
                  <Figure
                    value={
                      stats.reviews.average === null
                        ? "—"
                        : `${stats.reviews.average}/5`
                    }
                    label={`From ${stats.reviews.count} reviews`}
                  />
                </section>

                {/* What is on */}
                <Section
                  title="What is on, in order of demand"
                  note={`${stats.events.openForBooking} of ${stats.events.upcoming} events still have places`}
                >
                  {stats.demand.length === 0 ? (
                    <Empty>Nothing is scheduled yet.</Empty>
                  ) : (
                    <div className="divide-y divide-border">
                      {stats.demand.map((row) => (
                        <div
                          key={row.title}
                          className="grid grid-cols-[1.6fr_0.9fr_0.9fr] items-center gap-4 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium tracking-[-0.012em]">
                              {row.title}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              {row.programme || "Independent"} ·{" "}
                              {new Date(row.startTime).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}{" "}
                              · {row.venue}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
                              <motion.span
                                className="absolute inset-y-0 left-0 rounded-full bg-brand"
                                initial={
                                  reduced === true ? undefined : { width: 0 }
                                }
                                animate={{ width: `${row.fill}%` }}
                                transition={{ duration: 0.9, ease: EASE }}
                              />
                            </span>
                            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                              {row.fill}%
                            </span>
                          </div>
                          <p className="text-right text-[12px] tabular-nums text-muted-foreground">
                            {row.booked} / {row.capacity} ·{" "}
                            <span className="text-foreground">
                              {money(row.price)}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Interest by category */}
                <Section title="Where interest sits">
                  {stats.categories.length === 0 ? (
                    <Empty>No events to group yet.</Empty>
                  ) : (
                    <div className="divide-y divide-border">
                      {stats.categories.map((row) => (
                        <div
                          key={row.name}
                          className="grid grid-cols-[1.1fr_1.6fr_0.8fr] items-center gap-4 py-3"
                        >
                          <p className="text-[13px]">{row.name}</p>
                          <div className="flex items-center gap-3">
                            <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-border">
                              <motion.span
                                className="absolute inset-y-0 left-0 rounded-full bg-plum"
                                initial={
                                  reduced === true ? undefined : { width: 0 }
                                }
                                animate={{ width: `${row.fill}%` }}
                                transition={{ duration: 0.9, ease: EASE }}
                              />
                            </span>
                            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                              {row.fill}%
                            </span>
                          </div>
                          <p className="text-right text-[12px] tabular-nums text-muted-foreground">
                            {row.events} {row.events === 1 ? "event" : "events"}{" "}
                            · {row.booked} booked
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Money */}
                <Section title="Where the money came from">
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
                    <Figure
                      value={money(stats.money.ticketsCollected)}
                      label="Collected for places"
                    />
                    <Figure
                      value={money(stats.money.shopCollected)}
                      label={`Shop, ${stats.money.orders} orders`}
                    />
                    <Figure
                      value={money(stats.money.sponsorsPledged)}
                      label="Sponsorship pledged"
                    />
                    <Figure
                      value={money(stats.money.sponsorsCollected)}
                      label="Sponsorship settled"
                    />
                    <Figure
                      value={String(stats.money.shopItems)}
                      label="Items sold in the shop"
                    />
                    <Figure
                      value={String(stats.money.awaitingSettlement)}
                      label="Places awaiting settlement"
                    />
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <span className="label-eyebrow mr-1">Rails</span>
                    {stats.rails.length === 0 ? (
                      <span className="text-[12px] text-muted-foreground">
                        No payments recorded yet
                      </span>
                    ) : (
                      stats.rails.map((rail) => (
                        <span
                          key={rail.method}
                          className="chip chip-tinted chip-cool"
                        >
                          {rail.method}{" "}
                          <span className="tabular-nums opacity-70">
                            {rail.count}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </Section>

                {/* Sponsorship */}
                <Section
                  title="Sponsorship, tier by tier"
                  note={`${stats.sponsorship.count} pledges across four tiers`}
                >
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                    {stats.sponsorship.tiers.map((tier) => (
                      <div
                        key={tier.tier}
                        className="flex items-baseline justify-between gap-4 border-b border-border pb-3"
                      >
                        <span className="text-[13px] capitalize">
                          {tier.tier}
                        </span>
                        <span className="text-[12px] tabular-nums text-muted-foreground">
                          {tier.count} {tier.count === 1 ? "pledge" : "pledges"}{" "}
                          ·{" "}
                          <span className="text-foreground">
                            {money(tier.amount)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Promotions and reviews */}
                <Section
                  title="In flight"
                  note="Promotions running today, and what the room rated"
                >
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div>
                      <p className="label-eyebrow">Promotions</p>
                      {stats.promotions.length === 0 ? (
                        <Empty>No promotion is running.</Empty>
                      ) : (
                        <ul className="mt-3 space-y-3">
                          {stats.promotions.map((row) => (
                            <li key={row.code} className="flex gap-3">
                              <span className="chip chip-tinted chip-warm shrink-0">
                                {row.code}
                              </span>
                              <span className="text-[12px] leading-5 text-muted-foreground">
                                <span className="text-foreground">
                                  {row.title}
                                </span>{" "}
                                — {row.scope} “{row.scopeName}”, ends{" "}
                                {new Date(row.endsAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                  },
                                )}
                                {row.remaining === null
                                  ? ""
                                  : `, ${row.remaining} uses left`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="label-eyebrow">Rated by attendees</p>
                      {stats.reviews.rated.length === 0 ? (
                        <Empty>No reviews have been left yet.</Empty>
                      ) : (
                        <ul className="mt-3 space-y-3">
                          {stats.reviews.rated.map((row) => (
                            <li
                              key={row.title}
                              className="flex items-baseline justify-between gap-4 border-b border-border pb-2.5"
                            >
                              <span className="truncate text-[12.5px]">
                                {row.title}
                              </span>
                              <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                                {row.average ?? "—"}/5 · {row.reviews}{" "}
                                {row.reviews === 1 ? "review" : "reviews"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </Section>

                {/* Programmes */}
                <Section
                  title="Programmes on the platform"
                  note={`${stats.programmes.count} in total`}
                >
                  <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {stats.programmes.list.map((row) => (
                      <div
                        key={row.slug}
                        className="flex items-baseline justify-between gap-4 border-b border-border pb-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px]">{row.name}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {row.organization}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                          {row.events} {row.events === 1 ? "event" : "events"} ·{" "}
                          {row.upcoming} to come
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>

                <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-3.5 text-brand" />
                    Produced by Memorius from the live catalogue.
                  </span>
                  <span className="tabular-nums">
                    {loading ? "" : `Report date ${generated}`}
                  </span>
                </footer>
              </>
            )}
          </motion.article>

          <p className="no-print mt-6 text-[12px] leading-6 text-muted-foreground">
            The assistant is grounded on this same pass, so a figure quoted in
            the chat is the figure printed here. Amounts follow the market you
            have chosen; the underlying figures are held in US dollars.
          </p>
        </div>
      </main>
    </div>
  );
}

/** One headline number, in the display serif. */
function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[26px] leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

/** A titled block of the report. */
function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-border pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-medium tracking-[-0.015em]">{title}</h2>
        {note !== undefined && (
          <span className="text-[11px] text-muted-foreground">{note}</span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3 text-[12px] text-muted-foreground">{children}</p>;
}
