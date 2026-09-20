import { Button } from "@shared/design-system";
import { formatsFor } from "@shared/localisation";
import { useLanguage } from "@shared/preferences";

/**
 * Offers the language the page is not in, named in its own words and marked as that language, so a
 * reader who cannot read the page can still find their way to one they can.
 */
export const LanguageToggle = () => {
  const { language, languages, setLanguage } = useLanguage();
  // With two languages the choice is the other one; a longer list would need a menu.
  const other = languages.find((code) => code !== language);
  if (!other) return null;

  return (
    <Button variant="ghost" size="small" lang={other} onClick={() => setLanguage(other)}>
      {formatsFor(other).languageName(other)}
    </Button>
  );
};
