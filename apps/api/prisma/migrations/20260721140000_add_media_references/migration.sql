-- CreateTable
-- Media's own record that something holds a reference to an object — the state
-- ADR 0005 Decision 8 requires, so referenced-ness is computed from Media's own
-- state rather than by reaching into feature schemas.
--
-- "referrer" is an opaque tag: the feature composes it, Media stores and matches
-- it, and never interprets it. Media therefore learns *that* a reference exists,
-- never *what* refers to it — Decision 9's "a MediaObject is unaware of its
-- referrers" holds, and no foreign key points at a feature table.
CREATE TABLE "media_references" (
    "id" SERIAL NOT NULL,
    "media_id" INTEGER NOT NULL,
    "referrer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- One referrer holds one reference to one object: a repeated "begin" is
-- idempotent rather than duplicating, and an "end" is exact.
CREATE UNIQUE INDEX "media_references_media_id_referrer_key" ON "media_references"("media_id", "referrer");

-- AddForeignKey
-- Within Media's own boundary, so a real foreign key is appropriate — unlike
-- the feature side, which holds a bare reference. RESTRICT enforces
-- reclamation's invariant at the database: an object that is still referenced
-- cannot be removed.
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
