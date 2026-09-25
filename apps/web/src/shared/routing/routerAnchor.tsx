import { forwardRef, type ComponentProps } from "react";
import { Link as RouterLink } from "react-router-dom";

/**
 * The element the Design System's destinations render with. A router's link
 * throws outside the router that mounts it, so the layer cannot import one —
 * the composition root hands this in instead.
 */
export const RouterAnchor = forwardRef<
  HTMLAnchorElement,
  ComponentProps<"a"> & { href: string }
>(({ href, ...rest }, ref) => <RouterLink ref={ref} to={href} {...rest} />);

RouterAnchor.displayName = "RouterAnchor";
