import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
};

// O contexto mora fora do arquivo do provider: exportar contexto e componente
// juntos quebra o fast refresh do Vite.
export const ThemeProviderContext = createContext<ThemeProviderState | null>(
  null,
);
