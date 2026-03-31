-- ========================================
-- JY系统部署验证脚本
-- ========================================
-- 用途: 验证生产环境部署是否成功
-- 使用: psql -U jy_admin -d jy_production -f verify-deployment.sql
-- ========================================

\echo ''
\echo '========================================'
\echo 'JY系统部署验证'
\echo '========================================'
\echo ''

-- ========================================
-- 1. 数据库连接测试
-- ========================================
\echo '【1】数据库连接测试'
\echo '----------------------------------------'
SELECT
    current_database() AS database_name,
    current_user AS current_user,
    version() AS postgres_version;
\echo ''

-- ========================================
-- 2. 表结构验证
-- ========================================
\echo '【2】表结构验证'
\echo '----------------------------------------'
SELECT
    table_name AS table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'User', 'Role', 'UserRole',
    'Organization', 'Employee',
    'DataSource', 'DataSourceOption',
    'Shift', 'ShiftProperty',
    'PunchDevice',
    'EmployeeInfoTab', 'EmployeeInfoTabGroup', 'EmployeeInfoTabField',
    'CustomField'
  )
ORDER BY table_name;
\echo ''

-- ========================================
-- 3. 核心数据统计
-- ========================================
\echo '【3】核心数据统计'
\echo '----------------------------------------'

-- 用户和角色
SELECT 'User' AS table_name, COUNT(*) AS row_count FROM "User"
UNION ALL
SELECT 'Role', COUNT(*) FROM "Role"
UNION ALL
SELECT 'UserRole', COUNT(*) FROM "UserRole"
UNION ALL
SELECT 'Organization', COUNT(*) FROM "Organization"
UNION ALL
SELECT 'Employee', COUNT(*) FROM "Employee"
UNION ALL
SELECT 'DataSource', COUNT(*) FROM "DataSource"
UNION ALL
SELECT 'DataSourceOption', COUNT(*) FROM "DataSourceOption"
UNION ALL
SELECT 'Shift', COUNT(*) FROM "Shift"
UNION ALL
SELECT 'PunchDevice', COUNT(*) FROM "PunchDevice"
UNION ALL
SELECT 'EmployeeInfoTab', COUNT(*) FROM "EmployeeInfoTab"
UNION ALL
SELECT 'EmployeeInfoTabGroup', COUNT(*) FROM "EmployeeInfoTabGroup"
UNION ALL
SELECT 'EmployeeInfoTabField', COUNT(*) FROM "EmployeeInfoTabField"
UNION ALL
SELECT 'CustomField', COUNT(*) FROM "CustomField"
ORDER BY table_name;

\echo ''

-- ========================================
-- 4. 人事信息页签详细验证
-- ========================================
\echo '【4】人事信息页签配置验证'
\echo '----------------------------------------'

-- 页签列表及分组/字段统计
SELECT
    t.code AS tab_code,
    t.name AS tab_name,
    t.description AS tab_description,
    COUNT(DISTINCT g.id) AS group_count,
    COUNT(DISTINCT f.id) AS field_count,
    t.is_system AS is_system,
    t.status AS status
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."tabId" = t.id
WHERE t.code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info')
GROUP BY t.id, t.code, t.name, t.description, t.is_system, t.status
ORDER BY t.sort;

\echo ''

-- 分组详细信息
SELECT
    t.code AS tab_code,
    g.code AS group_code,
    g.name AS group_name,
    COUNT(f.id) AS field_count
FROM "EmployeeInfoTab" t
INNER JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code IN ('basic_info', 'work_info')
GROUP BY t.code, g.code, g.name, g.sort
ORDER BY t.code, g.sort;

\echo ''

-- ========================================
-- 5. 重复数据检查
-- ========================================
\echo '【5】重复数据检查'
\echo '----------------------------------------'

-- 检查是否有重复的页签代码（应该为空）
SELECT
    'EmployeeInfoTab' AS table_name,
    code,
    COUNT(*) AS duplicate_count
FROM "EmployeeInfoTab"
GROUP BY code
HAVING COUNT(*) > 1;

\echo ''

-- ========================================
-- 6. 索引验证
-- ========================================
\echo '【6】性能优化索引检查'
\echo '----------------------------------------'
SELECT
    indexname AS index_name,
    tablename AS table_name
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

\echo ''

-- ========================================
-- 7. 序列验证
-- ========================================
\echo '【7】序列状态检查'
\echo '----------------------------------------'
SELECT
    s.relname AS sequence_name,
    pg_size_pretty(pg_relation_size(s.oid)) AS sequence_size,
    last_value
FROM pg_sequence s
JOIN pg_class c ON c.oid = s.seqrelid
WHERE c.relkind = 'S'
  AND s.relname LIKE '%_id_seq'
ORDER BY s.relname;

\echo ''

-- ========================================
-- 8. 默认账号验证
-- ========================================
\echo '【8】默认账号验证'
\echo '----------------------------------------'

SELECT
    id,
    username,
    name,
    email,
    status,
    createdAt
FROM "User"
WHERE username IN ('admin', 'testuser')
ORDER BY id;

\echo ''

-- 管理员角色分配
SELECT
    u.username,
    r.code AS role_code,
    r.name AS role_name
FROM "UserRole" ur
INNER JOIN "User" u ON u.id = ur."userId"
INNER JOIN "Role" r ON r.id = ur."roleId"
WHERE u.username = 'admin';

\echo ''

-- ========================================
-- 9. 组织架构验证
-- ========================================
\echo '【9】组织架构验证'
\echo '----------------------------------------'
SELECT
    id,
    code,
    name,
    "parentId",
    type,
    level,
    status
FROM "Organization"
ORDER BY level, code;

\echo ''

-- ========================================
-- 10. 班次配置验证
-- ========================================
\echo '【10】班次配置验证'
\echo '----------------------------------------'
SELECT
    code,
    name,
    type,
    "standardHours",
    status
FROM "Shift"
ORDER BY id;

\echo ''

-- ========================================
-- 11. 数据源配置验证
-- ========================================
\echo '【11】数据源配置验证'
\echo '----------------------------------------'
SELECT
    code,
    name,
    type,
    description,
    (SELECT COUNT(*) FROM "DataSourceOption" o WHERE o."dataSourceId" = d.id) AS option_count,
    status
FROM "DataSource" d
ORDER BY sort;

\echo ''

-- ========================================
-- 12. 数据完整性检查
-- ========================================
\echo '【12】数据完整性检查'
\echo '----------------------------------------'

-- 检查孤立的用户角色（应该为空）
SELECT '孤立的用户角色（无效userId）' AS check_item, COUNT(*) AS count
FROM "UserRole" ur
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = ur."userId")
UNION ALL
SELECT '孤立的用户角色（无效roleId）', COUNT(*)
FROM "UserRole" ur
WHERE NOT EXISTS (SELECT 1 FROM "Role" r WHERE r.id = ur."roleId")
UNION ALL
SELECT '孤立的员工（无效orgId）', COUNT(*)
FROM "Employee" e
WHERE NOT EXISTS (SELECT 1 FROM "Organization" o WHERE o.id = e."orgId")
UNION ALL
SELECT '孤立的页签分组（无效tabId）', COUNT(*)
FROM "EmployeeInfoTabGroup" g
WHERE NOT EXISTS (SELECT 1 FROM "EmployeeInfoTab" t WHERE t.id = g."tabId")
UNION ALL
SELECT '孤立的页签字段（无效tabId）', COUNT(*)
FROM "EmployeeInfoTabField" f
WHERE NOT EXISTS (SELECT 1 FROM "EmployeeInfoTab" t WHERE t.id = f."tabId")
UNION ALL
SELECT '孤立的页签字段（无效groupId）', COUNT(*)
FROM "EmployeeInfoTabField" f
WHERE f."groupId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "EmployeeInfoTabGroup" g WHERE g.id = f."groupId");

\echo ''

-- ========================================
-- 13. 性能统计
-- ========================================
\echo '【13】数据库统计信息'
\echo '----------------------------------------'

-- 表大小统计
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'User', 'Role', 'UserRole',
    'Organization', 'Employee',
    'DataSource', 'DataSourceOption',
    'Shift', 'PunchDevice',
    'EmployeeInfoTab', 'EmployeeInfoTabGroup', 'EmployeeInfoTabField',
    'CustomField'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''

-- ========================================
-- 14. 安全检查
-- ========================================
\echo '【14】安全配置检查'
\echo '----------------------------------------'

-- 检查是否有弱密码用户（默认密码）
SELECT
    '使用默认密码的用户' AS check_item,
    COUNT(*) AS user_count
FROM "User"
WHERE password = '$2b$10$VK4dEqPfsqJ8fE8kQYQ2VuH5J3kFJE9WqeCfO7TUKHN9PYFcGxOYq';

-- 检查活跃用户状态
SELECT
    '活跃用户数量' AS check_item,
    COUNT(*) AS user_count
FROM "User"
WHERE status = 'ACTIVE';

-- 检查是否有测试数据
SELECT
    '测试用户数量' AS check_item,
    COUNT(*) AS user_count
FROM "User"
WHERE username LIKE '%test%' OR username LIKE '%demo%';

\echo ''

-- ========================================
-- 验证总结
-- ========================================
\echo '========================================'
\echo '验证完成！请检查以上输出。'
\echo '========================================'
\echo ''
\echo '✓ 如果所有检查都通过，说明部署成功！'
\echo ''
\echo '⚠️  需要关注的问题：'
\echo '  1. 数据完整性检查应该全部为 0'
\echo '  2. 重复数据检查应该为空'
\echo '  3. 默认账号检查应该显示 admin 用户'
\echo '  4. 人事信息页签应该有 5 个（basic_info, work_info等）'
\echo '  5. 索引检查应该显示 idx_ 开头的索引'
\echo ''
\echo '📝 部署后必做事项：'
\echo '  1. 修改默认管理员密码'
\echo '  2. 更新 .env.production 中的 JWT_SECRET'
\echo '  3. 配置数据库自动备份'
\echo '  4. 配置应用日志监控'
\echo '========================================'
\echo ''
