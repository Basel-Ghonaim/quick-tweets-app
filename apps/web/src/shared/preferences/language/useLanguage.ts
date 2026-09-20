import { useContext } from "react";
import { LanguageContext, type LanguagePreference } from "./languageContext";

export const useLanguage = (): LanguagePreference => {
  const preference = useContext(LanguageContext);
  if (!preference)
    throw new Error("useLanguage must be used within a LanguageProvider.");
  return preference;
};
