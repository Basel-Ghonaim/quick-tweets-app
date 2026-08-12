-- WI-7 · Enforce single-provenance at the database (ADR 0008 Decision 4).

-- Defensive precondition guard. WI-5 drove COUNT(uploader_id IS NULL) = 0 on the
-- dev database, but that was a point-in-time, dev-only verification. Any database
-- this migration is applied to must have its legacy null-owner rows cleaned first
-- (WI-5). Fail loudly and legibly here rather than on the opaque SET NOT NULL scan.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "media_objects" WHERE "uploader_id" IS NULL) THEN
    RAISE EXCEPTION 'WI-7 precondition failed: % media_objects have uploader_id IS NULL. Run the WI-5 legacy cleanup on THIS database before applying this migration.',
      (SELECT count(*) FROM "media_objects" WHERE "uploader_id" IS NULL);
  END IF;
END $$;

-- DropIndex
DROP INDEX "media_objects_grant_id_key";

-- AlterTable: drop the retired grant-provenance columns and make ownership
-- mandatory. Dropping grant_id/grant_expires_at intentionally discards the
-- vestigial grant provenance still present on adopted (owned) objects — the
-- pre-auth grant model is retired (ADR 0008). Those objects remain owned and
-- referenced; the uploader FK (media_objects_uploader_id_fkey) is unchanged.
ALTER TABLE "media_objects" DROP COLUMN "grant_expires_at",
DROP COLUMN "grant_id",
ALTER COLUMN "uploader_id" SET NOT NULL;
