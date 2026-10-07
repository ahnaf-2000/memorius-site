import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { errorMessage, initials } from "@/lib/format";
import type { OrganizerReviewView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNowStrict } from "date-fns";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

/** What attendees said, across every event this business runs. */
export function ConsoleReviews() {
  const data = useQuery(api.reviews.forOrganizer);
  const remove = useMutation(api.reviews.remove);

  if (data === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const items = data.items as OrganizerReviewView[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <span className="font-display text-[26px] leading-none tabular-nums">
            {data.average === null ? "—" : data.average.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((step) => (
              <Star
                key={step}
                className={cn(
                  "size-3.5",
                  data.average !== null && step <= Math.round(data.average)
                    ? "fill-warm text-warm"
                    : "text-border",
                )}
              />
            ))}
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {data.count} {data.count === 1 ? "review" : "reviews"} across your
          events
        </p>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border py-14 text-center">
          <p className="text-[14px] font-medium tracking-[-0.012em]">
            No reviews yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-6 text-muted-foreground">
            Attendees leave a rating on the event page once they have been in
            the room. Ratings are what future customers read first, so they are
            worth asking for.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-5">
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
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star
                        key={step}
                        className={cn(
                          "size-3",
                          step <= review.rating
                            ? "fill-warm text-warm"
                            : "text-border",
                        )}
                      />
                    ))}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNowStrict(review.createdAt)} ago
                  </p>
                </div>
                <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground whitespace-pre-line">
                  {review.body}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {review.eventTitle}
                  <span className="px-1.5 text-border">·</span>
                  {review.programmeName}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove review"
                onClick={async () => {
                  try {
                    await remove({ reviewId: review._id });
                    toast.success("Review removed");
                  } catch (error) {
                    toast.error(errorMessage(error));
                  }
                }}
                className="rounded-full text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
