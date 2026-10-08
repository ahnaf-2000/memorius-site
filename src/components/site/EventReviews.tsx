import { celebrate } from "@/components/site/LiveMotion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, initials } from "@/lib/format";
import type { ReviewView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNowStrict } from "date-fns";
import { Loader2, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

function Stars({ value, size = "size-3.5" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          className={cn(
            size,
            step <= Math.round(value) ? "fill-warm text-warm" : "text-border",
          )}
        />
      ))}
    </span>
  );
}

/**
 * What attendees said about one event. Anyone signed in can rate it once; a
 * second submission replaces their own review rather than stacking another.
 */
export function EventReviews({ eventId }: { eventId: Id<"events"> }) {
  const data = useQuery(api.reviews.forEvent, { eventId });
  const addReview = useMutation(api.reviews.add);
  const removeReview = useMutation(api.reviews.remove);
  const { isAuthenticated } = useAuth();

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);

  const items: ReviewView[] = data?.items ?? [];
  const mineId = data?.mineId ?? null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await addReview({ eventId, rating, body });
      setBody("");
      setEditing(false);
      toast.success(mineId === null ? "Review posted" : "Review updated");
      // Saying something in public earns a small acknowledgement.
      celebrate({ count: 44 });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
        <h2 className="label-eyebrow">Reviews from attendees</h2>
        {data !== undefined && data.count > 0 && data.average !== null && (
          <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Stars value={data.average} />
            <span className="tabular-nums">
              {data.average.toFixed(1)} from {data.count}{" "}
              {data.count === 1 ? "review" : "reviews"}
            </span>
          </span>
        )}
      </div>

      {data === undefined ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <p className="mt-6 text-[13px] leading-6 text-muted-foreground">
              No reviews yet. If you were in the room, yours would be the first.
            </p>
          ) : (
            <ul className="mt-6 space-y-6">
              {items.map((review) => (
                <li key={review._id} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-[10px] font-medium">
                    {initials(review.authorName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-[13px] font-medium tracking-[-0.01em]">
                        {review.authorName}
                      </p>
                      {review.authorCompany !== null && (
                        <p className="text-[12px] text-muted-foreground">
                          {review.authorCompany}
                        </p>
                      )}
                      <Stars value={review.rating} />
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNowStrict(review.createdAt)} ago
                      </p>
                      {review._id === mineId && (
                        <span className="chip chip-cool">Yours</span>
                      )}
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-muted-foreground whitespace-pre-line">
                      {review.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            {!isAuthenticated ? (
              <p className="rounded-md border border-border bg-card px-4 py-3.5 text-[13px] leading-6 text-muted-foreground">
                <Link
                  to="/auth"
                  className="text-foreground underline decoration-border underline-offset-4"
                >
                  Sign in
                </Link>{" "}
                to leave a rating for this event.
              </p>
            ) : mineId !== null && !editing ? (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3.5">
                <p className="text-[13px] text-muted-foreground">
                  You rated this event{" "}
                  <span className="text-foreground tabular-nums">
                    {data.mineRating}/5
                  </span>
                  .
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRating(data.mineRating ?? 5);
                    setBody(data.mineBody ?? "");
                    setEditing(true);
                  }}
                  className="h-8 rounded-full border-border px-3.5 text-[12px] shadow-none"
                >
                  Edit your review
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await removeReview({ reviewId: mineId });
                      toast.success("Review withdrawn");
                    } catch (error) {
                      toast.error(errorMessage(error));
                    }
                  }}
                  className="h-8 rounded-full px-3 text-[12px] text-muted-foreground"
                >
                  <Trash2 className="size-3.5" />
                  Withdraw
                </Button>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="animate-rise rounded-lg border border-border bg-card px-5 py-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13px] font-medium tracking-[-0.01em]">
                    {mineId === null ? "Leave a review" : "Update your review"}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setRating(step)}
                        aria-label={`Rate ${step} of 5`}
                        aria-pressed={rating === step}
                        className="rounded-md p-1 transition-transform duration-200 ease-soft hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "size-5",
                            step <= rating
                              ? "fill-warm text-warm"
                              : "text-border",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={3}
                  placeholder="What was it actually like? A sentence or two helps the next person."
                  className="mt-4 bg-background shadow-none"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    Reviews are public and shown with your name.
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending || body.trim().length < 10}
                    className="h-8 rounded-full px-4 text-[12px]"
                  >
                    {pending && <Loader2 className="size-3.5 animate-spin" />}
                    {mineId === null ? "Post review" : "Save changes"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </section>
  );
}
