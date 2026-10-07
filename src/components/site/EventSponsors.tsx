import { MethodPicker, TestModeNote } from "@/components/site/PaymentMethods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, formatMoney } from "@/lib/format";
import { fromLocalAmount, toLocalAmount, useActiveCountry } from "@/lib/pricing";
import type {
  PaymentMethod,
  SponsorshipTier,
  SponsorshipTierOption,
  SponsorshipView,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Check, Handshake, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const STATUS_LABEL: Record<SponsorshipView["status"], string> = {
  pledged: "Pledged",
  confirmed: "Confirmed",
  paid: "Paid",
};

const TIER_TINT: Record<SponsorshipTier, string> = {
  community: "chip chip-cool",
  silver: "chip",
  gold: "chip chip-warm",
  lead: "chip chip-plum",
};

/**
 * Sponsorship, at the event and at the programme around it. Tiers are a
 * starting point: the amount can be raised or lowered, and the pledge lands in
 * the organizer's revenue screen the moment it is made.
 */
export function EventSponsors({
  festId,
  eventId,
  eventTitle,
  eventSlug,
  programmeName,
}: {
  festId: Id<"fests">;
  eventId: Id<"events">;
  eventTitle: string;
  eventSlug: string;
  programmeName: string;
}) {
  const sponsors = useQuery(api.sponsorships.forEvent, { eventId }) as
    | SponsorshipView[]
    | undefined;
  const tiers = useQuery(api.sponsorships.options) as
    | SponsorshipTierOption[]
    | undefined;
  const pledge = useMutation(api.sponsorships.pledge);
  const { user, isAuthenticated } = useAuth();
  const country = useActiveCountry();

  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<SponsorshipTier>("silver");
  const [amount, setAmount] = useState("");
  const [company, setCompany] = useState(user?.company ?? "");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("paypal");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const activeTier = (tiers ?? []).find((option) => option.id === tier);
  const tierAmount = activeTier?.amount ?? 0;
  const typedAmount = Number.parseFloat(amount);
  const effectiveLocal =
    amount.trim() === ""
      ? toLocalAmount(tierAmount, country)
      : Number.isFinite(typedAmount)
        ? typedAmount
        : 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const baseAmount = fromLocalAmount(effectiveLocal, country);
      if (baseAmount <= 0) {
        throw new Error("Enter the amount you would like to pledge.");
      }
      await pledge({
        festId,
        eventId,
        company,
        contactName,
        email,
        tier,
        amount: baseAmount,
        message,
        paymentMethod: method,
      });
      setDone(true);
      setMessage("");
      toast.success("Pledge recorded", {
        description: `${company} · ${formatMoney(baseAmount)} towards ${eventTitle}`,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
        <h2 className="label-eyebrow">Sponsors of this event</h2>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          <Handshake className="size-3.5" />
          {sponsors === undefined ? "" : `${sponsors.length} backing it`}
        </span>
      </div>

      {sponsors === undefined ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : sponsors.length === 0 ? (
        <p className="mt-6 text-[13px] leading-6 text-muted-foreground">
          No sponsors yet. Backing the programme puts your name in front of
          everyone who attends — and it is the fastest way to open a
          conversation with the room.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sponsors.map((sponsor) => (
            <li
              key={sponsor._id}
              className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-[14px] font-medium tracking-[-0.012em]">
                    {sponsor.company}
                  </p>
                  <span className={cn(TIER_TINT[sponsor.tier], "capitalize")}>
                    {sponsor.tier === "lead" ? "Lead partner" : sponsor.tier}
                  </span>
                  <span className="text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    {STATUS_LABEL[sponsor.status]}
                  </span>
                </div>
                {sponsor.message !== null && (
                  <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
                    {sponsor.message}
                  </p>
                )}
              </div>
              <span className="font-display shrink-0 text-[16px] tabular-nums">
                {formatMoney(sponsor.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-7 rounded-lg border border-border card-soft px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-medium tracking-[-0.012em]">
              Back {eventTitle}
            </p>
            <p className="mt-1.5 max-w-lg text-[12.5px] leading-6 text-muted-foreground">
              Choose a tier, or name your own figure. Your pledge appears above
              as soon as it is made, and the organizer confirms it from their
              console.
            </p>
          </div>
          <Button
            type="button"
            variant={open ? "outline" : "default"}
            onClick={() => setOpen((value) => !value)}
            className="h-9 gap-1.5 rounded-full px-4 text-[13px]"
          >
            <Sparkles className="size-3.5" />
            {open ? "Close" : "Sponsor this event"}
          </Button>
        </div>

        {done && (
          <p className="animate-rise mt-4 flex items-center gap-2 rounded-md border border-brand-line bg-brand-soft px-3.5 py-2.5 text-[12.5px] leading-5">
            <Check className="size-3.5" />
            Pledge received. The organizer sees it on {programmeName} and will
            confirm the details with you.
          </p>
        )}

        {open && (
          <div className="animate-rise mt-5 border-t border-border pt-5">
            {!isAuthenticated ? (
              <div className="text-center">
                <p className="text-[13px] leading-6 text-muted-foreground">
                  Sign in to pledge — the organizer needs a name and an address
                  to confirm with.
                </p>
                <Button asChild className="mt-4 h-9 rounded-full px-4 text-[13px]">
                  <Link to={`/auth?returnTo=%2Fevents%2F${eventSlug}`}>
                    Sign in to sponsor
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(tiers ?? []).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setTier(option.id);
                        setAmount("");
                      }}
                      aria-pressed={tier === option.id}
                      className={cn(
                        "rounded-md border px-4 py-3 text-left transition-[border-color,background-color] duration-200 ease-soft",
                        tier === option.id
                          ? "border-brand-line bg-brand-soft"
                          : "border-border bg-card hover:border-foreground/25",
                      )}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-medium tracking-[-0.01em]">
                          {option.name}
                        </span>
                        <span className="font-display text-[15px] tabular-nums">
                          {formatMoney(option.amount)}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-[11.5px] leading-5 text-muted-foreground">
                        {option.blurb}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="sponsor-company"
                      className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                    >
                      Company
                    </Label>
                    <Input
                      id="sponsor-company"
                      required
                      value={company}
                      onChange={(event) => setCompany(event.target.value)}
                      placeholder="Vantage Freight"
                      className="h-10 bg-card shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="sponsor-contact"
                      className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                    >
                      Contact
                    </Label>
                    <Input
                      id="sponsor-contact"
                      value={contactName}
                      onChange={(event) => setContactName(event.target.value)}
                      placeholder="Who we write to"
                      className="h-10 bg-card shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="sponsor-email"
                      className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                    >
                      Email
                    </Label>
                    <Input
                      id="sponsor-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@company.com"
                      className="h-10 bg-card shadow-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label
                      htmlFor="sponsor-amount"
                      className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                    >
                      Amount ({country.currency})
                    </Label>
                    <Input
                      id="sponsor-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder={String(Math.round(effectiveLocal))}
                      className="h-10 bg-card shadow-none tabular-nums"
                    />
                  </div>
                  <p className="text-[11.5px] leading-5 text-muted-foreground sm:pb-2.5">
                    Leave blank to pledge the tier figure —{" "}
                    <span className="text-foreground tabular-nums">
                      {formatMoney(tierAmount)}
                    </span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="sponsor-message"
                    className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                  >
                    Message (optional)
                  </Label>
                  <Textarea
                    id="sponsor-message"
                    rows={2}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Why you are backing it, or what you would like in return."
                    className="bg-card shadow-none"
                  />
                </div>

                <MethodPicker value={method} onChange={setMethod} />
                <TestModeNote />

                <Button
                  type="submit"
                  disabled={pending}
                  className="h-10 w-full rounded-full"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Handshake className="size-4" />
                  )}
                  Pledge {formatMoney(fromLocalAmount(effectiveLocal, country))}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
