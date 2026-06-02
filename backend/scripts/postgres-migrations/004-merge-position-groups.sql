-- ============================================================================
-- 人事信息页签配置优化 - 合并岗位信息分组
-- ============================================================================
-- 功能：
--   1. 将工作信息页签的"当前职位"和"组织信息"分组合并为"岗位信息"
--   2. 修复所有系统字段的isSystem标志，确保前端正确显示
--
-- 适用环境：生产环境（PostgreSQL）
-- 依赖：003-init-datasources.sql
-- ============================================================================

BEGIN;

-- ========================================
-- 1. 修改分组名��和结构
-- ========================================

-- 将"组织信息"分组改名为"岗位信息"
UPDATE "EmployeeInfoTabGroup"
SET
    "name" = '岗位信息',
    "code" = 'POSITION_INFO',
    "description" = '职位、职级、所属组织等岗位信息',
    "sort" = 1
WHERE "code" = 'ORG_INFO';

-- 获取岗位信息分组的ID（用于后续字段移动）
DO $$
DECLARE
    position_group_id INTEGER;
BEGIN
    SELECT "id" INTO position_group_id
    FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'POSITION_INFO';

    -- ========================================
    -- 2. 将"当前职位"分组的字段移动到"岗位信息"分组
    -- ========================================

    UPDATE "EmployeeInfoTabField"
    SET "groupId" = position_group_id
    WHERE "groupId" IN (
        SELECT "id" FROM "EmployeeInfoTabGroup"
        WHERE "code" = 'CURRENT_POSITION'
    );

    -- ========================================
    -- 3. 删除"当前职位"分组
    -- ========================================

    DELETE FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'CURRENT_POSITION';

    -- ========================================
    -- 4. 重新调整字段排序
    -- ========================================

    -- 岗位信息分组字段排序
    UPDATE "EmployeeInfoTabField"
    SET "sort" = 1
    WHERE "fieldCode" = 'orgId' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 2
    WHERE "fieldCode" = 'position' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 3
    WHERE "fieldCode" = 'jobLevel' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 4
    WHERE "fieldCode" = 'employeeType' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 5
    WHERE "fieldCode" = 'workLocation' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 6
    WHERE "fieldCode" = 'workAddress' AND "groupId" = position_group_id;

    -- 调整雇佣信息分组的排序
    UPDATE "EmployeeInfoTabGroup"
    SET "sort" = 2
    WHERE "code" = 'EMPLOYMENT_INFO';

    RAISE NOTICE '岗位信息分组ID: %', position_group_id;
END $$;

-- ========================================
-- 5. 修复系统字段的isSystem标志
-- ========================================
-- 说明：将所有系统类型字段的isSystem设置为true
-- 只有fieldType为'CUSTOM'的才是自定义字段

UPDATE "EmployeeInfoTabField"
SET "isSystem" = true
WHERE "fieldType" IN (
    'TEXT',
    'DATE',
    'NUMBER',
    'SELECT',
    'ORG_SELECT',
    'TEXTAREA',
    'EMAIL',
    'PHONE',
    'IMAGE',
    'CHILD_TABLE'
);

-- ========================================
-- 6. 验证修改结果
-- ========================================

-- 查看工作信息页签的分组
SELECT
    '========== 工作信息页签分组 ==========' as info;

SELECT
    "id",
    "code",
    "name",
    "sort",
    "status"
FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (
    SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info'
)
ORDER BY "sort";

-- 查看岗位信息分组的字段
SELECT
    '========== 岗位信息分组字段 ==========' as info;

SELECT
    g."name" as group_name,
    f."fieldCode",
    f."fieldName",
    f."fieldType",
    f."isSystem",
    f."isRequired",
    f."sort"
FROM "EmployeeInfoTabField" f
LEFT JOIN "EmployeeInfoTabGroup" g ON f."groupId" = g."id"
WHERE g."code" = 'POSITION_INFO'
ORDER BY f."sort";

COMMIT;

-- ========================================
-- 7. 部署验证
-- ========================================

-- 执行以下SQL验证部署是否成功：

-- 验证1：检查分组数量（应该是2个：岗位信息、雇佣信息）
-- SELECT COUNT(*) FROM "EmployeeInfoTabGroup" WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info');

-- 验证2：检查岗位信息分组字段数量（应该是6个）
-- SELECT COUNT(*) FROM "EmployeeInfoTabField" WHERE "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'POSITION_INFO');

-- 验证3：检查所有工作信息字段的isSystem（应该都是true）
-- SELECT "fieldCode", "fieldName", "isSystem" FROM "EmployeeInfoTabField" WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info');

COMMIT;
