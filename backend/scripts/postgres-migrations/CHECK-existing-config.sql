-- ============================================================================
-- 生产环境配置检查脚本 - 部署前执行
-- ============================================================================
-- 用途：在部署前检查现有配置，避免数据丢失
-- 执行方式：psql -U jy_user -d jy_production -f CHECK-existing-config.sql
-- ============================================================================

\echo '========== 1. 检查人事信息页签配置 =========='

-- 查看所有页签
SELECT
    '--- 所有页签 ---' as info;
SELECT
    id,
    code,
    name,
    sort,
    status,
    createdAt
FROM "EmployeeInfoTab"
ORDER BY sort;

\echo ''
\echo '========== 2. 检查工作信息页签的分组（将被修改）=========='

-- 查看工作信息页签的分组
SELECT
    '--- 工作信息页签分组 ---' as info;
SELECT
    g.id,
    g.code,
    g.name,
    g.sort,
    g.status,
    COUNT(f.id) as field_count
FROM "EmployeeInfoTabGroup" g
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE g."tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
GROUP BY g.id, g.code, g.name, g.sort, g.status
ORDER BY g.sort;

\echo ''
\echo '========== 3. 检查将被删除的"当前职位"分组 =========='

-- 查看CURRENT_POSITION分组的字段（将被删除）
SELECT
    '--- 当前职位分组的字段（将合并到岗位信息）---' as info;
SELECT
    f.id,
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    f.isRequired,
    f.isHidden,
    f.isSystem,
    f.sort
FROM "EmployeeInfoTabField" f
WHERE f."groupId" = (SELECT id FROM "EmployeeInfoTabGroup" WHERE code = 'CURRENT_POSITION')
ORDER BY f.sort;

\echo ''
\echo '========== 4. 检查"组织信息"分组（将改名为"岗位信息"）=========='

-- 查看ORG_INFO分组及其字段（将被改名为POSITION_INFO）
SELECT
    '--- 组织信息分组的字段 ---' as info;
SELECT
    f.id,
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    f.isRequired,
    f.isHidden,
    f.isSystem,
    f.sort
FROM "EmployeeInfoTabField" f
WHERE f."groupId" = (SELECT id FROM "EmployeeInfoTabGroup" WHERE code = 'ORG_INFO')
ORDER BY f.sort;

\echo ''
\echo '========== 5. 检查自定义配置（非系统配置）=========='

-- 检查是否有自定义页签（isSystem = false）
SELECT
    '--- 自定义页签（isSystem=false）---' as info;
SELECT
    id,
    code,
    name,
    sort,
    status
FROM "EmployeeInfoTab"
WHERE "isSystem" = false
ORDER BY sort;

\echo ''
\echo '========== 6. 检查自定义分组（非系统分组）=========='

-- 检查工作信息页签的自定义分组
SELECT
    '--- 工作信息页签的自定义分组 ---' as info;
SELECT
    id,
    code,
    name,
    sort,
    status,
    isSystem
FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
  AND "isSystem" = false;

\echo ''
\echo '========== 7. 检查自定义字段（非系统字段）=========='

-- 检查工作信息页签的自定义字段
SELECT
    '--- 工作信息页签的自定义字段 ---' as info;
SELECT
    f.id,
    g.name as group_name,
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    f.isRequired,
    f.isHidden,
    f.isSystem
FROM "EmployeeInfoTabField" f
LEFT JOIN "EmployeeInfoTabGroup" g ON f."groupId" = g.id
WHERE f."tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
  AND f."isSystem" = false
ORDER BY g.sort, f.sort;

\echo ''
\echo '========== 8. 检查所有分组及其字段统计 =========='

-- 统计所有分组的字段数量
SELECT
    '--- 所有分组字段统计 ---' as info;
SELECT
    t.name as tab_name,
    g.code as group_code,
    g.name as group_name,
    COUNT(f.id) as total_fields,
    COUNT(f.id) FILTER (WHERE f.isSystem = true) as system_fields,
    COUNT(f.id) FILTER (WHERE f.isSystem = false) as custom_fields,
    g.isSystem
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'work_info'
GROUP BY t.id, t.name, g.id, g.code, g.name, g.isSystem
ORDER BY g.sort;

\echo ''
\echo '========== 9. 检查是否有已删除的分组（安全检查）=========='

-- 检查是否有已删除的分组（status = DELETED 或 deletedAt 不为空）
SELECT
    '--- 已删除的分组 ---' as info;
SELECT
    id,
    code,
    name,
    status,
    deletedAt
FROM "EmployeeInfoTabGroup"
WHERE "status" = 'DELETED' OR "deletedAt" IS NOT NULL;

\echo ''
\echo '========== 10. 重要提示 =========='

\echo '迁移脚本将执行以下操作：'
\echo '1. 将"组织信息"(ORG_INFO)分组改名为"岗位信息"(POSITION_INFO)'
\echo '2. 删除"当前职位"(CURRENT_POSITION)分组'
\echo '3. 将"当前职位"分组的所有字段移动到"岗位信息"分组'
\echo '4. 调整字段排序顺序'
\echo '5. 将所有系统字段的isSystem设置为true'
\echo ''
\echo '⚠️  如果您有自定义配置，请注意备份！'
\echo ''
