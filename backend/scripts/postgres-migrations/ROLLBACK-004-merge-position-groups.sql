-- ============================================================================
-- 回滚脚本 - 恢复合并前的分组结构
-- ============================================================================
-- ⚠️  重要提示：
--   此脚本会恢复到合并"岗位信息"分组之前的状态
--   执行前请确保：
--   1. 真的需要回滚
--   2. 没有正在使用新结构的操作
--
-- 恢复内容：
--   1. 恢复"当前职位"分组
--   2. 将"岗位信息"改回"组织信息"
--   3. 将字段移回原分组
--   4. 恢复原始排序
-- ============================================================================

BEGIN;

\echo '========== 开始回滚到合并前的状态 =========='

-- ========================================
-- 第一步：检查当前状态
-- ========================================

\echo '检查当前分组状态...'
DO $$
DECLARE
    position_group_exists INTEGER;
BEGIN
    SELECT COUNT(*) INTO position_group_exists
    FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'POSITION_INFO';

    IF position_group_exists = 0 THEN
        RAISE EXCEPTION '❌ 错误：未找到"岗位信息"分组，可能已经回滚或从未执行过迁移';
    END IF;

    RAISE NOTICE '✅ 找到"岗位信息"分组，可以执行回滚';
END $$;

-- ========================================
-- 第二步：恢复"当前职位"分组
-- ========================================

\echo '1. 恢复"当前职位"分组...'

INSERT INTO "EmployeeInfoTabGroup" (
    "tabId",
    "code",
    "name",
    "description",
    "sort",
    "status",
    "collapsed",
    "isSystem",
    "createdAt",
    "updatedAt"
)
VALUES (
    (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info'),
    'CURRENT_POSITION',
    '当前职位',
    '当前职位和岗位信息',
    1,
    'ACTIVE',
    false,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- ========================================
-- 第三步：将"岗位信息"改回"组织信息"
-- ========================================

\echo '2. 将"岗位信息"改回"组织信息"...'

UPDATE "EmployeeInfoTabGroup"
SET
    "name" = '组织信息',
    "code" = 'ORG_INFO',
    "description" = '所属组织和部门信息',
    "sort" = 3,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'POSITION_INFO';

-- ========================================
-- 第四步：移动字段回原分组
-- ========================================

DO $$
DECLARE
    current_position_group_id INTEGER;
    org_info_group_id INTEGER;
BEGIN
    SELECT "id" INTO current_position_group_id
    FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'CURRENT_POSITION';

    SELECT "id" INTO org_info_group_id
    FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'ORG_INFO';

    -- 4.1 将职位相关字段移回"当前职位"分组
    \echo '3. 移动字段回原分组...'

    UPDATE "EmployeeInfoTabField"
    SET
        "groupId" = current_position_group_id,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" IN ('position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress')
      AND "groupId" = org_info_group_id;

    -- 4.2 将所属组织字段保留在"组织信息"分组

    -- 4.3 恢复"当前职位"分组的字段排序
    \echo '4. 恢复字段排序...';

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'position' AND "groupId" = current_position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 2, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'jobLevel' AND "groupId" = current_position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 3, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'employeeType' AND "groupId" = current_position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 4, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'workLocation' AND "groupId" = current_position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 5, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'workAddress' AND "groupId" = current_position_group_id;

    -- 4.4 恢复"组织信息"分组的字段排序
    UPDATE "EmployeeInfoTabField"
    SET "sort" = 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'orgId' AND "groupId" = org_info_group_id;

    -- 4.5 恢复"雇佣信息"分组的排序
    UPDATE "EmployeeInfoTabGroup"
    SET "sort" = 2, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = 'EMPLOYMENT_INFO';

    RAISE NOTICE '✅ 字段已移回原分组';
END $$;

-- ========================================
-- 第五步：验证回滚结果
-- ========================================

\echo ''
\echo '========== 验证回滚结果 =========='

-- 验证1：分组数量（应该是3个）
\echo '验证1：分组数量检查'
DO $$
DECLARE
    group_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO group_count
    FROM "EmployeeInfoTabGroup"
    WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE "code" = 'work_info');

    IF group_count = 3 THEN
        RAISE NOTICE '✅ 分组数量正确: % (期望: 3)', group_count;
    ELSE
        RAISE NOTICE '⚠️  分组数量: % (期望: 3)', group_count;
    END IF;
END $$;

-- 验证2：分组名称
\echo '验证2：分组名称检查'
SELECT
    '  ' || sort || '. ' || code || ' - ' || name as group_list
FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE "code" = 'work_info')
ORDER BY sort;

-- 验证3：当前职位分组字段数量（应该是5个）
\echo '验证3：当前职位分组字段数量'
DO $$
DECLARE
    field_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO field_count
    FROM "EmployeeInfoTabField"
    WHERE "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'CURRENT_POSITION');

    IF field_count = 5 THEN
        RAISE NOTICE '✅ 当前职位字段数量正确: % (期望: 5)', field_count;
    ELSE
        RAISE NOTICE '⚠️  当前职位字段数量: % (期望: 5)', field_count;
    END IF;
END $$;

-- 验证4：组织信息分组字段数量（应该是1个）
\echo '验证4：组织信息分组字段数量'
DO $$
DECLARE
    field_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO field_count
    FROM "EmployeeInfoTabField"
    WHERE "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'ORG_INFO');

    IF field_count = 1 THEN
        RAISE NOTICE '✅ 组织信息字段数量正确: % (期望: 1)', field_count;
    ELSE
        RAISE NOTICE '⚠️  组织信息字段数量: % (期望: 1)', field_count;
    END IF;
END $$;

COMMIT;

\echo ''
\echo '========== 回滚完成 =========='
\echo '✅ 已成功回滚到合并前的状态'
\echo ''
\echo '分组结构：'
\echo '  1. 当前职位（5个字段）'
\echo '  2. 雇佣信息（8个字段）'
\echo '  3. 组织信息（1个字段）'
\echo ''
\echo '⚠️  请测试新增人员功能是否恢复正常'
\echo ''
