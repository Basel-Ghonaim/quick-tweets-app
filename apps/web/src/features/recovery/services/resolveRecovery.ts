import type { RecoveryRead } from "../model";
import type { RecoveryGateway } from "../gateway";

/**
 * The read never `404`s and produces no `401` to distinguish, so every way it
 * can fail is transport and collapses into one state.
 */
export const resolveRecovery = async (repo: RecoveryGateway): Promise<RecoveryRead> => {
  try {
    return { status: "resolved", position: await repo.position() };
  } catch {
    return { status: "failed" };
  }
};
