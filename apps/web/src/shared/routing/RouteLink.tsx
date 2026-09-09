import { forwardRef, useContext, type ComponentProps } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { Link, type LinkProps } from "@shared/design-system";
import { carrySearchParams } from "./carrySearchParams";
import { PreservedSearchParams } from "./preservedSearchParams";

/** The Design System's link takes the navigating element rather than importing
 *  a router; this is the element this mechanism supplies. */
const RouterAnchor = forwardRef<
  HTMLAnchorElement,
  ComponentProps<"a"> & { href: string }
>(({ href, ...rest }, ref) => <RouterLink ref={ref} to={href} {...rest} />);

RouterAnchor.displayName = "RouterAnchor";

/** Every navigating link, so a destination carries what decides the page for
 *  the same reason `useRouteNavigate` does. */
export const RouteLink = ({ href, ...rest }: LinkProps) => {
  const [searchParams] = useSearchParams();
  const preserved = useContext(PreservedSearchParams);

  return (
    <Link
      {...rest}
      as={RouterAnchor}
      href={carrySearchParams(href, preserved, searchParams)}
    />
  );
};
