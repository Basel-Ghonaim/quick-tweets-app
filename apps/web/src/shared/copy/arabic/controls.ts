import type { Catalogue } from "../catalogue";
import { ARABIC_FORMATS, files } from "./formats";

// Unit symbols stay Latin, as Arabic interfaces commonly write them.
const size = (bytes: number) =>
  ARABIC_FORMATS.fileSize(bytes, {
    bytes: (amount) => `${amount} B`,
    kilobytes: (amount) => `${amount} KB`,
    megabytes: (amount) => `${amount} MB`,
  });

export const CONTROLS = {
  revealPassword: "إظهار كلمة المرور",

  file: {
    upload: "رفع وسائط",
    uploadCompact: "رفع",
    remove: "حذف الملف",
    removeTitle: "حذف",
    replace: "استبدال الملف",
    replaceTitle: "استبدال",
    notAccepted: (fileName: string) =>
      `نوع الملف «${ARABIC_FORMATS.authored(fileName)}» غير مقبول`,
    tooLarge: (fileName: string, limit: string) =>
      `حجم «${ARABIC_FORMATS.authored(fileName)}» يتجاوز الحد المسموح به (${limit})`,
    size,
  },

  files: {
    choose: "اختيار ملف",
    nothingChosen: "لم يتم اختيار ملف",
    chosenCount: (count: number) => `تم اختيار ${files(count)}`,
    tooLarge: (fileName: string, limit: string) =>
      `حجم «${ARABIC_FORMATS.authored(fileName)}» يتجاوز الحد المسموح به (${limit})`,
    size,
  },
} satisfies Catalogue["controls"];
