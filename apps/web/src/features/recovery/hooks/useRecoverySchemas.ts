import { useMemo } from "react";
import { useCopy } from "@shared/copy";
import { recoveryFormSchemas } from "../forms";

/** Recovery's schemas in the active language, held until the language changes. */
export const useRecoverySchemas = () => {
  const copy = useCopy();
  return useMemo(() => recoveryFormSchemas(copy), [copy]);
};
