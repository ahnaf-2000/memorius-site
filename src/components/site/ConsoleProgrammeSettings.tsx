import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/format";
import type { ConsoleProgrammeView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { Ban, Loader2, MailCheck, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * The two things an organizer changes after publishing: what releasing a place
 * costs, and what the email says.
 *
 * Both belong to the programme rather than to the account, so a collaborator
 * with the right role can keep them up to date, and every event inherits them
 * until an event overrides the fee. The preview is the whole point of the form:
 * an organizer should be able to read the sentence a customer will receive
 * before they send it to a hundred of them.
 *
 * The parent mounts this with a `key` of the programme id, so switching
 * programme remounts the form with that programme's values rather than leaving
 * a half-edited draft of the previous one on screen.
 */

/** The words an organizer may drop into their own sentences. */
const TOKENS: { token: string; means: string }[] = [
  { token: "{{name}}", means: "the customer's name" },
  { token: "{{event}}", means: "the event title" },
  { token: "{{reference}}", means: "their booking reference" },
  { token: "{{programme}}", means: "the programme name" },
  { token: "{{organization}}", means: "the business" },
  { token: "{{when}}", means: "the day, spelled out" },
  { token: "{{time}}", means: "the hours" },
  { token: "{{venue}}", means: "where it is" },
  { token: "{{category}}", means: "their guest list category" },
  { token: "{{deadline}}", means: "when booking closes" },
];

const SAMPLE: Record<string, string> = {
  name: "Ayesha Rahman",
  event: "Freight Standards Forum 2026",
  reference: "MEM-7K4Q2M",
  programme: "Operations Season",
  organization: "Meridian Group",
  when: "Saturday, 14 March 2026",
  time: "10:00 – 16:00",
  venue: "Main Hall, Meridian House",
  category: "Delegate",
  deadline: "Thursday, 12 March 2026, 18:00",
};

function fill(template: string): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (match, key: string) => SAMPLE[key] ?? match,
  );
}

export function ConsoleProgrammeSettings({
  programme,
}: {
  programme: ConsoleProgrammeView;
}) {
  const save = useMutation(api.fests.update);

  const [fee, setFee] = useState(
    programme.cancellationFee === 0
      ? ""
      : (programme.cancellationFee / 100).toString(),
  );
  const [hours, setHours] = useState(String(programme.cancellationWindowHours));
  const [subject, setSubject] = useState(programme.emailTemplate?.subject ?? "");
  const [heading, setHeading] = useState(programme.emailTemplate?.heading ?? "");
  const [intro, setIntro] = useState(programme.emailTemplate?.intro ?? "");
  const [closing, setClosing] = useState(programme.emailTemplate?.closing ?? "");
  const [pending, setPending] = useState(false);

  const feeMinor = Math.max(0, Math.round((Number(fee) || 0) * 100));
  const windowHours = Math.min(720, Math.max(0, Math.round(Number(hours) || 0)));
  const canEdit = programme.canEdit;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      await save({
        id: programme._id,
        cancellationFee: feeMinor,
        cancellationWindowHours: windowHours,
        emailTemplate: { subject, heading, intro, closing },
      });
      toast.success("Settings saved", {
        description: `${programme.name} now quotes ${windowHours} hours and its own wording.`,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-12">
      <section>
        <div className="border-b border-border pb-3">
          <p className="label-eyebrow">Cancellation policy</p>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-6 text-muted-foreground">
            What releasing a place costs, and from when. The policy is quoted on
            every event page and inside every confirmation, and it is settled at
            the moment a customer releases — a policy changed tomorrow cannot
            rewrite what was agreed today. Zero means releasing is always free.
          </p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="cancel-fee"
              className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
            >
              Cancellation fee (USD)
            </label>
            <Input
              id="cancel-fee"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={fee}
              disabled={!canEdit}
              onChange={(event) => setFee(event.target.value)}
              placeholder="0 — releasing is free"
              className="h-10 bg-background shadow-none tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="cancel-window"
              className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
            >
              Free to release until (hours before the start)
            </label>
            <Input
              id="cancel-window"
              type="number"
              min={0}
              max={720}
              step={1}
              value={hours}
              disabled={!canEdit}
              onChange={(event) => setHours(event.target.value)}
              placeholder="48"
              className="h-10 bg-background shadow-none tabular-nums"
            />
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2.5 rounded-md border border-dashed border-border px-4 py-3 text-[12.5px] leading-6 text-muted-foreground">
          <Ban className="mt-0.5 size-4 shrink-0" />
          {feeMinor === 0
            ? `A customer can release a place any time, free — the ${windowHours}-hour window only applies once a fee is set.`
            : `Releasing later than ${windowHours} hours before the start records $${(feeMinor / 100).toFixed(2)} against the booking. Places are free today, so nothing is collected — the fee is shown to the desk and counted in the analytics.`}
        </p>
      </section>

      <section>
        <div className="border-b border-border pb-3">
          <p className="label-eyebrow">The email after booking</p>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-6 text-muted-foreground">
            Everything below is optional. Where you write nothing, the product's
            own sentence is used instead of a blank line. It applies to every
            confirmation sent after you save, alongside the reference, the
            invoice and the guest list category.
          </p>
        </div>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="mail-subject"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Subject
              </label>
              <Input
                id="mail-subject"
                value={subject}
                disabled={!canEdit}
                onChange={(event) => setSubject(event.target.value.slice(0, 160))}
                placeholder="Your place at {{event}}"
                className="h-10 bg-background shadow-none"
              />
              <p className="text-[11px] text-muted-foreground">
                The reference is always appended, so the message stays findable.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mail-heading"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Heading
              </label>
              <Input
                id="mail-heading"
                value={heading}
                disabled={!canEdit}
                onChange={(event) => setHeading(event.target.value.slice(0, 120))}
                placeholder="We will see you at {{event}}"
                className="h-10 bg-background shadow-none"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mail-intro"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Opening paragraph
              </label>
              <Textarea
                id="mail-intro"
                rows={4}
                value={intro}
                disabled={!canEdit}
                onChange={(event) => setIntro(event.target.value.slice(0, 900))}
                placeholder="Hello {{name}}, your place is held. Doors open thirty minutes before {{time}} — bring the reference if you can."
                className="bg-background shadow-none"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="mail-closing"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Closing note
              </label>
              <Textarea
                id="mail-closing"
                rows={2}
                value={closing}
                disabled={!canEdit}
                onChange={(event) =>
                  setClosing(event.target.value.slice(0, 300))
                }
                placeholder="Any question, reply to this message — it reaches the desk in {{organization}}."
                className="bg-background shadow-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {TOKENS.map((entry) => (
                <span
                  key={entry.token}
                  title={entry.means}
                  className="chip chip-cool font-mono text-[10.5px]"
                >
                  {entry.token}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={pending || !canEdit}
                className="h-10 gap-1.5 rounded-full px-5 text-[13px]"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save settings
              </Button>
              {!canEdit && (
                <span className="text-[12px] text-muted-foreground">
                  Your role on this programme only allows reading.
                </span>
              )}
            </div>
          </div>

          {/* The preview: the same substitutions the server makes, resolved
              against one sample delegate so the organizer reads a real email. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="label-eyebrow">Preview</p>
            <div className="mt-3 rounded-lg border border-border bg-card p-5 shadow-hairline">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                <MailCheck className="size-3.5" />
                Confirmation email
              </div>
              <p className="mt-4 text-[12.5px] font-medium">
                {subject.trim() === ""
                  ? `Your place is confirmed — ${SAMPLE.event} (${SAMPLE.reference})`
                  : `${fill(subject)} (${SAMPLE.reference})`}
              </p>
              <div className="mt-4 border-t border-border pt-4">
                <h3 className="font-display text-[17px] leading-tight font-light">
                  {heading.trim() === ""
                    ? "Your place is confirmed"
                    : fill(heading)}
                </h3>
                <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">
                  Hello {SAMPLE.name},
                </p>
                <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
                  {intro.trim() === ""
                    ? "Your place is held. Everything you need at the door is below, and the invoice is attached as a printable PDF."
                    : fill(intro)}
                </p>
                <dl className="mt-4 space-y-2 border-t border-border pt-4 text-[12px]">
                  {[
                    ["Reference", SAMPLE.reference],
                    ["Event", SAMPLE.event],
                    ["Date", SAMPLE.when],
                    ["Time", SAMPLE.time],
                    ["Venue", SAMPLE.venue],
                    ["Guest list category", SAMPLE.category],
                    [
                      "Releasing your place",
                      feeMinor === 0
                        ? `Free any time, up to ${windowHours} hours before it starts`
                        : `$${(feeMinor / 100).toFixed(2)} if released within ${windowHours} hours of the start`,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-6"
                    >
                      <dt className="shrink-0 text-muted-foreground">{label}</dt>
                      <dd className="truncate text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
                {closing.trim() !== "" && (
                  <p
                    className={cn(
                      "mt-4 border-t border-border pt-4 text-[12.5px] leading-6",
                      "text-foreground/85",
                    )}
                  >
                    {fill(closing)}
                  </p>
                )}
                <p className="mt-4 text-[11.5px] text-muted-foreground">
                  Invoice attached as invoice-{SAMPLE.reference}.pdf
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
              Sample values shown. Real emails carry the customer's own name,
              reference, event and category.
            </p>
          </div>
        </div>
      </section>
    </form>
  );
}
