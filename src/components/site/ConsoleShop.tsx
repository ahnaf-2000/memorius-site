import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage, formatMoney } from "@/lib/format";
import { fromLocalAmount, useActiveCountry } from "@/lib/pricing";
import type { ManagedProductView, ProductKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Coffee, Loader2, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function AddProductDialog({ eventId }: { eventId: Id<"events"> }) {
  const create = useMutation(api.shop.create);
  const country = useActiveCountry();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [kind, setKind] = useState<ProductKind>("merchandise");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "100",
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const price = fromLocalAmount(Number.parseFloat(form.price), country);
      await create({
        eventId,
        name: form.name,
        kind,
        description: form.description,
        price,
        stock: Number.parseInt(form.stock, 10),
      });
      toast.success("Item on sale", {
        description: `${form.name} · ${formatMoney(price)}`,
      });
      setOpen(false);
      setForm({ name: "", description: "", price: "", stock: "100" });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 rounded-full px-3.5 text-[12px]">
          <Plus className="size-3.5" />
          List an item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[18px] tracking-[-0.02em]">
            List something for sale
          </DialogTitle>
          <DialogDescription>
            Merchandise travels home with the attendee; snacks are handed over
            on the day. Both are paid for with the same methods as places.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "merchandise" as const, label: "Merchandise", icon: ShoppingBag },
                { id: "snack" as const, label: "Snack or drink", icon: Coffee },
              ]
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setKind(option.id)}
                aria-pressed={kind === option.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-md border px-3.5 py-3 text-left text-[13px] transition-colors",
                  kind === option.id
                    ? "border-brand-line bg-brand-soft"
                    : "border-border hover:border-foreground/25",
                )}
              >
                <option.icon className="size-4 text-muted-foreground" />
                {option.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="product-name"
              className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
            >
              Name
            </Label>
            <Input
              id="product-name"
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Programme tote bag"
              className="h-10 bg-background shadow-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="product-price"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                Price ({country.currency})
              </Label>
              <Input
                id="product-price"
                required
                inputMode="decimal"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
                placeholder="24"
                className="h-10 bg-background shadow-none tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="product-stock"
                className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
              >
                How many you have
              </Label>
              <Input
                id="product-stock"
                required
                inputMode="numeric"
                value={form.stock}
                onChange={(event) =>
                  setForm({ ...form, stock: event.target.value })
                }
                className="h-10 bg-background shadow-none tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="product-description"
              className="text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
            >
              Description (optional)
            </Label>
            <Textarea
              id="product-description"
              rows={2}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="Heavyweight cotton, printed with the programme mark."
              className="bg-background shadow-none"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="rounded-full">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Put it on sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The shelf for one event, as the business sees it. */
export function ConsoleShop({ eventId }: { eventId: Id<"events"> }) {
  const products = useQuery(api.shop.managed, { eventId }) as
    | ManagedProductView[]
    | undefined;
  const remove = useMutation(api.shop.remove);

  const rows = products ?? [];
  const gross = rows.reduce((sum, row) => sum + row.price * row.sold, 0);
  const sold = rows.reduce((sum, row) => sum + row.sold, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {sold} sold · {formatMoney(gross)} taken at this event
        </p>
        <AddProductDialog eventId={eventId} />
      </div>

      {products === undefined ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-[12px] text-muted-foreground">
          Nothing is on sale here yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {rows.map((product) => (
            <li
              key={product._id}
              className="row-marker relative flex flex-wrap items-center gap-x-4 gap-y-2 py-3 pl-1 transition-colors hover:bg-accent/30"
            >
              <span
                className={cn(
                  "icon-chip size-8 shrink-0",
                  product.kind === "snack" ? "icon-chip-warm" : "",
                )}
              >
                {product.kind === "snack" ? (
                  <Coffee className="size-3.5" />
                ) : (
                  <ShoppingBag className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium tracking-[-0.01em]">
                  {product.name}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  {formatMoney(product.price)} · {product.sold} sold ·{" "}
                  {product.available} of {product.stock} left
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${product.name}`}
                onClick={async () => {
                  try {
                    await remove({ productId: product._id });
                    toast.success("Removed from sale");
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
