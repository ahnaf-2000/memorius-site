import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAccess } from "@/hooks/use-access";
import { errorMessage, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarCheck,
  Loader2,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const EASE = [0.16, 1, 0.3, 1] as const;

/** "12 Mar, 14:05" — enough to sort a queue by eye. */
function stamp(ms: number) {
  return new Date(ms).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Tile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="icon-chip size-7">{icon}</span>
        <span className="label-eyebrow text-[9px]">{label}</span>
      </div>
      <p className="font-display mt-3 text-[26px] leading-none tabular-nums">
        {value}
      </p>
    </div>
  );
}

function RoleTag({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] tracking-[0.08em] uppercase",
        tone,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The owner's console.
 *
 * This is the one page in the product that is not scoped to a single account,
 * and it is the reason the access layer exists. It does three things: it shows
 * what the platform holds, it hands out and takes back moderator rights, and it
 * holds the queue of everything published anywhere so a moderator can act on a
 * comment or a review that its author and its organiser both refuse to touch.
 *
 * Being here is not what grants any of it. Every query and every mutation on
 * this page asks the server again — see `src/convex/access.ts` — so a forged
 * visit to this URL renders a page with no data and buttons that refuse.
 */
export default function Control() {
  const access = useAccess();
  const counts = useQuery(api.access.platformCounts);
  const queue = useQuery(api.access.moderationQueue);
  const [search, setSearch] = useState("");
  const directory = useQuery(api.access.directory, { search });
  const setModerator = useMutation(api.access.setModerator);
  const removeComment = useMutation(api.comments.remove);
  const removeReview = useMutation(api.reviews.remove);
  const reduced = useReducedMotion();
  const [busy, setBusy] = useState<string | null>(null);

  async function applyModerator(
    userId: Id<"users">,
    moderator: boolean,
    label: string,
  ) {
    setBusy(userId);
    try {
      await setModerator({ userId, moderator });
      toast.success(
        moderator
          ? `${label} can now moderate the platform.`
          : `${label} is no longer a moderator.`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function takeDownComment(commentId: Id<"comments">, label: string) {
    setBusy(commentId);
    try {
      await removeComment({ commentId });
      toast.success(`Removed ${label}'s comment.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function takeDownReview(reviewId: Id<"reviews">, label: string) {
    setBusy(reviewId);
    try {
      await removeReview({ reviewId });
      toast.success(`Removed ${label}'s review.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  const enter = (delay: number) =>
    reduced === true
      ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: EASE },
        };

  const comments = queue?.comments ?? [];
  const reviews = queue?.reviews ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
        <motion.header {...enter(0)} className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-eyebrow inline-flex items-center gap-2 text-brand">
              <ShieldCheck className="size-3.5" />
              Control
            </span>
            <RoleTag
              tone={
                access.isOwner
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : "border-warm/40 bg-warm/10 text-warm"
              }
            >
              {access.isOwner ? "Owner" : "Moderator"}
            </RoleTag>
          </div>
          <h1 className="font-display mt-5 text-[26px] leading-[1.15] font-light tracking-[-0.016em] sm:text-[32px]">
            Everything the platform holds, and who may touch it.
          </h1>
          <p className="mt-3 text-[14px] leading-7 text-muted-foreground">
            {access.isOwner
              ? "You are the owner: moderator rights, the account directory and the moderation queue are yours to hand out and to use. Every action here is checked again on the server, so this page is a window, not a key."
              : "You are a moderator: the queue below is yours to work through. Only the owner can grant or remove access."}
          </p>
        </motion.header>

        <motion.section {...enter(0.08)} className="mt-12">
          <h2 className="label-eyebrow text-muted-foreground">The platform</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {counts === undefined ? (
              Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={index} className="h-[104px] rounded-lg" />
              ))
            ) : counts === null ? (
              <p className="col-span-full text-[13px] text-muted-foreground">
                The ledger is only readable by staff.
              </p>
            ) : (
              <>
                <Tile
                  label="Accounts"
                  value={counts.accounts}
                  icon={<Users className="size-3.5" />}
                />
                <Tile
                  label="Programmes"
                  value={counts.programmes}
                  icon={<ScrollText className="size-3.5" />}
                />
                <Tile
                  label="Events"
                  value={counts.events}
                  icon={<Sparkles className="size-3.5" />}
                />
                <Tile
                  label="Bookings"
                  value={counts.bookings}
                  icon={<CalendarCheck className="size-3.5" />}
                />
                <Tile
                  label="Comments"
                  value={counts.comments}
                  icon={<MessageSquare className="size-3.5" />}
                />
                <Tile
                  label="Reviews"
                  value={counts.reviews}
                  icon={<Star className="size-3.5" />}
                />
                <Tile
                  label="Moderators"
                  value={counts.moderators}
                  icon={<UserCog className="size-3.5" />}
                />
              </>
            )}
          </div>
        </motion.section>

        <motion.section {...enter(0.14)} className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="label-eyebrow text-muted-foreground">
                Access and moderation rights
              </h2>
              <p className="mt-2 text-[13px] text-muted-foreground">
                A moderator can remove anything published on the platform.
                Nothing else — no directory, no roles, no ledgers.
              </p>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className="h-9 w-full bg-background shadow-none sm:w-72"
              aria-label="Search accounts"
            />
          </div>

          <div className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {directory === undefined ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : directory.length === 0 ? (
              <p className="p-5 text-[13px] text-muted-foreground">
                No account matches “{search}”.
              </p>
            ) : (
              directory.map((person) => {
                const label =
                  person.name ?? person.email?.split("@")[0] ?? "This account";
                return (
                  <div
                    key={person._id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-[11px] text-muted-foreground">
                      {initials(label)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">
                        {person.name ?? "—"}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {person.email ?? "no address"}
                        {person.isAnonymous ? " · guest" : ""}
                      </span>
                    </span>

                    {person.isOwner ? (
                      <RoleTag tone="border-brand/30 bg-brand/10 text-brand">
                        Owner
                      </RoleTag>
                    ) : person.isModerator ? (
                      <RoleTag tone="border-warm/40 bg-warm/10 text-warm">
                        Moderator
                      </RoleTag>
                    ) : (
                      <RoleTag tone="border-border text-muted-foreground">
                        Account
                      </RoleTag>
                    )}

                    {person.isOwner ? (
                      <span className="w-[124px] text-right text-[11px] text-muted-foreground">
                        Full access
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={person.isModerator ? "ghost" : "outline"}
                        className="h-8 w-[124px] justify-center text-[12px] shadow-none"
                        disabled={busy === person._id}
                        onClick={() =>
                          void applyModerator(
                            person._id,
                            !person.isModerator,
                            label,
                          )
                        }
                      >
                        {busy === person._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : person.isModerator ? (
                          "Remove rights"
                        ) : (
                          "Make moderator"
                        )}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.section>

        <motion.section {...enter(0.2)} className="mt-14">
          <h2 className="label-eyebrow text-muted-foreground">
            The moderation queue
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground">
            The newest thirty of each, everywhere on the platform. Removing one
            cannot be undone.
          </p>

          <Tabs defaultValue="comments" className="mt-5">
            <TabsList>
              <TabsTrigger value="comments">
                Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({reviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-5">
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {queue === undefined ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="p-5 text-[13px] text-muted-foreground">
                    Nothing said yet.
                  </p>
                ) : (
                  comments.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-start gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] text-muted-foreground">
                          {item.authorName} ·{" "}
                          {item.eventTitle ?? "removed event"}
                          {item.programmeName === null
                            ? ""
                            : ` · ${item.programmeName}`}{" "}
                          · {stamp(item.createdAt)}
                        </span>
                        <span className="mt-1 block text-[13px] leading-6">
                          {item.body}
                        </span>
                        {item.attachmentName !== null && (
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            Attachment: {item.attachmentName}
                          </span>
                        )}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 text-[12px] text-muted-foreground hover:text-destructive"
                        disabled={busy === item._id}
                        onClick={() =>
                          void takeDownComment(item._id, item.authorName)
                        }
                      >
                        {busy === item._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-5">
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {queue === undefined ? (
                  <div className="space-y-3 p-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="p-5 text-[13px] text-muted-foreground">
                    Nothing reviewed yet.
                  </p>
                ) : (
                  reviews.map((item) => (
                    <div
                      key={item._id}
                      className="flex flex-wrap items-start gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] text-muted-foreground">
                          {item.authorName} ·{" "}
                          {item.eventTitle ?? "removed event"}
                          {item.programmeName === null
                            ? ""
                            : ` · ${item.programmeName}`}{" "}
                          · {stamp(item.createdAt)}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-brand">
                          {Array.from({ length: item.rating }, (_, index) => (
                            <Star key={index} className="size-3 fill-current" />
                          ))}
                        </span>
                        <span className="mt-1 block text-[13px] leading-6">
                          {item.body}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 text-[12px] text-muted-foreground hover:text-destructive"
                        disabled={busy === item._id}
                        onClick={() =>
                          void takeDownReview(item._id, item.authorName)
                        }
                      >
                        {busy === item._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.section>
      </main>

      <SiteFooter />
    </div>
  );
}
