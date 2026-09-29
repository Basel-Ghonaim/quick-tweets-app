import { describe, expect, test } from "vitest";
import type { DialogProps } from "./Dialog.types";

/**
 * The half of the contract a rendered story cannot reach: what each form
 * refuses, proved by writing what must not compile.
 */

const base = { open: true, onClose: () => {}, title: "Reply" };

describe("the dismissal", () => {
  test("arrives with its word", () => {
    const dialog: DialogProps = {
      ...base,
      onDismiss: () => {},
      dismissLabel: "Close",
    };

    expect(dialog.dismissLabel).toBe("Close");
  });

  test("cannot exist without its word", () => {
    // @ts-expect-error a control nobody can name. If this directive ever
    // reports as unused, the pair has come apart.
    const dialog: DialogProps = { ...base, onDismiss: () => {} };

    expect(dialog.title).toBe("Reply");
  });

  test("is refused by an alert, which is left by answering it", () => {
    // @ts-expect-error no alert is drawn with a way out but its answers.
    const dialog: DialogProps = {
      ...base,
      variant: "alert",
      onDismiss: () => {},
      dismissLabel: "Close",
    };

    expect(dialog.variant).toBe("alert");
  });
});

describe("the full-screen form's actions", () => {
  test("sit in its bar, one of them", () => {
    const dialog: DialogProps = { ...base, variant: "fullscreen", action: "Post" };

    expect(dialog.variant).toBe("fullscreen");
  });

  test("have no row beneath it", () => {
    // @ts-expect-error the bar is where its action goes; nothing is drawn below.
    const dialog: DialogProps = { ...base, variant: "fullscreen", actions: "Post" };

    expect(dialog.variant).toBe("fullscreen");
  });
});

describe("the task form", () => {
  test("takes a dismissal", () => {
    const dialog: DialogProps = {
      ...base,
      variant: "task",
      onDismiss: () => {},
      dismissLabel: "Close",
    };

    expect(dialog.variant).toBe("task");
  });

  test("draws no actions of its own", () => {
    // @ts-expect-error its work carries the actions; the frame draws none.
    const dialog: DialogProps = { ...base, variant: "task", actions: "Post" };

    expect(dialog.variant).toBe("task");
  });
});
