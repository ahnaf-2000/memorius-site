import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Mail,
  Send,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Mirrors the topics the contact mutation accepts; the field is free text. */
const TOPICS = [
  "Booking or payment",
  "Running a programme",
  "Sponsorship",
  "Merchandise and snacks",
  "Press or partnership",
  "Something else",
];

const MIN_BODY = 20;
const MAX_BODY = 2000;

const NEXT_STEPS = [
  {
    index: "01",
    title: "You get a reference",
    copy: "Every note is logged with a short reference like MEM-7K4Q2M, so you can quote it if you follow up.",
  },
  {
    index: "02",
    title: "It goes to a person",
    copy: "The topic decides who picks it up — bookings, programmes, sponsorship or press — instead of a shared inbox.",
  },
  {
    index: "03",
    title: "You hear back",
    copy: "We answer within one working day, usually with a straight answer or a time to talk.",
  },
];

const DIRECT = [
  { label: "Bookings and payments", address: "hello@memorius.events" },
  { label: "Programmes and sponsorship", address: "partners@memorius.events" },
  { label: "Press", address: "press@memorius.events" },
];

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label
          htmlFor={id}
          className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
        >
          {label}
        </Label>
        {hint !== undefined && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function Contact() {
  const send = useMutation(api.contact.send);
  const { isAuthenticated, user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string } | null>(null);

  const bodyLength = body.trim().length;
  const emailLooksRight = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const ready =
    name.trim().length >= 2 && emailLooksRight && bodyLength >= MIN_BODY;

  function useMyDetails() {
    if (user === undefined || user === null) return;
    const emailValue = user.email ?? "";
    setName((current) => current || user.name || emailValue.split("@")[0]);
    setEmail((current) => current || emailValue);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await send({
        name,
        email,
        topic,
        subject: subject.trim() === "" ? undefined : subject,
        body,
      });
      setSent({ reference: result.reference });
      toast.success("Message sent", {
        description: `Quote ${result.reference} if you follow up.`,
      });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setSent(null);
    setError(null);
    setName("");
    setEmail("");
    setSubject("");
    setBody("");
    setTopic(TOPICS[0]);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative mx-auto w-full max-w-6xl px-5 pt-16 pb-20 sm:px-8 sm:pt-20">
          <div
            aria-hidden="true"
            className="glow-soft pointer-events-none absolute inset-x-[-10%] -top-40 h-[30rem]"
          />
          <div
            aria-hidden="true"
            className="grid-veil pointer-events-none absolute inset-x-0 -top-40 h-[30rem]"
          />
          <header className="relative max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="label-eyebrow"
            >
              Contact
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
              className="mt-4 text-[26px] leading-[1.2] font-light tracking-[-0.015em] text-balance sm:text-[34px]"
            >
              Talk to the people who{" "}
              <em className="font-display font-normal italic">run the desk</em>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
              className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground"
            >
              A booking question, a programme to publish, a sponsorship to talk
              through — write to us and you will get a real answer, from a real
              person, with a reference to quote.
            </motion.p>
          </header>

          <div className="relative mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            {/* The form */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
              className="surface-card rounded-lg border border-border bg-card p-6 shadow-hairline sm:p-8"
            >
              <AnimatePresence mode="wait" initial={false}>
                {sent === null ? (
                  <motion.form
                    key="form"
                    onSubmit={submit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="space-y-5"
                  >
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={useMyDetails}
                        className="group flex w-full items-center justify-between gap-3 rounded-md border border-dashed border-border px-3.5 py-2.5 text-left text-[12px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                      >
                        <span className="truncate">
                          Signed in as {user?.email ?? "you"}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          Use my details
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </button>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="contact-name" label="Your name">
                        <Input
                          id="contact-name"
                          required
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder="Ayesha Rahman"
                          className="h-10 bg-background shadow-none"
                        />
                      </Field>
                      <Field id="contact-email" label="Email">
                        <Input
                          id="contact-email"
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@company.com"
                          className="h-10 bg-background shadow-none"
                        />
                      </Field>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                        What is it about
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {TOPICS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setTopic(option)}
                            aria-pressed={topic === option}
                            className={cn(
                              "chip",
                              topic === option
                                ? "chip-tinted border-brand-line text-foreground"
                                : "",
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field id="contact-subject" label="Subject" hint="Optional">
                      <Input
                        id="contact-subject"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Transferring a booking to a colleague"
                        className="h-10 bg-background shadow-none"
                      />
                    </Field>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-4">
                        <Label
                          htmlFor="contact-body"
                          className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                        >
                          Message
                        </Label>
                        <span
                          className={cn(
                            "text-[11px] tabular-nums transition-colors",
                            bodyLength > 0 && bodyLength < MIN_BODY
                              ? "text-muted-foreground"
                              : "text-muted-foreground/60",
                          )}
                        >
                          {bodyLength}/{MAX_BODY}
                        </span>
                      </div>
                      <Textarea
                        id="contact-body"
                        rows={6}
                        value={body}
                        onChange={(event) =>
                          setBody(event.target.value.slice(0, MAX_BODY))
                        }
                        placeholder="A sentence or two about what you need, and anything we should know — a booking reference, a programme name, a date."
                        className="bg-background shadow-none"
                      />
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        {bodyLength < MIN_BODY
                          ? `${MIN_BODY - bodyLength} more character${MIN_BODY - bodyLength === 1 ? "" : "s"} and we can route it properly.`
                          : "That is plenty — we will take it from here."}
                      </p>
                    </div>

                    {error !== null && (
                      <p
                        role="alert"
                        className="rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[12px] leading-5 text-destructive"
                      >
                        {error}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="submit"
                        disabled={!ready || pending}
                        className="h-10 gap-2 rounded-full px-5 text-[13px]"
                      >
                        {pending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Send message
                      </Button>
                      <span className="text-[12px] text-muted-foreground">
                        We never share your details.
                      </span>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="py-4"
                  >
                    <span className="grid size-11 place-items-center rounded-full border border-border bg-background">
                      <Check className="text-tone-open size-5" />
                    </span>
                    <h2 className="mt-6 text-[22px] font-medium tracking-[-0.025em]">
                      Message received
                    </h2>
                    <p className="mt-3 max-w-md text-[13px] leading-6 text-muted-foreground">
                      Thank you. It is logged, it has been routed by topic, and
                      somebody will reply to{" "}
                      <span className="text-foreground">{email.trim()}</span>{" "}
                      within one working day.
                    </p>

                    <div className="mt-7 flex items-center justify-between gap-4 rounded-md border border-dashed border-border px-4 py-3.5">
                      <span className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                        Your reference
                      </span>
                      <span className="font-display text-[15px] tracking-[0.16em]">
                        {sent.reference}
                      </span>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={reset}
                        className="h-10 rounded-full border-border px-5 text-[13px] shadow-none"
                      >
                        Send another
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        className="group h-10 gap-2 rounded-full px-4 text-[13px]"
                      >
                        <Link to="/events">
                          Browse the catalogue
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* What happens next */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22, ease: EASE }}
              className="space-y-12"
            >
              <div>
                <p className="label-eyebrow">What happens next</p>
                <ol className="mt-6 space-y-6">
                  {NEXT_STEPS.map((step) => (
                    <li key={step.index} className="flex gap-5">
                      <span className="font-display mt-0.5 text-[15px] text-muted-foreground tabular-nums">
                        {step.index}
                      </span>
                      <div>
                        <p className="text-[14px] font-medium tracking-[-0.012em]">
                          {step.title}
                        </p>
                        <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                          {step.copy}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-border pt-8">
                <p className="label-eyebrow">Straight to an inbox</p>
                <ul className="mt-5 space-y-4">
                  {DIRECT.map((line) => (
                    <li
                      key={line.address}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                        <Mail className="size-3.5" />
                        {line.label}
                      </span>
                      <a
                        href={`mailto:${line.address}`}
                        className="text-[13px] underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                      >
                        {line.address}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
                  <span className="chip chip-cool">
                    <Clock className="size-3.5" />
                    Under one working day
                  </span>
                  <span className="chip chip-warm">
                    <Ticket className="size-3.5" />
                    Bookings desk, 08:00–20:00
                  </span>
                </div>
                <p className="mt-5 flex items-start gap-2.5 text-[13px] leading-6 text-muted-foreground">
                  <Sparkles className="mt-0.5 size-4 shrink-0" />
                  In a hurry? The assistant in the corner answers dates, prices
                  and places left from the live catalogue, on any page.
                </p>
              </div>
            </motion.aside>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
