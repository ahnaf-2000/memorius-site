import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreditCard, Globe, Smartphone, Ticket, Wallet } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Every method the product accepts, in the order a customer from either market
 * is most likely to look for one. Tints come from the theme tokens, so the
 * colour-blind palette changes them without this file knowing.
 */
export const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  name: string;
  detail: string;
  region: string;
  icon: ReactNode;
  tint: string;
}[] = [
  {
    id: "bkash",
    name: "bKash",
    detail: "Pay from your bKash wallet. Marks the balance settled straight away.",
    region: "Bangladesh",
    icon: <Smartphone className="size-4" />,
    tint: "chip-plum",
  },
  {
    id: "nagad",
    name: "Nagad",
    detail: "Pay from your Nagad wallet, with the reference recorded on the receipt.",
    region: "Bangladesh",
    icon: <Wallet className="size-4" />,
    tint: "chip-warm",
  },
  {
    id: "google-pay",
    name: "Google Pay",
    detail: "One tap with a saved card in your Google account.",
    region: "Global",
    icon: <Wallet className="size-4" />,
    tint: "chip-cool",
  },
  {
    id: "paypal",
    name: "PayPal",
    detail: "Pay from your PayPal balance or a linked account.",
    region: "Global",
    icon: <Globe className="size-4" />,
    tint: "chip-cool",
  },
  {
    id: "card",
    name: "Card",
    detail: "Visa, Mastercard or Amex. Charged immediately and recorded on the reference.",
    region: "Global",
    icon: <CreditCard className="size-4" />,
    tint: "",
  },
  {
    id: "on-site",
    name: "Settle on the day",
    detail: "Your place is held and the balance is taken at the desk.",
    region: "Any",
    icon: <Ticket className="size-4" />,
    tint: "",
  },
];

export function MethodPicker({
  value,
  onChange,
  className,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {PAYMENT_OPTIONS.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={selected}
            className={cn(
              "group flex w-full items-start gap-3 rounded-md border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-soft",
              selected
                ? "border-brand-line bg-brand-soft shadow-hairline"
                : "border-border bg-card hover:border-foreground/25",
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
              <span className="flex flex-wrap items-center gap-2 text-[13px] font-medium tracking-[-0.01em]">
                {option.name}
                <span className="text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                  {option.region}
                </span>
              </span>
              <span className="mt-1 block text-[12px] leading-5 text-muted-foreground">
                {option.detail}
              </span>
            </span>
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                selected ? "border-brand bg-brand" : "border-border",
              )}
              aria-hidden="true"
            >
              {selected && (
                <span className="size-1.5 rounded-full bg-background" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A one-line chip naming the method, used on receipts and order rows. */
export function MethodBadge({ method }: { method: PaymentMethod }) {
  const option =
    PAYMENT_OPTIONS.find((entry) => entry.id === method) ?? PAYMENT_OPTIONS[4];
  return (
    <span className={cn("chip", option.tint)}>
      {option.icon}
      {option.name}
    </span>
  );
}

/**
 * Honest disclosure: these rails are wired end to end in the product, but no
 * merchant account is connected yet, so the money is not really moved.
 */
export function TestModeNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-md border border-dashed border-border bg-background px-3 py-2.5 text-[11px] leading-5 text-muted-foreground",
        className,
      )}
    >
      Test mode: bKash, Nagad, Google Pay, PayPal and card are recorded here and
      matched to your reference, so the flow and the ledger are real. A merchant
      account has not been connected yet, so no money moves.
    </p>
  );
}
