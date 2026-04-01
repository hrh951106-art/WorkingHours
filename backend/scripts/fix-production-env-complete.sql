-- ========================================
-- 生产环境完整修复SQL (PostgreSQL)
-- ========================================
-- 用途: 修复生产环境的下拉字段配置问题
-- 问题:
--   1. CustomField表缺少系统内置字段
--   2. EmployeeInfoTabField的fieldType都是SYSTEM
--   3. 数据源重复（大小写问题）
-- ========================================

\echo ''
\echo '========================================'
\echo '生产环境完整修复脚本'
\echo '========================================'
\echo ''

-- ========================================
-- 第一步：检查并清理重复的数据源
-- ========================================

\echo '【第一步】检查并清理重复的数据源'
\echo '----------------------------------------'

-- 显示当前存在的重复数据源
SELECT
    code AS "数据源代码",
    name AS "数据源名称",
    type AS "类型",
    "isSystem" AS "系统内置"
FROM "DataSource"
WHERE code IN (
    'EDUCATION_LEVEL', 'EDUCATION_TYPE', 'GENDER',
    'MARITAL_STATUS', 'POLITICAL_STATUS'
)
ORDER BY code;

\echo ''
\echo '说明: 如果上述查询返回结果，说明存在重复数据源'
\echo '建议: 统一使用小写格式，保留小写版本，删除大写版本'
\echo ''

-- 可选：删除重复的大写数据源（谨慎执行）
-- 请先确认哪些数据源是重复的，然后再执行以下删除操作

-- DELETE FROM "DataSourceOption"
-- WHERE "dataSourceId" IN (SELECT id FROM "DataSource" WHERE code IN ('EDUCATION_LEVEL', 'EDUCATION_TYPE', 'GENDER', 'MARITAL_STATUS', 'POLITICAL_STATUS'));

-- DELETE FROM "DataSource"
-- WHERE code IN ('EDUCATION_LEVEL', 'EDUCATION_TYPE', 'GENDER', 'MARITAL_STATUS', 'POLITICAL_STATUS');

\echo ''
\echo '⚠️  警告: 请手动确认后再删除重复数据源'
\echo ''


-- ========================================
-- 第二步：插入系统内置CustomField记录
-- ========================================

\echo '【第二步】插入系统内置CustomField记录'
\echo '----------------------------------------'

INSERT INTO "CustomField" (
    code, name, type, "dataSourceId",
    "isRequired", "defaultValue", "group", sort,
    "isSystem", status, "createdAt", "updatedAt"
)
VALUES
    -- 基本信息字段
    ('gender', '性别', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'gender'),
        true, NULL, '基本信息', 1,
        true, 'ACTIVE', NOW(), NOW()),

    ('nation', '民族', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'nation'),
        false, NULL, '基本信息', 2,
        true, 'ACTIVE', NOW(), NOW()),

    ('maritalStatus', '婚姻状况', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'marital_status'),
        true, NULL, '基本信息', 3,
        true, 'ACTIVE', NOW(), NOW()),

    ('politicalStatus', '政治面貌', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'political_status'),
        false, NULL, '基本信息', 4,
        true, 'ACTIVE', NOW(), NOW()),

    -- 工作信息字段
    ('jobLevel', '职级', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'job_level'),
        true, NULL, '工作信息', 5,
        true, 'ACTIVE', NOW(), NOW()),

    ('employeeType', '员工类型', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'employee_type'),
        true, NULL, '工作信息', 6,
        true, 'ACTIVE', NOW(), NOW()),

    ('employmentStatus', '在职状态', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'employment_status'),
        true, NULL, '工作信息', 7,
        true, 'ACTIVE', NOW(), NOW()),

    ('resignationReason', '离职原因', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'resignation_reason'),
        false, NULL, '工作信息', 8,
        true, 'ACTIVE', NOW(), NOW()),

    -- 学历信息字段
    ('educationLevel', '学历层次', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'education_level'),
        true, NULL, '学历信息', 9,
        true, 'ACTIVE', NOW(), NOW()),

    ('educationType', '学历类型', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'education_type'),
        true, NULL, '学历信息', 10,
        true, 'ACTIVE', NOW(), NOW()),

    -- 家庭信息字段
    ('familyRelation', '家庭关系', 'SELECT_SINGLE',
        (SELECT id FROM "DataSource" WHERE code = 'family_relation'),
        true, NULL, '家庭信息', 11,
        true, 'ACTIVE', NOW(), NOW())

ON CONFLICT (code) DO NOTHING;

\echo '✓ 已插入系统内置CustomField记录'
\echo ''


-- ========================================
-- 第三步：更新EmployeeInfoTabField的fieldType为SELECT
-- ========================================

\echo '【第三步】更新EmployeeInfoTabField的fieldType为SELECT'
\echo '----------------------------------------'

-- 更新所有需要下拉的字段
UPDATE "EmployeeInfoTabField"
SET fieldType = 'SELECT',
    "updatedAt" = NOW()
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel', 'employeeType',
    'employmentStatus', 'resignationReason', 'familyRelation'
)
AND fieldType != 'SELECT';

\echo '✓ 已更新EmployeeInfoTabField的fieldType'
\echo ''


-- ========================================
-- 第四步：验证修复结果
-- ========================================

\echo '【第四步】验证修复结果'
\echo '========================================'
\echo ''

\echo '验证1: CustomField系统内置字段统计'
\echo '----------------------------------------'

SELECT
    COUNT(*) AS 'CustomField总数',
    SUM(CASE WHEN "isSystem" = true THEN 1 ELSE 0 END) AS '系统内置字段数',
    SUM(CASE WHEN "isSystem" = false THEN 1 ELSE 0 END) AS '自定义字段数'
FROM "CustomField";

\echo ''

\echo '验证2: 系统内置CustomField列表'
\echo '----------------------------------------'

SELECT
    code AS "字段代码",
    name AS "字段名称",
    type AS "字段类型",
    "dataSourceId" AS "数据源ID",
    "isSystem" AS "系统内置",
    status AS "状态"
FROM "CustomField"
WHERE "isSystem" = true
ORDER BY sort;

\echo ''

\echo '验证3: EmployeeInfoTabField字段类型验证'
\echo '----------------------------------------'

SELECT
    fieldCode AS "字段代码",
    fieldName AS "字段名称",
    fieldType AS "当前类型",
    CASE
        WHEN fieldType = 'SELECT' THEN '✅ 正确'
        ELSE '❌ 错误'
    END AS "状态"
FROM "EmployeeInfoTabField"
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel', 'employeeType',
    'employmentStatus', 'resignationReason', 'familyRelation'
)
ORDER BY fieldCode;

\echo ''

\echo '验证4: 数据源关联完整性检查'
\echo '----------------------------------------'

SELECT
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) > 0 THEN '✅ 有选项'
        ELSE '❌ 无选项'
    END AS "状态"
FROM "CustomField" cf
INNER JOIN "DataSource" d ON d.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE cf."isSystem" = true
GROUP BY cf.id, cf.code, cf.name, d.code, d.name
ORDER BY cf.code;

\echo ''

\echo '验证5: 字段命名一致性检查'
\echo '----------------------------------------'

SELECT
    f.fieldCode AS "页签字段代码",
    cf.code AS "CustomField代码",
    CASE
        WHEN f.fieldCode = cf.code THEN '✅ 一致'
        ELSE '❌ 不一致'
    END AS "一致性状态"
FROM "EmployeeInfoTabField" f
INNER JOIN "CustomField" cf ON cf.code = f.fieldCode
WHERE f.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel', 'employeeType'
)
ORDER BY f.fieldCode;

\echo ''

\echo '========================================'
\echo '✅ 生产环境修复完成！'
\echo '========================================'
\echo ''
\echo '修复内容:'
\echo '  1. 创建了11个系统内置CustomField记录'
\echo '  2. 更新了所有下拉字段的fieldType为SELECT'
\echo '  3. 验证了修复结果'
\echo ''
\echo '⚠️  注意事项:'
\echo '  1. 如果存在重复数据源，请手动清理'
\echo '  2. 建议统一使用小写格式（如gender、marital_status）'
\echo '  3. 清理重复数据源前请先备份数据库'
\echo ''
\echo '下一步操作:'
\echo '  1. 重启应用: pm2 restart jy-backend'
\echo '  2. 测试API: curl -X GET http://your-domain/api/hr/employee-info-tabs/display'
\echo '  3. 检查前端下拉框是否正常显示'
\echo ''
\echo '清理重复数据源（可选）:'
\echo '  如果确认存在重复，执行以下步骤:'
\echo '  1. 查看重复数据源: SELECT code, name FROM "DataSource" WHERE code = ''EDUCATION_LEVEL'';'
\echo '  2. 删除重复选项: DELETE FROM "DataSourceOption" WHERE "dataSourceId" = <重复数据源ID>;'
\echo '  3. 删除重复数据源: DELETE FROM "DataSource" WHERE code = ''EDUCATION_LEVEL'';'
\echo ''
