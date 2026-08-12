-- AlterTable
-- Avatar as a bare numeric Media Reference (MediaObject.id): a plain nullable
-- column with NO foreign key by design. MediaObject stays unaware of who points
-- at it (ADR 0005 Decision 9), and Media determines referenced-ness from the
-- registry — never from a feature-table FK (M11). Integrity is Media's, via
-- adoption + the future reference-coordination mechanism.
ALTER TABLE "users" ADD COLUMN     "avatar_media_id" INTEGER;
