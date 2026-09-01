import { createContext } from "react";

/**
 * The search parameters an auth navigation carries forward.
 *
 * **Empty by default, and that default is the point.** Nothing about moving
 * between auth screens requires a parameter; the one that exists today belongs
 * to the temporary design-comparison phase, which supplies it here rather than
 * being imported. When that phase is deleted its provider goes with it, this
 * default applies, and every call site keeps working unchanged.
 */
export const PreservedSearchParams = createContext<readonly string[]>([]);
