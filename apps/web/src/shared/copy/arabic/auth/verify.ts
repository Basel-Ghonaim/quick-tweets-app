import type { Catalogue } from "../../shape";
import { seconds } from "../formats";

export const VERIFY = {
  askTitle: "التحقق من بريدك الإلكتروني",
  askSubtitle: "اختياري — يمكنك القيام بذلك لاحقًا من حسابك.",
  codeTitle: "إدخال الرمز",
  codeSubtitle: "أرسلنا رمزًا إلى بريدك الإلكتروني.",

  reason:
    "تظل الحسابات غير المُتحقَّق منها مصحوبة بتذكير داخل التطبيق، وتبقى بعض الإجراءات غير متاحة إلى أن يتم تأكيد العنوان.",

  send: "إرسال الرمز",
  sending: "جارٍ الإرسال…",
  submit: "تأكيد البريد الإلكتروني",
  submitting: "جارٍ التحقق…",
  later: "لاحقًا",
  backToProfile: "العودة إلى الملف الشخصي",

  codeLabel: "رمز التحقق",
  codeHint: "أحرف وأرقام. لا تهم حالة الأحرف ولا المسافات.",

  resend: "إعادة إرسال الرمز",
  resendIn: (wait: number) => `إعادة الإرسال بعد ${seconds(wait)}`,
  resendReady: "يمكنك طلب رمز جديد الآن.",

  cooldownRefused: "أُرسل رمز قبل لحظات. يُرجى الانتظار قليلًا قبل طلب رمز آخر.",
  rateLimited: "طلبات كثيرة من هذا الجهاز. يُرجى المحاولة بعد 15 دقيقة تقريبًا.",
  codeRejected: "هذا الرمز غير صالح. يُرجى التحقق منه والمحاولة مرة أخرى.",
} satisfies Catalogue["auth"]["verify"];
