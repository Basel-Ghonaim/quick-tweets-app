-- Mail Delivery: the send-attempt record its abuse controls are counted from.
--
-- Safety class: ADDITIVE. One new table with its indexes; no existing table is
-- altered, nothing is dropped, and no data is backfilled. Applying this to a
-- populated database changes no existing row.
--
-- Note the absence of any foreign key. The table references no consumer and no
-- consumer's rows, because a control derived from a consumer's data would be
-- weakened by that consumer's retention settings — which is the coupling
-- ADR 0015 Decision 5 exists to forbid.
--
-- Note also that the recipient is stored as a digest. The controls only ask
-- whether two attempts share a recipient, so the address is never read back,
-- and this table would otherwise accumulate every recipient ever mailed.

-- CreateTable
CREATE TABLE "mail_send_attempts" (
    "id" SERIAL NOT NULL,
    "recipient_key" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_send_attempts_pkey" PRIMARY KEY ("id")
);

-- The per-recipient window: WHERE recipient_key = $1 AND created_at > $2
CREATE INDEX "mail_send_attempts_recipient_key_created_at_idx" ON "mail_send_attempts"("recipient_key", "created_at");

-- The global ceiling's window, and the pruning job's cutoff: both range over
-- created_at alone.
CREATE INDEX "mail_send_attempts_created_at_idx" ON "mail_send_attempts"("created_at");
