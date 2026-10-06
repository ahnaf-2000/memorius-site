import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

/**
 * Populates the showcase catalogue the first time the platform is opened on an
 * empty deployment. The mutation is idempotent, so a race between two tabs is
 * harmless — it simply returns early.
 */
export function useEnsureSeeded() {
  const catalogue = useQuery(api.fests.list);
  const ensureSeeded = useMutation(api.seed.ensureSeeded);
  const requested = useRef(false);

  useEffect(() => {
    if (catalogue === undefined) return;
    if (catalogue.length > 0) return;
    if (requested.current) return;
    requested.current = true;
    ensureSeeded().catch((error: unknown) => {
      console.warn("[Cadence] Could not seed the showcase catalogue:", error);
    });
  }, [catalogue, ensureSeeded]);
}
