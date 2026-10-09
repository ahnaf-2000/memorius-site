import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage, relativeDay } from "@/lib/format";
import type {
  CollaboratorRole,
  CollaboratorView,
  InviteView,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

/**
 * Collaboration, from both sides.
 *
 * The invitations waiting for this account come first, because they are the
 * only thing on this screen that needs an answer today. Below them sits the
 * team for whichever programme is selected, which is where an owner invites
 * someone and where everyone can see who else is on it.
 *
 * Revoking the wrong person is annoying but harmless — they can be invited
 * again — so the button asks once and then acts, rather than demanding a
 * confirmation ritual.
 */

const ROLE_COPY: {
  id: CollaboratorRole;
  name: string;
  blurb: string;
}[] = [
  {
    id: "manager",
    name: "Manager",
    blurb:
      "Everything on the programme: events, guest list, settings and the email wording.",
  },
  {
    id: "editor",
    name: "Editor",
    blurb:
      "Adds and edits events, posts announcements and decides on bookings.",
  },
  {
    id: "viewer",
    name: "Viewer",
    blurb: "Reads the guest list and the analytics. Changes nothing.",
  },
];

function roleBlurb(role: CollaboratorRole): string {
  return ROLE_COPY.find((copy) => copy.id === role)?.blurb ?? "";
}

function roleName(role: CollaboratorRole | "owner"): string {
  return role === "owner"
    ? "Owner"
    : (ROLE_COPY.find((copy) => copy.id === role)?.name ?? role);
}

/** An invitation addressed to the person reading the page. */
function InviteCard({ invite }: { invite: InviteView }) {
  const respond = useMutation(api.collaborators.respond);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);

  async function answer(accept: boolean) {
    setPending(accept ? "accept" : "decline");
    try {
      await respond({ id: invite._id, accept });
      toast.success(accept ? "You are on the team" : "Invitation declined", {
        description: accept
          ? `${invite.programmeName} now appears in your console.`
          : `${invite.programmeName} was left alone.`,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 border-b border-border py-5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[14px] font-medium tracking-[-0.012em]">
          {invite.programmeName}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {invite.organization} · invited by {invite.invitedByName} ·{" "}
          {relativeDay(invite.invitedAt)}
        </p>
        <p className="mt-2 max-w-xl text-[12px] leading-6 text-muted-foreground">
          As {roleName(invite.role).toLowerCase()}: {roleBlurb(invite.role)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3.5 text-[12px]"
          disabled={pending !== null}
          onClick={() => answer(true)}
        >
          {pending === "accept" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          Accept
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-[12px] text-muted-foreground"
          disabled={pending !== null}
          onClick={() => answer(false)}
        >
          {pending === "decline" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          Decline
        </Button>
      </div>
    </li>
  );
}

export function ConsoleCollaborators({
  festId,
  programmeName,
}: {
  festId: Id<"fests"> | null;
  programmeName: string | null;
}) {
  const invites = useQuery(api.collaborators.invites) as InviteView[] | undefined;
  const team = useQuery(
    api.collaborators.team,
    festId === null ? "skip" : { festId },
  );
  const invite = useMutation(api.collaborators.invite);
  const revoke = useMutation(api.collaborators.revoke);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<CollaboratorRole>("editor");
  const [pending, setPending] = useState(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (festId === null || pending) return;
    setPending(true);
    try {
      await invite({
        festId,
        email,
        name: name.trim() === "" ? undefined : name,
        role,
      });
      toast.success("Invitation sent", {
        description: `${email.trim().toLowerCase()} will see it the next time they sign in.`,
      });
      setEmail("");
      setName("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
          <p className="label-eyebrow">Invitations for you</p>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {invites === undefined
              ? "…"
              : invites.length === 0
                ? "Nothing waiting"
                : `${invites.length} waiting`}
          </span>
        </div>

        {invites === undefined ? (
          <Skeleton className="mt-5 h-24 w-full rounded-lg" />
        ) : invites.length === 0 ? (
          <p className="py-8 text-[13px] leading-6 text-muted-foreground">
            When an organizer invites the address on your account, it appears
            here — accept it and their programme joins the console above.
          </p>
        ) : (
          <ul className="mt-1">
            {invites.map((row) => (
              <InviteCard key={row._id} invite={row} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="border-b border-border pb-3">
          <p className="label-eyebrow">
            Team{programmeName === null ? "" : ` · ${programmeName}`}
          </p>
          <p className="mt-1.5 text-[12px] leading-6 text-muted-foreground">
            Collaborators help run a programme without ever holding the owner's
            password, and each one keeps their own name on every decision they
            make.
          </p>
        </div>

        {festId === null ? (
          <p className="py-8 text-[13px] text-muted-foreground">
            Pick a programme in the Programmes tab to see and change its team.
          </p>
        ) : team === undefined ? (
          <Skeleton className="mt-5 h-24 w-full rounded-lg" />
        ) : team === null ? (
          <p className="py-8 text-[13px] text-muted-foreground">
            You do not have access to this programme's team.
          </p>
        ) : (
          <>
            {team.isOwner && (
              <form
                onSubmit={send}
                className="mt-5 grid gap-3 rounded-lg border border-border bg-card p-5 sm:grid-cols-[1.2fr_1fr_auto]"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="invite-email"
                    className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                  >
                    Email
                  </label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="colleague@company.com"
                    className="h-10 bg-background shadow-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="invite-name"
                    className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                  >
                    Name (optional)
                  </label>
                  <Input
                    id="invite-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Halima Yusuf"
                    className="h-10 bg-background shadow-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                    Role
                  </label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={role}
                      onValueChange={(value) =>
                        setRole(value as CollaboratorRole)
                      }
                    >
                      <SelectTrigger className="h-10 w-[8.5rem] bg-background shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_COPY.map((copy) => (
                          <SelectItem key={copy.id} value={copy.id}>
                            {copy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="submit"
                      disabled={pending}
                      className="h-10 gap-1.5 rounded-full px-4 text-[13px]"
                    >
                      {pending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                      Invite
                    </Button>
                  </div>
                </div>
                <p className="text-[11.5px] leading-5 text-muted-foreground sm:col-span-3">
                  {roleBlurb(role)}
                </p>
              </form>
            )}

            {team.rows.length === 0 ? (
              <p className="py-8 text-[13px] text-muted-foreground">
                No collaborators yet. You are the only person on this programme
                {team.isOwner
                  ? " — invite someone and the work stops being yours alone."
                  : "."}
              </p>
            ) : (
              <ul className="mt-4">
                {team.rows.map((row: CollaboratorView) => (
                  <li
                    key={row._id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="icon-chip size-8">
                        {row.status === "active" ? (
                          <ShieldCheck className="size-4" />
                        ) : (
                          <Mail className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">
                          {row.name ?? row.email}
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {row.email}
                          <span className="px-1.5 text-border">·</span>
                          {roleName(row.role)}
                          <span className="px-1.5 text-border">·</span>
                          <span
                            className={cn(
                              row.status === "active"
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {row.status === "active"
                              ? "On the team"
                              : row.status === "invited"
                                ? "Invitation waiting"
                                : "Revoked"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[11.5px] text-muted-foreground tabular-nums">
                        {relativeDay(row.invitedAt)}
                      </span>
                      {team.isOwner && row.status !== "revoked" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-3 text-[12px] text-muted-foreground"
                          onClick={async () => {
                            try {
                              await revoke({ id: row._id });
                              toast.success("Access ended", {
                                description: `${row.email} no longer works on this programme.`,
                              });
                            } catch (error) {
                              toast.error(errorMessage(error));
                            }
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <p className="text-[12px] leading-6 text-muted-foreground">
        Invited by mistake?{" "}
        <Link to="/contact" className="link-quiet">
          Write to the desk
        </Link>{" "}
        and we will sort it out.
      </p>
    </div>
  );
}
