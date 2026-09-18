-- Add normalized provenance and investigation fields without altering existing event data.
ALTER TABLE "SecurityEvent"
  ADD COLUMN "ingestionTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "eventCategory" TEXT,
  ADD COLUMN "sourceType" TEXT,
  ADD COLUMN "vendor" TEXT,
  ADD COLUMN "product" TEXT,
  ADD COLUMN "hostname" TEXT,
  ADD COLUMN "sourcePort" INTEGER,
  ADD COLUMN "destinationPort" INTEGER,
  ADD COLUMN "protocol" TEXT,
  ADD COLUMN "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN "processName" TEXT,
  ADD COLUMN "processId" TEXT,
  ADD COLUMN "parentProcess" TEXT,
  ADD COLUMN "commandLine" TEXT,
  ADD COLUMN "fileHash" TEXT,
  ADD COLUMN "domain" TEXT,
  ADD COLUMN "url" TEXT,
  ADD COLUMN "userAgent" TEXT;

CREATE INDEX "SecurityEvent_organizationId_vendor_product_idx"
  ON "SecurityEvent"("organizationId", "vendor", "product");

CREATE INDEX "SecurityEvent_organizationId_ingestionTimestamp_idx"
  ON "SecurityEvent"("organizationId", "ingestionTimestamp");

CREATE INDEX "SecurityEvent_organizationId_domain_idx"
  ON "SecurityEvent"("organizationId", "domain");

CREATE INDEX "SecurityEvent_organizationId_fileHash_idx"
  ON "SecurityEvent"("organizationId", "fileHash");
