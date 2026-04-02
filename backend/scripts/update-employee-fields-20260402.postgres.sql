-- ====================================================================
-- PostgreSQL 数据库迁移脚本：员工字段配置更新
-- 版本：20260402
-- 描述：修复员工信息系统中字段验证和显示问题
-- 数据库：PostgreSQL 12+
-- ====================================================================

-- 开始事务
BEGIN;

-- ====================================================================
-- 1. 修改 Employee 表：将 name 和 gender 字段改为可选
-- ====================================================================

-- 检查约束是否存在（如果约束名不同可能需要调整）
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- 查找 name 字段的 NOT NULL 约束
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'Employee'::regclass
      AND contype = 'c'
      AND conname LIKE '%name%';

    -- 如果存在约束，删除它
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE "Employee" DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE '已删除约束: %', constraint_name;
    END IF;
END $$;

-- 将 name 字段改为可选
ALTER TABLE 'Employee' ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "name" TYPE TEXT USING ("name"::TEXT);
RAISE NOTICE '✓ Employee.name 字段已改为可选';

-- 检查并删除 gender 字段的 NOT NULL 约束
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'Employee'::regclass
      AND contype = 'c'
      AND conname LIKE '%gender%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE "Employee" DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE '已删除约束: %', constraint_name;
    END IF;
END $$;

-- 将 gender 字段改为可选
ALTER TABLE "Employee" ALTER COLUMN "gender" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "gender" TYPE TEXT USING ("gender"::TEXT);
RAISE NOTICE '✓ Employee.gender 字段已改为可选';

-- ====================================================================
-- 2. 更新 EmployeeInfoTabField 的 dataSourceId
-- ====================================================================

-- 2.1 更新紧急联系人关系字段的数据源
UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = 19,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldCode" = 'emergencyRelation'
  AND ("dataSourceId" IS NULL OR "dataSourceId" != 19);

RAISE NOTICE '✓ 已更新 emergencyRelation 字段的数据源为 ID: 19';

-- 2.2 更新职级字段的数据源
UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = 13,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldCode" = 'jobLevel'
  AND ("dataSourceId" IS NULL OR "dataSourceId" != 13);

RAISE NOTICE '✓ 已更新 jobLevel 字段的数据源为 ID: 13';

-- 2.3 更新在职状态字段的数据源
UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = 15,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldCode" = 'status'
  AND ("dataSourceId" IS NULL OR "dataSourceId" != 15);

RAISE NOTICE '✓ 已更新 status 字段的数据源为 ID: 15';

-- ====================================================================
-- 3. 添加注释说明
-- ====================================================================

COMMENT ON COLUMN "Employee"."name" IS '员工姓名（可选）';
COMMENT ON COLUMN "Employee"."gender" IS '员工性别（可选）';

-- ====================================================================
-- 4. 验证数据完整性
-- ====================================================================

-- 4.1 检查 Employee 表结构
DO $$
DECLARE
    column_info RECORD;
    name_nullable BOOLEAN := FALSE;
    gender_nullable BOOLEAN := FALSE;
BEGIN
    -- 检查 name 字段
    SELECT attnotnull INTO name_nullable
    FROM pg_attribute
    WHERE attrelid = 'Employee'::regclass
      AND attname = 'name'
      AND attnum > 0;

    -- 检查 gender 字段
    SELECT attnotnull INTO gender_nullable
    FROM pg_attribute
    WHERE attrelid = 'Employee'::regclass
      AND attname = 'gender'
      AND attnum > 0;

    -- 输出验证结果
    IF NOT name_nullable THEN
        RAISE NOTICE '✓ 验证通过: Employee.name 字段已设置为可选';
    ELSE
        RAISE EXCEPTION '✗ 验证失败: Employee.name 字段仍然是必填';
    END IF;

    IF NOT gender_nullable THEN
        RAISE NOTICE '✓ 验证通过: Employee.gender 字段已设置为可选';
    ELSE
        RAISE EXCEPTION '✗ 验证失败: Employee.gender 字段仍然是必填';
    END IF;
END $$;

-- 4.2 检查 dataSourceId 更新结果
SELECT
    f."fieldCode",
    f."fieldName",
    f."dataSourceId",
    ds.code as "dataSourceCode",
    ds.name as "dataSourceName"
FROM "EmployeeInfoTabField" f
LEFT JOIN "DataSource" ds ON f."dataSourceId" = ds.id
WHERE f."fieldCode" IN ('emergencyRelation', 'jobLevel', 'status', 'nation')
ORDER BY f."fieldCode";

RAISE NOTICE '✓ 数据源关联查询完成，请检查上述结果';

-- ====================================================================
-- 5. 统计当前数据状态
-- ====================================================================

-- 统计 Employee 表中空值记录数
DO $$
DECLARE
    total_count INTEGER;
    null_name_count INTEGER;
    null_gender_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM "Employee";
    SELECT COUNT(*) INTO null_name_count FROM "Employee" WHERE "name" IS NULL;
    SELECT COUNT(*) INTO null_gender_count FROM "Employee" WHERE "gender" IS NULL;

    RAISE NOTICE '========================================';
    RAISE NOTICE '数据统计报告';
    RAISE NOTICE '========================================';
    RAISE NOTICE '员工总数: %', total_count;
    RAISE NOTICE '姓名为空的记录数: %', null_name_count;
    RAISE NOTICE '性别为空的记录数: %', null_gender_count;
    RAISE NOTICE '========================================';
END $$;

-- 提交事务
COMMIT;

RAISE NOTICE '========================================';
RAISE NOTICE '✓ 数据库迁移成功完成！';
RAISE NOTICE '========================================';
RAISE NOTICE '变更内容:';
RAISE NOTICE '  1. Employee.name 字段已改为可选';
RAISE NOTICE '  2. Employee.gender 字段已改为可选';
RAISE NOTICE '  3. emergencyRelation 数据源已更新为 ID 19';
RAISE NOTICE '  4. jobLevel 数据源已更新为 ID 13';
RAISE NOTICE '  5. status 数据源已更新为 ID 15';
RAISE NOTICE '========================================';

-- ====================================================================
-- 6. 回滚脚本（仅在需要时使用）
-- ====================================================================

/*
-- ⚠️ 回滚前请确保没有 name 或 gender 为空的记录
-- ⚠️ 如果有空值记录，需要先更新为默认值

-- 检查是否有空值
SELECT COUNT(*) FROM "Employee" WHERE "name" IS NULL OR "gender" IS NULL;

-- 如果有空值，先更新
UPDATE "Employee" SET "name" = '未命名' WHERE "name" IS NULL;
UPDATE "Employee" SET "gender" = 'UNKNOWN' WHERE "gender" IS NULL;

-- 然后执行回滚
BEGIN;

-- 恢复 NOT NULL 约束
ALTER TABLE "Employee" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "gender" SET NOT NULL;

-- 恢复数据源关联
UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldCode" IN ('emergencyRelation', 'jobLevel', 'status');

COMMIT;

RAISE NOTICE '✓ 回滚完成';
*/

-- ====================================================================
-- 说明：
-- 1. 本次迁移将 Employee 表的 name 和 gender 字段改为可选
-- 2. 更新了关键字段的数据源关联，确保下拉选项正确显示
-- 3. 建议在执行前备份数据库：pg_dump -U postgres -d jy_production > backup.sql
-- 4. 迁移完成后请重启应用服务
-- 5. 如需回滚，请参考上面的回滚脚本
-- ====================================================================
