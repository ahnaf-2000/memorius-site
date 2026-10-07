import { useSyncExternalStore } from "react";

/**
 * Two independent display choices, kept in one place because every surface
 * needs both: an appearance (light or dark) and a palette (standard or
 * colour-blind safe). The colour-blind palette swaps the red/green status dots
 * for blue and orange, which stay distinguishable without colour vision.
 */
export type ThemeId = "light" | "dark";

export const THEMES: { id: ThemeId; name: string; blurb: string }[] = [
  { id: "light", name: "Light", blurb: "Warm paper, ink text" },
  { id: "dark", name: "Dark", blurb: "Low light, same layout" },
];

export const PALETTES = [
  { id: "standard", name: "Standard" },
  { id: "colour-blind", name: "Colour-blind" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export interface ThemeState {
  theme: ThemeId;
  palette: PaletteId;
}

const THEME_KEY = "memorius.theme";
const PALETTE_KEY = "memorius.palette";
const listeners = new Set<() => void>();

function prefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStored(): ThemeState {
  if (typeof window === "undefined") {
    return { theme: "light", palette: "standard" };
  }
  const storedTheme = window.localStorage.getItem(THEME_KEY);
  const storedPalette = window.localStorage.getItem(PALETTE_KEY);
  return {
    theme:
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : prefersDark()
          ? "dark"
          : "light",
    palette: storedPalette === "colour-blind" ? "colour-blind" : "standard",
  };
}

let state: ThemeState = readStored();

function apply(next: ThemeState) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", next.theme === "dark");
  root.dataset.palette = next.palette;
  root.dataset.theme = next.theme;
  root.style.colorScheme = next.theme;
}

// Applied on module load so the very first paint is already themed.
apply(state);

function emit() {
  for (const listener of listeners) listener();
}

export function getThemeState() {
  return state;
}

export function setTheme(theme: ThemeId) {
  state = { ...state, theme };
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore: the theme still applies for this session.
  }
  apply(state);
  emit();
}

export function setPalette(palette: PaletteId) {
  state = { ...state, palette };
  try {
    window.localStorage.setItem(PALETTE_KEY, palette);
  } catch {
    // Ignore: the palette still applies for this session.
  }
  apply(state);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getThemeState, getThemeState);
  return {
    theme: snapshot.theme,
    palette: snapshot.palette,
    setTheme,
    setPalette,
    toggleTheme: () => setTheme(snapshot.theme === "dark" ? "light" : "dark"),
  };
}

/** True when the stored preferences ask for the colour-blind palette. */
export function isColourBlind() {
  return state.palette === "colour-blind";
}
