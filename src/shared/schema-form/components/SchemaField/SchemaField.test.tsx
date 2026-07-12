/**
 * Characterization test for the SchemaField seam (Issues #248, #249).
 *
 * SchemaField is the type→control seam: given a field `type` it selects the
 * matching design-system control and wires the field's value, error, and change
 * handler, wrapping the result in `<div data-span data-type>`. Issue #248
 * relocated this seam out of the design system and into the form engine (a
 * verbatim move — the engine consumes the controls, not the reverse) to resolve
 * Finding 0001. This test locks the seam's observable behavior — the wrapper
 * attributes, the control chosen per field type, and the props wired to it — so
 * the move is shown behavior-preserving.
 *
 * SchemaField is a pure, hookless function component, so it is characterized in
 * the Node unit lane by invoking it directly and inspecting the returned React
 * element tree — no DOM, no renderer, no new test dependencies. The controls it
 * selects (Input / Checkbox / FileInput) are imported from the design system, so
 * element identity (`child.type === Input`) confirms the seam's one-directional
 * dependency on the design system.
 */
import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { SchemaField } from "@shared/schema-form";
import { Input, Checkbox, FileInput } from "@shared/design-system";

type Props = Parameters<typeof SchemaField>[0];
type El = ReactElement<Record<string, unknown>>;

// Invoke the pure component and expose the wrapper element + its single child.
const invoke = (props: Props) => {
  const wrapper = (SchemaField as (p: Props) => El)(props);
  const child = wrapper.props.children as El | null;
  return { wrapper, child };
};

const base = {
  name: "email",
  label: "Email",
  placeholder: "you@example.com",
  value: "" as unknown,
  error: null as string | null,
  onChange: () => {},
};

describe("SchemaField seam (#248, #249)", () => {
  it("wraps every field in <div data-span data-type>, defaulting span to full", () => {
    const { wrapper } = invoke({ ...base, type: "text" });
    expect(wrapper.type).toBe("div");
    expect(wrapper.props["data-type"]).toBe("text");
    expect(wrapper.props["data-span"]).toBe("full");

    const half = invoke({ ...base, type: "text", span: "half" });
    expect(half.wrapper.props["data-span"]).toBe("half");
  });

  it.each(["text", "email", "password", "number"] as const)(
    "maps %s to an Input carrying type, value, placeholder, autoFocus, fullWidth",
    (type) => {
      const { child } = invoke({ ...base, type, value: "x", autoFocus: true });
      expect(child?.type).toBe(Input);
      expect(child?.props.type).toBe(type);
      expect(child?.props.value).toBe("x");
      expect(child?.props.placeholder).toBe(base.placeholder);
      expect(child?.props.autoFocus).toBe(true);
      expect(child?.props.fullWidth).toBe(true);
    },
  );

  it("maps checkbox to a Checkbox carrying the boolean value as checked", () => {
    const { child } = invoke({ ...base, type: "checkbox", value: true });
    expect(child?.type).toBe(Checkbox);
    expect(child?.props.checked).toBe(true);
  });

  it("maps file to a FileInput (avatar variant) wired via onNativeChange", () => {
    const { child } = invoke({ ...base, type: "file" });
    expect(child?.type).toBe(FileInput);
    expect(child?.props.variant).toBe("avatar");
    expect(child?.props.onNativeChange).toBe(base.onChange);
    expect(child?.props.fullWidth).toBe(true);
  });

  it("maps file-multiple to a FileInput (standard variant, multiple) via onNativeChange", () => {
    const { child } = invoke({ ...base, type: "file-multiple" });
    expect(child?.type).toBe(FileInput);
    expect(child?.props.variant).toBe("standard");
    expect(child?.props.multiple).toBe(true);
    expect(child?.props.onNativeChange).toBe(base.onChange);
    expect(child?.props.fullWidth).toBe(true);
  });

  it.each(["radio", "select", "textarea"] as const)(
    "fails fast for the declared-but-unimplemented field type %s",
    (type) => {
      expect(() => invoke({ ...base, type })).toThrow(/not implemented yet/);
    },
  );

  it("fails fast for an unknown field type via the exhaustiveness guard", () => {
    expect(() => invoke({ ...base, type: "totally-unknown" as never })).toThrow(
      /unhandled field type/,
    );
  });

  it("passes error through: null → valid + no message; set → invalid + message", () => {
    const clean = invoke({ ...base, type: "text" });
    expect(clean.child?.props.isInvalid).toBe(false);
    expect(clean.child?.props.errorMessage).toBeUndefined();

    const invalid = invoke({ ...base, type: "text", error: "Required" });
    expect(invalid.child?.props.isInvalid).toBe(true);
    expect(invalid.child?.props.errorMessage).toBe("Required");
  });
});
