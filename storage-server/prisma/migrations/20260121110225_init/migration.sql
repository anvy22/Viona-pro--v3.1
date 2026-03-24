-- CreateTable
CREATE TABLE IF NOT EXISTS "storage_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "storageUsed" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" BIGINT NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "gcsKey" TEXT,
    "orgId" TEXT,
    "isOrgFolder" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "storage_users_email_key" ON "storage_users"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "File_ownerId_parentId_idx" ON "File"("ownerId", "parentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "File_orgId_idx" ON "File"("orgId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'File_parentId_fkey') THEN
    ALTER TABLE "File" ADD CONSTRAINT "File_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'File_ownerId_fkey') THEN
    ALTER TABLE "File" ADD CONSTRAINT "File_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "storage_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
