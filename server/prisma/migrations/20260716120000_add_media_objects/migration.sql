-- CreateTable
CREATE TABLE "media_objects" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_objects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_objects_token_key" ON "media_objects"("token");

-- CreateIndex
CREATE UNIQUE INDEX "media_objects_storage_key_key" ON "media_objects"("storage_key");
