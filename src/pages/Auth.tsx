import { Brand, BrandMark } from "@/components/site/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { readPendingPersona, rememberPersona } from "@/hooks/use-profile";
import { errorMessage } from "@/lib/format";
import type { Persona } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Handshake,
  Loader2,
  Mail,
  Ticket,
  UserX,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

/**
 * The three ways into the product. The choice is made before the email goes in,
 * because it decides what the console opens on afterwards.
 */
const PERSONAS: {
  id: Persona;
  name: string;
  blurb: string;
  tint: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "organizer",
    name: "Organizer — I run events",
    blurb:
      "Publish programmes, sell places, merchandise and snacks, and collect sponsorship.",
    tint: "",
    icon: <Building2 className="size-4" />,
  },
  {
    id: "participant",
    name: "Participant — I attend",
    blurb:
      "Book a place in a minute, keep your schedule, and leave a review afterwards.",
    tint: "icon-chip-cool",
    icon: <Ticket className="size-4" />,
  },
  {
    id: "sponsor",
    name: "Sponsor — I back events",
    blurb: "Pledge towards a programme or a single event, in four tiers.",
    tint: "icon-chip-plum",
    icon: <Handshake className="size-4" />,
  },
];

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [persona, setPersona] = useState<Persona>(
    () => readPendingPersona() ?? "participant",
  );
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      rememberPersona(persona);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (signInError) {
      console.error("Email sign-in error:", signInError);
      setError(
        errorMessage(signInError) ||
          "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      rememberPersona(persona);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (verifyError) {
      console.error("OTP verification error:", verifyError);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      rememberPersona(persona);
      await signIn("anonymous");
      navigate(redirect);
    } catch (guestError) {
      console.error("Guest login error:", guestError);
      setError(errorMessage(guestError));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to events
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-24 sm:px-8">
        <div className="w-full max-w-[400px]">
          {step === "signIn" ? (
            <>
              <h1 className="text-[24px] leading-[1.2] font-light tracking-[-0.014em] text-balance">
                One account, whichever side of the table you are on.
              </h1>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                No password to remember — we send a six-digit code by email.
                Pick how you are joining, and the product opens on the right
                screen.
              </p>

              <div className="mt-8">
                <p className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  I am joining as
                </p>
                <div className="mt-3 grid gap-2">
                  {PERSONAS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPersona(option.id)}
                      aria-pressed={persona === option.id}
                      className={cn(
                        "flex items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-soft",
                        persona === option.id
                          ? "border-brand-line bg-brand-soft shadow-hairline"
                          : "border-border hover:border-foreground/25",
                      )}
                    >
                      <span
                        className={cn(
                          "icon-chip mt-0.5 size-8 shrink-0",
                          option.tint,
                        )}
                      >
                        {option.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium tracking-[-0.01em]">
                          {option.name}
                        </span>
                        <span className="mt-1 block text-[12px] leading-5 text-muted-foreground">
                          {option.blurb}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="mt-8">
                <label
                  htmlFor="email"
                  className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                >
                  Email address
                </label>
                <div className="mt-3 flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      className="h-11 border-border bg-card pl-10 text-[14px] shadow-none focus-visible:border-foreground/25 focus-visible:ring-0"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading}
                    className="size-11 shrink-0 rounded-md"
                    aria-label="Send verification code"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                  </Button>
                </div>

                {error !== null && (
                  <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] leading-5 text-destructive">
                    {error}
                  </p>
                )}

                <div className="my-7 flex items-center gap-4">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    or
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-md border-border text-[13px] shadow-none"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                >
                  <UserX className="size-4" />
                  Continue as guest
                </Button>
                <p className="mt-3 text-center text-[11px] leading-5 text-muted-foreground">
                  A guest account can register for events, but your schedule is
                  only kept on this device. Stuck at any point? Memo, the
                  assistant, is in the corner of every page.
                </p>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[22px] leading-[1.2] font-light tracking-[-0.014em]">
                Check your email
              </h1>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                We sent a six-digit code to{" "}
                <span className="text-foreground">{step.email}</span>.
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-9">
                <input type="hidden" name="email" value={step.email} />
                <input type="hidden" name="code" value={otp} />

                <div className="flex justify-center sm:justify-start">
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    disabled={isLoading}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        otp.length === 6 &&
                        !isLoading
                      ) {
                        const form = (event.target as HTMLElement).closest(
                          "form",
                        );
                        form?.requestSubmit();
                      }
                    }}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error !== null && (
                  <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[12px] leading-5 text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="mt-8 h-11 w-full rounded-md text-[13px]"
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying
                    </>
                  ) : (
                    <>
                      Verify and continue
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <div className="mt-4 flex items-center justify-between text-[12px]">
                  <button
                    type="button"
                    onClick={() => setStep("signIn")}
                    disabled={isLoading}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("signIn")}
                    disabled={isLoading}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-6 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="inline-flex items-center gap-2">
            <BrandMark className="size-4 rounded-[5px]" />©{" "}
            {new Date().getFullYear()} Memorius
          </span>
          <span>
            Need a hand?{" "}
            <Link
              to="/contact"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              Talk to the team
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
