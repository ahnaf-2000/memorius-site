import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** One easing for every entrance on the page. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ *
 * Confetti.
 *
 * Any part of the page can ask for a burst by calling `celebrate()`; one
 * layer near the top of the tree listens and does the drawing. That keeps
 * the effect available everywhere without threading state through props.
 * ------------------------------------------------------------------ */

export const CELEBRATE_EVENT = "memorius:celebrate";

export type CelebrateDetail = { x?: number; y?: number; count?: number };

export function celebrate(detail: CelebrateDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CelebrateDetail>(CELEBRATE_EVENT, { detail }),
  );
}

const CONFETTI_TINTS = [
  "var(--brand)",
  "var(--warm)",
  "var(--plum)",
  "var(--cool)",
  "var(--status-open)",
];

type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  spin: number;
  width: number;
  height: number;
  delay: number;
  tint: string;
};

export function Celebrate() {
  const reduced = useReducedMotion();
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    function onCelebrate(event: Event) {
      if (reduced) return;
      const detail = (event as CustomEvent<CelebrateDetail>).detail ?? {};
      const originX = detail.x ?? window.innerWidth / 2;
      const originY = detail.y ?? window.innerHeight * 0.32;
      const count = detail.count ?? 64;

      const batch: ConfettiPiece[] = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 240;
        return {
          id: nextId.current++,
          x: originX,
          y: originY,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed - 110,
          spin: (Math.random() - 0.5) * 900,
          width: 5 + Math.random() * 6,
          height: 4 + Math.random() * 8,
          delay: Math.random() * 0.12,
          tint: CONFETTI_TINTS[
            Math.floor(Math.random() * CONFETTI_TINTS.length)
          ],
        };
      });

      setPieces((previous) => [...previous, ...batch]);
      const ids = new Set(batch.map((piece) => piece.id));
      window.setTimeout(() => {
        setPieces((previous) => previous.filter((piece) => !ids.has(piece.id)));
      }, 2200);
    }

    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
    >
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute block rounded-[2px]"
          style={{
            left: piece.x,
            top: piece.y,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.tint,
          }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0],
            x: [0, piece.dx * 0.7, piece.dx],
            y: [0, piece.dy, piece.dy + 280],
            rotate: piece.spin,
            scale: [1, 1, 0.6],
          }}
          transition={{
            duration: 1.5,
            delay: piece.delay,
            ease: [0.2, 0.8, 0.4, 1],
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Magnetic hover: content leans a few pixels toward the pointer and
 * springs home when it leaves. Used on the primary actions.
 * ------------------------------------------------------------------ */

export function Magnetic({
  children,
  className,
  pull = 0.12,
}: {
  children: ReactNode;
  className?: string;
  pull?: number;
}) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const spring = { stiffness: 220, damping: 18, mass: 0.4 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * pull);
    y.set((event.clientY - (rect.top + rect.height / 2)) * pull);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn("inline-flex", className)}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * Split reveal: each word rises out of its own mask, in order. The
 * headline arrives as a sentence being written rather than a block
 * fading in.
 * ------------------------------------------------------------------ */

export function SplitWords({
  text,
  className,
  delay = 0,
  stagger = 0.05,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block overflow-hidden pb-[0.08em] align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, y: "1.1em", rotate: 2 }
            }
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{
              duration: reduced ? 0 : 0.9,
              delay: delay + index * stagger,
              ease: EASE_OUT,
            }}
          >
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Spotlight card: the surface tilts a few degrees toward the pointer and
 * carries a soft light that follows it. The glow is a radial gradient
 * driven by motion values, so nothing re-renders while the pointer moves.
 * ------------------------------------------------------------------ */

export function SpotlightCard({
  children,
  className,
  tint = "var(--brand)",
  strength = 6,
  radius = 260,
  intensity = 16,
}: {
  children: ReactNode;
  className?: string;
  tint?: string;
  strength?: number;
  radius?: number;
  intensity?: number;
}) {
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const spring = { stiffness: 260, damping: 26, mass: 0.5 };
  const srx = useSpring(rx, spring);
  const sry = useSpring(ry, spring);
  const glow = useMotionTemplate`radial-gradient(${radius}px circle at ${mx}% ${my}%, color-mix(in oklch, ${tint} ${intensity}%, transparent), transparent 72%)`;

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    mx.set(px * 100);
    my.set(py * 100);
    ry.set((px - 0.5) * strength);
    rx.set(-(py - 0.5) * strength);
  }

  function onLeave() {
    rx.set(0);
    ry.set(0);
    mx.set(50);
    my.set(50);
  }

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1100 }}
      className={cn("group relative", className)}
    >
      <motion.span
        aria-hidden="true"
        style={{ background: glow }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * A constellation that drifts behind the hero. Dots wander, neighbours
 * link up, and the pointer pulls the nearest ones a little closer.
 *
 * The canvas is decorative: it never takes a pointer event, it stops
 * while the tab is hidden, and it draws a single still frame for anyone
 * who has asked for reduced motion.
 * ------------------------------------------------------------------ */

type Rgb = { r: number; g: number; b: number };

/** Resolve a themed colour to plain RGB by letting a canvas sample it. */
function sampleRgb(cssColour: string): Rgb | null {
  const probe = document.createElement("span");
  probe.style.color = cssColour;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx === null) return null;

  ctx.fillStyle = "#000000";
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2] };
}

type Dot = { x: number; y: number; vx: number; vy: number; r: number };

export function ParticleField({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const context = element.getContext("2d");
    if (context === null) return;
    // Re-bound so the closures below keep the narrowed types.
    const canvas: HTMLCanvasElement = element;
    const ctx: CanvasRenderingContext2D = context;

    const fallback: Rgb = document.documentElement.classList.contains("dark")
      ? { r: 156, g: 190, b: 208 }
      : { r: 63, g: 101, b: 119 };
    const brand = sampleRgb("var(--brand)") ?? fallback;
    const warm = sampleRgb("var(--warm)") ?? fallback;

    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    let frame = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999, active: false };

    function build() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(16, Math.min(52, Math.round(width / 28)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 0.9 + Math.random() * 1.4,
      }));
    }

    function paint(withPointer: boolean) {
      ctx.clearRect(0, 0, width, height);

      for (const dot of dots) {
        if (withPointer && pointer.active) {
          const dx = pointer.x - dot.x;
          const dy = pointer.y - dot.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 190 && distance > 0.5) {
            dot.vx += (dx / distance) * 0.012;
            dot.vy += (dy / distance) * 0.012;
          }
        }
        dot.vx = Math.max(-0.5, Math.min(0.5, dot.vx));
        dot.vy = Math.max(-0.5, Math.min(0.5, dot.vy));
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0) dot.x = width;
        if (dot.x > width) dot.x = 0;
        if (dot.y < 0) dot.y = height;
        if (dot.y > height) dot.y = 0;
      }

      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const squared = dx * dx + dy * dy;
          if (squared > 15600) continue;
          const alpha = (1 - Math.sqrt(squared) / 125) * 0.28;
          ctx.strokeStyle = `rgba(${brand.r}, ${brand.g}, ${brand.b}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const dot of dots) {
        const near =
          withPointer &&
          pointer.active &&
          Math.hypot(pointer.x - dot.x, pointer.y - dot.y) < 190;
        const ink = near ? warm : brand;
        ctx.fillStyle = `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${near ? 0.85 : 0.5})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, near ? dot.r * 1.6 : dot.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop() {
      frame = window.requestAnimationFrame(loop);
      if (!running) return;
      paint(true);
    }

    function onPointerMove(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active =
        pointer.x > -120 &&
        pointer.x < rect.width + 120 &&
        pointer.y > -120 &&
        pointer.y < rect.height + 120;
    }

    function onVisibility() {
      running = !document.hidden;
    }

    build();
    if (reduced) {
      paint(false);
    } else {
      loop();
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    }

    function onResize() {
      build();
      if (reduced) paint(false);
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ *
 * The easter-egg rail.
 *
 * A comet crosses a hairline above a row of tappable chips. Every chip
 * that is tapped answers with a small burst of its own colour, and the
 * counter keeps the tally; the last one gets a full celebration.
 * ------------------------------------------------------------------ */

export type RailItem = { name: string; icon: LucideIcon; tint: string };

export function CometRail({
  items,
  title = "Loose change",
  hint = "Twelve small things hide in this row. Tap one.",
}: {
  items: RailItem[];
  title?: string;
  hint?: string;
}) {
  const reduced = useReducedMotion();
  const [found, setFound] = useState<string[]>([]);
  const finished = useRef(false);
  const complete = found.length === items.length;

  useEffect(() => {
    if (!complete || finished.current) return;
    finished.current = true;
    celebrate({ count: 130 });
    void import("sonner").then(({ toast }) => {
      toast("You found every one of them", {
        description:
          "Twelve small pieces of the product, hidden in one row. Nothing was behind a paywall.",
      });
    });
  }, [complete]);

  return (
    <div className="relative mt-12 overflow-hidden rounded-xl border border-brand-line/40 bg-brand-soft/20 px-5 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="label-eyebrow text-brand">{title}</span>
          <span className="text-[13px] text-muted-foreground">{hint}</span>
        </div>
        <span
          className="chip chip-tinted tabular-nums"
          style={{ ["--chip-tint" as string]: "var(--brand)" }}
        >
          {found.length} / {items.length} found
        </span>
      </div>

      {/* The comet: a dot with a tail, crossing the rail on its own clock. */}
      <div aria-hidden="true" className="relative mt-5 h-px w-full bg-border">
        {!reduced && (
          <motion.span
            className="absolute top-1/2 flex -translate-y-1/2 items-center"
            initial={{ left: "-8%" }}
            animate={{ left: "104%" }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          >
            <span className="h-px w-20 bg-gradient-to-r from-transparent via-warm to-warm" />
            <span className="size-1.5 rounded-full bg-warm shadow-[0_0_12px_var(--warm)]" />
          </motion.span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {items.map((item, index) => {
          const isFound = found.includes(item.name);
          return (
            // Each chip drifts on its own clock until it is found, so the row
            // is visibly alive rather than a static line of buttons.
            <motion.span
              key={item.name}
              className="inline-block"
              animate={
                reduced || isFound
                  ? undefined
                  : {
                      y: [0, -3.5, 0],
                      rotate: [0, index % 2 === 0 ? 0.8 : -0.8, 0],
                    }
              }
              transition={
                reduced
                  ? undefined
                  : {
                      duration: 3.4 + (index % 4) * 0.35,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.19,
                    }
              }
            >
              <motion.button
                type="button"
                initial={
                  reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }
                }
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: reduced ? 0 : 0.5,
                  delay: reduced ? 0 : index * 0.035,
                  ease: EASE_OUT,
                }}
                whileTap={reduced ? undefined : { scale: 0.94 }}
                onClick={(event) => {
                  if (isFound) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  celebrate({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                    count: 16,
                  });
                  setFound((previous) => [...previous, item.name]);
                }}
                style={{ ["--chip-tint" as string]: item.tint }}
                className={cn(
                  "chip gap-2 transition-transform",
                  isFound && "chip-tinted",
                  !isFound && "hover:-translate-y-0.5",
                )}
              >
                <motion.span
                  whileHover={
                    reduced
                      ? undefined
                      : { rotate: [0, -14, 10, 0], scale: 1.12 }
                  }
                  transition={{ duration: 0.5 }}
                  className="grid place-items-center"
                >
                  <item.icon className="size-3.5" />
                </motion.span>
                {item.name}
              </motion.button>
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
