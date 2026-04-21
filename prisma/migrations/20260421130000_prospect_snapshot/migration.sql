-- AlterTable
ALTER TABLE "Prospect"
    ADD COLUMN "labels" JSONB,
    ADD COLUMN "dirigeants" JSONB,
    ADD COLUMN "idccs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "categorie" TEXT,
    ADD COLUMN "syncedAt" TIMESTAMP(3);
