import { RevealOnScroll } from "@/components/site/RevealOnScroll";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Section header: one hairline rule, one eyebrow, one sentence. The same
 * rhythm on every page is what makes the layout feel quiet rather than busy.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <RevealOnScroll>
      <div
        className={cn(
          "flex flex-col gap-6 border-t border-border pt-7 sm:flex-row sm:items-end sm:justify-between",
          className,
        )}
      >
        <div className="max-w-2xl">
          <p className="label-eyebrow">{eyebrow}</p>
          <h2 className="mt-3 text-[22px] leading-[1.25] font-medium tracking-[-0.022em] text-balance sm:text-[26px]">
            {title}
          </h2>
          {description !== undefined && (
            <p className="mt-3.5 max-w-xl text-[14px] leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action !== undefined && <div className="shrink-0">{action}</div>}
      </div>
    </RevealOnScroll>
  );
}
