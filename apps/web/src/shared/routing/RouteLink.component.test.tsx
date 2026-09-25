import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";
import { PreservedSearchParams } from "./preservedSearchParams";
import { RouteLink } from "./RouteLink";

/**
 * What this mechanism is now for, and all it is for. The element a destination
 * renders with moved to the Design System's seam; carrying what decides the
 * page did not, and nothing else was watching that it still happens.
 */
const at = (location: string, preserved: readonly string[], to: string) =>
  render(
    <MemoryRouter initialEntries={[location]}>
      <PreservedSearchParams.Provider value={preserved}>
        <RouteLink href={to}>onward</RouteLink>
      </PreservedSearchParams.Provider>
    </MemoryRouter>,
  );

const destination = () => screen.getByRole("link").getAttribute("href");

describe("a route link", () => {
  test("carries a preserved parameter the location already had", () => {
    at("/feed?lang=ar", ["lang"], "/profile");

    expect(destination()).toBe("/profile?lang=ar");
  });

  test("leaves a parameter nobody asked to preserve", () => {
    at("/feed?ref=twitter", ["lang"], "/profile");

    expect(destination()).toBe("/profile");
  });

  test("does not overwrite one the destination states itself", () => {
    at("/feed?lang=ar", ["lang"], "/profile?lang=en");

    expect(destination()).toBe("/profile?lang=en");
  });

  test("renders an anchor without the application's element", () => {
    // The seam is unregistered in this lane, which is the fallback's whole point.
    at("/feed", [], "/profile");

    expect(screen.getByRole("link").tagName).toBe("A");
  });
});
