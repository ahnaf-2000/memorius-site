import { EventList } from "@/components/site/EventList";
import { FestPhaseTag } from "@/components/site/FestCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useEnsureSeeded } from "@/hooks/use-seed";
import { formatDateRange } from "@/lib/format";
import { useQuery } from "convex/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router";

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[26px] leading-none tabular-nums">
        {value}
      </span>
      <span className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

export default function FestDetail() {
  useEnsureSeeded();
  const { slug } = useParams<{ slug: string }>();
  const data = useQuery(api.fests.getBySlug, slug ? { slug } : "skip");

  if (data === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16 sm:px-8">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-8 h-12 w-2/3" />
          <Skeleton className="mt-6 h-3 w-1/3" />
          <Skeleton className="mt-16 h-64 w-full" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <div className="mx-auto max-w-xl px-5 py-32 text-center sm:px-8">
            <p className="label-eyebrow">Not found</p>
            <h1 className="mt-4 text-[28px] font-medium tracking-[-0.03em]">
              That festival is no longer listed.
            </h1>
            <Button asChild className="mt-8 h-10 rounded-full px-5">
              <Link to="/fests">Back to festivals</Link>
            </Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const { fest, events } = data;
  const upcoming = events.filter((event) => event.state !== "past");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
          <Link
            to="/fests"
            className="group inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            All festivals
          </Link>
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
          <header className="mt-8 border-b border-border pb-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="label-eyebrow">{fest.organization}</p>
              <FestPhaseTag phase={fest.phase} />
            </div>

            <h1 className="mt-6 max-w-3xl text-[36px] leading-[1.04] font-medium tracking-[-0.038em] text-balance sm:text-[48px]">
              {fest.name}
            </h1>

            {fest.summary !== null && (
              <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted-foreground">
                {fest.summary}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-baseline gap-x-8 gap-y-3 text-[13px] text-muted-foreground">
              <span className="tabular-nums">
                {formatDateRange(fest.startDate, fest.endDate)}
              </span>
              {fest.venue !== null && (
                <>
                  <span className="text-border">·</span>
                  <span>{fest.venue}</span>
                </>
              )}
            </div>
          </header>

          <div className="grid grid-cols-2 gap-8 border-b border-border py-10 sm:grid-cols-4">
            <StatBlock value={String(fest.eventCount)} label="Events" />
            <StatBlock value={String(fest.capacity)} label="Seats offered" />
            <StatBlock value={String(fest.seatsTaken)} label="Seats claimed" />
            <StatBlock
              value={String(
                Math.max(0, fest.capacity - fest.seatsTaken),
              )}
              label="Seats remaining"
            />
          </div>

          {fest.description !== null && (
            <div className="max-w-2xl border-b border-border py-12">
              <p className="text-[14px] leading-7 text-muted-foreground">
                {fest.description}
              </p>
            </div>
          )}

          <section className="pt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-eyebrow">The programme</p>
                <h2 className="mt-3 text-[22px] font-medium tracking-[-0.024em]">
                  {upcoming.length} of {fest.eventCount} events still ahead
                </h2>
              </div>
              <Button
                asChild
                variant="ghost"
                className="group h-9 gap-2 rounded-full px-4 text-[13px]"
              >
                <Link to="/events">
                  See every event
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            <div className="mt-10">
              <EventList items={events} showFest={false} />
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
