-- ============================================================================
-- 生产环境更新验证脚本 - 2025年6月9日
-- ============================================================================
-- 说明: 本脚本用于验证生产环境更新是否成功执行
-- ============================================================================

-- ============================================================================
-- 第一部分: 数据库连接验证
-- ============================================================================

SELECT 'DATABASE_CONNECTION_CHECK' AS check_type,
       CASE
           WHEN current_database() IS NOT NULL THEN 'PASSED'
           ELSE 'FAILED'
       END AS status,
       current_database() AS database_name;

-- ============================================================================
-- 第二部分: 表结构验证
-- ============================================================================

-- 检查新增字段是否存在
SELECT 'NEW_COLUMNS_CHECK' AS check_type,
       table_name,
       column_name,
       CASE
           WHEN column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description')
           THEN 'PASSED'
           ELSE 'FAILED'
       END AS status
FROM information_schema.columns
WHERE table_name IN (
    'PersonalProductionRecord',
    'AllocationRuleConfig',
    'LaborHourReportEmployee',
    'EarnedHoursAllocationResult',
    'ProductStandardHourByLevel'
)
AND column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description');

-- 验证字段属性
SELECT 'COLUMN_PROPERTIES_CHECK' AS check_type,
       table_name,
       column_name,
       is_nullable,
       column_default
FROM information_schema.columns
WHERE table_name IN (
    'PersonalProductionRecord',
    'AllocationRuleConfig',
    'LaborHourReportEmployee',
    'EarnedHoursAllocationResult',
    'ProductStandardHourByLevel'
)
AND column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description')
ORDER BY table_name, column_name;

-- ============================================================================
-- 第三部分: 索引验证
-- ============================================================================

SELECT 'INDEX_CHECK' AS check_type,
       tablename,
       indexname,
       CASE
           WHEN indexname = 'ProductStandardHourByLevel_productId_idx'
           THEN 'PASSED'
           ELSE 'FAILED'
       END AS status
FROM pg_indexes
WHERE tablename = 'ProductStandardHourByLevel'
AND indexname = 'ProductStandardHourByLevel_productId_idx';

-- ============================================================================
-- 第四部分: 数据完整性验证
-- ============================================================================

-- 检查关键表的数据量
SELECT 'DATA_COUNT_CHECK' AS check_type,
       'PersonalProductionRecord' AS table_name,
       COUNT(*) AS row_count
FROM "PersonalProductionRecord"
UNION ALL
SELECT 'DATA_COUNT_CHECK',
       'AllocationRuleConfig',
       COUNT(*)
FROM "AllocationRuleConfig"
UNION ALL
SELECT 'DATA_COUNT_CHECK',
       'LaborHourReportEmployee',
       COUNT(*)
FROM "LaborHourReportEmployee"
UNION ALL
SELECT 'DATA_COUNT_CHECK',
       'EarnedHoursAllocationResult',
       COUNT(*)
FROM "EarnedHoursAllocationResult"
UNION ALL
SELECT 'DATA_COUNT_CHECK',
       'ProductStandardHourByLevel',
       COUNT(*)
FROM "ProductStandardHourByLevel";

-- ============================================================================
-- 第五部分: 新字段数据分布检查
-- ============================================================================

-- 检查unit字段的数据分布
SELECT 'UNIT_FIELD_CHECK' AS check_type,
       'PersonalProductionRecord' AS table_name,
       unit,
       COUNT(*) AS count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage
FROM "PersonalProductionRecord"
WHERE unit IS NOT NULL
GROUP BY unit
UNION ALL
SELECT 'UNIT_FIELD_CHECK',
       'EarnedHoursAllocationResult',
       unit,
       COUNT(*),
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2)
FROM "EarnedHoursAllocationResult"
WHERE unit IS NOT NULL
GROUP BY unit;

-- ============================================================================
-- 第六部分: 性能验证
-- ============================================================================

-- 检查索引使用情况
SELECT 'INDEX_USAGE_CHECK' AS check_type,
       schemaname,
       tablename,
       indexname,
       idx_scan AS index_scans,
       idx_tup_read AS tuples_read,
       idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'ProductStandardHourByLevel'
AND indexname = 'ProductStandardHourByLevel_productId_idx';

-- ============================================================================
-- 第七部分: 约束验证
-- ============================================================================

-- 检查外键约束
SELECT 'FOREIGN_KEY_CHECK' AS check_type,
       tc.table_name,
       tc.constraint_name,
       tc.constraint_type,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN (
    'PersonalProductionRecord',
    'AllocationRuleConfig',
    'LaborHourReportEmployee',
    'EarnedHoursAllocationResult',
    'ProductStandardHourByLevel'
)
AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- 完成
-- ============================================================================
-- 验证完成，请检查所有检查项是否为PASSED状态
-- ============================================================================