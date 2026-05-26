-- =====================================================
-- 恢复 LineShift 表的原始唯一性约束
-- 基于 orgId + shiftId + scheduleDate
-- =====================================================

-- 1. 删除新增的部分索引
DROP INDEX IF EXISTS LineShift_accountId_shiftId_scheduleDate_deletedAt_key;
DROP INDEX IF EXISTS LineShift_orgId_shiftId_scheduleDate_deletedAt_legacy_key;

-- 2. 恢复原始的唯一索引
CREATE UNIQUE INDEX LineShift_orgId_shiftId_scheduleDate_deletedAt_key
ON LineShift(orgId, shiftId, scheduleDate, deletedAt);
