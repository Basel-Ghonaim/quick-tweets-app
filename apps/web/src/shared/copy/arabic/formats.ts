import { formatsFor } from "@shared/localisation";

/** How the Arabic catalogue writes the numbers and values inside its lines. */
export const ARABIC_FORMATS = formatsFor("ar");

const { count, plural } = ARABIC_FORMATS;

// A counted noun takes one of six forms by its number. Each sentence places it after a preposition
// or in a construct, so the same form reads correctly in every line that uses it.
export const characters = (n: number) =>
  plural(n, {
    zero: `${count(n)} حرف`,
    one: "حرف واحد",
    two: "حرفين",
    few: `${count(n)} أحرف`,
    many: `${count(n)} حرفًا`,
    other: `${count(n)} حرف`,
  });

export const seconds = (n: number) =>
  plural(n, {
    zero: `${count(n)} ثانية`,
    one: "ثانية واحدة",
    two: "ثانيتين",
    few: `${count(n)} ثوانٍ`,
    many: `${count(n)} ثانية`,
    other: `${count(n)} ثانية`,
  });

export const files = (n: number) =>
  plural(n, {
    zero: `${count(n)} ملف`,
    one: "ملف واحد",
    two: "ملفين",
    few: `${count(n)} ملفات`,
    many: `${count(n)} ملفًا`,
    other: `${count(n)} ملف`,
  });
