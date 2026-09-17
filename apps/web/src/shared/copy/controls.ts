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
    notAccepted: (fileName: string) => `"${fileName}" is not an accepted file type`,
    tooLarge: (fileName: string, limit: string) => `"${fileName}" exceeds the ${limit} limit`,
  },

  files: {
    choose: "Choose file",
    nothingChosen: "No file chosen",
    chosenCount: (count: number) => `${count} files selected`,
    tooLarge: (fileName: string, limit: string) => `"${fileName}" exceeds the ${limit} limit`,
  },
} as const;
