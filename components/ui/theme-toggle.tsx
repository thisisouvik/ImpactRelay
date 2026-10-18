"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);

  if (!mounted) {
    return <Button variant="ghost" size="sm" aria-label="Change theme"><Laptop size={16} /></Button>;
  }

  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
  const label = theme === "dark" ? "Dark theme" : theme === "light" ? "Light theme" : "System theme";

  return (
    <Button variant="ghost" size="sm" aria-label={`${label}. Switch to ${nextTheme} theme`} onClick={() => setTheme(nextTheme)}>
      {theme === "dark" ? <Moon size={16} /> : theme === "light" ? <Sun size={16} /> : <Laptop size={16} />}
    </Button>
  );
}
