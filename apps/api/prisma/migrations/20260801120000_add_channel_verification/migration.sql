-- Channel Verification: the standing (account, endpoint) record and its
-- subordinate challenge.
--
-- Safety class: ADDITIVE. Two new tables with their constraints and foreign
-- keys; no existing table is altered, nothing is dropped, and no data is
-- backfilled. Applying this to a populated database changes no existing row.
--
-- Note the absence of a status column on either table: verification status is
-- derived at read time from proven_at, closed_at, and expires_at, so an expired
-- challenge is correct without anyone having written to it.

-- CreateTable
CREATE TABLE "channel_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "proven_at" TIMESTAMP(3),
    "last_challenged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_verification_challenges" (
    "id" SERIAL NOT NULL,
    "verification_id" INTEGER NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_verification_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: one record per subject. An endpoint can be renamed away and back,
-- so lookup must resolve to exactly one row.
CREATE UNIQUE INDEX "channel_verifications_user_id_endpoint_key" ON "channel_verifications"("user_id", "endpoint");

-- CreateIndex: at most one OPEN challenge per record. Partial, because open is
-- the absence of closed_at and a plain unique would permit unlimited open rows —
-- Postgres treats NULLs as distinct.
CREATE UNIQUE INDEX "channel_verification_challenges_one_open" ON "channel_verification_challenges"("verification_id") WHERE "closed_at" IS NULL;

-- CreateIndex: the expiry sweep scans by this column.
CREATE INDEX "channel_verification_challenges_expires_at_idx" ON "channel_verification_challenges"("expires_at");

-- AddForeignKey
ALTER TABLE "channel_verifications" ADD CONSTRAINT "channel_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_verification_challenges" ADD CONSTRAINT "channel_verification_challenges_verification_id_fkey" FOREIGN KEY ("verification_id") REFERENCES "channel_verifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
