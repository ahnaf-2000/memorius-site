import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { errorMessage, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConvex } from "convex/react";
import { motion, useAnimationControls } from "framer-motion";
import { Check, Loader2, Tag, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** What the server accepted, kept by the parent so it can pass the code on. */
export type AppliedPromo = {
  code: string;
  title: string;
  label: string;
  discount: number;
};

/**
 * One place to enter a promotion code, shared by booking and by the shop.
 *
 * The code is checked against the live campaign table rather than decided in
 * the browser, and the answer is shown before anything is submitted — so the
 * discount on screen is the discount that gets charged. A code that is not
 * running shakes once and says why, which is friendlier than a silent nothing.
 */
export function PromoCodeField({
  subtotal,
  applied,
  onApply,
  className,
}: {
  subtotal: number;
  applied: AppliedPromo | null;
  onApply: (promo: AppliedPromo | null) => void;
  className?: string;
}) {
  const convex = useConvex();
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const controls = useAnimationControls();

  async function apply(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    const code = draft.trim().toUpperCase();
    if (code.length < 3) {
      setMessage("Codes are at least three characters.");
      return;
    }
    setMessage(null);
    setChecking(true);
    try {
      const result = await convex.query(api.campaigns.lookup, {
        code,
        subtotal,
      });
      if (result.valid) {
        onApply({
          code: result.code,
          title: result.title,
          label: result.label,
          discount: result.discount,
        });
        setDraft("");
        toast.success(`${result.code} applied — ${result.label}`, {
          description: `${result.title} · you save ${formatMoney(result.discount)}`,
        });
        return;
      }
      setMessage(result.reason);
      void controls.start(
        { x: [0, -7, 7, -4, 4, 0] },
        { duration: 0.42, ease: "easeInOut" },
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setChecking(false);
    }
  }

  if (applied !== null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "note-open flex items-center justify-between gap-4 rounded-md border px-3.5 py-3",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Check className="size-4 shrink-0" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12px] font-medium">
              <span className="tracking-[0.14em]">{applied.code}</span>
              <span className="opacity-70">· {applied.label}</span>
            </p>
            <p className="mt-0.5 truncate text-[11px] opacity-80">
              {applied.title}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onApply(null);
            setMessage(null);
            toast("Code removed");
          }}
          className="flex shrink-0 items-center gap-1 text-[11px] opacity-80 transition-opacity hover:opacity-100"
        >
          <X className="size-3.5" />
          Remove
        </button>
      </motion.div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor="promo-code"
        className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-muted-foreground uppercase"
      >
        <Tag className="size-3" />
        Promotion code
      </Label>

      <motion.form
        animate={controls}
        onSubmit={apply}
        className="flex items-center gap-2"
      >
        <Input
          id="promo-code"
          value={draft}
          onChange={(inputEvent) =>
            setDraft(inputEvent.target.value.toUpperCase().slice(0, 16))
          }
          placeholder="EARLYBIRD"
          autoComplete="off"
          spellCheck={false}
          className="h-10 bg-card tracking-[0.16em] shadow-none placeholder:tracking-[0.16em] placeholder:text-muted-foreground/50"
        />
        <Button
          type="submit"
          variant="outline"
          className="h-10 shrink-0 rounded-md px-4"
          disabled={draft.trim().length < 3 || checking}
        >
          {checking ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
        </Button>
      </motion.form>

      {message !== null && (
        <motion.p
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] leading-5 text-destructive"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
