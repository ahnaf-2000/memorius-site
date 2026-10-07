import { SectionHeading } from "@/components/site/SectionHeading";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useCountdown } from "@/hooks/use-countdown";
import { pluralize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, Copy, Ticket } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const EASE = [0.16, 1, 0.3, 1] as const;

type LiveCampaign = {
  _id: string;
  code: string;
  title: string;
  blurb: string | null;
  label: string;
  endsAt: number;
  remaining: number | null;
  scope: string;
  scopeName: string;
  programmeName: string;
  programmeSlug: string;
  eventSlug: string | null;
};

/** Two numerals and their label: the countdown, in chips. */
function Clock({ target, tone }: { target: number; tone: string }) {
  const left = useCountdown(target);
  if (left === null) return null;

  const units = [
    { value: left.days, label: "days" },
    { value: left.hours, label: "hrs" },
    { value: left.minutes, label: "min" },
    { value: left.seconds, label: "sec" },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {units.map((unit) => (
        <span
          key={unit.label}
          className="flex items-baseline gap-1 rounded-md border border-border bg-background px-2 py-1"
        >
          <span className="text-[12px] leading-none font-medium tabular-nums">
            {String(unit.value).padStart(2, "0")}
          </span>
          <span className="text-[9px] leading-none tracking-[0.08em] text-muted-foreground uppercase">
            {unit.label}
          </span>
        </span>
      ))}
      <span className={cn("ml-1 text-[10px] tracking-[0.1em] uppercase", tone)}>
        left
      </span>
    </div>
  );
}

/**
 * One promotion, drawn as a ticket: the code is the stub, torn along a
 * perforation from the terms. Copying is a single press and the button says so,
 * with the same check mark the rest of the product uses for "done".
 */
function CampaignTicket({
  campaign,
  index,
}: {
  campaign: LiveCampaign;
  index: number;
}) {
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const href =
    campaign.eventSlug !== null
      ? `/events/${campaign.eventSlug}`
      : `/programmes/${campaign.programmeSlug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(campaign.code);
      setCopied(true);
      toast.success(`${campaign.code} copied`, {
        description: `Paste it at checkout — ${campaign.label} on this booking.`,
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy — select the code by hand.");
    }
  }

  return (
    <motion.article
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay: index * 0.08, ease: EASE }}
      className="group surface-card relative overflow-hidden rounded-lg border border-border bg-card shadow-hairline hover:border-foreground/15"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
      />

      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="label-eyebrow flex items-center gap-2">
            <Ticket className="size-3" />
            {campaign.scope === "event" ? "Event offer" : "Programme offer"}
          </p>
          <h3 className="mt-3 text-[15px] leading-[1.3] font-medium tracking-[-0.015em] text-balance">
            {campaign.title}
          </h3>
        </div>
        <span className="chip shrink-0 border-none bg-brand-soft text-[10px] tracking-[0.1em] text-brand uppercase">
          {campaign.label}
        </span>
      </div>

      {campaign.blurb !== null && (
        <p className="mt-3.5 px-6 text-[13px] leading-6 text-muted-foreground">
          {campaign.blurb}
        </p>
      )}

      <div className="relative mt-6 flex items-stretch">
        {/* The perforation: the ticket's tear line, dotted and faint. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-6 top-0 h-px bg-[repeating-linear-gradient(to_right,var(--border)_0_4px,transparent_4px_9px)]"
        />
        <span
          aria-hidden="true"
          className="absolute -top-[7px] -left-[7px] size-3.5 rounded-full border border-border bg-background"
        />
        <span
          aria-hidden="true"
          className="absolute -top-[7px] -right-[7px] size-3.5 rounded-full border border-border bg-background"
        />
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <button
          type="button"
          onClick={() => void copy()}
          className="group/code flex items-center gap-2.5 rounded-md border border-dashed border-border bg-background px-3 py-2 text-left transition-colors hover:border-foreground/25"
        >
          <span className="font-display text-[17px] tracking-[0.18em]">
            {campaign.code}
          </span>
          {copied ? (
            <Check className="size-3.5 text-tone-open" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground transition-colors group-hover/code:text-foreground" />
          )}
        </button>
        <Link
          to={href}
          className="link-quiet flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          {campaign.scopeName}
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
        <Clock target={campaign.endsAt} tone="text-muted-foreground" />
        {campaign.remaining !== null && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {campaign.remaining === 0
              ? "All claimed"
              : `${pluralize(campaign.remaining, "use")} left at this price`}
          </span>
        )}
      </div>
    </motion.article>
  );
}

/**
 * The promotions in flight, on the landing page. A campaign only appears here
 * while it is genuinely running — the server decides that, not the copy — so
 * the band is either live or silent, never stale.
 */
export function PromoBand() {
  const campaigns = useQuery(api.campaigns.live);

  if (campaigns !== undefined && campaigns.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
      <SectionHeading
        eyebrow="Running now"
        title="A campaign already in flight — take the code with you."
        description="These are live right now, decided on the server against each programme's own window. Copy one, paste it at checkout, and the discount is applied before you pay."
        action={
          campaigns === undefined ? null : (
            <span className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              <span className="relative flex size-2">
                <span className="tone-open animate-halo absolute inset-0 rounded-full" />
                <span className="tone-open relative size-2 rounded-full" />
              </span>
              {pluralize(campaigns.length, "offer")} live
            </span>
          )
        }
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {campaigns === undefined
          ? [0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-72 rounded-lg" />
            ))
          : campaigns.slice(0, 3).map((campaign, index) => (
              <CampaignTicket
                key={campaign._id}
                campaign={campaign as LiveCampaign}
                index={index}
              />
            ))}
      </div>
    </section>
  );
}
