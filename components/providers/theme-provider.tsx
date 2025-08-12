"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

type ResolvedTheme = "light" | "dark";

function resolveInitialTheme(preference?: string | null): ResolvedTheme {
  if (preference === "dark" || preference === "light") return preference;
  // Fallback to system preference
  if (typeof window !== "undefined") {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  return "light";
}

export function useThemeSync() {
  const { data: session } = useSession();

  useEffect(() => {
    const preferred = (session?.user as any)?.preferences?.theme as
      | string
      | undefined;
    const theme = resolveInitialTheme(preferred ?? null);
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [session?.user]);
}

export function ThemeSync() {
  useThemeSync();
  return null;
}
