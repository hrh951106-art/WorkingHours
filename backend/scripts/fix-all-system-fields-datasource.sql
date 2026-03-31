-- ========================================
-- 系统内置字段数据源完整关联脚本
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
-- 第一步：清理重复记录
-- ========================================

\echo '【第一步】清理 EmployeeInfoTabField 重复记录'
\echo '----------------------------------------'

\echo '1.1 查看当前重复记录:'

SELECT
    fieldCode,
    fieldName,
    fieldType,
    COUNT(*) AS count,
    GROUP_CONCAT(id) AS ids
FROM "EmployeeInfoTabField"
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'employeeType', 'position', 'jobLevel',
    'marital_status', 'political_status', 'education_level',
    'employee_type', 'work_status', 'employment_status'
)
GROUP BY fieldCode, fieldName, fieldType
HAVING COUNT(*) > 1;

\echo ''

\echo '1.2 删除重复的 SYSTEM 类型记录（保留 SELECT 类型）:'

-- 删除重复的 gender (SYSTEM)
DELETE FROM "EmployeeInfoTabField"
WHERE fieldCode = 'gender'
  AND fieldType = 'SYSTEM'
  AND id IN (
      SELECT id FROM "EmployeeInfoTabField"
      WHERE fieldCode = 'gender'
      AND fieldType = 'SYSTEM'
      LIMIT 999
  );

\echo '✓ 已删除重复的 gender (SYSTEM) 记录'

-- 删除重复的 nation (SYSTEM)
DELETE FROM "EmployeeInfoTabField"
WHERE fieldCode = 'nation'
  AND fieldType = 'SYSTEM'
  AND id IN (
      SELECT id FROM "EmployeeInfoTabField"
      WHERE fieldCode = 'nation'
      AND fieldType = 'SYSTEM'
      LIMIT 999
  );

\echo '✓ 已删除重复的 nation (SYSTEM) 记录'

-- 删除下划线命名的重复记录
DELETE FROM "EmployeeInfoTabField"
WHERE fieldCode IN ('marital_status', 'political_status', 'education_level', 'employee_type')
  AND fieldType IN ('SYSTEM', 'SELECT')
  AND id NOT IN (
      -- 每个字段只保留一条记录（最小的ID）
      SELECT MIN(id)
      FROM "EmployeeInfoTabField"
      WHERE fieldCode IN ('marital_status', 'political_status', 'education_level', 'employee_type')
      GROUP BY fieldCode
  );

\echo '✓ 已删除下划线命名的重复记录'

\echo ''

-- ========================================
-- 第二步：统一命名规范（改为驼峰）
-- ========================================

\echo '【第二步】统一命名规范（改为驼峰命名）'
\echo '----------------------------------------'

\echo '2.1 更新 EmployeeInfoTabField 的 fieldCode:'

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

\echo '2.2 更新 CustomField 的 code（改为驼峰）:'

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
-- 第三步：确保所有字段都关联到数据源
-- ========================================

\echo '【第三步】确保所有字段都关联到数据源'
\echo '----------------------------------------'

\echo '3.1 更新 DataSource 的 code（改为驼峰）:'

UPDATE "DataSource"
SET code = CASE
    WHEN code = 'marital_status' THEN 'MARITAL_STATUS'
    WHEN code = 'political_status' THEN 'POLITICAL_STATUS'
    WHEN code = 'education_level' THEN 'EDUCATION_LEVEL'
    WHEN code = 'employee_type' THEN 'EMPLOYEE_TYPE'
    WHEN code = 'work_status' THEN 'WORK_STATUS'
    WHEN code = 'employment_status' THEN 'EMPLOYMENT_STATUS'
    WHEN code = 'job_level' THEN 'JOB_LEVEL'
    WHEN code = 'resignation_reason' THEN 'RESIGNATION_REASON'
    WHEN code = 'education_type' THEN 'EDUCATION_TYPE'
    WHEN code = 'family_relation' THEN 'FAMILY_RELATION'
    ELSE code
END
WHERE code IN (
    'marital_status', 'political_status', 'education_level', 'employee_type',
    'work_status', 'employment_status', 'job_level', 'resignation_reason',
    'education_type', 'family_relation'
);

\echo '✓ 已更新 DataSource 命名'

\echo ''

\echo '3.2 更新 CustomField 的 dataSourceId（使用新的 DataSource code）:'

-- maritalStatus
UPDATE "CustomField"
SET "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'MARITAL_STATUS' AND "isSystem" = 1)
WHERE code = 'maritalStatus';

\echo '✓ maritalStatus → MARITAL_STATUS'

-- politicalStatus
UPDATE "CustomField"
SET "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'POLITICAL_STATUS' AND "isSystem" = 1)
WHERE code = 'politicalStatus';

\echo '✓ politicalStatus → POLITICAL_STATUS'

-- educationLevel
UPDATE "CustomField"
SET "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EDUCATION_LEVEL' AND "isSystem" = 1)
WHERE code = 'educationLevel';

\echo '✓ educationLevel → EDUCATION_LEVEL'

-- employeeType
UPDATE "CustomField"
SET "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE' AND "isSystem" = 1)
WHERE code = 'employeeType';

\echo '✓ employeeType → EMPLOYEE_TYPE'

\echo ''

-- ========================================
-- 第四步：创建缺失的 CustomField 记录
-- ========================================

\echo '【第四步】创建缺失的 CustomField 记录'
\echo '----------------------------------------'

\echo '4.1 插入 workStatus（工作状态）:'

INSERT OR IGNORE INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
) VALUES (
    'workStatus',
    '工作状态',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS' AND "isSystem" = 1),
    true,
    NULL,
    'work',
    10,
    true,
    'ACTIVE',
    datetime('now'),
    datetime('now')
);

\echo '✓ 已创建 workStatus'

\echo ''

\echo '4.2 插入 position（职位）:'

INSERT OR IGNORE INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
) VALUES (
    'position',
    '职位',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'POSITION' AND "isSystem" = 1),
    true,
    NULL,
    'work',
    11,
    true,
    'ACTIVE',
    datetime('now'),
    datetime('now')
);

\echo '✓ 已创建 position'

\echo ''

\echo '4.3 插入 rank（职级）:'

INSERT OR IGNORE INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
) VALUES (
    'rank',
    '职级',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL' AND "isSystem" = 1),
    false,
    NULL,
    'work',
    12,
    true,
    'ACTIVE',
    datetime('now'),
    datetime('now')
);

\echo '✓ 已创建 rank'

\echo ''

\echo '4.4 插入 employmentStatus（在职状态）:'

INSERT OR IGNORE INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
) VALUES (
    'employmentStatus',
    '在职状态',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'EMPLOYMENT_STATUS' AND "isSystem" = 1),
    true,
    NULL,
    'work',
    13,
    true,
    'ACTIVE',
    datetime('now'),
    datetime('now')
);

\echo '✓ 已创建 employmentStatus'

\echo ''

\echo '4.5 插入 resignationReason（离职原因）:'

INSERT OR IGNORE INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
) VALUES (
    'resignationReason',
    '离职原因',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'RESIGNATION_REASON' AND "isSystem" = 1),
    false,
    NULL,
    'work',
    14,
    true,
    'ACTIVE',
    datetime('now'),
    datetime('now')
);

\echo '✓ 已创建 resignationReason'

\echo ''

\echo '4.6 插入 educationType（学历类型）:'

INSERT OR IGNORE INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
) VALUES (
    'educationType',
    '学历类型',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'EDUCATION_TYPE' AND "isSystem" = 1),
    false,
    NULL,
    'education',
    15,
    true,
    'ACTIVE',
    datetime('now'),
    datetime('now')
);

\echo '✓ 已创建 educationType'

\echo ''

\echo '4.7 插入 familyRelation（家庭关系）:'

INSERT OR IGNORE INTO "CustomField" (
    code, name, type, "dataSourceId", "isRequired", "defaultValue",
    "group", sort, "isSystem", status, "createdAt", "updatedAt"
) VALUES (
    'familyRelation',
    '家庭关系',
    'SELECT',
    (SELECT id FROM "DataSource" WHERE code = 'FAMILY_RELATION' AND "isSystem" = 1),
    true,
    NULL,
    'family',
    16,
    true,
    'ACTIVE',
    datetime('now'),
    datetime('now')
);

\echo '✓ 已创建 familyRelation'

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

\echo '【第六步】验证修复结果'
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
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = 1
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
\echo '2. 测试API: curl -X GET http://localhost:3001/api/hr/employee-info-tabs/display'
\echo '3. 检查前端下拉框是否正常显示选项'
\echo ''
\echo '说明：'
\echo '- 所有系统内置字段已统一使用驼峰命名'
\echo '- 所有字段已关联到查找项数据源'
\echo '- 后续通过查找项管理数据选项'
\echo ''
