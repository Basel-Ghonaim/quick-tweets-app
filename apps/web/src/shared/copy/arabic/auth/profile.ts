import type { Catalogue } from "../../shape";
import { ARABIC_FORMATS, characters } from "../formats";

export const PROFILE = {
  title: "إضافة ملف شخصي",
  subtitle: "اختياري — صورة واسم وسطر عنك.",

  submit: "حفظ",
  submitting: "جارٍ الحفظ…",
  skip: "التخطي حاليًا",

  avatarLabel: "الصورة الشخصية",
  avatarHint: "JPEG أو PNG، بحجم 1 MB كحد أقصى.",

  nameLabel: "الاسم المعروض",
  namePlaceholder: "اسمك",
  nameTooLong: (max: number) => `يجب ألا يزيد الاسم على ${characters(max)}.`,
  bioLabel: "نبذة",
  bioPlaceholder: "سطر واحد يكفي.",
  bioTooLong: (max: number) => `يجب ألا تزيد النبذة على ${characters(max)}.`,

  uploading: "جارٍ رفع صورتك…",
  uploaded: "الصورة جاهزة.",
  uploadFailed: "تعذّر رفع هذه الصورة.",
  uploadRetry: "إعادة المحاولة",
  invalid: "يُرجى مراجعة الحقول المميّزة.",
  sessionExpired: "انتهت جلستك. يُرجى تسجيل الدخول مرة أخرى.",

  bioCount: (used: number, limit: number) =>
    `${ARABIC_FORMATS.count(used)} / ${ARABIC_FORMATS.count(limit)}`,
} satisfies Catalogue["auth"]["profile"];
