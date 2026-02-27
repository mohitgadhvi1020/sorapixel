"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "sorapixel-theme";
const EVENT_NAME = "sorapixel-theme-change";

let currentTheme: Theme = "dark";

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

function applyTheme(theme: Theme) {
  currentTheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
  window.dispatchEvent(new Event(EVENT_NAME));
}

if (typeof window !== "undefined") {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    currentTheme = saved;
    document.documentElement.setAttribute("data-theme", saved);
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "dark" ? "light" : "dark");
  }, [theme]);

  return { theme, toggleTheme };
}
