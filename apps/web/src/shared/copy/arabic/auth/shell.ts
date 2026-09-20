import type { Catalogue } from "../../shape";

export const BRAND = {
  markLabel: "Quick Tweets",
  headlineLine1: "قل أكثر",
  headlineLine2: "بكلمات أقل.",
  tagline: "منشورات قصيرة. محادثات حقيقية.",
  themeToggle: "الوضع الداكن",
} satisfies Catalogue["auth"]["brand"];

export const JOURNEY = {
  steps: {
    account: "الحساب",
    profile: "الملف الشخصي",
    verify: "التحقق",
  },
  states: {
    done: "مكتمل",
    current: "قيد التنفيذ",
    optional: "اختياري",
    skipped: "تم التخطي",
  },
  label: "مراحل التسجيل",
} satisfies Catalogue["auth"]["journey"];

// Written for this language rather than translated; a handle is an identifier and stays Latin.
export const SAMPLE_POSTS = [
  { name: "ليلى حداد", handle: "@layla", age: "14 د", body: "سطر واحد. هذا هو المنشور كله." },
  { name: "يوسف العلي", handle: "@yousef", age: "31 د", body: "تُحمَّل الصفحة قبل أن ترمش عينك." },
] satisfies Catalogue["auth"]["samplePosts"];

export const BACKDROP_POSTS = [
  { name: "مريم السيد", handle: "@mariam", age: "2 د", body: "أطلقتُ التصميم الجديد قبل الغداء." },
  { name: "ليلى حداد", handle: "@layla", age: "14 د", body: "سطر واحد. هذا هو المنشور كله." },
  { name: "يوسف العلي", handle: "@yousef", age: "31 د", body: "تُحمَّل الصفحة قبل أن ترمش عينك." },
  { name: "إيناس رحال", handle: "@ines", age: "44 د", body: "كتبته مرتين ونشرت الأقصر." },
  { name: "طارق منصور", handle: "@tarek", age: "1 س", body: "لا سلاسل. لا مقالات. فقط هذا." },
  { name: "سلمى ناصر", handle: "@salma", age: "2 س", body: "أطلقته. قلته. انتهى." },
  { name: "كريم الحسن", handle: "@karim", age: "3 س", body: "الإيجاز ميزة، لا قيد." },
  { name: "لينا عبد الله", handle: "@lina", age: "4 س", body: "التحديث كله في سطر واحد." },
  { name: "عمر حداد", handle: "@omar", age: "5 س", body: "قلتُ أقل، وعنيتُ أكثر." },
  { name: "هدى الشامي", handle: "@huda", age: "6 س", body: "سطر واحد هو الشكل كله." },
] satisfies Catalogue["auth"]["backdropPosts"];
