-- Password Reset: the momentary credential authorizing a password change.
--
-- Safety class: ADDITIVE. One new table with its constraints, indexes, and
-- foreign key; no existing table is altered, nothing is dropped, and no data
-- is backfilled. Applying this to a populated database changes no existing row.
--
-- No status column: usable / expired / spent is derived at read time from
-- used_at and expires_at, the same shape channel_verification_challenges
-- already uses, so a lapsed code is correct without anyone writing to it.
--
-- No second table the way channel_verifications has one alongside its
-- challenges: this capability owns no standing record, only the credential
-- itself, so there is nothing else to anchor a cooldown on but the most
-- recent row for a user — a query, not a relation.
--
-- code_hash is unique. Confirm and apply resolve the account FROM the code,
-- not the other way around — the screen that submits it does not re-collect
-- the email — so the lookup is by digest, and the constraint makes two rows
-- sharing one code impossible rather than merely improbable.

-- CreateTable
CREATE TABLE "password_reset_challenges" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: the digest lookup confirm/apply run on every call.
CREATE UNIQUE INDEX "password_reset_challenges_code_hash_key" ON "password_reset_challenges"("code_hash");

-- CreateIndex: the request flow's cooldown check — the most recent row for a
-- known user.
CREATE INDEX "password_reset_challenges_user_id_created_at_idx" ON "password_reset_challenges"("user_id", "created_at");

-- CreateIndex: the sweep's cutoff scan.
CREATE INDEX "password_reset_challenges_expires_at_idx" ON "password_reset_challenges"("expires_at");

-- AddForeignKey
ALTER TABLE "password_reset_challenges" ADD CONSTRAINT "password_reset_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
