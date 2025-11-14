"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "dark-green", label: "Dark-Green", icon: Leaf },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState("light");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Initialize theme from localStorage or default to light
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);
    setCurrentTheme(savedTheme);
  }, []);

  const applyTheme = (theme) => {
    // Remove all theme classes
    document.documentElement.classList.remove("theme-light", "theme-dark", "theme-dark-green");
    // Add the selected theme class
    document.documentElement.classList.add(`theme-${theme}`);
    // Save to localStorage
    localStorage.setItem("theme", theme);
  };

  const handleThemeChange = (theme) => {
    applyTheme(theme);
    setCurrentTheme(theme);
    setIsOpen(false);
  };

  const currentThemeData = themes.find((t) => t.value === currentTheme) || themes[0];
  const CurrentIcon = currentThemeData.icon;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 cursor-pointer"
      >
        <CurrentIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{currentThemeData.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 w-48 z-50 bg-[var(--panel-bg)] border border-[var(--border)] rounded-lg shadow-[var(--shadow)] overflow-hidden"
            style={{
              animation: "fadeInScale 0.2s ease-out",
            }}
          >
            {themes.map((theme) => {
              const Icon = theme.icon;
              const isActive = currentTheme === theme.value;
              return (
                <button
                  key={theme.value}
                  onClick={() => handleThemeChange(theme.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--accent)] transition-colors ${
                    isActive ? "bg-[var(--accent)]" : ""
                  }`}
                  style={{ color: "var(--text)" }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{theme.label}</span>
                  {isActive && (
                    <svg
                      className="w-4 h-4 ml-auto"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

