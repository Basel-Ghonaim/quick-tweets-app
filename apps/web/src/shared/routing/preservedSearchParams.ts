import { createContext } from "react";

/**
 * No provider today, so every navigation carries nothing. The empty default is
 * what lets one return without a call site changing.
 */
export const PreservedSearchParams = createContext<readonly string[]>([]);
