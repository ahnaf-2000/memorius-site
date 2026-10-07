import { celebrate } from "@/components/site/LiveMotion";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** The word that unlocks the first one. */
const SECRET = "memorius";
const KONAMI = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
];

/**
 * The small rewards for paying attention.
 *
 * Three of them, and none of them in the way: spelling the product name opens
 * the one door that a first-time visitor cannot find (the opening sequence
 * again), the old Konami code gets what the old Konami code deserves, and the
 * tab title quietly notices when you leave. Nothing here is announced, nothing
 * is required, and every one of them leaves the page exactly as it was.
 *
 * Renders nothing.
 */
export function EasterEggs() {
  const typed = useRef("");
  const sequence = useRef<string[]>([]);
  const found = useRef(new Set<string>());

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Never steal keys from a field, and never fire under a modifier.
      const target = event.target as HTMLElement | null;
      if (
        target !== null &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      typed.current = (typed.current + key).slice(-SECRET.length);
      if (typed.current === SECRET && !found.current.has("name")) {
        found.current.add("name");
        celebrate({ count: 150 });
        toast("You spelt it", {
          description:
            "The opening sequence is yours to replay whenever you like.",
          action: {
            label: "Replay it",
            onClick: () => {
              window.location.assign("/?intro=1");
            },
          },
        });
      }

      sequence.current = [...sequence.current, key].slice(-KONAMI.length);
      if (
        sequence.current.join(",") === KONAMI.join(",") &&
        !found.current.has("konami")
      ) {
        found.current.add("konami");
        celebrate({ count: 90 });
        toast("Thirty lives, no waiting list", {
          description:
            "The code still works. Every seat here is a front-row seat anyway.",
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The tab notices when it loses you, and says so.
  useEffect(() => {
    const original = document.title;
    function onVisibility() {
      document.title = document.hidden
        ? "Still here — your place is waiting · Memorius"
        : original;
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.title = original;
    };
  }, []);

  return null;
}
