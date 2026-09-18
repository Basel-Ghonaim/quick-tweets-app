import { ToggleButton } from "@shared/design-system";
import { useTheme } from "@shared/preferences";
import { useCopy } from "@shared/copy";

export const ThemeToggle = () => {
  const copy = useCopy();
  const { theme, setTheme } = useTheme();

  return (
    <ToggleButton
      variant="ghost"
      size="small"
      pressed={theme === "dark"}
      onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
    >
      {copy.auth.brand.themeToggle}
    </ToggleButton>
  );
};
