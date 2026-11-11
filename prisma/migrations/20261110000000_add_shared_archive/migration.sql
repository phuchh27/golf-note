CREATE TYPE "ArchiveEntryType" AS ENUM ('TEXT', 'LINK', 'IMAGE');

CREATE TABLE "ArchiveEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ArchiveEntryType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchiveEntry_type_updatedAt_idx" ON "ArchiveEntry"("type", "updatedAt");
CREATE INDEX "ArchiveEntry_title_idx" ON "ArchiveEntry"("title");
