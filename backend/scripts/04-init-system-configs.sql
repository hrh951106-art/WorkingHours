-- =====================================================
-- 系统配置基础数据初始化脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 初始化工时基础配置相关的系统配置
-- =====================================================

-- 1. 检查并插入系统配置
-- 注意：configValue 需要根据实际环境进行调整

-- 1.1 产线对应层级配置（占位符，需要根据实际情况设置）
INSERT INTO "SystemConfig" ("configKey", "configValue", "category", "description")
VALUES (
  'productionLineHierarchyLevel',
  '',
  'WORK_HOURS',
  '产线对应层级-配置后开线维护和产量记录中的组织选择将限制为该类型的组织'
)
ON CONFLICT ("configKey")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.2 产线开线班次属性配置（占位符，需要根据实际情况设置）
INSERT INTO "SystemConfig" ("configKey", "configValue", "category", "description")
VALUES (
  'productionLineShiftPropertyKeys',
  '',
  'WORK_HOURS',
  '产线开线班次属性-配置后开线维护和产量记录中的班次选择将限制为具有这些属性的班次'
)
ON CONFLICT ("configKey")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.3 产线班次ID列表配置（自动生成，不需要手动设置）
INSERT INTO "SystemConfig" ("configKey", "configValue", "category", "description")
VALUES (
  'productionLineShiftIds',
  '',
  'WORK_HOURS',
  '产线班次ID列表-根据产线开线班次属性自动生成，不需要手动配置'
)
ON CONFLICT ("configKey")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.4 按实际工时方式分配的工时代码配置（占位符）
INSERT INTO "SystemConfig" ("configKey", "configValue", "category", "description")
VALUES (
  'actualHoursAllocationCode',
  '',
  'ALLOCATION',
  '按实际工时方式分配的工时代码-用于标识按实际工时比例分配间接工时后生成的工时记录'
)
ON CONFLICT ("configKey")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.5 间接工时分配后的工时代码配置（占位符）
INSERT INTO "SystemConfig" ("configKey", "configValue", "category", "description")
VALUES (
  'indirectHoursAllocationCode',
  '',
  'ALLOCATION',
  '间接工时分配后的工时代码-用于标识间接工时分配完成后生成的工时记录代码'
)
ON CONFLICT ("configKey")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 2. 验证插入结果
SELECT
  "configKey" AS "配置键",
  CASE
    WHEN "configValue" = '' THEN '需要配置'
    ELSE "configValue"
  END AS "配置值",
  "category" AS "分类",
  "description" AS "描述",
  "updatedAt" AS "更新时间"
FROM "SystemConfig"
WHERE "configKey" IN (
  'productionLineHierarchyLevel',
  'productionLineShiftPropertyKeys',
  'productionLineShiftIds',
  'actualHoursAllocationCode',
  'indirectHoursAllocationCode'
)
ORDER BY "category", "configKey";

-- 3. 输出配置说明
SELECT '========================================' AS " ";
SELECT '系统配置初始化完成' AS " ";
SELECT '' AS " ";
SELECT '需要手动配置的项：' AS " ";
SELECT '1. productionLineHierarchyLevel - 产线对应层级ID' AS " ";
SELECT '2. productionLineShiftPropertyKeys - 产线开线班次属性（多个用逗号分隔）' AS " ";
SELECT '3. actualHoursAllocationCode - 按实际工时分配的工时代码' AS " ";
SELECT '4. indirectHoursAllocationCode - 间接工时分配的工时代码' AS " ";
SELECT '' AS " ";
SELECT '配置步骤：' AS " ";
SELECT '1. 在"工时基础配置"页面中手动配置以上项' AS " ";
SELECT '2. 或通过SQL UPDATE语句直接更新"SystemConfig"表' AS " ";
SELECT '========================================' AS " ";
