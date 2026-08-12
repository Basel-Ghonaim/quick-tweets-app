-- AlterTable
-- A single optional media file per comment, as a bare numeric Media Reference
-- (MediaObject.id) with NO foreign key by design — MediaObject stays unaware of
-- who points at it (ADR 0005 Decision 9), and Media determines referenced-ness
-- from the registry, never from a feature-table FK (M11). Integrity is Media's,
-- via attach-authorized coordination (referrer tag `comment:{id}`).
ALTER TABLE "comments" ADD COLUMN     "media_id" INTEGER;
