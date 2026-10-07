import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CampaignState } from "@/convex/campaigns";
import { errorMessage, pluralize } from "@/lib/format";
import { fromLocalAmount, useActiveCountry } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import {
  Check,
  Copy,
  Loader2,
  Pause,
  Percent,
  Play,
  Plus,
  Ticket,
  Trash2,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DAY = 86_400_000;

const PRESETS = [
  { label: "A week", days: 7 },
  { label: "A fortnight", days: 14 },
  { label: "A month", days: 30 },
  { label: "A quarter", days: 90 },
];

type CampaignRow = {
  _id: Id<"campaigns">;
  code: string;
  title: string;
  blurb: string | null;
  kind: "percent" | "amount";
  value: number;
  label: string;
  startsAt: number;
  endsAt: number;
  maxUses: number | null;
  uses: number;
  active: boolean;
  running: boolean;
  state: CampaignState;
  programmeName: string;
  eventTitle: string | null;
};

/**
 * Where a campaign is in its life, in one word. The server decides the state;
 * this only gives it a colour, so rendering stays pure.
 */
const CAMPAIGN_STATE: Record<CampaignState, { label: string; tone: string }> = {
  running: { label: "Running", tone: "text-tone-open" },
  paused: { label: "Paused", tone: "text-muted-foreground" },
  scheduled: { label: "Scheduled", tone: "text-tone-few" },
  claimed: { label: "Fully claimed", tone: "text-tone-neutral" },
  finished: { label: "Finished", tone: "text-muted-foreground" },
};

function StartCampaignDialog({
  programmes,
  events,
}: {
  programmes: { _id: Id<"fests">; name: string }[];
  events: { _id: Id<"events">; title: string; festId: Id<"fests"> }[];
}) {
  const create = useMutation(api.campaigns.create);
  const country = useActiveCountry();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [festId, setFestId] = useState<Id<"fests"> | null>(
    programmes[0]?._id ?? null,
  );
  const [eventId, setEventId] = useState<string>("");
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const [days, setDays] = useState(30);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [form, setForm] = useState({
    code: "",
    title: "",
    blurb: "",
    value: "15",
    maxUses: "100",
  });

  const scopedEvents = events.filter((event) => event.festId === festId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (festId === null) {
      toast.error("Choose the programme this campaign belongs to.");
      return;
    }
    const value =
      kind === "percent"
        ? Number.parseInt(form.value, 10)
        : fromLocalAmount(Number.parseFloat(form.value), country);
    setPending(true);
    try {
      const now = Date.now();
      await create({
        festId,
        eventId: eventId === "" ? undefined : (eventId as Id<"events">),
        code: form.code,
        title: form.title,
        blurb: form.blurb.trim() === "" ? undefined : form.blurb,
        kind,
        value,
        startsAt: now,
        endsAt: now + days * DAY,
        maxUses:
          form.maxUses.trim() === ""
            ? undefined
            : Number.parseInt(form.maxUses, 10),
      });
      toast.success(`${form.code.toUpperCase()} is live`, {
        description: `Running for ${pluralize(days, "day")} on ${programmes.find((row) => row._id === festId)?.name ?? "the programme"}.`,
      });
      setOpen(false);
      setForm({ code: "", title: "", blurb: "", value: "15", maxUses: "100" });
      setEventId("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setEndsAt(Date.now() + days * DAY);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3.5 text-[12px]"
          disabled={programmes.length === 0}
        >
          <Plus className="size-3.5" />
          Start a campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            Start a campaign
          </DialogTitle>
          <DialogDescription>
            A code that takes money off a place or a shop order, inside a
            window, optionally capped. It appears on the landing page the moment
            it is running, and it is checked on the server at checkout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "percent" as const, label: "Percentage off", icon: Percent },
              { id: "amount" as const, label: "Fixed amount off", icon: Wallet },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setKind(option.id)}
                aria-pressed={kind === option.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left text-[13px] transition-colors",
                  kind === option.id
                    ? "border-brand-line bg-brand-soft"
                    : "border-border hover:border-foreground/25",
                )}
              >
                <option.icon className="size-4 text-muted-foreground" />
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="campaign-code"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Code
              </Label>
              <Input
                id="campaign-code"
                required
                value={form.code}
                onChange={(inputEvent) =>
                  setForm({
                    ...form,
                    code: inputEvent.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9-]/g, "")
                      .slice(0, 16),
                  })
                }
                placeholder="EARLYBIRD"
                className="h-10 bg-background tracking-[0.16em] shadow-none"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="campaign-value"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                {kind === "percent"
                  ? "Percent off"
                  : `Amount off (${country.currency})`}
              </Label>
              <Input
                id="campaign-value"
                required
                inputMode="decimal"
                value={form.value}
                onChange={(inputEvent) =>
                  setForm({ ...form, value: inputEvent.target.value })
                }
                className="h-10 bg-background shadow-none tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="campaign-title"
              className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
            >
              Name it
            </Label>
            <Input
              id="campaign-title"
              required
              value={form.title}
              onChange={(inputEvent) =>
                setForm({ ...form, title: inputEvent.target.value })
              }
              placeholder="Early bird — 15% off the summit week"
              className="h-10 bg-background shadow-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="campaign-programme"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Programme
              </Label>
              <select
                id="campaign-programme"
                value={festId ?? ""}
                onChange={(selectEvent) => {
                  setFestId(selectEvent.target.value as Id<"fests">);
                  setEventId("");
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-[13px] shadow-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                {programmes.map((programme) => (
                  <option key={programme._id} value={programme._id}>
                    {programme.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="campaign-event"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Applies to
              </Label>
              <select
                id="campaign-event"
                value={eventId}
                onChange={(selectEvent) => setEventId(selectEvent.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-[13px] shadow-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <option value="">Every event in the programme</option>
                {scopedEvents.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
              Runs for
            </Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    // The preview date is set here, not during render.
                    setDays(preset.days);
                    setEndsAt(Date.now() + preset.days * DAY);
                  }}
                  aria-pressed={days === preset.days}
                  className={cn(
                    "chip",
                    days === preset.days
                      ? "chip-tinted border-brand-line text-foreground"
                      : "",
                  )}
                >
                  {preset.label}
                </button>
              ))}
              {endsAt !== null && (
                <span className="chip border-dashed">
                  ends {format(endsAt, "d MMM yyyy")}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="campaign-uses"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Cap on uses (optional)
              </Label>
              <Input
                id="campaign-uses"
                inputMode="numeric"
                value={form.maxUses}
                onChange={(inputEvent) =>
                  setForm({ ...form, maxUses: inputEvent.target.value })
                }
                placeholder="Leave empty for no cap"
                className="h-10 bg-background shadow-none tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="campaign-blurb"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                One line about it
              </Label>
              <Textarea
                id="campaign-blurb"
                rows={1}
                value={form.blurb}
                onChange={(inputEvent) =>
                  setForm({ ...form, blurb: inputEvent.target.value })
                }
                placeholder="Book while the early bird runs."
                className="bg-background shadow-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="rounded-full">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Put it live
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The promotions screen. Everything an organizer needs to run a campaign is
 * here: what is live, what is capped, how much of it has been claimed, and one
 * press to pause it — because a campaign that cannot be stopped quickly is a
 * liability, not a feature.
 */
export function ConsoleCampaigns() {
  const campaigns = useQuery(api.campaigns.forOrganizer) as
    | CampaignRow[]
    | undefined;
  const programmes = useQuery(api.fests.mine);
  const events = useQuery(api.events.organized);
  const setActive = useMutation(api.campaigns.setActive);
  const remove = useMutation(api.campaigns.remove);
  const [copied, setCopied] = useState<string | null>(null);

  const rows = campaigns ?? [];
  const running = rows.filter((row) => row.running).length;
  const claimed = rows.reduce((sum, row) => sum + row.uses, 0);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 1600);
      toast.success(`${code} copied`);
    } catch {
      toast.error("Could not copy the code.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {running} of {pluralize(rows.length, "campaign")} running ·{" "}
          {pluralize(claimed, "use")} so far
        </p>
        <StartCampaignDialog
          programmes={(programmes ?? []).map((row) => ({
            _id: row._id,
            name: row.name,
          }))}
          events={(events ?? []).map((row) => ({
            _id: row._id,
            title: row.title,
            festId: row.festId,
          }))}
        />
      </div>

      {campaigns === undefined ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-5 py-8 text-center text-[13px] leading-6 text-muted-foreground">
          No campaigns yet. A campaign is a code that takes money off a place or
          a shop order while it runs — start one and it appears on the landing
          page within the second.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {rows.map((campaign) => {
            const state = CAMPAIGN_STATE[campaign.state];
            const progress =
              campaign.maxUses === null
                ? null
                : Math.min(
                    100,
                    Math.round((campaign.uses / Math.max(1, campaign.maxUses)) * 100),
                  );
            return (
              <li
                key={campaign._id}
                className="row-marker relative flex flex-wrap items-center gap-x-5 gap-y-3 py-4 pl-1 transition-colors hover:bg-accent/30"
              >
                <button
                  type="button"
                  onClick={() => void copyCode(campaign.code)}
                  className="group/code flex shrink-0 items-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-1.5 transition-colors hover:border-foreground/25"
                >
                  <span className="font-display text-[14px] tracking-[0.16em]">
                    {campaign.code}
                  </span>
                  {copied === campaign.code ? (
                    <Check className="size-3 text-tone-open" />
                  ) : (
                    <Copy className="size-3 text-muted-foreground transition-colors group-hover/code:text-foreground" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium tracking-[-0.01em]">
                    {campaign.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {campaign.eventTitle ?? campaign.programmeName}
                    <span className="px-1.5 text-border">·</span>
                    {format(campaign.startsAt, "d MMM")} –{" "}
                    {format(campaign.endsAt, "d MMM")}
                    <span className="px-1.5 text-border">·</span>
                    {campaign.label}
                  </p>
                  {progress !== null && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-px w-24 bg-border">
                        <div
                          className="h-px bg-brand transition-[width] duration-700 ease-quint"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {campaign.uses}/{campaign.maxUses} claimed
                      </span>
                    </div>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 border-border text-[10px] font-normal tracking-[0.08em] uppercase",
                    state.tone,
                  )}
                >
                  {state.label}
                </Badge>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      campaign.active ? "Pause campaign" : "Restart campaign"
                    }
                    onClick={async () => {
                      try {
                        await setActive({
                          campaignId: campaign._id,
                          active: !campaign.active,
                        });
                        toast.success(
                          campaign.active ? "Campaign paused" : "Campaign restarted",
                          { description: campaign.code },
                        );
                      } catch (error) {
                        toast.error(errorMessage(error));
                      }
                    }}
                    className="rounded-full text-muted-foreground hover:text-foreground"
                  >
                    {campaign.active ? (
                      <Pause className="size-3.5" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${campaign.code}`}
                    onClick={async () => {
                      try {
                        await remove({ campaignId: campaign._id });
                        toast.success("Campaign deleted");
                      } catch (error) {
                        toast.error(errorMessage(error));
                      }
                    }}
                    className="rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 flex items-center gap-2 text-[11px] leading-5 text-muted-foreground">
        <Ticket className="size-3.5" />
        Codes are stored in capitals and checked on the server at checkout, so a
        paused code stops working the moment you press pause.
      </p>
    </div>
  );
}
