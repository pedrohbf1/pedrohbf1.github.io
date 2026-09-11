import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={
        resolvedTheme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
      }
      className={cn(
        "grid size-9 place-items-center rounded-full border border-foreground/15",
        "transition-colors hover:border-foreground/40 hover:bg-foreground/5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
