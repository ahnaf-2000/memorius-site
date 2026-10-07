import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { errorMessage, formatMoney, paymentMethodLabel } from "@/lib/format";
import type { OrganizerSponsorshipView } from "@/lib/types";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNowStrict } from "date-fns";
import { Check, Handshake, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_STYLE: Record<OrganizerSponsorshipView["status"], string> = {
  pledged: "chip chip-warm",
  confirmed: "chip chip-cool",
  paid: "chip chip-tinted",
};

const TIER_LABEL: Record<OrganizerSponsorshipView["tier"], string> = {
  community: "Community",
  silver: "Silver",
  gold: "Gold",
  lead: "Lead partner",
};

/**
 * Every pledge towards the programmes this business runs. A pledge is recorded
 * the moment a sponsor makes it; confirming and marking it paid are the two
 * steps that move it from promise to money.
 */
export function ConsoleSponsorships() {
  const rows = useQuery(api.sponsorships.forOrganizer) as
    | OrganizerSponsorshipView[]
    | undefined;
  const setStatus = useMutation(api.sponsorships.setStatus);
  const [busy, setBusy] = useState<string | null>(null);

  const items = rows ?? [];
  const totals = {
    paid: items
      .filter((row) => row.status === "paid")
      .reduce((sum, row) => sum + row.amount, 0),
    confirmed: items
      .filter((row) => row.status === "confirmed")
      .reduce((sum, row) => sum + row.amount, 0),
    pledged: items
      .filter((row) => row.status === "pledged")
      .reduce((sum, row) => sum + row.amount, 0),
  };

  async function move(
    sponsorshipId: OrganizerSponsorshipView["_id"],
    status: OrganizerSponsorshipView["status"],
  ) {
    setBusy(sponsorshipId);
    try {
      await setStatus({ sponsorshipId, status });
      toast.success(
        status === "paid" ? "Marked as paid" : "Pledge confirmed",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-6 border-b border-border pb-6">
        {[
          { label: "Paid", value: totals.paid },
          { label: "Confirmed", value: totals.confirmed },
          { label: "Pledged", value: totals.pledged },
        ].map((bucket) => (
          <div key={bucket.label}>
            <p className="font-display text-[22px] leading-none tabular-nums">
              {formatMoney(bucket.value)}
            </p>
            <p className="mt-2 text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
              {bucket.label}
            </p>
          </div>
        ))}
      </div>

      {rows === undefined ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border py-14 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-full border border-border">
            <Handshake className="size-4 text-muted-foreground" />
          </span>
          <p className="mt-4 text-[14px] font-medium tracking-[-0.012em]">
            No pledges yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-6 text-muted-foreground">
            Every programme page carries a sponsorship panel, with four tiers
            from Community to Lead partner. Pledges made there land here
            immediately.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((row) => (
            <li
              key={row._id}
              className="rounded-lg border border-border bg-card px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <p className="text-[14px] font-medium tracking-[-0.012em]">
                      {row.company}
                    </p>
                    <span className={STATUS_STYLE[row.status]}>
                      {row.status === "paid"
                        ? "Paid"
                        : row.status === "confirmed"
                          ? "Confirmed"
                          : "Pledged"}
                    </span>
                    <span className="chip">
                      {TIER_LABEL[row.tier]}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {row.programmeName}
                    {row.eventTitle !== null && (
                      <>
                        <span className="px-1.5 text-border">·</span>
                        {row.eventTitle}
                      </>
                    )}
                    <span className="px-1.5 text-border">·</span>
                    <span className="tabular-nums">
                      {paymentMethodLabel(row.paymentMethod)}
                    </span>
                    <span className="px-1.5 text-border">·</span>
                    {formatDistanceToNowStrict(row.createdAt)} ago
                  </p>
                  {row.message !== null && (
                    <p className="mt-2 max-w-2xl text-[12.5px] leading-6 text-muted-foreground">
                      “{row.message}”
                    </p>
                  )}
                  {(row.contactName !== null || row.email !== null) && (
                    <p className="mt-2 text-[11.5px] text-muted-foreground">
                      {row.contactName ?? "Contact"}
                      {row.email !== null && (
                        <>
                          {" "}
                          ·{" "}
                          <span className="text-foreground">{row.email}</span>
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className="font-display text-[18px] tabular-nums">
                    {formatMoney(row.amount)}
                  </span>
                  <div className="flex items-center gap-2">
                    {row.status === "pledged" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy === row._id}
                        onClick={() => void move(row._id, "confirmed")}
                        className="h-8 rounded-full border-border px-3.5 text-[12px] shadow-none"
                      >
                        {busy === row._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                        Confirm
                      </Button>
                    )}
                    {row.status !== "paid" && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy === row._id}
                        onClick={() => void move(row._id, "paid")}
                        className="h-8 rounded-full px-3.5 text-[12px]"
                      >
                        Mark paid
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
