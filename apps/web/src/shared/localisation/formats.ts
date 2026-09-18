import { localeOf } from "./locale";

/** The forms a line takes by count. `other` is the one every language has. */
type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** A file size's unit words, each handed its amount already written. */
interface FileSizeUnits {
  bytes: (amount: string) => string;
  kilobytes: (amount: string) => string;
  megabytes: (amount: string) => string;
}

interface Formats {
  /** A whole number read as a count, ungrouped: a countdown reads `1200s`. */
  count: (value: number) => string;
  /** The form of a line its language's plural rules choose for `count`. */
  plural: (count: number, forms: PluralForms) => string;
  fileSize: (bytes: number, units: FileSizeUnits) => string;
}

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

/** How one language writes numbers, on the pinned locale. A catalogue is written with its own. */
export const formatsFor = (language: string): Formats => {
  const locale = localeOf(language);
  const counts = new Intl.NumberFormat(locale, { maximumFractionDigits: 0, useGrouping: false });
  const tenths = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
  });
  const rules = new Intl.PluralRules(locale);

  const count = (value: number) => counts.format(value);

  return {
    count,
    plural: (value, forms) => forms[rules.select(value)] ?? forms.other,
    fileSize: (bytes, units) => {
      if (bytes < KILOBYTE) return units.bytes(count(bytes));
      if (bytes < MEGABYTE) return units.kilobytes(tenths.format(bytes / KILOBYTE));
      return units.megabytes(tenths.format(bytes / MEGABYTE));
    },
  };
};
