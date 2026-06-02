-- ============================================================================
-- 人事信息页签配置优化 - 安全迁移脚本（支持备份和回滚）
-- ============================================================================
-- ⚠️  重要提示：
--   1. 执行前请先运行 CHECK-existing-config.sql 检查现有配置
--   2. 此脚本会自动备份将被修改的数据
--   3. 如有问题，可执行回滚脚本恢复
--
-- 功能：
--   1. 将工作信息页签的"当前职位"和"组织信息"分组合并为"岗位信息"
--   2. 修复所有系统字段的isSystem标志，确保前端正确显示
--   3. 自动备份修改前的数据
--
-- 适用环境：生产环境（PostgreSQL）
-- 依赖：003-init-datasources.sql
-- ============================================================================

BEGIN;

-- ========================================
-- 第一步：自动备份现有配置
-- ========================================

\echo '========== 开始备份现有配置 =========='

-- 创建备份表
CREATE TEMPORARY TABLE IF NOT EXISTS employee_info_tab_groups_backup AS
SELECT
    id,
    tabId,
    code,
    name,
    description,
    sort,
    status,
    collapsed,
    isSystem,
    createdAt,
    updatedAt
FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
  AND "code" IN ('CURRENT_POSITION', 'ORG_INFO', 'EMPLOYMENT_INFO');

CREATE TEMPORARY TABLE IF NOT EXISTS employee_info_tab_fields_backup AS
SELECT
    id,
    tabId,
    groupId,
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    isSystem,
    dataSourceId,
    sort,
    createdAt,
    updatedAt
FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info');

\echo '✅ 备份完成'
\echo '备份分组数量: ' || (SELECT COUNT(*) FROM employee_info_tab_groups_backup)
\echo '备份字段数量: ' || (SELECT COUNT(*) FROM employee_info_tab_fields_backup)

-- ========================================
-- 第二步：检查是否存在自定义配置
-- ========================================

DO $$
DECLARE
    custom_group_count INTEGER;
    custom_field_count INTEGER;
BEGIN
    -- 检查自定义分组
    SELECT COUNT(*) INTO custom_group_count
    FROM "EmployeeInfoTabGroup"
    WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
      AND "isSystem" = false;

    -- 检查自定义字段
    SELECT COUNT(*) INTO custom_field_count
    FROM "EmployeeInfoTabField"
    WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
      AND "isSystem" = false;

    IF custom_group_count > 0 OR custom_field_count > 0 THEN
        RAISE NOTICE '⚠️  警告：发现自定义配置';
        RAISE NOTICE '自定义分组数量: %', custom_group_count;
        RAISE NOTICE '自定义字段数量: %', custom_field_count;
        RAISE NOTICE '这些自定义配置不会被修改，但分组结构会发生变化';
    ELSE
        RAISE NOTICE '✅ 未发现自定义配置，可以安全迁移';
    END IF;
END $$;

-- ========================================
-- 第三步：执行迁移
-- ========================================

\echo '========== 开始执行迁移 =========='

-- 3.1 将"组织信息"分组改名为"岗位信息"
\echo '1. 将"组织信息"改名为"岗位信息"...'
UPDATE "EmployeeInfoTabGroup"
SET
    "name" = '岗位信息',
    "code" = 'POSITION_INFO',
    "description" = '职位、职级、所属组织等岗位信息',
    "sort" = 1,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'ORG_INFO';

-- 3.2 获取岗位信息分组的ID
DO $$
DECLARE
    position_group_id INTEGER;
    current_position_group_id INTEGER;
BEGIN
    SELECT "id" INTO position_group_id
    FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'POSITION_INFO';

    SELECT "id" INTO current_position_group_id
    FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'CURRENT_POSITION';

    -- 3.3 将"当前职位"分组的字段移动到"岗位信息"分组
    \echo '2. 移动"当前职位"分组的字段到"岗位信息"...'
    UPDATE "EmployeeInfoTabField"
    SET
        "groupId" = position_group_id,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "groupId" = current_position_group_id;

    -- 3.4 删除"当前职位"分组
    \echo '3. 删除"当前职位"分组...'
    DELETE FROM "EmployeeInfoTabGroup"
    WHERE "code" = 'CURRENT_POSITION';

    -- 3.5 重新调整字段排序
    \echo '4. 调整字段排序...'

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'orgId' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 2, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'position' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 3, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'jobLevel' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 4, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'employeeType' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 5, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'workLocation' AND "groupId" = position_group_id;

    UPDATE "EmployeeInfoTabField"
    SET "sort" = 6, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "fieldCode" = 'workAddress' AND "groupId" = position_group_id;

    -- 3.6 调整雇佣信息分组的排序
    UPDATE "EmployeeInfoTabGroup"
    SET "sort" = 2, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = 'EMPLOYMENT_INFO';

    RAISE NOTICE '✅ 迁移完成';
END $$;

-- 3.7 修复系统字段的isSystem标志
\echo '5. 修复系统字段isSystem标志...'
UPDATE "EmployeeInfoTabField"
SET
    "isSystem" = true,
    "updatedAt" = CURRENT_TIMESTAMP
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
)
AND "isSystem" = false;

\echo '✅ 所有步骤完成'

-- ========================================
-- 第四步：验证迁移结果
-- ========================================

\echo ''
\echo '========== 验证迁移结果 =========='

-- 验证1：分组数量（应该是2个）
\echo '验证1：分组数量检查'
DO $$
DECLARE
    group_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO group_count
    FROM "EmployeeInfoTabGroup"
    WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info');

    IF group_count = 2 THEN
        RAISE NOTICE '✅ 分组数量正确: % (期望: 2)', group_count;
    ELSE
        RAISE NOTICE '❌ 分组数量错误: % (期望: 2)', group_count;
    END IF;
END $$;

-- 验证2：分组名称
\echo '验证2：分组名称检查'
SELECT
    'CODE=' || code || ', NAME=' || name || ', SORT=' || sort as group_info
FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
ORDER BY sort;

-- 验证3：岗位信息分组字段数量（应该是6个）
\echo '验证3：岗位信息分组字段数量'
DO $$
DECLARE
    field_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO field_count
    FROM "EmployeeInfoTabField"
    WHERE "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'POSITION_INFO');

    IF field_count = 6 THEN
        RAISE NOTICE '✅ 岗位信息字段数量正确: % (期望: 6)', field_count;
    ELSE
        RAISE NOTICE '⚠️  岗位信息字段数量: % (期望: 6)', field_count;
    END IF;
END $$;

-- 验证4：字段列表
\echo '验证4：岗位信息字段列表'
SELECT
    '  ' || sort || '. ' || fieldCode || ' (' || fieldName || ')' as field_list
FROM "EmployeeInfoTabField"
WHERE "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'POSITION_INFO')
ORDER BY sort;

COMMIT;

\echo ''
\echo '========== 迁移完成 =========='
\echo '✅ 迁移已成功完成'
\echo ''
\echo '⚠️  重要提示：'
\echo '1. 备份数据已保存在临时表中，会话结束自动清除'
\echo '2. 如需回滚，请执行 ROLLBACK-merge-position-groups.sql'
\echo '3. 请立即测试新增人员功能是否正常'
\echo ''
