-- Password Reset: the position learns who it is for, and when it may ask again.
--
-- Safety class: ADDITIVE. Three nullable-or-defaulted columns, one index and
-- one foreign key on an existing table. Nothing is dropped, no column becomes
-- NOT NULL, and every row already present stays valid: existing positions read
-- user_id NULL, last_asked_at at the moment of migration, and resends_used 0.
--
-- Why user_id: a resend must reach the address the position was opened for, and
-- the position holds only a mask, which is not an address. Storing the plaintext
-- instead would start retaining every string anyone types for the position's
-- lifetime, including addresses no account holds. A link to the minted credential
-- would not do either: a position opened inside the account's cooldown has no
-- credential, and would be permanently unable to ask again.
--
-- Nullable, and that is the neutrality: a position is opened for every submitted
-- address alike, so the column is NULL for one no account holds and the row stays
-- identical in kind on every branch.
--
-- ON DELETE SET NULL rather than CASCADE: a position whose account has gone
-- should stop being able to send, not vanish from under a reader mid-flow.
--
-- Why last_asked_at rather than a stored window: the seconds a reader sees are
-- derived from this on read, so nothing has to be written for a window to close.
-- Opening the position counts as its first ask, which is why it defaults to now.
--
-- Why resends_used counts asks and not sends: a counter that moved only when mail
-- left would report whether mail left, which is the one thing this capability
-- refuses to answer. It bounds how far expires_at may be pushed forward
-- (ADR 0017 Decision 4).

-- AlterTable
ALTER TABLE "password_reset_sessions" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "password_reset_sessions" ADD COLUMN "last_asked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "password_reset_sessions" ADD COLUMN "resends_used" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex: serves the cascade SET NULL and any lookup by account.
CREATE INDEX "password_reset_sessions_user_id_idx" ON "password_reset_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "password_reset_sessions" ADD CONSTRAINT "password_reset_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
