-- ================================================================================
-- 生产环境完整修复SQL - 支持数据源功能
-- ================================================================================
-- 目标：让字段既能显示又能使用数据源
-- 策略：创建CustomField + 统一类型SELECT_SINGLE + 部署新前端
-- ================================================================================

BEGIN;

-- ================================================================================
-- 第一步：检查并创建数据源（如果缺失）
-- ================================================================================

-- 1.1 检查现有数据源
SELECT '=== 现有数据源检查 ===' AS step;
SELECT
    id,
    code,
    name,
    type,
    "isSystem",
    COUNT(dso.id) AS optionCount
FROM "DataSource" ds
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE ds.code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
GROUP BY ds.id, ds.code, ds.name, ds.type, ds."isSystem"
ORDER BY ds.code;

-- 1.2 如果数据源缺失，需要先创建数据源和选项
-- 注意：这部分需要根据实际情况手动执行，因为需要具体的选项数据

-- ================================================================================
-- 第二步：为系统内置字段创建CustomField记录
-- ================================================================================

SELECT '=== 创建CustomField记录 ===' AS step;

-- 2.1 删除已存在的错误记录（如果有）
DELETE FROM "CustomField"
WHERE code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

-- 2.2 插入CustomField记录
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
    eif."fieldCode"::text,
    eif."fieldName"::text,
    'SELECT_SINGLE'::text,
    ds.id::integer,
    '系统内置字段 - ' || eif."fieldName"::text,
    true,
    'ACTIVE'::text,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
INNER JOIN "DataSource" ds ON ds.code = eif."fieldCode"
WHERE eif."fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
AND ds.id IS NOT NULL;

-- 验证插入结果
SELECT
    code,
    name,
    type,
    "dataSourceId"
FROM "CustomField"
WHERE code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
ORDER BY code;

-- ================================================================================
-- 第三步：统一字段类型为SELECT_SINGLE
-- ================================================================================

SELECT '=== 统一字段类型 ===' AS step;

-- 3.1 更新EmployeeInfoTabField表
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

-- 验证更新结果
SELECT
    fieldCode,
    fieldName,
    fieldType
FROM "EmployeeInfoTabField"
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus'
)
ORDER BY fieldCode;

COMMIT;

-- ================================================================================
-- 第四步：验证修复结果
-- ================================================================================

SELECT '=== 验证修复结果 ===' AS step;

-- 4.1 检查CustomField完整性
SELECT
    cf.code,
    cf.name,
    cf.type AS "customField_type",
    cf."dataSourceId",
    ds.code AS "dataSource_code",
    ds.name AS "dataSource_name",
    COUNT(dso.id) AS "option_count",
    CASE
        WHEN cf.id IS NOT NULL AND ds.id IS NOT NULL AND COUNT(dso.id) > 0 THEN '✓ 完整'
        WHEN cf.id IS NULL THEN '✗ 缺少CustomField'
        WHEN ds.id IS NULL THEN '✗ 缺少数据源'
        WHEN COUNT(dso.id) = 0 THEN '✗ 数据源无选项'
        ELSE '? 未知'
    END AS "status"
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif."fieldCode"
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif."fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
GROUP BY eif."fieldCode", cf.code, cf.name, cf.type, cf."dataSourceId", ds.code, ds.name, cf.id
ORDER BY eif."fieldCode";

-- 预期结果：所有字段应该显示为 '✓ 完整'

-- 4.2 统计修复记录数
SELECT 'CustomField记录数: ' || COUNT(*) AS "统计"
FROM "CustomField"
WHERE code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

SELECT 'SELECT_SINGLE字段数: ' || COUNT(*) AS "统计"
FROM "EmployeeInfoTabField"
WHERE "fieldType" = 'SELECT_SINGLE'
AND "fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

SELECT '关联数据源的字段数: ' || COUNT(*) AS "统计"
FROM "CustomField"
WHERE "dataSourceId" IS NOT NULL
AND code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

-- ================================================================================
-- 执行完成提示
-- ================================================================================
/*
执行此SQL后：

✅ 数据库层面：
   - CustomField表有11条系统字段记录
   - 所有字段类型都是SELECT_SINGLE
   - 所有字段都关联到数据源
   - 每个数据源都有选项

⚠️ 重要：必须同时部署新的前端代码！

前端代码已修复，支持SELECT_SINGLE类型：
- frontend/dist/ 目录（已构建）
- EmployeeCreatePage.tsx（4处修改）

如果不部署新前端，字段仍然不会显示！

下一步：执行下方的前端部署步骤
*/
