-- ========================================
-- 清理重复的人事信息页签
-- ========================================
-- 问题: 数据库中同时存在大写代码（BASIC_INFO）和小写代码（basic_info）的页签
-- 解决: 删除大写代码的重复页签，保留小写代码的正确页签
-- ========================================

\echo ''
\echo '========================================'
\echo '清理重复的人事信息页签'
\echo '========================================'
\echo ''

-- 显示当前的重复情况
\echo '【步骤 1】检查重复的页签'
\echo '----------------------------------------'

SELECT
    code AS "页签代码",
    name AS "页签名称",
    id AS "ID",
    "isSystem" AS "系统内置"
FROM "EmployeeInfoTab"
WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
ORDER BY code;

\echo ''

-- 删除重复页签的字段
\echo '【步骤 2】删除重复页签的字段'
\echo '----------------------------------------'

DELETE FROM "EmployeeInfoTabField"
WHERE "tabId" IN (
    SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

\echo '已删除重复页签的字段记录'

\echo ''

-- 删除重复页签的分组
\echo '【步骤 3】删除重复页签的分组'
\echo '----------------------------------------'

DELETE FROM "EmployeeInfoTabGroup"
WHERE "tabId" IN (
    SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

\echo '已删除重复页签的分组记录'

\echo ''

-- 删除重复的页签
\echo '【步骤 4】删除重复的页签'
\echo '----------------------------------------'

DELETE FROM "EmployeeInfoTab"
WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY');

\echo '已删除重复的页签'

\echo ''

-- 验证结果
\echo '【步骤 5】验证清理结果'
\echo '----------------------------------------'

\echo '剩余的页签:'
SELECT
    code AS "页签代码",
    name AS "页签名称",
    COUNT(DISTINCT g.id) AS "分组数",
    COUNT(DISTINCT f.id) AS "字段数"
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."tabId" = t.id
WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info')
GROUP BY t.id, t.code, t.name
ORDER BY t.sort;

\echo ''

-- 检查是否还有重复
\echo '重复检查:'

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM "EmployeeInfoTab"
            WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
        )
        THEN '✗ 仍然存在重复页签'
        ELSE '✓ 已成功清理所有重复页签'
    END AS "状态";

\echo ''

\echo '========================================'
\echo '✓ 清理完成！'
\echo '========================================'
\echo ''
\echo '注意: 如果gender和age字段仍然缺失，请运行:'
\echo '  psql -U username -d database_name -f scripts/fix-employee-fields.sql'
\echo ''
