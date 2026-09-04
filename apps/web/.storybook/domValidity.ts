import { afterEach, beforeEach, expect } from "vitest";

/**
 * React validates the content model as it renders and reports to a console
 * nothing read — invalid nesting is a DOM-validity fault, not an axe rule.
 */

/** React spells the two halves of a nesting violation these two ways. */
const NESTING = /cannot be a descendant of|cannot contain a nested/;

let violations: string[] = [];
let report: typeof console.error;

beforeEach(() => {
  violations = [];
  report = console.error;

  console.error = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    if (NESTING.test(message)) violations.push(message.split("\n")[0].trim());
    report(...(args as []));
  };
});

/* React reports each violation once per file, so this names the first story to
   render one rather than every story that would. */
afterEach(() => {
  console.error = report;
  expect(violations).toEqual([]);
});
