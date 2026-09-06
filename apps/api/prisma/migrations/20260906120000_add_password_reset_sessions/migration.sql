-- Password Reset: where a reader stands in the recovery flow.
--
-- Safety class: ADDITIVE. One new table with its constraints and foreign key;
-- no existing table is altered, nothing is dropped, and no data is backfilled.
-- Applying this to a populated database changes no existing row.
--
-- Why the table exists: recovery is three steps and its position had nowhere to
-- live. A URL per step makes the position reader-editable, client-readable
-- storage would hold a live password-change credential, and component state does
-- not survive a reload — so the position is held here and addressed by a key the
-- browser keeps and JavaScript cannot read (ADR 0017 Decisions 1-5).
--
-- No step column. Absent challenge means the reader is still entering a code;
-- present means they may set a password. The step is therefore correct with
-- nobody having written it, the same property the two challenge tables and the
-- onboarding journey already rely on.
--
-- token_hash, not the token. The plaintext travels to a client, so it is stored
-- the way an emailed code is: as a digest nothing can reverse.
--
-- masked_endpoint, not the address. The mask is produced where the address is
-- held and the unmasked value never leaves the boundary.
--
-- ON DELETE CASCADE from the challenge: a session outliving the credential it
-- points at would be a position a reader could return to and not be able to
-- leave. The sweep removes the rest.

-- CreateTable
CREATE TABLE "password_reset_sessions" (
    "id" SERIAL NOT NULL,
    "token_hash" TEXT NOT NULL,
    "masked_endpoint" TEXT NOT NULL,
    "challenge_id" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: the lookup every read performs, and the guarantee that one key
-- addresses at most one session.
CREATE UNIQUE INDEX "password_reset_sessions_token_hash_key" ON "password_reset_sessions"("token_hash");

-- CreateIndex: at most one session may hold a given credential, so confirming
-- the same code from two browsers cannot leave two sessions able to spend it.
CREATE UNIQUE INDEX "password_reset_sessions_challenge_id_key" ON "password_reset_sessions"("challenge_id");

-- CreateIndex: the sweep's only scan.
CREATE INDEX "password_reset_sessions_expires_at_idx" ON "password_reset_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "password_reset_sessions" ADD CONSTRAINT "password_reset_sessions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "password_reset_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
