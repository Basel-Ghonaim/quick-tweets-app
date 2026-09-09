import { createContext } from "react";

/**
 * Empty by default, which is what keeps the comparison phase's removal
 * mechanical: only that phase answers this, and when it goes the default
 * applies with no call site changed.
 */
export const PreservedSearchParams = createContext<readonly string[]>([]);
