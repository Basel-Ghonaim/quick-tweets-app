import { useContext } from "react";
import { Link, type LinkProps } from "@shared/design-system";
import { carrySearchParams } from "./carrySearchParams";
import { PreservedSearchParams } from "./preservedSearchParams";
import { useSearchParams } from "react-router-dom";

/**
 * Every navigating link, so a destination carries what decides the page for the
 * same reason `useRouteNavigate` does.
 *
 * Which element a destination renders with is no longer here: the composition
 * root registers it once with the Design System, so this is left with the only
 * thing that was ever its own — what a destination takes with it.
 */
export const RouteLink = ({ href, ...rest }: LinkProps) => {
  const [searchParams] = useSearchParams();
  const preserved = useContext(PreservedSearchParams);

  return (
    <Link {...rest} href={carrySearchParams(href, preserved, searchParams)} />
  );
};
