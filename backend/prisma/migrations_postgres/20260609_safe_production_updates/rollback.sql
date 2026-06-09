-- ============================================================================
-- 生产环境更新回滚脚本 - 2025年6月9日
-- ============================================================================
-- 说明: 本脚本用于回滚生产环境数据库结构更新
-- 警告: 回滚只会删除新增的字段，不会影响现有数据
-- ============================================================================

-- ============================================================================
-- 回滚步骤
-- ============================================================================

-- 1. 删除新增的索引 (无数据影响)
DROP INDEX IF EXISTS "ProductStandardHourByLevel_productId_idx";

-- 2. 删除新增的可选字段 (无数据影响)
-- 注意: 这些字段都是可选的，删除不会影响现有数据

-- PersonalProductionRecord表
ALTER TABLE "PersonalProductionRecord" DROP COLUMN IF EXISTS "unit";

-- AllocationRuleConfig表
ALTER TABLE "AllocationRuleConfig" DROP COLUMN IF EXISTS "ruleCode";

-- LaborHourReportEmployee表
ALTER TABLE "LaborHourReportEmployee" DROP COLUMN IF EXISTS "startTime";
ALTER TABLE "LaborHourReportEmployee" DROP COLUMN IF EXISTS "endTime";
ALTER TABLE "LaborHourReportEmployee" DROP COLUMN IF EXISTS "value";
ALTER TABLE "LaborHourReportEmployee" DROP COLUMN IF EXISTS "description";

-- EarnedHoursAllocationResult表
ALTER TABLE "EarnedHoursAllocationResult" DROP COLUMN IF EXISTS "unit";

-- ProductStandardHourByLevel表
ALTER TABLE "ProductStandardHourByLevel" DROP COLUMN IF EXISTS "unit";

-- ============================================================================
-- 验证回滚
-- ============================================================================

-- 验证字段已删除
SELECT
    table_name,
    column_name
FROM information_schema.columns
WHERE table_name IN (
    'PersonalProductionRecord',
    'AllocationRuleConfig',
    'LaborHourReportEmployee',
    'EarnedHoursAllocationResult',
    'ProductStandardHourByLevel'
)
AND column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description');

-- 应该返回0行

-- ============================================================================
-- 完成
-- ============================================================================
-- 回滚完成，数据库已恢复到更新前的状态
-- ============================================================================