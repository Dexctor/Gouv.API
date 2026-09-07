-- Additive migration: existing website URLs remain suggestions until a human validates them.
CREATE TYPE "WebsiteStatus" AS ENUM ('unknown', 'candidate', 'verified', 'rejected');
CREATE TYPE "ObservationStatus" AS ENUM ('verified', 'unknown', 'not_found_in_scope', 'collection_failed');

ALTER TABLE "Prospect"
ADD COLUMN "siteWebStatus" "WebsiteStatus" NOT NULL DEFAULT 'unknown',
ADD COLUMN "siteWebVerifiedAt" TIMESTAMP(3);

UPDATE "Prospect"
SET "siteWebStatus" = 'candidate'
WHERE "siteWeb" IS NOT NULL AND BTRIM("siteWeb") <> '';

CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "url" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ObservationStatus" NOT NULL,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Observation_prospectId_source_scope_key_key"
ON "Observation"("prospectId", "source", "scope", "key");

CREATE INDEX "Observation_prospectId_observedAt_idx"
ON "Observation"("prospectId", "observedAt");

ALTER TABLE "Observation"
ADD CONSTRAINT "Observation_prospectId_fkey"
FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
