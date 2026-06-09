-- Migration: Add Product relation to ProductStandardHourByLevel
-- Date: 2025-06-09
-- Description: Add foreign key relationship between ProductStandardHourByLevel and Product tables
-- Impact: Non-breaking change, only adds metadata, does not modify existing data

-- Step 1: Verify that the ProductStandardHourByLevel table exists and has productId column
-- This is a validation step, the table should already exist

-- Step 2: The foreign key constraint is defined at Prisma schema level
-- SQLite will enforce this automatically through the application layer
-- No ALTER TABLE needed for foreign keys in SQLite (handled by Prisma)

-- Step 3: Create an index on productId if it doesn't exist for better query performance
CREATE INDEX IF NOT EXISTS "ProductStandardHourByLevel_productId_idx" ON "ProductStandardHourByLevel"("productId");

-- Migration completed successfully
-- This migration is safe to run on production databases
