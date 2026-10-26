import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
