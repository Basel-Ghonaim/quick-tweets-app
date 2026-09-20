import type { Catalogue } from "../../shape";

export const ONBOARDING = {
  unavailable: "تعذّر علينا معرفة المرحلة التي وصلت إليها. يُرجى المحاولة مرة أخرى.",
  retry: "إعادة المحاولة",
} satisfies Catalogue["auth"]["onboarding"];
