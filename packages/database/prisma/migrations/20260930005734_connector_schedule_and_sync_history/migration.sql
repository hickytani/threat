-- Migration: connector_schedule_and_sync_history
-- Adds connector lifecycle status, scheduling state, and full sync history

-- ConnectorStatus enum
CREATE TYPE "ConnectorStatus" AS ENUM (
  'DISABLED',
  'READY',
  'SYNCING',
  'HEALTHY',
  'DEGRADED',
  'ERROR',
  'UNAUTHORIZED'
);

-- SyncStatus enum
CREATE TYPE "SyncStatus" AS ENUM (
  'SUCCESS',
  'FAILED',
  'UNAUTHORIZED',
  'TIMEOUT',
  'PARTIAL'
);

-- Add scheduling and operational state columns to Integration
ALTER TABLE "Integration"
  ADD COLUMN "connectorStatus"      "ConnectorStatus" NOT NULL DEFAULT 'READY',
  ADD COLUMN "pollingIntervalMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "nextSyncAt"           TIMESTAMP(3),
  ADD COLUMN "dedupCount"           INTEGER NOT NULL DEFAULT 0;

-- Index for scheduler query (find integrations due for sync)
CREATE INDEX "Integration_isEnabled_nextSyncAt_idx"
  ON "Integration"("isEnabled", "nextSyncAt");

CREATE INDEX "Integration_organizationId_connectorStatus_idx"
  ON "Integration"("organizationId", "connectorStatus");

-- ConnectorSyncHistory table
CREATE TABLE "ConnectorSyncHistory" (
  "id"                  TEXT NOT NULL,
  "integrationId"       TEXT NOT NULL,
  "organizationId"      TEXT NOT NULL,
  "triggeredBy"         TEXT NOT NULL DEFAULT 'SYSTEM',
  "triggerType"         TEXT NOT NULL DEFAULT 'SCHEDULED',
  "startedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"         TIMESTAMP(3),
  "status"              "SyncStatus" NOT NULL DEFAULT 'SUCCESS',
  "durationMs"          INTEGER,
  "eventsDiscovered"    INTEGER NOT NULL DEFAULT 0,
  "eventsIngested"      INTEGER NOT NULL DEFAULT 0,
  "eventsDeduplicated"  INTEGER NOT NULL DEFAULT 0,
  "eventsFailed"        INTEGER NOT NULL DEFAULT 0,
  "errorCode"           TEXT,
  "errorMessage"        TEXT,
  "checkpointToken"     TEXT,

  CONSTRAINT "ConnectorSyncHistory_pkey" PRIMARY KEY ("id")
);

-- Foreign key constraints
ALTER TABLE "ConnectorSyncHistory"
  ADD CONSTRAINT "ConnectorSyncHistory_integrationId_fkey"
    FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ConnectorSyncHistory_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for sync history queries
CREATE INDEX "ConnectorSyncHistory_integrationId_idx" ON "ConnectorSyncHistory"("integrationId");
CREATE INDEX "ConnectorSyncHistory_organizationId_idx" ON "ConnectorSyncHistory"("organizationId");
CREATE INDEX "ConnectorSyncHistory_integrationId_startedAt_idx" ON "ConnectorSyncHistory"("integrationId", "startedAt");
CREATE INDEX "ConnectorSyncHistory_status_idx" ON "ConnectorSyncHistory"("status");
