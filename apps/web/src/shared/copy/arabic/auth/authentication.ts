import type { Catalogue } from "../../shape";

export const SIGN_IN = {
  title: "مرحبًا بعودتك",
  subtitle: "تسجيل الدخول للمتابعة إلى حسابك",

  submit: "تسجيل الدخول",
  submitting: "جارٍ تسجيل الدخول…",

  forgotPassword: "نسيت كلمة المرور؟",

  identifierLabel: "اسم المستخدم أو البريد الإلكتروني",
  identifierPlaceholder: "johndoe أو you@company.com",
  passwordLabel: "كلمة المرور",
  passwordPlaceholder: "كلمة المرور الخاصة بك",

  altLabel: "ليس لديك حساب في Quick Tweets؟",
  createAccount: "إنشاء حساب جديد",
  browseAsGuest: "التصفح دون حساب",
} satisfies Catalogue["auth"]["signIn"];

export const SIGN_UP = {
  title: "إنشاء حسابك",
  subtitle: "يستغرق ذلك دقيقة تقريبًا.",

  submit: "إنشاء الحساب",
  submitting: "جارٍ إنشاء الحساب…",

  altLabel: "لديك حساب بالفعل؟",
  backToLogin: "العودة إلى تسجيل الدخول",
  browseAsGuest: "التصفح دون حساب",

  usernameLabel: "اسم المستخدم",
  usernamePlaceholder: "johndoe",
  emailLabel: "البريد الإلكتروني",
  emailPlaceholder: "you@company.com",
  passwordLabel: "كلمة المرور",
  passwordPlaceholder: "8 أحرف على الأقل",
  confirmPasswordLabel: "تأكيد كلمة المرور",
  confirmPasswordPlaceholder: "إعادة كتابة كلمة المرور",
} satisfies Catalogue["auth"]["signUp"];

export const REFUSALS = {
  unauthorized: "اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  validation: "يُرجى مراجعة الحقول المميّزة لتصحيح الأخطاء.",
  conflict: "هذا الحساب مسجّل بالفعل. يمكنك تسجيل الدخول بدلًا من ذلك.",
  tooManyRequests: "محاولات فاشلة كثيرة. يُرجى الانتظار بضع دقائق.",
} satisfies Catalogue["auth"]["errors"];
