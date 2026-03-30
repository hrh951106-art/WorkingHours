-- =====================================================
-- 数据库回滚脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 回滚班次属性功能相关的数据库变更
-- 注意: 执行前务必备份数据库！
-- =====================================================

-- 警告信息
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '警告：此操作将删除以下内容：';
  RAISE NOTICE '1. 班次属性关联表中的所有数据';
  RAISE NOTICE '2. 班次属性定义表中的所有数据';
  RAISE NOTICE '3. 新增的系统配置';
  RAISE NOTICE '4. ShiftProperty 表的新增字段';
  RAISE NOTICE '';
  RAISE NOTICE '请确认已备份当前数据库！';
  RAISE NOTICE '输入 CONTINUE 确认继续回滚...';
  RAISE NOTICE '========================================';
END $$;

-- 等待确认（取消下面的注释以启用）
-- SELECT pg_sleep(10);

-- 1. 删除系统配置
\echo '1. 删除新增的系统配置...'
DELETE FROM "SystemConfig"
WHERE "configKey" IN (
  'productionLineHierarchyLevel',
  'productionLineShiftPropertyKeys',
  'productionLineShiftIds',
  'actualHoursAllocationCode',
  'indirectHoursAllocationCode',
  'workInfoVersionEnabled',
  'workInfoChangeTypeRequired'
);

-- 2. 删除班次属性关联数据
\echo '2. 删除班次属性关联数据...'
DELETE FROM "ShiftProperty";

-- 3. 删除班次属性定义
\echo '3. 删除班次属性定义...'
DELETE FROM "ShiftPropertyDefinition";

-- 4. 删除 ShiftProperty 表的新增字段（可选）
-- 注意：PostgreSQL 不支持 DROP COLUMN IF NOT EXISTS，需要先检查

-- 4.1 删除 description 字段
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ShiftProperty'
      AND COLUMN_NAME = 'description'
      AND TABLE_SCHEMA = current_schema()
  ) THEN
    ALTER TABLE "ShiftProperty" DROP COLUMN "description";
  END IF;
END $$;

-- 4.2 删除 sortOrder 字段
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'ShiftProperty'
      AND COLUMN_NAME = 'sortOrder'
      AND TABLE_SCHEMA = current_schema()
  ) THEN
    ALTER TABLE "ShiftProperty" DROP COLUMN "sortOrder";
  END IF;
END $$;

-- 5. 删除 ShiftPropertyDefinition 表
\echo '4. 删除 ShiftPropertyDefinition 表...'
DROP TABLE IF EXISTS "ShiftPropertyDefinition" CASCADE;

-- 6. 删除序列
\echo '5. 删除序列...'
DROP SEQUENCE IF EXISTS "ShiftPropertyDefinition_id_seq";

-- 7. 删除索引
\echo '6. 删除索引...'
DROP INDEX IF EXISTS "ShiftPropertyDefinition_propertyKey_key";
DROP INDEX IF EXISTS "ShiftPropertyDefinition_status_idx";

-- 8. 删除人事模块数据源（可选，根据需要）
\echo '7. 删除人事模块数据源...'
DO $$
DECLARE
  v_change_type_id INTEGER;
  v_employee_type_id INTEGER;
BEGIN
  -- 获取数据源ID
  SELECT "id" INTO v_change_type_id FROM "DataSource" WHERE "code" = 'CHANGE_TYPE';
  SELECT "id" INTO v_employee_type_id FROM "DataSource" WHERE "code" = 'EMPLOYEE_TYPE';

  -- 删除数据源选项
  IF v_change_type_id IS NOT NULL THEN
    DELETE FROM "DataSourceOption" WHERE "dataSourceId" = v_change_type_id;
    RAISE NOTICE '✓ 删除异动类型数据源选项';
  END IF;

  IF v_employee_type_id IS NOT NULL THEN
    DELETE FROM "DataSourceOption" WHERE "dataSourceId" = v_employee_type_id;
    RAISE NOTICE '✓ 删除员工类型数据源选项';
  END IF;

  -- 删除数据源
  DELETE FROM "DataSource" WHERE "code" IN ('CHANGE_TYPE', 'EMPLOYEE_TYPE');
  RAISE NOTICE '✓ 删除人事模块数据源';
END $$;

-- 8. 验证回滚结果
\echo '=========================================='
\echo '回滚完成验证'
\echo '=========================================='

-- 检查 ShiftPropertyDefinition 表是否已删除
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ShiftPropertyDefinition') THEN '❌ 表仍然存在'
    ELSE '✓ 表已删除'
  END as "ShiftPropertyDefinition 表";

-- 检查 ShiftProperty 表字段是否已删除
SELECT
  COLUMN_NAME as "字段名",
  CASE
    WHEN COLUMN_NAME IN ('description', 'sortOrder') THEN '❌ 字段仍然存在'
    ELSE '✓ 字段不存在（正常）'
  END as "状态"
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'ShiftProperty'
  AND COLUMN_NAME IN ('description', 'sortOrder')
  AND TABLE_SCHEMA = current_schema();

-- 检查系统配置是否已删除
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "SystemConfig"
      WHERE "configKey" IN ('productionLineShiftPropertyKeys', 'workInfoVersionEnabled')
    ) THEN '❌ 配置仍然存在'
    ELSE '✓ 配置已删除'
  END as "系统配置相关";

-- 检查数据源是否已删除
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM "DataSource"
      WHERE "code" IN ('CHANGE_TYPE', 'EMPLOYEE_TYPE')
    ) THEN '❌ 数据源仍然存在'
    ELSE '✓ 数据源已删除'
  END as "人事模块数据源";

\echo '=========================================='
\echo '回滚完成！'
\echo '=========================================='
\echo ''
\echo '请检查以上验证结果，确保所有数据已成功回滚。'
\echo ''
