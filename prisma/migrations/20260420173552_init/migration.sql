-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('A_QUALIFIER', 'CONTACTE', 'RDV', 'PROPOSITION', 'SIGNE', 'PERDU');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'EMAIL', 'MEETING', 'STAGE_CHANGE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "siret" TEXT,
    "denomination" TEXT NOT NULL,
    "nomCommercial" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "codeNaf" TEXT,
    "libelleNaf" TEXT,
    "trancheEffectif" TEXT,
    "dateCreation" TIMESTAMP(3),
    "formeJuridique" TEXT,
    "etatAdministratif" TEXT,
    "siteWeb" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "stage" "PipelineStage" NOT NULL DEFAULT 'A_QUALIFIER',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastContactedAt" TIMESTAMP(3),

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financial" (
    "id" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "dateCloture" TIMESTAMP(3) NOT NULL,
    "chiffreAffaires" DOUBLE PRECISION,
    "margeBrute" DOUBLE PRECISION,
    "ebe" DOUBLE PRECISION,
    "resultatNet" DOUBLE PRECISION,
    "typeBilan" TEXT,
    "prospectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Financial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialCache" (
    "siren" TEXT NOT NULL,
    "dernierCA" DOUBLE PRECISION,
    "derniereMarge" DOUBLE PRECISION,
    "dernierEBE" DOUBLE PRECISION,
    "dernierResultat" DOUBLE PRECISION,
    "dateDernierBilan" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialCache_pkey" PRIMARY KEY ("siren")
);

-- CreateTable
CREATE TABLE "BodaccEvent" (
    "id" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "publication" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodaccEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProspectTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProspectTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_siren_key" ON "Prospect"("siren");

-- CreateIndex
CREATE INDEX "Prospect_stage_idx" ON "Prospect"("stage");

-- CreateIndex
CREATE INDEX "Prospect_codePostal_idx" ON "Prospect"("codePostal");

-- CreateIndex
CREATE INDEX "Prospect_codeNaf_idx" ON "Prospect"("codeNaf");

-- CreateIndex
CREATE INDEX "Prospect_assignedToId_idx" ON "Prospect"("assignedToId");

-- CreateIndex
CREATE INDEX "Activity_prospectId_idx" ON "Activity"("prospectId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "Financial_siren_idx" ON "Financial"("siren");

-- CreateIndex
CREATE UNIQUE INDEX "Financial_siren_dateCloture_key" ON "Financial"("siren", "dateCloture");

-- CreateIndex
CREATE INDEX "BodaccEvent_siren_idx" ON "BodaccEvent"("siren");

-- CreateIndex
CREATE INDEX "BodaccEvent_date_idx" ON "BodaccEvent"("date");

-- CreateIndex
CREATE INDEX "_ProspectTags_B_index" ON "_ProspectTags"("B");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Financial" ADD CONSTRAINT "Financial_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProspectTags" ADD CONSTRAINT "_ProspectTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProspectTags" ADD CONSTRAINT "_ProspectTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
