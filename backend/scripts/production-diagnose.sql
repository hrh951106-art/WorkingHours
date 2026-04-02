-- ================================================================================
-- 生产环境问题排查SQL
-- ================================================================================
-- 问题：新增人员时性别等字段未显示
-- 作用：全面检查生产环境数据状态
-- ================================================================================

-- ================================================================================
-- 第一步：检查字段类型分布
-- ================================================================================

-- 1.1 检查系统内置字段的fieldType分布
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType,
    eif.isRequired,
    eif.isHidden,
    cf.id AS customFieldId,
    cf.type AS customFieldType
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
ORDER BY eif.fieldCode;

-- 预期结果分析：
-- - 如果 fieldType = 'SELECT_SINGLE' 且 customFieldId IS NULL：生产环境部分修复，但CustomField记录缺失
-- - 如果 fieldType = 'SYSTEM' 且 customFieldId IS NULL：生产环境未修复
-- - 如果 fieldType = 'SELECT_SINGLE' 且 customFieldId IS NOT NULL：生产环境已修复

-- ================================================================================
-- 第二步：检查CustomField记录
-- ================================================================================

-- 2.1 检查系统内置字段的CustomField记录
SELECT
    cf.code,
    cf.name,
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
GROUP BY cf.code, cf.name, cf.type, cf."dataSourceId", ds.code, ds.name
ORDER BY cf.code;

-- 预期结果：
-- - 应该有11条记录
-- - 每个记录的type应该是'SELECT_SINGLE'
-- - 每个记录都应该有dataSourceId
-- - optionCount应该大于0

-- ================================================================================
-- 第三步：检查数据源配置
-- ================================================================================

-- 3.1 检查所有相关数据源
SELECT
    ds.id,
    ds.code,
    ds.name,
    ds.type,
    ds."isSystem",
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

-- 预期结果：
-- - 应该有11条数据源记录
-- - 每个数据源都应该有选项（optionCount > 0）

-- 3.2 检查是否有重复的数据源
SELECT
    code,
    COUNT(*) AS count,
    array_agg(id ORDER BY id) AS ids
FROM "DataSource"
WHERE code IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
GROUP BY code
HAVING COUNT(*) > 1;

-- 预期结果：应该返回0行（无重复）

-- ================================================================================
-- 第四步：检查API返回数据格式
-- ================================================================================

-- 4.1 模拟API查询 - 获取基本信息页签的所有字段
SELECT
    t.code AS tabCode,
    t.name AS tabName,
    g.code AS groupCode,
    g.name AS groupName,
    g.status AS groupStatus,
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType,
    eif.isRequired,
    eif.isHidden,
    eif.sort
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
JOIN "EmployeeInfoTabField" eif ON eif."groupId" = g.id
WHERE t.code = 'basic_info'
  AND g.status = 'ACTIVE'
  AND NOT eif.isHidden
ORDER BY g.sort, eif.sort;

-- 预期结果：
-- - 应该返回约20个字段
-- - 检查gender等字段的fieldType值
-- - 检查isRequired字段

-- ================================================================================
-- 第五步：统计诊断结果
-- ================================================================================

-- 5.1 统计各类型字段数量
SELECT
    eif.fieldType,
    COUNT(*) AS fieldCount
FROM "EmployeeInfoTabField" eif
JOIN "EmployeeInfoTabGroup" g ON g.id = eif."groupId"
JOIN "EmployeeInfoTab" t ON t.id = g."tabId"
WHERE t.code = 'basic_info'
  AND g.status = 'ACTIVE'
  AND NOT eif.isHidden
GROUP BY eif.fieldType
ORDER BY eif.fieldType;

-- 5.2 检查缺少CustomField记录的字段
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
AND cf.id IS NULL;

-- 预期结果：应该返回0行（所有字段都有CustomField记录）

-- 5.3 字段类型不一致检查
SELECT
    eif.fieldCode,
    eif.fieldType AS tabFieldType,
    cf.type AS customFieldType,
    CASE
        WHEN eif.fieldType = cf.type THEN '✓ 一致'
        WHEN cf.id IS NULL THEN '✗ 缺少CustomField'
        ELSE '✗ 不一致'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
WHERE eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
)
ORDER BY eif.fieldCode;

-- ================================================================================
-- 第六步：检查前端过滤逻辑会包含哪些字段
-- ================================================================================

-- 6.1 模拟前端过滤逻辑（只包含SYSTEM类型）
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType
FROM "EmployeeInfoTabField" eif
JOIN "EmployeeInfoTabGroup" g ON g.id = eif."groupId"
JOIN "EmployeeInfoTab" t ON t.id = g."tabId"
WHERE t.code = 'basic_info'
  AND g.status = 'ACTIVE'
  AND NOT eif.isHidden
  AND eif.fieldType = 'SYSTEM'  -- 前端只过滤这个类型
  AND eif.fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel',
    'employeeType', 'resignationReason', 'familyRelation', 'A05'
  )
ORDER BY eif.fieldCode;

-- 如果返回0行：说明生产环境字段都是SELECT_SINGLE类型，被前端过滤掉了
-- 这就是问题所在！

-- ================================================================================
-- 诊断结论
-- ================================================================================

/*
根据以上查询结果，判断生产环境问题：

情况1：生产环境fieldType = 'SELECT_SINGLE'，前端只识别'SYSTEM'
- 问题：字段被前端过滤，不显示
- 解决：需要更新前端代码（包含SELECT_SINGLE）或将数据库改为SYSTEM

情况2：生产环境fieldType = 'SYSTEM'，但缺少CustomField记录
- 问题：字段无法获取数据源
- 解决：创建CustomField记录并关联数据源

情况3：生产环境字段类型和数据源都配置正确
- 问题：可能是前端缓存或代码未更新
- 解决：清除缓存，确认前端代码版本

请根据上述查询的实际结果，选择对应的修复方案。
*/
