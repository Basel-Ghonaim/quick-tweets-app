/**
 * Temporary design-comparison infrastructure for the auth redesign phase.
 *
 * Removal is deliberately mechanical: delete this directory, remove the
 * provider from the composition root, and remove the switch at each Design
 * Unit's boundary. Nothing else in the module knows this exists.
 */

export { AuthDesignProvider } from "./AuthDesignProvider";
export { AuthDesignToggle } from "./AuthDesignToggle";
export { useAuthDesignMode } from "./useAuthDesignMode";
export {
  AUTH_DESIGN_MODES,
  AUTH_DESIGN_PARAM,
  DEFAULT_AUTH_DESIGN_MODE,
  oppositeAuthDesignMode,
  parseAuthDesignMode,
  type AuthDesignMode,
} from "./authDesignMode";
export type { AuthDesignContextValue } from "./authDesignContext";
