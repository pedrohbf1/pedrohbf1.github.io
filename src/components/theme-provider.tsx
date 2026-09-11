import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ThemeProviderContext, type Theme } from "@/lib/theme-context";

function systemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "devpedro-theme",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme,
  );
  const [system, setSystem] = useState<"dark" | "light">(systemTheme);

  // Só precisamos acompanhar o SO enquanto o usuário estiver em "system".
  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(query.matches ? "dark" : "light");
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  const resolvedTheme = theme === "system" ? system : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: Theme) => {
        localStorage.setItem(storageKey, next);
        setThemeState(next);
      },
    }),
    [theme, resolvedTheme, storageKey],
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
