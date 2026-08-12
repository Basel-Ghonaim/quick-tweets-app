-- Username history / reservation: a former handle a user released via a rename.
-- Reserved (unique) so it cannot be re-registered by anyone else, and retained so
-- old locators resolve/redirect to the current handle. Additive: no change to
-- existing tables, no backfill.

-- CreateTable
CREATE TABLE "username_aliases" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "username_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "username_aliases_username_key" ON "username_aliases"("username");

-- CreateIndex
CREATE INDEX "username_aliases_user_id_idx" ON "username_aliases"("user_id");

-- AddForeignKey
ALTER TABLE "username_aliases" ADD CONSTRAINT "username_aliases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
