import type { ReactNode } from "react";
import type { NativeProps } from "../../shared";

export interface TabsProps extends Omit<NativeProps<"nav">, "children"> {
  /** What this set of destinations is. Required: a navigation with no name is
   *  one more unnamed landmark on a page that already has several. */
  label: string;

  /** `TabLink`s. */
  children: ReactNode;
}

export interface TabLinkProps extends Omit<NativeProps<"a">, "href"> {
  href: string;

  /**
   * Whether this is the address the reader is at. The caller decides: this
   * layer holds no router, and comparing a destination with a location is
   * exactly the knowledge it does not have.
   */
  current?: boolean;
}
