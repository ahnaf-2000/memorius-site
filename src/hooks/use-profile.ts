import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import type { Persona, ProfileView } from "@/lib/types";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

const PENDING_KEY = "memorius.persona";

/** Remember the role picked before signing in. */
export function rememberPersona(persona: Persona) {
  try {
    window.localStorage.setItem(PENDING_KEY, persona);
  } catch {
    // A blocked store should not stop sign-in.
  }
}

export function readPendingPersona(): Persona | null {
  try {
    const stored = window.localStorage.getItem(PENDING_KEY);
    return stored === "organizer" || stored === "participant" || stored === "sponsor"
      ? stored
      : null;
  } catch {
    return null;
  }
}

/** The signed-in account's profile, or null while signed out. */
export function useProfile() {
  const profile = useQuery(api.profiles.me) as ProfileView | null | undefined;
  const save = useMutation(api.profiles.save);

  const persona: Persona = profile?.persona ?? "participant";

  return {
    profile: profile ?? null,
    persona,
    isOrganizer: persona === "organizer",
    isSponsor: persona === "sponsor",
    save,
  };
}

/**
 * The role is chosen before signing in, so it is written to the account the
 * first time a signed-in visitor arrives with a profile that does not exist
 * yet. Runs once per session.
 */
export function usePersonaSync() {
  const { isAuthenticated } = useAuth();
  const profile = useQuery(api.profiles.me);
  const save = useMutation(api.profiles.save);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    if (!isAuthenticated || profile === undefined || profile !== null) return;
    const pending = readPendingPersona();
    if (pending === null) return;
    applied.current = true;
    void save({ persona: pending }).catch(() => {
      // A failed write must never interrupt the page it happened on.
    });
  }, [isAuthenticated, profile, save]);
}
