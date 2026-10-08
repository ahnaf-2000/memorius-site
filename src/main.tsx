import "@vly-ai/integrations";
import { Toaster } from "@/components/ui/sonner";
import { AssistantDock } from "@/components/site/AssistantDock";
import { EasterEggs } from "@/components/site/EasterEggs";
import { KeepsakeTray } from "@/components/site/KeepsakeTray";
import { Celebrate } from "@/components/site/LiveMotion";
import { OpeningIntro } from "@/components/site/OpeningIntro";
import { PageTransition } from "@/components/site/PageTransition";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { SecretAdmin } from "@/components/site/SecretAdmin";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireStaff } from "@/components/site/RequireStaff";
import { useOwnerClaim } from "@/hooks/use-access";
import { usePersonaSync } from "@/hooks/use-profile";
import { api } from "@/convex/_generated/api";
import { detectCountry } from "@/lib/geo";
import {
  applyDetectedCountry,
  applyDetectedCurrency,
  hasChosenCountry,
  isKnownCountry,
  isKnownCurrency,
  useActiveCurrency,
} from "@/lib/pricing";
import type { ProfileView } from "@/lib/types";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useQuery } from "convex/react";
import React, {
  Fragment,
  StrictMode,
  useEffect,
  useRef,
  lazy,
  Suspense,
} from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Events = lazy(() => import("./pages/Events.tsx"));
const EventDetail = lazy(() => import("./pages/EventDetail.tsx"));
const Programmes = lazy(() => import("./pages/Programmes.tsx"));
const ProgrammeDetail = lazy(() => import("./pages/ProgrammeDetail.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Control = lazy(() => import("./pages/Control.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Report = lazy(() => import("./pages/Report.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  // A new page starts at the top of itself, without the smooth-scroll
  // animation the stylesheet turns on for in-page anchors.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
/**
 * The routed tree. It reads the current path once and uses it as the key on the
 * page transition, which is what makes a navigation replay the entrance motion
 * instead of swapping content underneath the customer.
 */
function AppRoutes() {
  const location = useLocation();

  return (
    <>
      <RouteSyncer />
      <Suspense fallback={<RouteLoading />}>
        <PageTransition routeKey={location.pathname}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route path="/programmes" element={<Programmes />} />
            <Route path="/programmes/:slug" element={<ProgrammeDetail />} />
            <Route
              path="/auth"
              element={<AuthPage redirectAfterAuth="/dashboard" />}
            />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <Admin />
                </RequireAuth>
              }
            />
            <Route
              path="/control"
              element={
                <RequireAuth
                  title="Control is by invitation"
                  description="The owner's console is only open to the owner and the moderators they appoint."
                >
                  <RequireStaff>
                    <Control />
                  </RequireStaff>
                </RequireAuth>
              }
            />
            <Route path="/contact" element={<Contact />} />
            <Route path="/report" element={<Report />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </Suspense>
    </>
  );
}

/** Writes the role chosen before sign-in onto a fresh account, once. */
function PersonaSync() {
  usePersonaSync();
  return null;
}

/**
 * Records the site owner on their own account the first time they arrive
 * signed in. The server decides whether that is true, by email.
 */
function AccessSync() {
  useOwnerClaim();
  return null;
}

/**
 * Quotes prices in the visitor's own market the first time they arrive.
 *
 * The order of preference is the whole point of it: a market chosen in this
 * browser wins outright, then the one saved on their account, and only then the
 * country their IP address points to. It resolves behind the opening sequence,
 * so nobody watches the page re-quote, and every failure simply leaves the
 * default market alone.
 */
function GeoDefaults() {
  const profile = useQuery(api.profiles.me) as ProfileView | null | undefined;
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current || hasChosenCountry()) return;
    // Wait for the account, so a saved market is never beaten by a guess.
    if (profile === undefined) return;
    settled.current = true;

    // An account can carry both a region and a currency, and they are applied
    // independently: the currency decides what a price says, the region decides
    // how the number is written.
    const savedCountry = profile?.country ?? null;
    const savedCurrency = profile?.currency ?? null;
    if (isKnownCountry(savedCountry)) applyDetectedCountry(savedCountry);
    if (isKnownCurrency(savedCurrency)) applyDetectedCurrency(savedCurrency);
    if (isKnownCountry(savedCountry)) return;

    // Nothing saved to honour: ask the IP, quietly, and let it go.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    void detectCountry(controller.signal)
      .then((code) => {
        if (code !== null) applyDetectedCountry(code);
      })
      .finally(() => window.clearTimeout(timer));
  }, [profile]);

  return null;
}

/**
 * The market decides what every price on the page says, so switching it
 * re-mounts the routed pages. The assistant sits outside this boundary, which
 * means a conversation survives a change of country.
 */
function PricedRoutes() {
  const currency = useActiveCurrency();
  return (
    <Fragment key={currency.code}>
      <AppRoutes />
    </Fragment>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <PersonaSync />
          <AccessSync />
          <GeoDefaults />
          <PricedRoutes />
          {/* Chrome that stays out of a printed page: see the print rules. */}
          <div data-app-chrome="">
            <AssistantDock />
            <KeepsakeTray />
            <OpeningIntro />
            <SecretAdmin />
          </div>
        </BrowserRouter>
        <div data-app-chrome="">
          <ScrollProgress />
          <EasterEggs />
          <Toaster />
          {/* One confetti layer for the whole product: every page can burst. */}
          <Celebrate />
        </div>
      </ConvexAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
