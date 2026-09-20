import type { Catalogue } from "../shape";

export const PLACEHOLDER = {
  notBuiltTitle: {
    feed: "الخلاصة غير جاهزة بعد",
    tweet: "تفاصيل التغريدة غير جاهزة بعد",
    profile: "الملف الشخصي غير جاهز بعد",
    settings: "الإعدادات غير جاهزة بعد",
    security: "الأمان غير جاهز بعد",
  },
  notBuiltBody: "هذه الصفحة جزء من المنتج وستتوفر قريبًا، وتحلّ هذه الصفحة محلها إلى ذلك الحين.",

  unknownTitle: "لا يوجد شيء على هذا العنوان",
  unknownBody: "ربما كُتب الرابط بشكل خاطئ، أو أنه يشير إلى شيء لم يكن موجودًا قط.",
} satisfies Catalogue["placeholder"];
