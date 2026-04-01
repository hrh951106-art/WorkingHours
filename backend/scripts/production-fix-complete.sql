-- ================================================================================
-- 生产环境数据修复SQL脚本
-- ================================================================================
-- 修复时间: 2026-04-01
-- 数据库: PostgreSQL
-- 说明: 修复系统字段无法选择数据源、删除重复数据源、修复字段类型等问题
-- ================================================================================

-- 执行前请确认：
-- 1. 已备份数据库
-- 2. 使用超级用户或具有足够权限的用户执行
-- 3. 在非业务高峰期执行
-- ================================================================================

BEGIN;

-- ================================================================================
-- 第一步：检查和修复系统内置字段的CustomField记录
-- ================================================================================

-- 1.1 查询当前系统内置字段配置
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType,
    cf.id as customFieldId,
    cf.code as customFieldCode,
    ds.id as dataSourceId,
    ds.code as dataSourceCode
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
ORDER BY eif.fieldCode;

-- 1.2 为缺失系统内置字段创建CustomField记录（不覆盖已存在的）
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
    eif.fieldCode::text,
    eif.fieldName::text,
    'SELECT_SINGLE'::text,
    ds.id::integer,
    '系统内置字段 - ' || eif.fieldName::text,
    true,
    'ACTIVE'::text,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.code = eif.fieldCode
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
AND cf.id IS NULL  -- 只插入不存在的记录
AND ds.id IS NOT NULL;  -- 确保数据源存在

-- ================================================================================
-- 第二步：修复字段类型错误（SELECT改为SELECT_SINGLE）
-- ================================================================================

-- 2.1 修复CustomField表的字段类型
UPDATE "CustomField"
SET type = 'SELECT_SINGLE',
    updatedAt = CURRENT_TIMESTAMP
WHERE type IN ('SELECT', 'SELECT_SINGLE')
AND code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

-- 2.2 修复EmployeeInfoTabField表的字段类型
UPDATE "EmployeeInfoTabField"
SET "fieldType" = 'SELECT_SINGLE'
WHERE "fieldType" IN ('SELECT', 'SELECT_SINGLE')
AND "fieldCode" IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
);

-- ================================================================================
-- 第三步：删除重复的数据源记录
-- ================================================================================

-- 3.1 查找重复的数据源（保留ID最小的记录）
WITH duplicate_sources AS (
    SELECT
        code,
        array_agg(id ORDER BY id) AS ids,
        array_agg(name ORDER BY id) AS names,
        COUNT(*) AS count
    FROM "DataSource"
    GROUP BY code
    HAVING COUNT(*) > 1
)
SELECT
    code,
    ids,
    names,
    count
FROM duplicate_sources
ORDER BY code;

-- 3.2 删除重复的数据源（保留ID最小的记录）
WITH duplicate_sources AS (
    SELECT
        code,
        array_agg(id ORDER BY id) AS ids,
        COUNT(*) AS count
    FROM "DataSource"
    GROUP BY code
    HAVING COUNT(*) > 1
),
sources_to_delete AS (
    SELECT
        unnest(ids[2:array_length(ids, 1)]) AS id_to_delete
    FROM duplicate_sources
)
DELETE FROM "DataSource"
WHERE id IN (SELECT id_to_delete FROM sources_to_delete);

-- 3.3 检查删除后的数据源状态
SELECT
    code,
    name,
    COUNT(*) OVER (PARTITION BY code) AS count
FROM "DataSource"
WHERE code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation'
)
GROUP BY code, name
ORDER BY code;

-- ================================================================================
-- 第四步：修复CustomField与DataSource的关联
-- ================================================================================

-- 4.1 检查CustomField的dataSourceId是否正确
SELECT
    cf.code AS fieldCode,
    cf.name AS fieldName,
    cf.type,
    cf."dataSourceId",
    ds.code AS dataSourceCode,
    ds.name AS dataSourceName,
    COUNT(dso.id) AS optionCount
FROM "CustomField" cf
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE cf.code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
ORDER BY cf.code;

-- 4.2 修复CustomField的dataSourceId（根据code匹配）
UPDATE "CustomField" cf
SET "dataSourceId" = ds.id,
    updatedAt = CURRENT_TIMESTAMP
FROM "DataSource" ds
WHERE cf.code = ds.code
AND cf.code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
AND (cf."dataSourceId" IS NULL OR cf."dataSourceId" != ds.id);

-- ================================================================================
-- 第五步：验证修复结果
-- ================================================================================

-- 5.1 验证所有系统内置字段都有CustomField记录
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif."fieldType",
    cf.id AS "customFieldId",
    cf.type AS "customFieldType",
    cf."dataSourceId",
    ds.code AS "dataSourceCode",
    ds.name AS "dataSourceName",
    COUNT(dso.id) AS "optionCount"
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
GROUP BY
    eif.fieldCode, eif.fieldName, eif."fieldType",
    cf.id, cf.type, cf."dataSourceId",
    ds.code, ds.name
ORDER BY eif.fieldCode;

-- 5.2 验证没有重复的数据源
SELECT
    code,
    COUNT(*) AS count
FROM "DataSource"
GROUP BY code
HAVING COUNT(*) > 1;

-- 5.3 验证字段类型统一性
SELECT
    eif.fieldCode,
    eif."fieldType" AS "tabFieldType",
    cf.type AS "customFieldType",
    CASE
        WHEN eif."fieldType" != cf.type THEN 'TYPE_MISMATCH'
        ELSE 'OK'
    END AS "status"
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
ORDER BY eif.fieldCode;

-- 5.4 统计修复结果
SELECT
    '系统内置字段CustomField记录' AS "检查项",
    COUNT(DISTINCT cf.id) AS "数量"
FROM "CustomField" cf
WHERE cf.code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)

UNION ALL

SELECT
    '关联数据源的字段' AS "检查项",
    COUNT(DISTINCT cf.id) AS "数量"
FROM "CustomField" cf
WHERE cf."dataSourceId" IS NOT NULL
AND cf.code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)

UNION ALL

SELECT
    '类型为SELECT_SINGLE的字段' AS "检查项",
    COUNT(DISTINCT eif.fieldCode) AS "数量"
FROM "EmployeeInfoTabField" eif
WHERE eif."fieldType" = 'SELECT_SINGLE'
AND eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)

UNION ALL

SELECT
    '有数据源选项的字段' AS "检查项",
    COUNT(DISTINCT ds.code) AS "数量"
FROM "DataSource" ds
INNER JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE ds.code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation'
);

COMMIT;

-- ================================================================================
-- 执行完成提示
-- ================================================================================
-- 如果执行成功，您应该看到：
-- 1. 所有系统内置字段都有CustomField记录（11条）
-- 2. 所有字段都关联到正确的数据源
-- 3. 所有字段类型都是SELECT_SINGLE
-- 4. 没有重复的数据源
-- 5. 每个数据源都有对应的选项
-- ================================================================================
