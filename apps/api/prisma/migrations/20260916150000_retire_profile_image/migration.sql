-- Users: the deprecated profile image is retired.
--
-- Safety class: DESTRUCTIVE. One column is dropped from a populated table, and
-- whatever it held cannot be recovered.
--
-- Why it is safe: the column is deprecated and always null. The avatar lives in
-- avatar_media_id, and nothing reads this column. The guard below makes that a
-- precondition rather than an assumption.

-- Precondition: a value is refused loudly rather than dropped silently.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "profile_image" IS NOT NULL) THEN
    RAISE EXCEPTION 'retire_profile_image precondition failed: % users have a non-null profile_image. Resolve those rows before applying this migration.',
      (SELECT count(*) FROM "users" WHERE "profile_image" IS NOT NULL);
  END IF;
END $$;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "profile_image";
