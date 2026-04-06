import { useRef, useEffect } from "react";

/**
 * A React Hook that always returns the most recent value passed to it.
 * Perfect for bypassing closure-capture inside `useCallback` functions
 * without causing those functions to re-render.
 */
export const useLatest = <T>(value: T) => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};
