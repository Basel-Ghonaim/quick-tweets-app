import type { Catalogue } from "../catalogue";
import { ARABIC_FORMATS, characters, seconds } from "./formats";

export const AUTH = {
  brand: {
    markLabel: "Quick Tweets",
    headlineLine1: "قل أكثر",
    headlineLine2: "بكلمات أقل.",
    tagline: "منشورات قصيرة. محادثات حقيقية.",
    themeToggle: "الوضع الداكن",
  },

  journey: {
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
  },

  signIn: {
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
  },

  signUp: {
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
  },

  errors: {
    unauthorized: "اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    validation: "يُرجى مراجعة الحقول المميّزة لتصحيح الأخطاء.",
    conflict: "هذا الحساب مسجّل بالفعل. يمكنك تسجيل الدخول بدلًا من ذلك.",
    tooManyRequests: "محاولات فاشلة كثيرة. يُرجى الانتظار بضع دقائق.",
  },

  onboarding: {
    unavailable: "تعذّر علينا معرفة المرحلة التي وصلت إليها. يُرجى المحاولة مرة أخرى.",
    retry: "إعادة المحاولة",
  },

  profile: {
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
  },

  verify: {
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
  },

  recovery: {
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
  },

  // Written for this language rather than translated; a handle is an identifier and stays Latin.
  samplePosts: [
    { name: "ليلى حداد", handle: "@layla", age: "14 د", body: "سطر واحد. هذا هو المنشور كله." },
    { name: "يوسف العلي", handle: "@yousef", age: "31 د", body: "تُحمَّل الصفحة قبل أن ترمش عينك." },
  ],
  backdropPosts: [
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
  ],
} satisfies Catalogue["auth"];
