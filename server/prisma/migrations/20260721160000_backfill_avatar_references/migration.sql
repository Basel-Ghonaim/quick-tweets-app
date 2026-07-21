-- Backfill: existing avatars join reference coordination.
--
-- Avatar references predate the reference ledger, so users registered before it
-- hold an avatar that Media has no record of anything referencing. Reclamation
-- determines referenced-ness from the ledger alone, so without this backfill it
-- would classify every pre-existing avatar as unreferenced and destroy it.
--
-- The referrer tag matches the one the register path now writes
-- (`user-avatar:<id>`), so a future end signal for these rows will match.
--
-- ON CONFLICT DO NOTHING keeps this idempotent and safe to re-run.
INSERT INTO "media_references" ("media_id", "referrer", "created_at")
SELECT u."avatar_media_id", 'user-avatar:' || u."id", NOW()
FROM "users" u
WHERE u."avatar_media_id" IS NOT NULL
ON CONFLICT ("media_id", "referrer") DO NOTHING;
