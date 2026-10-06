import { Brand } from "@/components/site/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage } from "@/lib/format";
import { ArrowLeft, ArrowRight, Loader2, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

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
              <h1 className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em] text-balance">
                Your seat, saved.
              </h1>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                Sign in with an email address. No password to remember — we send
                a six-digit code.
              </p>

              <form onSubmit={handleEmailSubmit} className="mt-9">
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
                  only kept on this device.
                </p>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[26px] leading-[1.15] font-medium tracking-[-0.03em]">
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
          <span>© {new Date().getFullYear()} Cadence</span>
          <span>
            Secured by{" "}
            <a
              href="https://freebuff.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              freebuff.com
            </a>
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
