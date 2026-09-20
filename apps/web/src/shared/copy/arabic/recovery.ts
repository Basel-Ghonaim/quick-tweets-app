import type { Catalogue } from "../shape";
import { ARABIC_FORMATS, seconds } from "./formats";

export const RECOVERY = {
  requestTitle: "إعادة تعيين كلمة المرور",
  requestSubtitle: "سنرسل إليك رمزًا عبر البريد الإلكتروني لتعيين كلمة مرور جديدة.",
  codeTitle: "إدخال الرمز",
  codeSubtitle: (masked: string) =>
    `أرسلنا رمزًا مكوّنًا من 12 حرفًا إلى ${ARABIC_FORMATS.identifier(masked)}.`,
  passwordTitle: "تعيين كلمة مرور جديدة",
  passwordSubtitle: "يجب أن تكون كلمة مرور لم تُستخدم في هذا الحساب من قبل.",

  sent: "إذا كان هناك حساب مرتبط بهذا العنوان، فالرمز في طريقه إليك، وتنتهي صلاحيته قريبًا.",

  emailLabel: "البريد الإلكتروني",
  emailPlaceholder: "you@company.com",
  codeLabel: "رمز إعادة التعيين",
  codePlaceholder: "XXXX-XXXX-XXXX",
  codeHint: "أحرف وأرقام. لا تهم حالة الأحرف ولا المسافات ولا الشرطات.",
  newPasswordLabel: "كلمة المرور الجديدة",
  newPasswordPlaceholder: "8 أحرف على الأقل",
  confirmPasswordLabel: "تأكيد كلمة المرور",
  confirmPasswordPlaceholder: "إعادة كتابة كلمة المرور الجديدة",

  send: "إرسال الرمز",
  sending: "جارٍ الإرسال…",
  submitCode: "تأكيد الرمز",
  submittingCode: "جارٍ التحقق…",
  submitPassword: "إعادة تعيين كلمة المرور",
  submittingPassword: "جارٍ إعادة التعيين…",
  backToLogin: "العودة إلى تسجيل الدخول",

  resend: "إعادة إرسال الرمز",
  resendIn: (wait: number) => `إعادة الإرسال بعد ${seconds(wait)}`,
  resendReady: "يمكنك طلب رمز جديد الآن.",
  resendSpent: "بلغت طلبات الرمز الجديد الحد الذي تسمح به هذه المحاولة.",
  startOver: "عنوان خاطئ؟ البدء من جديد",

  codeRejected: "هذا الرمز غير صالح. يُرجى التحقق منه أو طلب رمز جديد.",
  lapsed: "لم تعد عملية إعادة التعيين هذه صالحة. يُرجى طلب رمز جديد للبدء من جديد.",
  rateLimited: "طلبات كثيرة من هذا الجهاز. يُرجى المحاولة بعد 15 دقيقة تقريبًا.",
  unavailable: "تعذّر علينا معرفة المرحلة التي وصلت إليها. يُرجى المحاولة مرة أخرى.",
  retry: "إعادة المحاولة",

  done: "تم تغيير كلمة المرور. يُرجى تسجيل الدخول بها.",
} satisfies Catalogue["recovery"];
