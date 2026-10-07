import { MethodPicker, TestModeNote } from "@/components/site/PaymentMethods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, formatMoney } from "@/lib/format";
import { useActiveCountry } from "@/lib/pricing";
import type { PaymentMethod, ProductView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  Coffee,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const KIND_LABEL: Record<ProductView["kind"], string> = {
  merchandise: "Merchandise to take home",
  snack: "Snacks and drinks on the day",
};

/**
 * The shop that sits inside an event: something to keep, something to eat.
 * The basket lives in this component — it is a single-page purchase, and the
 * server recomputes every price at checkout, so nothing here can be trusted
 * into a wrong total.
 */
export function EventShop({
  eventId,
  eventSlug,
}: {
  eventId: Id<"events">;
  eventSlug: string;
}) {
  const products = useQuery(api.shop.forEvent, { eventId }) as
    | ProductView[]
    | undefined;
  const checkout = useMutation(api.shop.checkout);
  const { user, isAuthenticated } = useAuth();
  const country = useActiveCountry();

  const [basket, setBasket] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<PaymentMethod>("bkash");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [receipt, setReceipt] = useState<{
    reference: string;
    subtotal: number;
    paymentStatus: string;
  } | null>(null);

  const rows = products ?? [];
  const lines = rows
    .filter((product) => (basket[product._id] ?? 0) > 0)
    .map((product) => ({ product, quantity: basket[product._id] ?? 0 }));
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );

  function step(product: ProductView, delta: number) {
    setBasket((previous) => {
      const next = { ...previous };
      const value = Math.min(
        product.available,
        Math.max(0, (next[product._id] ?? 0) + delta),
      );
      if (value === 0) delete next[product._id];
      else next[product._id] = value;
      return next;
    });
    setReceipt(null);
  }

  async function place(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await checkout({
        eventId,
        items: lines.map((line) => ({
          productId: line.product._id,
          quantity: line.quantity,
        })),
        paymentMethod: method,
        fullName: form.fullName,
        email: form.email,
        country: country.code,
      });
      setReceipt({
        reference: result.reference,
        subtotal: result.subtotal,
        paymentStatus: result.paymentStatus,
      });
      setBasket({});
      setOpen(false);
      toast.success("Order placed", {
        description: `Reference ${result.reference} · collect at the desk`,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  const kinds: ProductView["kind"][] = ["merchandise", "snack"];

  return (
    <section className="mt-16">
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <h2 className="label-eyebrow">Shop at this event</h2>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          <ShoppingBag className="size-3.5" />
          {products === undefined ? "" : `${rows.length} items`}
        </span>
      </div>

      {products === undefined ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-border px-5 py-8 text-center text-[13px] leading-6 text-muted-foreground">
          The shop for this event is not open yet. Merchandise and snacks appear
          here as soon as the organizer lists them.
        </p>
      ) : (
        <div className="mt-7 space-y-9">
          {kinds.map((kind) => {
            const items = rows.filter((product) => product.kind === kind);
            if (items.length === 0) return null;
            return (
              <div key={kind}>
                <p className="flex items-center gap-2 text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                  <Coffee className="size-3.5" />
                  {KIND_LABEL[kind]}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {items.map((product) => {
                    const quantity = basket[product._id] ?? 0;
                    return (
                      <div
                        key={product._id}
                        className={cn(
                          "surface-card flex flex-col justify-between rounded-lg border bg-card p-4 shadow-hairline transition-colors",
                          quantity > 0
                            ? "border-brand-line"
                            : "border-border hover:border-foreground/15",
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[14px] font-medium tracking-[-0.012em]">
                              {product.name}
                            </p>
                            <span className="font-display shrink-0 text-[16px] tabular-nums">
                              {formatMoney(product.price)}
                            </span>
                          </div>
                          {product.description !== null && (
                            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[11px] tracking-[0.06em] text-muted-foreground uppercase tabular-nums">
                            {product.available} left
                          </span>
                          {quantity === 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => step(product, 1)}
                              className="h-8 rounded-full border-border px-3.5 text-[12px] shadow-none"
                            >
                              <Plus className="size-3.5" />
                              Add
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                aria-label={`One fewer ${product.name}`}
                                onClick={() => step(product, -1)}
                                className="rounded-full border-border shadow-none"
                              >
                                <Minus className="size-3.5" />
                              </Button>
                              <span className="w-7 text-center text-[13px] tabular-nums">
                                {quantity}
                              </span>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="outline"
                                aria-label={`One more ${product.name}`}
                                disabled={quantity >= product.available}
                                onClick={() => step(product, 1)}
                                className="rounded-full border-border shadow-none"
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {count > 0 && (
        <div className="animate-rise mt-7 rounded-lg border border-brand-line bg-brand-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium tracking-[-0.01em]">
                {count} {count === 1 ? "item" : "items"} in your basket
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Total{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(subtotal)}
                </span>{" "}
                · collected from the desk on the day
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="h-9 rounded-full px-4 text-[13px]"
            >
              {open ? "Hide checkout" : "Checkout"}
            </Button>
          </div>

          {open && (
            <div className="animate-rise mt-5 border-t border-brand-line pt-5">
              {isAuthenticated ? (
                <form onSubmit={place} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="shop-name"
                        className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                      >
                        Name
                      </Label>
                      <Input
                        id="shop-name"
                        required
                        value={form.fullName}
                        onChange={(event) =>
                          setForm({ ...form, fullName: event.target.value })
                        }
                        placeholder="As it should appear on the order"
                        className="h-10 bg-card shadow-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="shop-email"
                        className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
                      >
                        Email
                      </Label>
                      <Input
                        id="shop-email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) =>
                          setForm({ ...form, email: event.target.value })
                        }
                        placeholder="name@company.com"
                        className="h-10 bg-card shadow-none"
                      />
                    </div>
                  </div>

                  <MethodPicker value={method} onChange={setMethod} />
                  <TestModeNote />

                  <Button
                    type="submit"
                    disabled={pending}
                    className="h-10 w-full rounded-full"
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="size-4" />
                    )}
                    Place order · {formatMoney(subtotal)}
                  </Button>
                </form>
              ) : (
                <div className="text-center">
                  <p className="text-[13px] leading-6 text-muted-foreground">
                    Sign in to place this order — your basket stays as it is.
                  </p>
                  <Button asChild className="mt-4 h-9 rounded-full px-4 text-[13px]">
                    <Link to={`/auth?returnTo=%2Fevents%2F${eventSlug}`}>
                      Sign in and continue
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {receipt !== null && (
        <div className="animate-rise mt-5 rounded-lg border border-border bg-card px-5 py-5">
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="size-4 tone-open" />
            <p className="text-[14px] font-medium tracking-[-0.012em]">
              Order recorded
            </p>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
            Show the reference at the desk and collect what you ordered.{" "}
            {receipt.paymentStatus === "paid"
              ? "Payment is recorded against the order."
              : "The balance is taken when you collect."}
          </p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-md border border-dashed border-border bg-background px-4 py-3">
            <span className="font-display text-[18px] tracking-[0.06em]">
              {receipt.reference}
            </span>
            <span className="text-[13px] text-muted-foreground tabular-nums">
              {formatMoney(receipt.subtotal)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
