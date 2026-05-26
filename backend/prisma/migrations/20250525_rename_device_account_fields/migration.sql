-- Rename hierarchyCode to path and hierarchyName to namePath in DeviceAccount table

-- Step 1: Add new columns
ALTER TABLE "DeviceAccount" ADD COLUMN "path" TEXT;
ALTER TABLE "DeviceAccount" ADD COLUMN "namePath" TEXT;

-- Step 2: Copy data from old columns to new columns
UPDATE "DeviceAccount" SET "path" = "hierarchyCode" WHERE "hierarchyCode" IS NOT NULL;
UPDATE "DeviceAccount" SET "namePath" = "hierarchyName" WHERE "hierarchyName" IS NOT NULL;

-- Step 3: Drop old columns
ALTER TABLE "DeviceAccount" DROP COLUMN "hierarchyCode";
ALTER TABLE "DeviceAccount" DROP COLUMN "hierarchyName";

-- Step 4: Create indexes on new columns
CREATE INDEX "DeviceAccount_path_idx" ON "DeviceAccount"("path");
CREATE INDEX "DeviceAccount_namePath_idx" ON "DeviceAccount"("namePath");
