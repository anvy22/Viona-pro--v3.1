-- Create storage_users table (replaces "User" from initial migration, using new name to avoid conflict)
CREATE TABLE "storage_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "storageUsed" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_users_pkey" PRIMARY KEY ("id")
);

-- Create File table
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" BIGINT NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "gcsKey" TEXT,
    "parentId" TEXT,
    "ownerId" TEXT NOT NULL,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isTrashed" BOOLEAN NOT NULL DEFAULT false,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- Unique index on email
CREATE UNIQUE INDEX "storage_users_email_key" ON "storage_users"("email");

-- Index on File
CREATE INDEX "File_ownerId_parentId_idx" ON "File"("ownerId", "parentId");

-- Foreign key: File self-reference for tree
ALTER TABLE "File" ADD CONSTRAINT "File_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign key: File owner -> storage_users
ALTER TABLE "File" ADD CONSTRAINT "File_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "storage_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
