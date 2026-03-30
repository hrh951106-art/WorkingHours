-- =====================================================
-- 数据库迁移验证脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 验证班次属性和人事模块功能相关的数据迁移是否成功
-- =====================================================

\echo '=========================================='
\echo '开始验证数据库迁移'
\echo '=========================================='
\echo ''

-- 1. 验证表结构
\echo '1. 验证表结构'
\echo '=========================================='

SELECT
  TABLE_NAME as "表名",
  COLUMN_NAME as "字段名",
  DATA_TYPE as "数据类型",
  IS_NULLABLE as "可空",
  COLUMN_DEFAULT as "默认值"
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('ShiftPropertyDefinition', 'ShiftProperty', 'SystemConfig', 'DataSource', 'EmployeeInfoTab', 'EmployeeInfoTabField')
  AND TABLE_SCHEMA = current_schema()
ORDER BY TABLE_NAME, ORDINAL_POSITION;

\echo ''

-- 2. 验证约束和索引
\echo '2. 验证约束和索引'
\echo '=========================================='

-- 检查 ShiftPropertyDefinition 表的约束
SELECT
  CONSTRAINT_NAME as "约束名",
  CONSTRAINT_TYPE as "约束类型"
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_NAME = 'ShiftPropertyDefinition'
  AND TABLE_SCHEMA = current_schema();

\echo ''

-- 检查索引
SELECT
  INDEXNAME as "索引名",
  TABLENAME as "表名",
  INDEXDEF as "索引定义"
FROM PG_INDEXES
WHERE INDEXDEF LIKE '%ShiftProperty%'
   OR INDEXDEF LIKE '%SystemConfig%'
ORDER BY TABLENAME, INDEXNAME;

\echo ''

-- 3. 验证基础数据
\echo '3. 验证基础数据'
\echo '=========================================='

-- 3.1 班次属性定义
\echo '班次属性定义：'
SELECT "propertyKey", "name", "status", "sortOrder"
FROM "ShiftPropertyDefinition"
ORDER BY "sortOrder";

\echo ''
SELECT '总数: ' || COUNT(*) AS "班次属性定义总数"
FROM "ShiftPropertyDefinition";

\echo ''

-- 3.2 系统配置
\echo '系统配置：'
SELECT "configKey",
       CASE
         WHEN "configValue" = '' THEN '（未配置）'
         ELSE "configValue"
       END as "配置值",
       "category", "description"
FROM "SystemConfig"
WHERE "configKey" IN (
  'productionLineHierarchyLevel',
  'productionLineShiftPropertyKeys',
  'productionLineShiftIds',
  'actualHoursAllocationCode',
  'indirectHoursAllocationCode'
)
ORDER BY "configKey";

\echo ''

-- 3.3 人事模块数据源
\echo '异动类型数据源：'
SELECT "code", "name", "type", "status"
FROM "DataSource"
WHERE "code" IN ('CHANGE_TYPE', 'EMPLOYEE_TYPE')
ORDER BY "code";

\echo ''

\echo '异动类型选项：'
SELECT "label", "value", "sort", "isActive"
FROM "DataSourceOption"
WHERE "dataSourceId" = (SELECT "id" FROM "DataSource" WHERE "code" = 'CHANGE_TYPE')
ORDER BY "sort";

\echo ''

SELECT '总数: ' || COUNT(*) AS "异动类型选项总数"
FROM "DataSourceOption"
WHERE "dataSourceId" = (SELECT "id" FROM "DataSource" WHERE "code" = 'CHANGE_TYPE');

\echo ''

-- 3.4 工作信息页签配置
\echo '工作信息页签字段配置：'
SELECT
  git."code" as "页签代码",
  git."name" as "页签名称",
  g."code" as "字段组代码",
  g."name" as "字段组名称",
  f."fieldCode" as "字段代码",
  f."fieldName" as "字段名称",
  f."fieldType" as "字段类型",
  f."isRequired" as "是否必填",
  f."sort" as "排序"
FROM "EmployeeInfoTab" git
LEFT JOIN "EmployeeInfoTabGroup" g ON git."id" = g."tabId"
LEFT JOIN "EmployeeInfoTabField" f ON f."tabId" = git."id" AND f."groupId" = g."id"
WHERE git."code" = 'work_info'
ORDER BY g."sort", f."sort";

\echo ''

-- 3.5 所有页签统计
\echo '所有员工信息页签统计：'
SELECT
  "code" as "页签代码",
  "name" as "页签名称",
  "sort" as "排序",
  "status" as "状态"
FROM "EmployeeInfoTab"
ORDER BY "sort";

\echo ''

-- 3.6 所有字段分组统计
\echo '所有字段分组统计：'
SELECT
  t."code" as "页签代码",
  t."name" as "页签名称",
  g."code" as "分组代码",
  g."name" as "分组名称",
  COUNT(f."id") as "字段数量"
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON t."id" = g."tabId"
LEFT JOIN "EmployeeInfoTabField" f ON g."id" = f."groupId"
GROUP BY t."code", t."name", g."code", g."name"
ORDER BY t."sort", g."sort";

\echo ''

-- 3.7 所有字段统计
\echo '各页签字段数量统计：'
SELECT
  t."code" as "页签代码",
  t."name" as "页签名称",
  COUNT(f."id") as "字段总数"
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabField" f ON t."id" = f."tabId"
GROUP BY t."code", t."name"
ORDER BY t."sort";

\echo ''

-- 4. 数据完整性检查
\echo '4. 数据完整性检查'
\echo '=========================================='

-- 4.1 检查是否有重复的属性定义
SELECT
  COUNT(*) as "重复数",
  STRING_AGG("id", ', ') as "ID列表"
FROM "ShiftPropertyDefinition"
GROUP BY "propertyKey"
HAVING COUNT(*) > 1;

\echo ''

-- 4.2 检查无效的属性关联
SELECT
  sp."id",
  sp."shiftId",
  s."name" as "shiftName",
  sp."propertyKey",
  '属性定义不存在' as "问题"
FROM "ShiftProperty" sp
LEFT JOIN "Shift" s ON sp."shiftId" = s."id"
LEFT JOIN "ShiftPropertyDefinition" spd ON sp."propertyKey" = spd."propertyKey"
WHERE spd."propertyKey" IS NULL;

\echo ''

-- 5. 统计信息
\echo '5. 统计信息'
\echo '=========================================='

SELECT
  '班次属性定义' as "项目",
  COUNT(*) as "数量"
FROM "ShiftPropertyDefinition"
UNION ALL
SELECT
  '启用中的属性定义',
  COUNT(*)
FROM "ShiftPropertyDefinition"
WHERE "status" = 'ACTIVE'
UNION ALL
SELECT
  '班次属性关联',
  COUNT(*)
FROM "ShiftProperty"
UNION ALL
SELECT
  '有属性的班次',
  COUNT(DISTINCT "shiftId")
FROM "ShiftProperty"
UNION ALL
SELECT
  '工时相关系统配置',
  COUNT(*)
FROM "SystemConfig"
WHERE "configKey" IN (
  'productionLineHierarchyLevel',
  'productionLineShiftPropertyKeys',
  'productionLineShiftIds',
  'actualHoursAllocationCode',
  'indirectHoursAllocationCode'
)
UNION ALL
SELECT
  '人事相关系统配置',
  COUNT(*)
FROM "SystemConfig"
WHERE "configKey" IN (
  'workInfoVersionEnabled',
  'workInfoChangeTypeRequired'
)
UNION ALL
SELECT
  '异动类型数据源选项',
  COUNT(*)
FROM "DataSourceOption"
WHERE "dataSourceId" = (SELECT "id" FROM "DataSource" WHERE "code" = 'CHANGE_TYPE')
UNION ALL
SELECT
  '员工类型数据源选项',
  COUNT(*)
FROM "DataSourceOption"
WHERE "dataSourceId" = (SELECT "id" FROM "DataSource" WHERE "code" = 'EMPLOYEE_TYPE')
UNION ALL
SELECT
  '工作信息页签字段',
  COUNT(*)
FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info')
UNION ALL
SELECT
  '基本信息页签字段',
  COUNT(*)
FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'basic_info')
UNION ALL
SELECT
  '教育信息页签字段',
  COUNT(*)
FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'education_info')
UNION ALL
SELECT
  '工作经历页签字段',
  COUNT(*)
FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_experience')
UNION ALL
SELECT
  '家庭信息页签字段',
  COUNT(*)
FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'family_info')
UNION ALL
SELECT
  '员工信息页签总数',
  COUNT(*)
FROM "EmployeeInfoTab"
UNION ALL
SELECT
  '员工信息字段组总数',
  COUNT(*)
FROM "EmployeeInfoTabGroup";

\echo ''

-- 6. 功能测试查询
\echo '6. 功能测试查询'
\echo '=========================================='

-- 6.1 查询带有"开线班次"属性的班次
\echo '带有"开线班次"属性的班次：'
SELECT
  s."id",
  s."code" as "班次编码",
  s."name" as "班次名称",
  s."type" as "班次类型",
  s."standardHours" as "标准工时"
FROM "Shift" s
WHERE EXISTS (
  SELECT 1 FROM "ShiftProperty" sp
  WHERE sp."shiftId" = s."id"
    AND sp."propertyKey" = '开线班次'
    AND sp."propertyValue" = '是'
)
ORDER BY s."code";

\echo ''

-- 6.2 查询每个班次的所有属性
\echo '班次属性明细：'
SELECT
  s."code" as "班次编码",
  s."name" as "班次名称",
  spd."name" as "属性名称",
  sp."propertyValue" as "属性值"
FROM "Shift" s
LEFT JOIN "ShiftProperty" sp ON s."id" = sp."shiftId"
LEFT JOIN "ShiftPropertyDefinition" spd ON sp."propertyKey" = spd."propertyKey"
WHERE s."status" = 'ACTIVE'
ORDER BY s."code", spd."sortOrder";

\echo ''

-- 7. 完成验证
\echo '=========================================='
\echo '验证完成！'
\echo '=========================================='
\echo ''
\echo '如果以上查询都正常返回结果，说明数据迁移成功。'
\echo '如果有错误或异常数据，请检查前面的迁移脚本。'
\echo ''
