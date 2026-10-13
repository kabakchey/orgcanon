import { useCallback, useEffect, useState } from "react";
import { resolveInitialTheme, setStoredTheme, type Theme } from "./config";

interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      setStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
