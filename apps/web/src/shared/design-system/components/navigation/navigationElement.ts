import type { ComponentProps, ComponentType } from "react";

/**
 * What a destination is rendered with, restricted by the props that element
 * must accept rather than by a list of tags — so a router's link qualifies
 * without this layer importing one, and an element that demands something a
 * destination never supplies does not.
 */
export type NavigatingElement =
  | "a"
  | ComponentType<ComponentProps<"a"> & { href: string }>;

let registered: NavigatingElement = "a";

/**
 * Hands the layer the element its destinations render with. Called once, by the
 * composition root: a router's link throws outside the router that mounts it,
 * so the layer could not import one and render on its own.
 *
 * This is the inversion the [frontend architecture](../../../../../../../docs/frontend/architecture.md)
 * prescribes once a second component needs to navigate. It does not breach the
 * layer's closure: the element arrives, and is never reached for.
 */
export const setupNavigation = (element: NavigatingElement): void => {
  registered = element;
};

/**
 * A plain anchor until something is handed in, rather than a failure.
 *
 * A catalogue has no sensible default and throws without one; an anchor does
 * have one, and it is what lets every destination in this layer render outside
 * the application — in a story, in a test, in isolation. A layer that could not
 * would have no proof of itself.
 */
export const navigatingElement = (): NavigatingElement => registered;
