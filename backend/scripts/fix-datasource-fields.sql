-- ========================================
-- 系统内置字段数据源一键修复脚本
-- ========================================
-- 用途: 修复系统内置字段无法获取数据源的问题
-- 适用: PostgreSQL生产环境
-- ========================================

\echo ''
\echo '========================================'
\echo '系统内置字段数据源修复'
\echo '========================================'
\echo ''

\echo '【步骤 1】检查当前配置'
\echo '----------------------------------------'

SELECT
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "当前类型",
    cf.id AS "CustomField记录",
    d.code AS "数据源"
FROM "EmployeeInfoTabField" f
INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
LEFT JOIN "CustomField" cf ON cf.code = f.fieldCode
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
WHERE f.fieldCode IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType')
ORDER BY f.fieldCode;

\echo ''

\echo '【步骤 2】更新EmployeeInfoTabField字段类型'
\echo '----------------------------------------'

-- 更新需要数据源的SYSTEM字段为SELECT类型
UPDATE "EmployeeInfoTabField"
SET fieldType = 'SELECT'
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType'
)
  AND fieldType = 'SYSTEM';

\echo '已更新字段类型为SELECT'

\echo ''

\echo '【步骤 3】删除已存在的CustomField记录'
\echo '----------------------------------------'

DELETE FROM "CustomField"
WHERE code IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType');

\echo '已删除旧的CustomField记录'

\echo ''

\echo '【步骤 4】创建CustomField记录并关联数据源'
\echo '----------------------------------------'

INSERT INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired",
    "defaultValue", "group", sort, "isSystem", status,
    "createdAt", "updatedAt"
) VALUES
(
    'gender',
    '性别',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'GENDER' AND "isSystem" = true),
    true,
    NULL,
    'basic',
    1,
    true,
    'ACTIVE',
    NOW(),
    NOW()
),
(
    'nation',
    '民族',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'NATION' AND "isSystem" = true),
    false,
    NULL,
    'basic',
    2,
    true,
    'ACTIVE',
    NOW(),
    NOW()
),
(
    'maritalStatus',
    '婚姻状况',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'MARITAL_STATUS' AND "isSystem" = true),
    true,
    NULL,
    'basic',
    3,
    true,
    'ACTIVE',
    NOW(),
    NOW()
),
(
    'politicalStatus',
    '政治面貌',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'POLITICAL_STATUS' AND "isSystem" = true),
    false,
    NULL,
    'basic',
    4,
    true,
    'ACTIVE',
    NOW(),
    NOW()
),
(
    'educationLevel',
    '学历层次',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'EDUCATION' AND "isSystem" = true),
    true,
    NULL,
    'education',
    5,
    true,
    'ACTIVE',
    NOW(),
    NOW()
),
(
    'employeeType',
    '员工类型',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE' AND "isSystem" = true),
    true,
    NULL,
    'work',
    6,
    true,
    'ACTIVE',
    NOW(),
    NOW()
)
ON CONFLICT (code) DO UPDATE SET
    "dataSourceId" = EXCLUDED."dataSourceId",
    "updatedAt" = NOW();

\echo '已创建CustomField记录并关联数据源'

\echo ''

\echo '【步骤 5】验证修复结果'
\echo '----------------------------------------'

\echo '5.1 验证字段类型更新:'
SELECT
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "新类型",
    CASE
        WHEN f.fieldType = 'SELECT' THEN '✓ 正确'
        ELSE '✗ 仍然是SYSTEM'
    END AS "状态"
FROM "EmployeeInfoTabField" f
WHERE f.fieldCode IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType');

\echo ''

\echo '5.2 验证CustomField配置:'
SELECT
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    d.code AS "关联数据源",
    d.name AS "数据源名称",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) > 0 THEN '✓ 有选项'
        ELSE '✗ 无选项'
    END AS "状态"
FROM "CustomField" cf
INNER JOIN "DataSource" d ON d.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE cf.code IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType')
GROUP BY cf.id, cf.code, cf.name, d.code, d.name;

\echo ''

\echo '5.3 验证数据源选项示例（GENDER）:'
SELECT
    d.code AS "数据源",
    o.label AS "选项名称",
    o.value AS "选项值",
    o.sort AS "排序"
FROM "DataSource" d
INNER JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE d.code = 'GENDER'
ORDER BY o.sort;

\echo ''

\echo '========================================'
\echo '✓ 修复完成！'
\echo '========================================'
\echo ''
\echo '验证API接口:'
\echo '  curl -X GET http://your-domain/api/hr/employee-info-tabs/display'
\echo ''
\echo '如果问题仍然存在，请检查:'
\echo '  1. 后端代码是否已重新构建和部署'
\echo '  2. DataSource表是否有数据'
\echo '  3. 前端是否正确解析dataSource字段'
\echo ''
