-- AlterTable
ALTER TABLE "media_objects" ADD COLUMN     "grant_expires_at" TIMESTAMP(3),
ADD COLUMN     "grant_id" TEXT,
ADD COLUMN     "uploader_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "media_objects_grant_id_key" ON "media_objects"("grant_id");

-- AddForeignKey
ALTER TABLE "media_objects" ADD CONSTRAINT "media_objects_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
