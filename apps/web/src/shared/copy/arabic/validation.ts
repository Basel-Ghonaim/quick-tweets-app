import type { Catalogue } from "../shape";
import { ARABIC_FORMATS, characters } from "./formats";

export const VALIDATION = {
  required: {
    identifier: "اسم المستخدم أو البريد الإلكتروني مطلوب.",
    password: "كلمة المرور مطلوبة.",
    username: "اسم المستخدم مطلوب.",
    email: "البريد الإلكتروني مطلوب.",
    confirmPassword: "تأكيد كلمة المرور مطلوب.",
    resetCode: "رمز إعادة التعيين مطلوب.",
  },
  emailFormat: "يُرجى إدخال بريد إلكتروني صالح.",
  minLength: (min: number) => ({
    min,
    message: `يجب ألا يقل عن ${characters(min)}.`,
  }),
  maxLength: (max: number) => ({
    max,
    message: `يجب ألا يزيد على ${characters(max)}.`,
  }),
  match: {
    password: "يجب أن يطابق هذا الحقل كلمة المرور.",
  },
  usernameCharset: "يمكن أن يحتوي اسم المستخدم على أحرف إنجليزية صغيرة وأرقام وشرطات سفلية فقط.",
  passwordComplexity: {
    lowercase: "يجب أن تحتوي كلمة المرور على حرف إنجليزي صغير.",
    uppercase: "يجب أن تحتوي كلمة المرور على حرف إنجليزي كبير.",
    digit: "يجب أن تحتوي كلمة المرور على رقم.",
    // The symbols are neutral characters, so a right-to-left line would reverse their order.
    special: `يجب أن تحتوي كلمة المرور على رمز خاص (${ARABIC_FORMATS.identifier("@$!%*?&#")}).`,
  },
  passwordCharacters: "يمكن أن تحتوي كلمة المرور على أحرف إنجليزية وأرقام ومسافات ورموز فقط.",
} satisfies Catalogue["validation"];
