-- ================================================================================
-- 生产环境修复SQL - 字段类型问题
-- ================================================================================
-- 问题：新增人员时性别等字段未显示
-- 原因：生产环境fieldType=SELECT_SINGLE，前端只识别SYSTEM
-- 策略：统一字段类型，创建CustomField记录
-- ================================================================================

BEGIN;

-- ================================================================================
-- 方案选择说明
-- ================================================================================
--
-- 方案1：快速修复（临时方案）
--   - 将所有SELECT_SINGLE改回SYSTEM
--   - 优点：快速恢复显示
--   - 缺点：无法使用数据源功能
--   - 适用：紧急恢复，后续需要完整修复
--
-- 方案2：完整修复（推荐方案）
--   - 保持SELECT_SINGLE类型
--   - 创建CustomField记录
--   - 关联数据源
--   - 优点：完整功能，支持数据源
--   - 缺点：需要配合前端代码更新
--   - 适用：标准更新流程
--
-- 请根据实际情况选择执行方案1或方案2
-- ================================================================================

-- ================================================================================
-- 方案1：快速修复 - 将SELECT_SINGLE改回SYSTEM
-- ================================================================================
-- 注意：执行前请先备份！执行此方案后，还需要执行方案2的完整修复

-- UPDATE "EmployeeInfoTabField"
-- SET "fieldType" = 'SYSTEM'
-- WHERE "fieldType" = 'SELECT_SINGLE'
-- AND "fieldCode" IN (
--     'gender', 'nation', 'maritalStatus', 'politicalStatus',
--     'educationLevel', 'educationType', 'jobLevel',
--     'employeeType', 'resignationReason', 'familyRelation', 'A05'
-- );

-- 验证修改结果
-- SELECT fieldCode, fieldType FROM "EmployeeInfoTabField"
-- WHERE fieldCode IN ('gender', 'nation', 'maritalStatus')
-- ORDER BY fieldCode;

-- ================================================================================
-- 方案2：完整修复 - 创建CustomField记录，保持SELECT_SINGLE类型
-- ================================================================================

-- Step 1: 为缺失系统内置字段创建CustomField记录
INSERT INTO "CustomField" (
    code,
    name,
    type,
    "dataSourceId",
    description,
    "isSystem",
    status,
    createdAt,
    updatedAt
)
SELECT
    eif."fieldCode",
    eif."fieldName",
    'SELECT_SINGLE',
    ds.id,
    '系统内置字段 - ' || eif."fieldName",
    true,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
INNER JOIN "DataSource" ds ON ds.code = eif."fieldCode"
LEFT JOIN "CustomField" cf ON cf.code = eif."fieldCode"
WHERE eif."fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
AND cf.id IS NULL  -- 只插入不存在的记录
AND ds.id IS NOT NULL;  -- 确保数据源存在

-- Step 2: 统一字段类型为SELECT_SINGLE
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldType" IN ('SELECT', 'SYSTEM')
AND "fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

-- Step 3: 更新CustomField表的类型（如果有记录的话）
UPDATE "CustomField"
SET type = 'SELECT_SINGLE',
    updatedAt = CURRENT_TIMESTAMP
WHERE type IN ('SELECT', 'SYSTEM')
AND code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

-- Step 4: 验证修复结果
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif."fieldType" AS tab_fieldType,
    cf.id AS customFieldId,
    cf.type AS customField_type,
    cf."dataSourceId",
    ds.code AS dataSourceCode,
    COUNT(dso.id) AS optionCount,
    CASE
        WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) > 0 THEN '✓ 完整'
        WHEN cf.id IS NULL THEN '✗ 缺少CustomField'
        WHEN ds.id IS NULL THEN '✗ 缺少数据源'
        WHEN COUNT(dso.id) = 0 THEN '✗ 数据源无选项'
        ELSE '? 未知状态'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
GROUP BY eif.fieldCode, eif.fieldName, eif."fieldType", cf.id, cf.type, cf."dataSourceId", ds.code
ORDER BY eif.fieldCode;

-- 预期结果：所有字段应该显示为 '✓ 完整'

COMMIT;

-- ================================================================================
-- 修复后验证
-- ================================================================================

-- 验证1: 统计CustomField记录数
-- 应该返回11
-- SELECT COUNT(DISTINCT code) FROM "CustomField"
-- WHERE code IN (
--     'gender', 'nation', 'maritalStatus', 'politicalStatus',
--     'educationLevel', 'educationType', 'jobLevel',
--     'employeeType', 'resignationReason', 'familyRelation', 'A05'
-- );

-- 验证2: 检查字段类型统一性
-- 应该返回0（无不一致）
-- SELECT COUNT(*) FROM "EmployeeInfoTabField" eif
-- LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
-- WHERE eif.fieldCode IN (
--     'gender', 'nation', 'maritalStatus', 'politicalStatus',
--     'educationLevel', 'educationType', 'jobLevel',
--     'employeeType', 'resignationReason', 'familyRelation', 'A05'
-- )
-- AND (eif."fieldType" != 'SELECT_SINGLE' OR cf.type != 'SELECT_SINGLE');

-- 验证3: 检查API返回数据（模拟）
-- SELECT fieldCode, fieldName, fieldType
-- FROM "EmployeeInfoTabField" eif
-- JOIN "EmployeeInfoTabGroup" g ON g.id = eif."groupId"
-- JOIN "EmployeeInfoTab" t ON t.id = g."tabId"
-- WHERE t.code = 'basic_info'
--   AND g.status = 'ACTIVE'
--   AND eif.fieldCode IN ('gender', 'nation', 'maritalStatus')
-- ORDER BY eif.sort;

-- ================================================================================
-- 重要提示
-- ================================================================================
--
-- 1. 执行SQL前务必备份数据库！
-- 2. 建议先在测试环境验证
-- 3. 执行后需要更新前端代码以支持SELECT_SINGLE类型
-- 4. 清除浏览器缓存
-- 5. 验证所有字段正常显示和工作
--
-- ================================================================================
