# Migration: Add Product Relation to ProductStandardHourByLevel

**Date:** 2025-06-09
**Type:** Schema Enhancement
**Impact:** Non-breaking
**Safe for Production:** ✅ Yes

## Description

This migration adds a foreign key relationship between the `ProductStandardHourByLevel` and `Product` tables to enable efficient querying of product information (code and name) when retrieving standard hour configurations.

## Changes Made

### 1. Prisma Schema Changes
- Added relation field `product` to `ProductStandardHourByLevel` model
- Added back-relation field `productStandardHourByLevels` to `Product` model
- Added index on `productId` for query optimization

### 2. Backend Code Changes
- Modified `getAllProductStandardHourByLevels` method to include product data
- Returns `productCode` field from related Product table

### 3. Frontend Changes
- Updated product display format to show "code-name" instead of just name
- Added sorting capability on product field

## Impact on Existing Data

✅ **SAFE** - This migration does NOT modify any existing data:
- No data deletion or modification
- No table structure changes that affect existing rows
- Only adds metadata (relations and indexes)
- Existing records continue to work normally

## Testing Checklist

- [x] Development build completed successfully
- [x] Migration script created and validated
- [x] Foreign key relationship defined in schema
- [x] Index created for query performance
- [x] No breaking changes to existing functionality

## Deployment Instructions

1. **Backup Production Database** (Recommended)
   ```bash
   cp production.db production.db.backup_$(date +%Y%m%d_%H%M%S)
   ```

2. **Apply Migration**
   ```bash
   # Apply the migration SQL
   sqlite3 production.db < prisma/migrations/20260609_add_product_relation_to_standard_hour_by_level/migration.sql

   # Or run via Prisma (if using Prisma Migrate in production)
   npx prisma migrate deploy
   ```

3. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Restart Application**
   ```bash
   # Restart your backend service
   npm run start:prod
   ```

5. **Verify Deployment**
   - Check that product codes display correctly
   - Verify sorting functionality works
   - Confirm no errors in logs

## Rollback Plan

If issues occur, rollback steps:

1. Restore database from backup
2. Revert code changes to previous version
3. Restart application

## Related Issues

- Enables proper display of product codes in Product Standard Configuration page
- Improves data consistency through foreign key constraints
