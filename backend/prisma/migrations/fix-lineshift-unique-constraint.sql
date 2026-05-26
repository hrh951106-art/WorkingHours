-- =====================================================
-- 修改 LineShift 表的唯一性约束
-- 从 orgId 改为 accountId，以支持同一工厂下的不同产线
-- =====================================================

-- 1. 删除旧的唯一索引
DROP INDEX IF EXISTS LineShift_orgId_shiftId_scheduleDate_deletedAt_key;

-- 2. 创建新的唯一索引（基于 accountId）
-- 注意：accountId 可能为 NULL 的情况需要特殊处理
-- 对于旧数据（accountId 为 NULL），继续使用 orgId 作为唯一性约束
-- 对于新数据（accountId 不为 NULL），使用 accountId 作为唯一性约束

-- 方案：创建一个部分索引，只对 accountId 不为 NULL 的记录生效
CREATE UNIQUE INDEX LineShift_accountId_shiftId_scheduleDate_deletedAt_key
ON LineShift(accountId, shiftId, scheduleDate, deletedAt)
WHERE accountId IS NOT NULL;

-- 3. 为旧数据（accountId 为 NULL）保留基于 orgId 的索引
CREATE UNIQUE INDEX LineShift_orgId_shiftId_scheduleDate_deletedAt_legacy_key
ON LineShift(orgId, shiftId, scheduleDate, deletedAt)
WHERE accountId IS NULL;

-- 4. 也可以创建一个包含两者的复合索引（作为备选方案）
-- 这个索引允许 accountId 或 orgId 任意一个不为 NULL
-- CREATE UNIQUE INDEX LineShift_line_org_shift_key
-- ON LineShift(
--   COALESCE(accountId, orgId),
--   shiftId,
--   scheduleDate,
--   deletedAt
-- );
