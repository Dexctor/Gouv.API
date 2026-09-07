CREATE TYPE "AuditPageCollectionStatus" AS ENUM ('not_collected', 'collected', 'collection_failed');

CREATE TABLE "AuditPage" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "title" TEXT,
    "pageType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "collectionStatus" "AuditPageCollectionStatus" NOT NULL DEFAULT 'not_collected',
    "collectionError" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCollectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditPage_prospectId_siteUrl_url_key"
ON "AuditPage"("prospectId", "siteUrl", "url");

CREATE INDEX "AuditPage_prospectId_selected_idx"
ON "AuditPage"("prospectId", "selected");

ALTER TABLE "AuditPage"
ADD CONSTRAINT "AuditPage_prospectId_fkey"
FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
