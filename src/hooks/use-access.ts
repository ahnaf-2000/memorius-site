import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

/**
 * What the signed-in visitor is allowed to do, straight from the server.
 *
 * The interface reads this to decide what to *show*; every action behind it is
 * checked again in Convex, which is where the answer actually counts. Until the
 * server has spoken this reports "nobody", so a restricted control never
 * flickers into view on the way to disappearing.
 */
export interface AccessView {
  signedIn: boolean;
  email: string | null;
  name: string | null;
  level: "owner" | "moderator" | "none";
  isOwner: boolean;
  isModerator: boolean;
  isStaff: boolean;
}

const NOBODY: AccessView = {
  signedIn: false,
  email: null,
  name: null,
  level: "none",
  isOwner: false,
  isModerator: false,
  isStaff: false,
};

export function useAccess(): AccessView & { loading: boolean } {
  const view = useQuery(api.access.viewer) as AccessView | undefined;
  if (view === undefined) return { ...NOBODY, loading: true };
  return { ...view, loading: false };
}

/**
 * Writes the owner's role onto their own account the first time they arrive
 * signed in. The server compares the email itself, so this call is harmless for
 * everyone else: it is refused, quietly, and nothing changes.
 */
export function useOwnerClaim() {
  const access = useAccess();
  const claim = useMutation(api.access.claim);
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current || access.loading || !access.isOwner) return;
    asked.current = true;
    void claim({}).catch(() => {
      // A refused claim is the normal case for every other account.
    });
  }, [access.isOwner, access.loading, claim]);
}
