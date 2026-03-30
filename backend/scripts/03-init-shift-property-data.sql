-- =====================================================
-- 班次属性基础数据初始化脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 初始化常用的班次属性定义
-- =====================================================

-- 1. 插入常用班次属性定义
INSERT INTO "ShiftPropertyDefinition" ("propertyKey", "name", "description", "valueType", "status", "sortOrder")
VALUES
  ('早班', '早班', '早上班次', 'TEXT', 'ACTIVE', 1),
  ('中班', '中班', '中午班次', 'TEXT', 'ACTIVE', 2),
  ('晚班', '晚班', '晚上班次', 'TEXT', 'ACTIVE', 3),
  ('夜班', '夜班', '夜间班次', 'TEXT', 'ACTIVE', 4),
  ('开线班次', '开线班次', '可以用于产线开线的班次', 'TEXT', 'ACTIVE', 10),
  ('特殊班次', '特殊班次', '特殊安排的班次', 'TEXT', 'ACTIVE', 20)
ON CONFLICT ("propertyKey")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "valueType" = EXCLUDED."valueType",
  "status" = EXCLUDED."status",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 2. 为现有班次添加默认属性（可选）
-- 注意：根据实际业务需求调整，这里仅作为示例

-- 2.1 获取所有班次ID
-- DO $$
-- DECLARE
--   shift_record RECORD;
--   shift_code TEXT;
-- BEGIN
--   FOR shift_record IN SELECT "id", "code" FROM "Shift" WHERE "status" = 'ACTIVE'
--   LOOP
--     -- 根据班次编码判断并添加属性
--     IF shift_record.code LIKE '%MORNING%' OR shift_record.code LIKE '%早%' THEN
--       INSERT INTO "ShiftProperty" ("shiftId", "propertyKey", "propertyValue", "sortOrder")
--       VALUES (shift_record.id, '早班', '是', 1)
--       ON CONFLICT ("shiftId", "propertyKey") DO NOTHING;
--     END IF;

--     IF shift_record.code LIKE '%AFTERNOON%' OR shift_record.code LIKE '%中%' THEN
--       INSERT INTO "ShiftProperty" ("shiftId", "propertyKey", "propertyValue", "sortOrder")
--       VALUES (shift_record.id, '中班', '是', 2)
--       ON CONFLICT ("shiftId", "propertyKey") DO NOTHING;
--     END IF;

--     IF shift_record.code LIKE '%EVENING%' OR shift_record.code LIKE '%晚%' THEN
--       INSERT INTO "ShiftProperty" ("shiftId", "propertyKey", "propertyValue", "sortOrder")
--       VALUES (shift_record.id, '晚班', '是', 3)
--       ON CONFLICT ("shiftId", "propertyKey") DO NOTHING;
--     END IF;

--     IF shift_record.code LIKE '%NIGHT%' OR shift_record.code LIKE '%夜%' THEN
--       INSERT INTO "ShiftProperty" ("shiftId", "propertyKey", "propertyValue", "sortOrder")
--       VALUES (shift_record.id, '夜班', '是', 4)
--       ON CONFLICT ("shiftId", "propertyKey") DO NOTHING;
--     END IF;
--   END LOOP;
-- END $$;

-- 3. 验证插入结果
SELECT
  spd."propertyKey" AS "属性键",
  spd."name" AS "属性名称",
  spd."description" AS "描述",
  spd."status" AS "状态",
  COUNT(sp."id") AS "使用次数"
FROM "ShiftPropertyDefinition" spd
LEFT JOIN "ShiftProperty" sp ON spd."propertyKey" = sp."propertyKey"
GROUP BY spd."propertyKey", spd."name", spd."description", spd."status"
ORDER BY spd."sortOrder";

-- 4. 显示插入的属性数量
SELECT
  COUNT(*) AS "属性定义总数",
  COUNT(*) FILTER (WHERE "status" = 'ACTIVE') AS "启用属性数量"
FROM "ShiftPropertyDefinition";

-- 输出提示
SELECT '========================================' AS " ";
SELECT '班次属性基础数据初始化完成' AS " ";
SELECT '属性定义数量: ' || COUNT(*) FROM "ShiftPropertyDefinition";
SELECT '========================================' AS " ";
