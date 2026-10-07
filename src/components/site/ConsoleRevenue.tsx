import { PAYMENT_OPTIONS } from "@/components/site/PaymentMethods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { errorMessage, formatMoney } from "@/lib/format";
import type { PaymentMethod, RevenueOverview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  BadgeCheck,
  Loader2,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

function Kpi({
  label,
  value,
  detail,
  icon,
  tint,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </p>
        <span className={cn("icon-chip size-8", tint)}>{icon}</span>
      </div>
      <p className="font-display mt-4 text-[24px] leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

/** Everything taken, owed, and expected — with where the money should land. */
export function ConsoleRevenue() {
  const data = useQuery(api.revenue.overview) as RevenueOverview | undefined;
  const save = useMutation(api.profiles.save);

  // Null means "not touched yet": the saved value is used until the organizer
  // edits it, which keeps the form honest without mirroring it into an effect.
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (data === undefined || data === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const activeMethod: PaymentMethod = method ?? data.payoutMethod ?? "bkash";
  const activeDetails = details ?? data.payoutDetails ?? "";

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Collected"
          value={formatMoney(data.collected)}
          detail="Places, shop orders and sponsorship that have settled."
          icon={<BadgeCheck className="size-4" />}
          tint=""
        />
        <Kpi
          label="Promised"
          value={formatMoney(data.promised)}
          detail="Still due on places and orders, plus confirmed and pledged sponsorship."
          icon={<TrendingUp className="size-4" />}
          tint="icon-chip-warm"
        />
        <Kpi
          label="Places"
          value={String(data.tickets)}
          detail={`${formatMoney(data.ticketPaid)} settled, ${formatMoney(
            data.ticketDue,
          )} outstanding.`}
          icon={<Wallet className="size-4" />}
          tint="icon-chip-cool"
        />
        <Kpi
          label="Shop"
          value={formatMoney(data.shopPaid)}
          detail={`${data.orders} orders of merchandise and snacks.`}
          icon={<Wallet className="size-4" />}
          tint="icon-chip-plum"
        />
      </div>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
          <p className="label-eyebrow">By event</p>
          <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Star className="size-3.5 fill-warm text-warm" />
            {data.rating === null
              ? "No reviews yet"
              : `${data.rating.toFixed(1)} average across ${data.reviewCount} reviews`}
          </span>
        </div>

        {data.events.length === 0 ? (
          <p className="mt-6 text-[13px] text-muted-foreground">
            Create a programme and its events will appear here with their
            takings.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem] border-collapse text-left">
              <thead>
                <tr className="text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 text-right font-medium">Places</th>
                  <th className="pb-2 text-right font-medium">Place takings</th>
                  <th className="pb-2 text-right font-medium">Shop</th>
                  <th className="pb-2 text-right font-medium">Sponsors</th>
                  <th className="pb-2 text-right font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((row) => (
                  <tr
                    key={row.eventId}
                    className="border-t border-border text-[13px]"
                  >
                    <td className="max-w-[16rem] py-3">
                      <Link
                        to={`/events/${row.slug}`}
                        className="link-quiet font-medium tracking-[-0.01em]"
                      >
                        {row.title}
                      </Link>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {row.programmeName}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.tickets}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatMoney(row.ticketPaid)}
                      {row.ticketDue > 0 && (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatMoney(row.ticketDue)} due
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatMoney(row.shopPaid)}
                      {row.shopDue > 0 && (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatMoney(row.shopDue)} due
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.sponsors === 0 ? "—" : formatMoney(row.sponsorValue)}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {row.rating === null ? "—" : row.rating.toFixed(1)}
                      {row.reviewCount > 0 && (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {row.reviewCount} reviews
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="label-eyebrow border-b border-border pb-3">
            Where orders came from
          </p>
          {data.markets.length === 0 ? (
            <p className="mt-5 text-[13px] text-muted-foreground">
              No shop orders yet. Each order records the market it was placed
              from, so pricing can be tuned per country.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.markets.map((market) => (
                <li
                  key={market.country}
                  className="flex items-center justify-between gap-4 border-b border-border pb-3 text-[13px] last:border-b-0"
                >
                  <span className="flex items-center gap-2">
                    <span className="chip">{market.country}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {market.orders} {market.orders === 1 ? "order" : "orders"}
                    </span>
                  </span>
                  <span className="font-display text-[15px] tabular-nums">
                    {formatMoney(market.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-border card-soft p-5">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            <p className="text-[14px] font-medium tracking-[-0.012em]">
              Getting paid
            </p>
          </div>
          <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
            Where you would like place, shop and sponsorship money to land.
            Participants see the same methods at checkout, in their own
            currency.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {PAYMENT_OPTIONS.filter((option) => option.id !== "on-site").map(
              (option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMethod(option.id)}
                  aria-pressed={activeMethod === option.id}
                  className={cn(
                    "chip",
                    activeMethod === option.id
                      ? "chip-tinted border-brand-line text-foreground"
                      : "",
                  )}
                >
                  {option.name}
                </button>
              ),
            )}
          </div>

          <div className="mt-5 space-y-2">
            <Label
              htmlFor="payout-details"
              className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
            >
              {activeMethod === "paypal"
                ? "PayPal email"
                : activeMethod === "card"
                  ? "Bank account or card reference"
                  : "Wallet number"}
            </Label>
            <Input
              id="payout-details"
              value={activeDetails}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={
                activeMethod === "paypal"
                  ? "finance@company.com"
                  : "01XXX XXXXXX"
              }
              className="h-10 bg-background shadow-none"
            />
          </div>

          <Button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await save({
                  payoutMethod: activeMethod,
                  payoutDetails: activeDetails,
                });
                toast.success("Payout details saved");
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setPending(false);
              }
            }}
            className="mt-4 h-9 w-full rounded-full text-[13px]"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
            Save payout details
          </Button>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            Test mode: payouts are recorded against your account but no merchant
            gateway is connected yet, so no transfer is initiated.
          </p>
        </div>
      </section>
    </div>
  );
}
