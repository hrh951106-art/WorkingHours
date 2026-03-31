-- ========================================
-- WorkInfoHistory表结构检查和诊断脚本
-- ========================================
-- 用途: 检查生产环境中WorkInfoHistory表的存在性和结构完整性
-- 使用: psql -U username -d database_name -f check-workinfo-history.sql
-- ========================================

\echo ''
\echo '========================================'
\echo 'WorkInfoHistory表结构诊断'
\echo '========================================'
\echo ''

-- ========================================
-- 第一部分：检查表是否存在
-- ========================================

\echo '【1】检查WorkInfoHistory表是否存在'
\echo '----------------------------------------'

SELECT
    table_schema,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✓ 表存在' ELSE '✗ 表不存在' END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'WorkInfoHistory';

\echo ''

-- ========================================
-- 第二部分：检查表结构
-- ========================================

\echo '【2】检查表字段完整性'
\echo '----------------------------------------'

SELECT
    column_name AS "字段名",
    data_type AS "数据类型",
    is_nullable AS "可空",
    column_default AS "默认值",
    ordinal_position AS "位置"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'WorkInfoHistory'
ORDER BY ordinal_position;

\echo ''

-- ========================================
-- 第三部分：检查必需字段
-- ========================================

\echo '【3】检查必需字段是否存在'
\echo '----------------------------------------'

SELECT
    column_name AS "字段名",
    CASE WHEN column_name IS NOT NULL THEN '✓ 存在' ELSE '✗ 缺失' END AS "状态"
FROM (VALUES
    ('id'),
    ('employeeId'),
    ('effectiveDate'),
    ('endDate'),
    ('changeType'),
    ('position'),
    ('jobLevel'),
    ('employeeType'),
    ('workLocation'),
    ('workAddress'),
    ('hireDate'),
    ('probationStart'),
    ('probationEnd'),
    ('probationMonths'),
    ('regularDate'),
    ('resignationDate'),
    ('resignationReason'),
    ('workYears'),
    ('orgId'),
    ('isCurrent'),
    ('reason'),
    ('customFields'),
    ('createdAt'),
    ('updatedAt')
) AS required_fields(column_name)
LEFT JOIN information_schema.columns c ON c.column_name = required_fields.column_name
    AND c.table_schema = 'public'
    AND c.table_name = 'WorkInfoHistory'
ORDER BY required_fields.column_name;

\echo ''

-- ========================================
-- 第四部分：检查索引
-- ========================================

\echo '【4】检查索引是否存在'
\echo '----------------------------------------'

SELECT
    indexname AS "索引名",
    indexdef AS "索引定义"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'WorkInfoHistory'
ORDER BY indexname;

\echo ''

-- 验证必需索引
\echo '验证关键索引:'
\echo '  - idx_employeeId_effectiveDate: ' ||
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'WorkInfoHistory'
              AND indexname LIKE '%employeeId%effectiveDate%'
        ) THEN '✓ 存在'
        ELSE '✗ 缺失'
    END;
\echo '  - idx_employeeId_isCurrent: ' ||
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'WorkInfoHistory'
              AND indexname LIKE '%employeeId%isCurrent%'
        ) THEN '✓ 存在'
        ELSE '✗ 缺失'
    END;

\echo ''

-- ========================================
-- 第五部分：检查外键约束
-- ========================================

\echo '【5】检查外键约束'
\echo '----------------------------------------'

SELECT
    tc.constraint_name AS "约束名",
    tc.constraint_type AS "约束类型",
    kcu.column_name AS "字段名",
    ccu.table_name AS "关联表",
    ccu.column_name AS "关联字段"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'WorkInfoHistory'
  AND tc.constraint_type IN ('FOREIGN KEY', 'PRIMARY KEY')
ORDER BY tc.constraint_type, tc.constraint_name;

\echo ''

-- ========================================
-- 第六部分：检查数据
-- ========================================

\echo '【6】检查表数据'
\echo '----------------------------------------'

SELECT
    COUNT(*) AS "总记录数",
    COUNT(DISTINCT "employeeId") AS "员工数",
    COUNT(*) FILTER (WHERE "isCurrent" = true) AS "当前记录数",
    COUNT(*) FILTER (WHERE "isCurrent" = false) AS "历史记录数",
    MIN("effectiveDate") AS "最早生效日期",
    MAX("effectiveDate") AS "最晚生效日期"
FROM "WorkInfoHistory";

\echo ''

-- ========================================
-- 第七部分：数据完整性检查
-- ========================================

\echo '【7】数据完整性检查'
\echo '----------------------------------------'

-- 检查孤立的employeeId
\echo '孤立的员工记录（无对应Employee）:'
SELECT COUNT(*) AS orphan_count
FROM "WorkInfoHistory" w
WHERE NOT EXISTS (
    SELECT 1 FROM "Employee" e
    WHERE e.id = w."employeeId"
);

-- 检查孤立的orgId
\echo '孤立的组织记录（无对应Organization）:'
SELECT COUNT(*) AS orphan_count
FROM "WorkInfoHistory" w
WHERE w."orgId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Organization" o
    WHERE o.id = w."orgId"
  );

\echo ''

-- ========================================
-- 第八部分：与Employee表的字段映射检查
-- ========================================

\echo '【8】检查WorkInfoHistory与Employee的字段对应关系'
\echo '--------------------------------========'

\echo 'WorkInfoHistory中应该与Employee同步的字段:'
\echo '  - position (职位)'
\echo '  - jobLevel (职级)'
\echo '  - employeeType (员工类型)'
\echo '  - workLocation (工作地点)'
\echo '  - workAddress (办公地址)'
\echo '  - hireDate (受雇日期)'
\echo '  - entryDate (入职日期) - Employee中存在'
\echo '  - status (在职状态) - Employee中存在'
\echo ''
\echo '注意: WorkInfoHistory记录工作信息的变更历史，'
echo '      有些字段名与Employee表不完全一致。'

\echo ''

-- ========================================
-- 总结
-- ========================================

\echo '========================================'
\echo '诊断完成'
\echo '========================================'
\echo ''
\echo '如果发现缺失的表或字段，请运行:'
\echo '  psql -U username -d database_name -f prisma/migrations_postgres/20250331_init/init_production.sql'
\echo ''
