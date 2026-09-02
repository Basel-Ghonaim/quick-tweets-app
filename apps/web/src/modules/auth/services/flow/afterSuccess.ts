/** Runs the continuation only when the action resolved: a failed submit must
 *  leave the reader on the screen that can report it. */
export const afterSuccess =
  <TValues>(action: (values: TValues) => Promise<void>, onDone?: () => void) =>
  async (values: TValues): Promise<void> => {
    await action(values);
    onDone?.();
  };
