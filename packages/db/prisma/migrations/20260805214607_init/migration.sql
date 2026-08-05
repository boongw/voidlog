-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "LogFileStatus" AS ENUM ('PENDING', 'PARSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "MechanicCategory" AS ENUM ('MISTAKE', 'STEALTH', 'REVEAL', 'GREEN', 'BOSS_SPECIFIC');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "discordId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_batches" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_files" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" "LogFileStatus" NOT NULL DEFAULT 'PENDING',
    "storageKeyRaw" TEXT NOT NULL,
    "storageKeyJson" TEXT,
    "externalReportUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "log_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounter_results" (
    "id" TEXT NOT NULL,
    "logFileId" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "bossName" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encounter_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_results" (
    "id" TEXT NOT NULL,
    "encounterResultId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "reached" BOOLEAN NOT NULL,
    "success" BOOLEAN NOT NULL,
    "playersAliveAtStart" INTEGER NOT NULL,

    CONSTRAINT "phase_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mechanic_events" (
    "id" TEXT NOT NULL,
    "phaseResultId" TEXT NOT NULL,
    "playerResultId" TEXT,
    "mechanicName" TEXT NOT NULL,
    "category" "MechanicCategory" NOT NULL,
    "displayName" TEXT NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "context" JSONB,

    CONSTRAINT "mechanic_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_results" (
    "id" TEXT NOT NULL,
    "encounterResultId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "group" INTEGER,
    "dps" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "downs" INTEGER NOT NULL,
    "role" TEXT,

    CONSTRAINT "player_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_discordId_key" ON "users"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_userId_key" ON "project_members"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "encounter_results_logFileId_key" ON "encounter_results"("logFileId");

-- CreateIndex
CREATE INDEX "player_results_encounterResultId_account_idx" ON "player_results"("encounterResultId", "account");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_files" ADD CONSTRAINT "log_files_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "upload_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_results" ADD CONSTRAINT "encounter_results_logFileId_fkey" FOREIGN KEY ("logFileId") REFERENCES "log_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_results" ADD CONSTRAINT "phase_results_encounterResultId_fkey" FOREIGN KEY ("encounterResultId") REFERENCES "encounter_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_events" ADD CONSTRAINT "mechanic_events_phaseResultId_fkey" FOREIGN KEY ("phaseResultId") REFERENCES "phase_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mechanic_events" ADD CONSTRAINT "mechanic_events_playerResultId_fkey" FOREIGN KEY ("playerResultId") REFERENCES "player_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_results" ADD CONSTRAINT "player_results_encounterResultId_fkey" FOREIGN KEY ("encounterResultId") REFERENCES "encounter_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
