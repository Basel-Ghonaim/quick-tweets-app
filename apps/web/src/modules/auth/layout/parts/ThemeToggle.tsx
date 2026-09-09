import { ToggleButton } from "@shared/design-system";
import { useTheme } from "@shared/preferences";
import { AUTH_COPY } from "@shared/copy";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleButton
      variant="ghost"
      size="small"
      pressed={theme === "dark"}
      onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
    >
      {AUTH_COPY.brand.themeToggle}
    </ToggleButton>
  );
};
