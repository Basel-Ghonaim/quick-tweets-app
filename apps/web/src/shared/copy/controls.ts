import { ENGLISH_FORMATS } from "./englishFormats";

const size = (bytes: number) =>
  ENGLISH_FORMATS.fileSize(bytes, {
    bytes: (amount) => `${amount} B`,
    kilobytes: (amount) => `${amount} KB`,
    megabytes: (amount) => `${amount} MB`,
  });

/** The words of the controls a screen renders: a password reveal and the two file controls. */
export const CONTROL_COPY = {
  revealPassword: "Show password",

  file: {
    upload: "Upload media",
    uploadCompact: "Upload",
    remove: "Delete file",
    removeTitle: "Delete",
    replace: "Replace file",
    replaceTitle: "Replace",
    notAccepted: (fileName: string) =>
      `"${ENGLISH_FORMATS.authored(fileName)}" is not an accepted file type`,
    tooLarge: (fileName: string, limit: string) =>
      `"${ENGLISH_FORMATS.authored(fileName)}" exceeds the ${limit} limit`,
    size,
  },

  files: {
    choose: "Choose file",
    nothingChosen: "No file chosen",
    chosenCount: (count: number) =>
      ENGLISH_FORMATS.plural(count, {
        one: `${ENGLISH_FORMATS.count(count)} file selected`,
        other: `${ENGLISH_FORMATS.count(count)} files selected`,
      }),
    tooLarge: (fileName: string, limit: string) =>
      `"${ENGLISH_FORMATS.authored(fileName)}" exceeds the ${limit} limit`,
    size,
  },
} as const;
