-- ========================================
-- 系统内置字段数据源完整关联脚本（生产环境PostgreSQL）
-- ========================================
-- 用途:
--   1. 清理 EmployeeInfoTabField 中的重复记录
--   2. 统一命名规范为驼峰命名（camelCase）
--   3. 确保所有需要下拉选项的字段都关联到数据源
--   4. 后续通过查找项管理数据选项
-- ========================================

\echo ''
\echo '========================================'
\echo '系统内置字段数据源完整关联'
\echo '========================================'
\echo ''

-- ========================================
-- 第一步：检查当前状态
-- ========================================

\echo '【第一步】检查当前状态'
\echo '----------------------------------------'

\echo '1.1 查看重复记录:'

SELECT
    fieldCode AS "字段代码",
    fieldName AS "字段名称",
    fieldType AS "字段类型",
    COUNT(*) AS "数量",
    STRING_AGG(CAST(id AS VARCHAR), ',') AS "ID列表"
FROM "EmployeeInfoTabField"
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'position', 'rank',
    'marital_status', 'political_status', 'education_level',
    'employee_type', 'work_status', 'employment_status'
)
GROUP BY fieldCode, fieldName, fieldType
HAVING COUNT(*) > 1
ORDER BY fieldCode;

\echo ''

\echo '1.2 查看命名不统一的情况:'

SELECT
    fieldCode AS "字段代码",
    fieldName AS "字段名称",
    fieldType AS "字段类型"
FROM "EmployeeInfoTabField"
WHERE fieldCode IN (
    'marital_status', 'political_status', 'education_level',
    'employee_type', 'work_status', 'employment_status',
    'job_level', 'resignation_reason', 'education_type',
    'family_relation'
)
ORDER BY fieldCode;

\echo ''

-- ========================================
-- 第二步：清理重复记录
-- ========================================

\echo '【第二步】清理重复记录'
\echo '----------------------------------------'

\echo '2.1 删除重复的 SYSTEM 类型记录（保留 SELECT 类型）:'

-- 使用 CTE 删除重复记录
WITH ranked_fields AS (
    SELECT
        id,
        fieldCode,
        fieldType,
        ROW_NUMBER() OVER (
            PARTITION BY fieldCode, fieldName
            ORDER BY
                CASE fieldType
                    WHEN 'SELECT' THEN 1
                    WHEN 'CUSTOM' THEN 2
                    ELSE 3
                END,
                id ASC
        ) AS rn
    FROM "EmployeeInfoTabField"
    WHERE fieldCode IN (
        'gender', 'nation', 'maritalStatus', 'politicalStatus',
        'educationLevel', 'employeeType', 'position', 'rank',
        'marital_status', 'political_status', 'education_level',
        'employee_type', 'work_status', 'employment_status'
    )
)
DELETE FROM "EmployeeInfoTabField"
WHERE id IN (
    SELECT id FROM ranked_fields WHERE rn > 1
);

\echo '✓ 已删除重复记录'

\echo ''

\echo '2.2 验证重复记录清理结果:'

SELECT
    fieldCode AS "字段代码",
    COUNT(*) AS "数量"
FROM "EmployeeInfoTabField"
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'position', 'rank'
)
GROUP BY fieldCode
HAVING COUNT(*) > 1;

\echo ''

-- ========================================
-- 第三步：统一命名规范（改为驼峰）
-- ========================================

\echo '【第三步】统一命名规范（改为驼峰命名）'
\echo '----------------------------------------'

\echo '3.1 更新 EmployeeInfoTabField 的 fieldCode:'

UPDATE "EmployeeInfoTabField"
SET fieldCode = CASE
    WHEN fieldCode = 'marital_status' THEN 'maritalStatus'
    WHEN fieldCode = 'political_status' THEN 'politicalStatus'
    WHEN fieldCode = 'education_level' THEN 'educationLevel'
    WHEN fieldCode = 'employee_type' THEN 'employeeType'
    WHEN fieldCode = 'work_status' THEN 'workStatus'
    WHEN fieldCode = 'employment_status' THEN 'employmentStatus'
    WHEN fieldCode = 'job_level' THEN 'jobLevel'
    WHEN fieldCode = 'resignation_reason' THEN 'resignationReason'
    WHEN fieldCode = 'education_type' THEN 'educationType'
    WHEN fieldCode = 'family_relation' THEN 'familyRelation'
    ELSE fieldCode
END
WHERE fieldCode IN (
    'marital_status', 'political_status', 'education_level', 'employee_type',
    'work_status', 'employment_status', 'job_level', 'resignation_reason',
    'education_type', 'family_relation'
);

\echo '✓ 已更新 EmployeeInfoTabField 命名'

\echo ''

\echo '3.2 更新 CustomField 的 code（改为驼峰）:'

UPDATE "CustomField"
SET code = CASE
    WHEN code = 'marital_status' THEN 'maritalStatus'
    WHEN code = 'political_status' THEN 'politicalStatus'
    WHEN code = 'education_level' THEN 'educationLevel'
    WHEN code = 'employee_type' THEN 'employeeType'
    WHEN code = 'work_status' THEN 'workStatus'
    WHEN code = 'employment_status' THEN 'employmentStatus'
    WHEN code = 'job_level' THEN 'jobLevel'
    WHEN code = 'resignation_reason' THEN 'resignationReason'
    WHEN code = 'education_type' THEN 'educationType'
    WHEN code = 'family_relation' THEN 'familyRelation'
    ELSE code
END
WHERE code IN (
    'marital_status', 'political_status', 'education_level', 'employee_type',
    'work_status', 'employment_status', 'job_level', 'resignation_reason',
    'education_type', 'family_relation'
);

\echo '✓ 已更新 CustomField 命名'

\echo ''

-- ========================================
-- 第四步：创建缺失的 CustomField 记录
-- ========================================

\echo '【第四步】创建缺失的 CustomField 记录'
\echo '----------------------------------------'

\echo '4.1 插入 position（职位）:'

INSERT INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
)
SELECT
    'position',
    '职位',
    'SELECT',
    id,
    true,
    NULL,
    'work',
    11,
    true,
    'ACTIVE',
    NOW(),
    NOW()
FROM "DataSource"
WHERE code = 'POSITION' AND "isSystem" = true
ON CONFLICT (code) DO NOTHING;

\echo '✓ position'

\echo '4.2 插入 rank（职级）:'

INSERT INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
)
SELECT
    'rank',
    '职级',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL' AND "isSystem" = true),
    false,
    NULL,
    'work',
    12,
    true,
    'ACTIVE',
    NOW(),
    NOW()
ON CONFLICT (code) DO NOTHING;

\echo '✓ rank'

\echo '4.3 插入 workStatus（工作状态）:'

INSERT INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
)
SELECT
    'workStatus',
    '工作状态',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS' AND "isSystem" = true),
    true,
    NULL,
    'work',
    10,
    true,
    'ACTIVE',
    NOW(),
    NOW()
ON CONFLICT (code) DO NOTHING;

\echo '✓ workStatus'

\echo '4.4 插入 employmentStatus（在职状态）:'

INSERT INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
)
SELECT
    'employmentStatus',
    '在职状态',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'EMPLOYMENT_STATUS' AND "isSystem" = true),
    true,
    NULL,
    'work',
    13,
    true,
    'ACTIVE',
    NOW(),
    NOW()
ON CONFLICT (code) DO NOTHING;

\echo '✓ employmentStatus'

\echo ''

-- ========================================
-- 第五步：更新 EmployeeInfoTabField 的 fieldType
-- ========================================

\echo '【第五步】更新 EmployeeInfoTabField 的 fieldType 为 SELECT'
\echo '----------------------------------------'

UPDATE "EmployeeInfoTabField"
SET fieldType = 'SELECT'
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'position', 'rank',
    'workStatus', 'employmentStatus', 'resignationReason',
    'educationType', 'familyRelation'
)
AND fieldType != 'SELECT';

\echo '✓ 已更新所有需要数据源的 fieldType 为 SELECT'

\echo ''

-- ========================================
-- 第六步：验证结果
-- ========================================

\echo '【第六步】验证结果'
\echo '----------------------------------------'

\echo '6.1 验证 EmployeeInfoTabField:'

SELECT
    fieldCode AS "字段代码",
    fieldName AS "字段名称",
    fieldType AS "字段类型"
FROM "EmployeeInfoTabField"
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'position', 'rank',
    'workStatus', 'employmentStatus', 'resignationReason'
)
ORDER BY fieldCode;

\echo ''

\echo '6.2 验证 CustomField 与 DataSource 的关联:'

SELECT
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) > 0 THEN '✓ 有选项'
        ELSE '✗ 无选项'
    END AS "状态"
FROM "CustomField" cf
INNER JOIN "DataSource" d ON d.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = true
WHERE cf.code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'position', 'rank',
    'workStatus', 'employmentStatus', 'resignationReason',
    'educationType', 'familyRelation'
)
GROUP BY cf.id, cf.code, cf.name, d.code, d.name
ORDER BY cf.code;

\echo ''

\echo '========================================'
\echo '✓ 系统内置字段数据源关联完成！'
\echo '========================================'
\echo ''
\echo '下一步操作：'
\echo '1. 重启应用: pm2 restart jy-backend'
\echo '2. 测试API: curl -X GET http://your-domain/api/hr/employee-info-tabs/display'
\echo '3. 检查前端下拉框是否正常显示选项'
\echo ''
\echo '说明：'
\echo '- 所有系统内置字段已统一使用驼峰命名'
\echo '- 所有字段已关联到查找项数据源'
\echo '- 后续通过查找项管理数据选项'
\echo ''
