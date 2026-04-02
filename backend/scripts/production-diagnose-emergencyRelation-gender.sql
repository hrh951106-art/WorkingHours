-- ================================================================================
-- 生产环境字段排查 - emergencyRelation vs gender
-- ================================================================================
-- 问题：emergencyRelation能获取数据但未关联数据源，gender关联了但查不到数据
-- 目标：找出两个字段配置差异，定位问题根源
-- ================================================================================

-- ================================================================================
-- 第一步：对比两个字段的完整配置
-- ================================================================================

SELECT '=== Step 1: EmployeeInfoTabField 表配置对比 ===' AS step;

SELECT
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    groupId
FROM "EmployeeInfoTabField"
WHERE fieldCode IN ('emergencyRelation', 'gender')
ORDER BY fieldCode;

-- 记录结果：
-- fieldType 是否相同？
-- isRequired 是否相同？
-- 其他配置差异

-- ================================================================================
-- 第二步：检查CustomField记录
-- ================================================================================

SELECT '=== Step 2: CustomField 表记录对比 ===' AS step;

SELECT
    cf.id,
    cf.code,
    cf.name,
    cf.type AS customField_type,
    cf."dataSourceId",
    cf.description,
    cf."isSystem",
    cf.status
FROM "CustomField" cf
WHERE cf.code IN ('emergencyRelation', 'gender')
ORDER BY cf.code;

-- 关键检查：
-- emergencyRelation 是否有CustomField记录？
-- gender 是否有CustomField记录？
-- dataSourceId 是否为NULL？

-- ================================================================================
-- 第三步：检查数据源配置
-- ================================================================================

SELECT '=== Step 3: DataSource 配置对比 ===' AS step;

-- 3.1 检查DataSource表
SELECT
    ds.id,
    ds.code,
    ds.name,
    ds.type,
    ds."isSystem",
    ds.status,
    COUNT(dso.id) AS optionCount
FROM "DataSource" ds
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE ds.code IN ('emergencyRelation', 'gender')
GROUP BY ds.id, ds.code, ds.name, ds.type, ds."isSystem", ds.status
ORDER BY ds.code;

-- 3.2 检查DataSourceOption详情
SELECT
    ds.code AS dataSourceCode,
    ds.name AS dataSourceName,
    dso.value,
    dso.label,
    dso.sort
FROM "DataSource" ds
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE ds.code IN ('emergencyRelation', 'gender')
ORDER BY ds.code, dso.sort;

-- 关键检查：
-- 两个数据源是否存在？
- 选项数量各是多少？
- 选项的value和label是什么？

-- ================================================================================
-- 第四步：检查字段与数据源的关联链路
-- ================================================================================

SELECT '=== Step 4: 字段到数据源的完整链路 ===' AS step;

SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType AS tab_fieldType,
    cf.id AS customFieldId,
    cf.type AS customField_type,
    cf."dataSourceId" AS cf_dataSourceId,
    ds.id AS dataSource_id,
    ds.code AS dataSource_code,
    ds.name AS dataSource_name,
    COUNT(dso.id) AS dataSource_optionCount,
    CASE
        WHEN cf.id IS NULL THEN '✗ 无CustomField记录'
        WHEN cf."dataSourceId" IS NULL THEN '✗ 未关联数据源'
        WHEN ds.id IS NULL THEN '✗ 数据源不存在'
        WHEN COUNT(dso.id) = 0 THEN '✗ 数据源无选项'
        ELSE '✓ 链路完整'
    END AS status
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
GROUP BY eif.fieldCode, eif.fieldName, eif.fieldType, cf.id, cf.type, cf."dataSourceId", ds.id, ds.code, ds.name
ORDER BY eif.fieldCode;

-- 这个查询会显示完整的关联链路状态

-- ================================================================================
-- 第五步：检查后端API返回数据的逻辑
-- ================================================================================

SELECT '=== Step 5: 模拟后端 enrichFieldWithType 逻辑 ===' AS step;

-- 5.1 检查字段是否为系统字段
SELECT
    eif.fieldCode,
    CASE
        WHEN eif."fieldType" IN ('SYSTEM', 'SELECT', 'SELECT_SINGLE') THEN 'isSystem'
        ELSE 'notSystem'
    END AS isSystemFlag,
    eif.fieldType AS originalType,
    CASE
        WHEN eif."fieldType" = 'SELECT' OR eif."fieldType" = 'SELECT_SINGLE' THEN 'SELECT_SINGLE'
        ELSE 'TEXT'
    END AS apiReturnedType
FROM "EmployeeInfoTabField" eif
WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
ORDER BY eif.fieldCode;

-- 这会模拟后端API返回的type值

-- 5.2 检查CustomField是否存在会影响返回
SELECT
    eif.fieldCode,
    cf.id AS hasCustomField,
    cf.type AS customFieldType,
    CASE
        WHEN cf.id IS NOT NULL THEN '有CustomField记录'
        ELSE '无CustomField记录'
    END AS customFieldStatus,
    CASE
        WHEN cf.id IS NOT NULL THEN cf.type
        WHEN eif."fieldType" = 'SELECT' OR eif."fieldType" = 'SELECT_SINGLE' THEN 'SELECT_SINGLE'
        ELSE 'TEXT'
    END AS finalApiType
FROM "EmployeeInfoTabField" eif
LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
ORDER BY eif.fieldCode;

-- ================================================================================
-- 第六步：检查前端渲染逻辑
-- ================================================================================

SELECT '=== Step 6: 模拟前端过滤逻辑 ===' AS step;

-- 6.1 使用旧逻辑（只识别SYSTEM）
SELECT
    eif.fieldCode,
    eif.fieldType,
    CASE
        WHEN eif.fieldType = 'SYSTEM' THEN '✓ 会显示'
        ELSE '✗ 被过滤掉'
    END AS oldLogicResult
FROM "EmployeeInfoTabField" eif
WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
ORDER BY eif.fieldCode;

-- 6.2 使用新逻辑（识别SYSTEM、SELECT_SINGLE、SELECT_MULTI）
SELECT
    eif.fieldCode,
    eif.fieldType,
    CASE
        WHEN eif.fieldType IN ('SYSTEM', 'SELECT_SINGLE', 'SELECT_MULTI')
        THEN '✓ 会显示'
        ELSE '✗ 被过滤掉'
    END AS newLogicResult
FROM "EmployeeInfoTabField" eif
WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
ORDER BY eif.fieldCode;

-- ================================================================================
-- 第七步：深度分析 emergencyRelation 为什么能获取数据
-- ================================================================================

SELECT '=== Step 7: emergencyRelation 特殊处理分析 ===' AS step;

-- 7.1 检查是否有特殊的枚举配置
SELECT
    eif.fieldCode,
    eif.fieldName,
    eif.fieldType,
    eif.settings  -- 检查是否有settings字段存储枚举值
FROM "EmployeeInfoTabField" eif
WHERE eif.fieldCode = 'emergencyRelation';

-- 7.2 检查CustomField的配置
SELECT
    cf.*,
    ds.code AS dataSource_code,
    ds.name AS dataSource_name
FROM "CustomField" cf
LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
WHERE cf.code = 'emergencyRelation';

-- 7.3 检查后端代码中是否有特殊处理
-- （这个需要查看代码，无法用SQL查询）

-- ================================================================================
-- 第八步：检查数据库中实际的枚举值存储
-- ================================================================================

SELECT '=== Step 8: 检查实际数据存储 ===' AS step;

-- 8.1 查看Employee表中这两个字段的实际值
SELECT
    'emergencyRelation' AS fieldCode,
    "emergencyRelation",
    COUNT(*) AS count
FROM "Employee"
WHERE "emergencyRelation" IS NOT NULL
  AND "emergencyRelation" != ''
GROUP BY "emergencyRelation"
ORDER BY count DESC
LIMIT 10;

-- 8.2 查看gender字段的实际值
SELECT
    'gender' AS fieldCode,
    gender,
    COUNT(*) AS count
FROM "Employee"
WHERE gender IS NOT NULL
  AND gender != ''
GROUP BY gender
ORDER BY count DESC
LIMIT 10;

-- ================================================================================
-- 第九步：完整的关联性测试
-- ================================================================================

SELECT '=== Step 9: 完整关联性诊断 ===' AS step;

WITH field_info AS (
    SELECT
        eif.fieldCode,
        eif.fieldName,
        eif.fieldType AS tabFieldType,
        cf.id AS customFieldId,
        cf.type AS customFieldType,
        cf."dataSourceId",
        ds.id AS dataSourceId_check,
        ds.code AS dataSourceCode,
        ds.name AS dataSourceName,
        COUNT(dso.id) AS dataSourceOptionCount
    FROM "EmployeeInfoTabField" eif
    LEFT JOIN "CustomField" cf ON cf.code = eif.fieldCode
    LEFT JOIN "DataSource" ds ON ds.id = cf."dataSourceId"
    LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
    WHERE eif.fieldCode IN ('emergencyRelation', 'gender')
    GROUP BY eif.fieldCode, eif.fieldName, eif.fieldType, cf.id, cf.type, cf."dataSourceId", ds.id, ds.code, ds.name
)
SELECT
    fieldCode,
    fieldName,
    tabFieldType,
    customFieldId,
    customFieldType,
    "dataSourceId",
    dataSourceCode,
    dataSourceOptionCount,
    CASE
        WHEN customFieldId IS NULL AND tabFieldType = 'SYSTEM'
        THEN '⚠️ SYSTEM类型无CustomField，可能使用硬编码枚举'
        WHEN customFieldId IS NOT NULL AND dataSourceOptionCount > 0
        THEN '✓ 有CustomField和数据源选项'
        WHEN customFieldId IS NOT NULL AND dataSourceOptionCount = 0
        THEN '✗ 有CustomField但数据源无选项'
        WHEN customFieldId IS NULL AND tabFieldType = 'SELECT_SINGLE'
        THEN '✗ SELECT_SINGLE类型缺少CustomField'
        ELSE '? 未知状态'
    END AS diagnosis,
    CASE
        WHEN customFieldId IS NULL AND tabFieldType = 'SYSTEM'
        THEN '前端可能硬编码了枚举值或使用了其他配置'
        WHEN customFieldId IS NOT NULL
        THEN '前端应该从CustomField.DataSource获取选项'
        ELSE '需要进一步排查'
    END AS frontendLogic
FROM field_info
ORDER BY fieldCode;

-- ================================================================================
-- 总结和建议
-- ================================================================================

/*
诊断结果分析：

emergencyRelation 能获取数据的可能原因：
1. 前端硬编码了枚举值（在代码中直接定义）
2. 后端在enrichFieldWithType中有特殊处理
3. 使用了settings字段存储枚举配置
4. 某个配置表中有特殊定义

gender 查不到数据的可能原因：
1. CustomField记录存在但dataSourceId指向错误的数据源
2. DataSource存在但DataSourceOption为空
3. CustomField.type与期望不符
4. 数据源配置与字段代码不匹配

根据上述查询结果，分析并给出修复建议。
*/
