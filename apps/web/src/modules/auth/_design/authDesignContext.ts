import { createContext } from "react";
import type { AuthDesignMode } from "./authDesignMode";

export interface AuthDesignContextValue {
  readonly mode: AuthDesignMode;
  readonly setMode: (mode: AuthDesignMode) => void;
  readonly toggleMode: () => void;
}

/**
 * Its own module so the provider and the hook can both reach it without either
 * importing the other, which would be a cycle.
 *
 * `null` rather than a default value: a component reading the mode outside the
 * provider is a wiring mistake, and the hook turns that into an explicit error
 * rather than silently reporting the bootstrap design.
 */
export const AuthDesignContext = createContext<AuthDesignContextValue | null>(null);
