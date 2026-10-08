import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAccess } from "@/hooks/use-access";
import { Loader2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

/**
 * The gate on the owner's console.
 *
 * `RequireAuth` has already dealt with strangers — they are signed in by the
 * time they reach this. What is left is the signed-in account that is not the
 * owner and not a moderator, and it is told plainly that the door is not for
 * them, without pretending the page does not exist.
 *
 * This is the interface agreeing with the server, not the server being
 * protected by it: every query and mutation behind the gate checks the same
 * thing again in Convex.
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const access = useAccess();
  const navigate = useNavigate();

  if (access.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (access.isStaff) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="size-5 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">Control is by invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
          <p>
            This console belongs to the owner of Memorius and the moderators
            they appoint. Your account is not on that list.
          </p>
          {access.signedIn && access.email !== null && (
            <p className="text-[12px]">
              Signed in as{" "}
              <span className="text-foreground">{access.email}</span>. If you
              should be here, ask the owner for moderator access.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => navigate("/dashboard")}>
            Go to my dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate("/")}
          >
            Back to home
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
