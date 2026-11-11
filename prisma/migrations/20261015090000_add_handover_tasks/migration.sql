-- CreateEnum
CREATE TYPE "HandoverTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandoverTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "HandoverTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "area" TEXT,
    "createdBy" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" "HandoverTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "HandoverTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoverTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoverTaskUpdate" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "status" "HandoverTaskStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoverTaskUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HandoverTask_status_priority_idx" ON "HandoverTask"("status", "priority");
CREATE INDEX "HandoverTask_dueAt_idx" ON "HandoverTask"("dueAt");
CREATE INDEX "HandoverTask_createdBy_idx" ON "HandoverTask"("createdBy");
CREATE INDEX "HandoverTask_assigneeId_idx" ON "HandoverTask"("assigneeId");
CREATE INDEX "HandoverTaskUpdate_taskId_createdAt_idx" ON "HandoverTaskUpdate"("taskId", "createdAt");
CREATE INDEX "HandoverTaskUpdate_actorId_idx" ON "HandoverTaskUpdate"("actorId");

-- AddForeignKey
ALTER TABLE "HandoverTaskUpdate" ADD CONSTRAINT "HandoverTaskUpdate_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "HandoverTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
