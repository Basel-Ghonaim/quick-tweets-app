-- CreateTable
-- The reclamation collector's append-only trail (M11). One row per candidate or
-- divergence per pass, written in BOTH modes (report → would_reclaim /
-- would_quarantine; destructive → reclaimed / quarantined). The durable evidence
-- a human reviews over the report-only soak before the destructive gate opens.
CREATE TABLE "media_reclamation_audit" (
    "id" SERIAL NOT NULL,
    "media_id" INTEGER,
    "storage_key" TEXT,
    "reason" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_reclamation_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_reclamation_audit_run_at_idx" ON "media_reclamation_audit"("run_at");

-- CreateTable
-- A registry<->storage divergence held for human review (ADR 0005 Decision 8,
-- invariant 3) — never deleted on divergence alone. A separate record keeps a
-- MediaObject immutable-once-ready, and holds the orphan-bytes case (no row to
-- stamp). Selection excludes any object with an OPEN (resolved_at IS NULL) row.
CREATE TABLE "media_quarantine" (
    "id" SERIAL NOT NULL,
    "media_id" INTEGER,
    "storage_key" TEXT,
    "kind" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "detected_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_quarantine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_quarantine_resolved_at_idx" ON "media_quarantine"("resolved_at");

-- AddForeignKey
-- Within Media's own boundary, so a real foreign key is appropriate. Nullable
-- for the orphan-bytes case (bytes with no registry row). RESTRICT: Media never
-- hard-deletes a MediaObject (it tombstones), so this is an inert backstop.
ALTER TABLE "media_quarantine" ADD CONSTRAINT "media_quarantine_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
