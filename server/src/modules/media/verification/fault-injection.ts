/**
 * Fault-injection seams for Controlled Reclamation Verification (WI-B, #375),
 * generalized from the minimal wrappers WI-A (#356) introduced.
 *
 * Two seams map to the two durable-step boundaries of a reclaim:
 * - `FaultInjectingStorage.delete` throws for chosen keys → the crash-AFTER
 *   tombstone-commit window (row `deleted`, bytes linger → recovery backlog).
 * - `faultTombstoneRepo` makes `tombstoneIfReclaimable` throw for chosen ids →
 *   the failure BEFORE the tombstone commits (transaction rolls back, row stays
 *   `ready`).
 *
 * Verification-only; never imported by production code.
 */

import type { Readable } from "node:stream";

import type { DbClient } from "../../../shared/database/index.js";
import type { IReclamationRepository } from "../media.reclamation.repository.js";
import type { StorageAdapter, StorageKey } from "../media.types.js";

/** Wraps a StorageAdapter so `delete()` throws for chosen keys. */
export class FaultInjectingStorage implements StorageAdapter {
  private readonly failDeletes: Set<string>;

  constructor(
    private readonly inner: StorageAdapter,
    failDeletes: Iterable<string> = [],
  ) {
    this.failDeletes = new Set(failDeletes);
  }

  failOn(key: string): void {
    this.failDeletes.add(key);
  }

  clearFaults(): void {
    this.failDeletes.clear();
  }

  save(key: StorageKey, data: Readable): Promise<void> {
    return this.inner.save(key, data);
  }

  createReadStream(key: StorageKey): Promise<Readable> {
    return this.inner.createReadStream(key);
  }

  exists(key: StorageKey): Promise<boolean> {
    return this.inner.exists(key);
  }

  async delete(key: StorageKey): Promise<void> {
    if (this.failDeletes.has(key)) throw new Error(`injected delete failure: ${key}`);
    return this.inner.delete(key);
  }

  enumerate(): Promise<StorageKey[]> {
    return this.inner.enumerate();
  }
}

/**
 * Wrap a reclamation repository so `tombstoneIfReclaimable` throws for chosen
 * object ids — the failure point BEFORE the tombstone commits. Every other
 * method delegates to the real repository unchanged.
 */
export const faultTombstoneRepo = (
  inner: IReclamationRepository,
  failIds: Iterable<number>,
): IReclamationRepository => {
  const ids = new Set(failIds);
  return {
    ...inner,
    tombstoneIfReclaimable: async (id: number, client: DbClient) => {
      if (ids.has(id)) throw new Error(`injected tombstone failure: ${id}`);
      return inner.tombstoneIfReclaimable(id, client);
    },
  };
};
