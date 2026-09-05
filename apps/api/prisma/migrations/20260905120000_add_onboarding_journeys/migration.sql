-- Onboarding Journey: the registration journey a reader is routed through.
--
-- Safety class: ADDITIVE. One new table with its constraint, unique index and
-- foreign key; no existing table is altered, nothing is dropped, and no data is
-- backfilled. Applying this to a populated database changes no existing row —
-- every account that exists today gets no journey, reads phase "none", and can
-- never enter the onboarding screens. That is the correct answer for them: they
-- registered before the journey existed and are long past it.
--
-- No phase column: profile / verify / code / none is derived at read time from
-- profile_settled_at, code_reached_at and closed_at in a fixed order, the same
-- shape channel_verifications and password_reset_challenges already use. A
-- journey is therefore correct with nobody having written to it.
--
-- user_id is UNIQUE, and that constraint is the permanence. A journey is
-- created exactly once per account, by registration alone, and nothing ever
-- deletes it. There is deliberately no sweep job the way the two challenge
-- tables have one: their rows are unbounded per user, these are one per
-- account, and the surviving row is precisely what makes a finished journey
-- permanently finished rather than merely missing.
--
-- No expiry column. An abandoned journey does not go stale: a reader who
-- registers, leaves, and signs in months later resumes where they stopped.

-- CreateTable
CREATE TABLE "onboarding_journeys" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "profile_settled_at" TIMESTAMP(3),
    "code_reached_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: one journey per account, ever. Both the lookup every read runs
-- and the guarantee that registration cannot mint a second one.
CREATE UNIQUE INDEX "onboarding_journeys_user_id_key" ON "onboarding_journeys"("user_id");

-- AddForeignKey
ALTER TABLE "onboarding_journeys" ADD CONSTRAINT "onboarding_journeys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
