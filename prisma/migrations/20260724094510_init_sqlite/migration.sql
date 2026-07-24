-- CreateTable
CREATE TABLE "Leader" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "channel" TEXT,
    "chatHandle" TEXT
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TASK',
    "team" TEXT NOT NULL,
    "leaderId" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "deadline" DATETIME,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "revenueImpact" TEXT NOT NULL DEFAULT 'MEDIUM',
    "lastUpdateAt" DATETIME,
    "lastUpdateNote" TEXT,
    "outputLink" TEXT,
    "note" TEXT,
    "parentId" TEXT,
    "recurringTemplateId" TEXT,
    "recurrenceKey" TEXT,
    "googleEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "Task_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Leader" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "partner" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'TWO_WAY',
    "cooperationType" TEXT,
    "contactPerson" TEXT,
    "mktTeam" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "followsProcess" BOOLEAN NOT NULL DEFAULT true,
    "slaDate" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "hasRevenue" BOOLEAN NOT NULL DEFAULT false,
    "hasRoas" BOOLEAN NOT NULL DEFAULT false,
    "hasData" BOOLEAN NOT NULL DEFAULT false,
    "hasProjects" BOOLEAN NOT NULL DEFAULT false,
    "hasRisks" BOOLEAN NOT NULL DEFAULT false,
    "reportLink" TEXT,
    "boardFeedback" TEXT,
    "recurringTemplateId" TEXT,
    "recurrenceKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Report_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetDb" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "scheduleDay" INTEGER,
    "defaults" TEXT NOT NULL,
    "subItemsTemplate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SopDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PersonalNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeeklyStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekKey" TEXT NOT NULL,
    "revenue" REAL,
    "planPct" REAL,
    "roas" REAL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "accessTokenExpiry" DATETIME,
    "calendarId" TEXT NOT NULL,
    "syncToken" TEXT,
    "lastSyncAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GoogleSheetSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL DEFAULT 'default',
    "label" TEXT,
    "sheetId" TEXT NOT NULL,
    "sheetRange" TEXT NOT NULL DEFAULT 'Sheet1',
    "lastRow" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoogleSheetSource_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "GoogleAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TelegramState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "lastShownJson" TEXT,
    "lastEodDate" TEXT,
    "lastError" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "messagesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "impact" INTEGER NOT NULL DEFAULT 3,
    "effort" INTEGER NOT NULL DEFAULT 3,
    "team" TEXT,
    "source" TEXT,
    "decisionNote" TEXT,
    "promotedTaskId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "rawText" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "parsedDraft" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Task_status_deadline_idx" ON "Task"("status", "deadline");

-- CreateIndex
CREATE INDEX "Task_team_status_idx" ON "Task"("team", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Task_recurringTemplateId_recurrenceKey_key" ON "Task"("recurringTemplateId", "recurrenceKey");

-- CreateIndex
CREATE INDEX "Dependency_partner_status_idx" ON "Dependency"("partner", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Report_recurringTemplateId_recurrenceKey_key" ON "Report"("recurringTemplateId", "recurrenceKey");

-- CreateIndex
CREATE INDEX "PersonalNote_pinned_updatedAt_idx" ON "PersonalNote"("pinned", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyStat_weekKey_key" ON "WeeklyStat"("weekKey");

-- CreateIndex
CREATE INDEX "GoogleSheetSource_accountId_idx" ON "GoogleSheetSource"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Idea_promotedTaskId_key" ON "Idea"("promotedTaskId");

-- CreateIndex
CREATE INDEX "Idea_status_updatedAt_idx" ON "Idea"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "InboxItem_status_createdAt_idx" ON "InboxItem"("status", "createdAt");
