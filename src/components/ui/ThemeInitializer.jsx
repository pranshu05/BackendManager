"use client";

import { useEffect } from "react";

export default function ThemeInitializer() {
  useEffect(() => {
    // Initialize theme on mount
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.classList.remove("theme-light", "theme-dark", "theme-dark-green");
    document.documentElement.classList.add(`theme-${savedTheme}`);
  }, []);

  return null;
}

