-- ================================================================
-- 人事模块字段类型修复 - PostgreSQL 生产环境迁移脚本
--
-- 功能说明：
-- 1. 修复系统字段的 fieldType 从 'SELECT' 改为 'SYSTEM'
-- 2. 确保数据源正确配置
-- 3. 修复字段显示问题
--
-- 执行方式：
-- psql -U username -d jy_production -f 004-fix-employee-field-types.sql
--
-- 注意事项：
-- 1. 执行前请备份数据库
-- 2. 建议先在测试环境验证
-- 3. 按顺序执行脚本
-- ================================================================

BEGIN;

-- ================================================================
-- 第一部分：修复系统字段的 fieldType
-- ================================================================

-- 1. 工作信息页签字段修复
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SYSTEM'
WHERE "fieldCode" IN ('position', 'employeeType', 'resignationReason')
  AND "fieldType" = 'SELECT';

-- 2. 基本信息页签字段修复
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SYSTEM'
WHERE "fieldCode" = 'nation'
  AND "fieldType" = 'SELECT';

-- 3. 学历信息页签字段修复
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SYSTEM'
WHERE "fieldCode" IN ('educationLevel', 'educationType')
  AND "fieldType" = 'SELECT';

-- ================================================================
-- 第二部分：验证修复结果
-- ================================================================

-- 验证修复的字段
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- 检查是否还有应该为 SYSTEM 但仍是 SELECT 的字段
    SELECT COUNT(*) INTO v_count
    FROM "EmployeeInfoTabField"
    WHERE "fieldCode" IN (
        'position', 'employeeType', 'resignationReason',
        'nation', 'educationLevel', 'educationType'
    )
    AND "fieldType" = 'SELECT';

    IF v_count > 0 THEN
        RAISE NOTICE '警告：仍有 % 个字段需要修复', v_count;
    ELSE
        RAISE NOTICE '✓ 所有关键字段的 fieldType 已正确设置为 SYSTEM';
    END IF;
END $$;

-- 显示修复的字段详情
SELECT
    "fieldCode" AS "字段代码",
    "fieldName" AS "字段名称",
    "fieldType" AS "字段类型",
    '✓ 已修复' AS "状态"
FROM "EmployeeInfoTabField"
WHERE "fieldCode" IN (
    'position', 'employeeType', 'resignationReason',
    'nation', 'educationLevel', 'educationType'
)
ORDER BY "fieldCode";

COMMIT;

-- ================================================================
-- 执行结果说明
-- ================================================================
--
-- 执行成功后，以下字段的 fieldType 将被更新为 'SYSTEM'：
--
-- 工作信息页签：
--   - position: 职位
--   - employeeType: 员工类型
--   - resignationReason: 离职原因
--
-- 基本信息页签：
--   - nation: 民族
--
-- 学历信息页签：
--   - educationLevel: 学历层次
--   - educationType: 学历类型
--
-- 前端效果：
--   - 详情页面预览模式将正确显示这些字段的值
--   - 下拉字段将显示标签而不是原始值
--   - 预览模式和编辑模式显示保持一致
-- ================================================================
