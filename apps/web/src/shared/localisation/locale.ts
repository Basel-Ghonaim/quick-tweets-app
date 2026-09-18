// Pinned, so a region's defaults cannot change the digits or the calendar a reader meets: `ar-EG`
// would otherwise write Arabic-Indic digits, and `fa-IR` would date by the Persian calendar.
export const localeOf = (language: string): string => `${language}-u-nu-latn-ca-gregory`;
