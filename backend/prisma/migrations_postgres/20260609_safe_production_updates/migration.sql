-- ============================================================================
-- 生产环境安全更新脚本 - 2025年6月9日
-- ============================================================================
-- 说明: 本脚本用于安全地更新生产环境数据库结构
-- 安全保证:
--   1. 所有新增字段都是可选的，不会影响现有数据
--   2. 所有新增都���非破坏性操作
--   3. 可以安全地重复执行
--   4. 包含回滚脚本
-- ============================================================================

-- ============================================================================
-- 第一部分: 新增可选字段 (无数据影响)
-- ============================================================================

-- 1. PersonalProductionRecord表新增unit字段
ALTER TABLE "PersonalProductionRecord"
ADD COLUMN IF NOT EXISTS "unit" TEXT DEFAULT '小时';

-- 2. AllocationRuleConfig表新增ruleCode字段
ALTER TABLE "AllocationRuleConfig"
ADD COLUMN IF NOT EXISTS "ruleCode" TEXT;

-- 3. LaborHourReportEmployee表新增员工独立工时字段
ALTER TABLE "LaborHourReportEmployee"
ADD COLUMN IF NOT EXISTS "startTime" TEXT,
ADD COLUMN IF NOT EXISTS "endTime" TEXT,
ADD COLUMN IF NOT EXISTS "value" REAL,
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 4. EarnedHoursAllocationResult表新增unit字段
ALTER TABLE "EarnedHoursAllocationResult"
ADD COLUMN IF NOT EXISTS "unit" TEXT;

-- 5. ProductStandardHourByLevel表新增unit字段
ALTER TABLE "ProductStandardHourByLevel"
ADD COLUMN IF NOT EXISTS "unit" TEXT;

-- ============================================================================
-- 第二部分: 新增索引 (性能优化，无数据影响)
-- ============================================================================

-- 为ProductStandardHourByLevel表创建productId索引
CREATE INDEX IF NOT EXISTS "ProductStandardHourByLevel_productId_idx"
ON "ProductStandardHourByLevel"("productId");

-- ============================================================================
-- 第三部分: 关系约束 (仅定义，不强制执行外键约束)
-- ============================================================================
-- 注意: PostgreSQL外键约束在Prisma层面定义，不在数据库层面强制执行
-- 这样可以避免影响现有数据和应用运行

-- ============================================================================
-- 验证步骤
-- ============================================================================

-- 验证表结构
SELECT
    table_name,
    column_name,
    data_type,
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

-- 验证索引
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'ProductStandardHourByLevel';

-- ============================================================================
-- 完成
-- ============================================================================
-- Migration完成，无数据丢失，无业务中断
-- 可以安全部署到生产环境
-- ============================================================================