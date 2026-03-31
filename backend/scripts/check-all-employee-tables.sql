-- ========================================
-- 员工信息相关表完整检查脚本
-- ========================================
-- 用途: 全面检查生产环境中所有员工信息相关表的结构和数据完整性
-- 检查表:
--   1. Employee (员工主表)
--   2. EmployeeEducation (学历信息表)
--   3. EmployeeWorkExperience (工作经历表)
--   4. EmployeeFamilyMember (家庭成员表)
--   5. EmployeeInfoTab (人事信息页签表)
--   6. EmployeeInfoTabGroup (人事信息页签分组表)
--   7. EmployeeInfoTabField (人事信息页签字段表)
--   8. WorkInfoHistory (工作信息历史表)
-- ========================================

\echo ''
\echo '========================================'
\echo '员工信息相关表完整性检查'
\echo '========================================'
\echo ''

-- ========================================
-- 第一部分：检查表是否存在
-- ========================================

\echo '【第一部分】表存在性检查'
\echo '========================================'
\echo ''

WITH required_tables AS (
    SELECT 'Employee' AS table_name
    UNION SELECT 'EmployeeEducation'
    UNION SELECT 'EmployeeWorkExperience'
    UNION SELECT 'EmployeeFamilyMember'
    UNION SELECT 'EmployeeInfoTab'
    UNION SELECT 'EmployeeInfoTabGroup'
    UNION SELECT 'EmployeeInfoTabField'
    UNION SELECT 'WorkInfoHistory'
)
SELECT
    rt.table_name AS "表名",
    CASE
        WHEN t.table_name IS NOT NULL THEN '✓ 存在'
        ELSE '✗ 缺失'
    END AS "状态"
FROM required_tables rt
LEFT JOIN information_schema.tables t
    ON t.table_name = rt.table_name
    AND t.table_schema = 'public'
ORDER BY rt.table_name;

\echo ''

-- ========================================
-- 第二部分：检查Employee表
-- ========================================

\echo '【第二部分】Employee表结构检查'
\echo '========================================'
\echo ''

-- 2.1 检查Employee表字段
\echo '2.1 Employee表必填字段检查:'
\echo '----------------------------------------'

SELECT
    column_name AS "字段名",
    CASE WHEN column_name IS NOT NULL THEN '✓' ELSE '✗' END AS "状态"
FROM (VALUES
    ('id'),
    ('employeeNo'),
    ('name'),
    ('gender'),
    ('orgId'),
    ('entryDate'),
    ('status'),
    ('customFields'),
    ('createdAt'),
    ('updatedAt'),
    ('age'),
    ('birthDate'),
    ('phone'),
    ('email')
) AS required_fields(field)
LEFT JOIN information_schema.columns c
    ON c.column_name = required_fields.field
    AND c.table_name = 'Employee'
    AND c.table_schema = 'public'
ORDER BY required_fields.field;

\echo ''

-- 2.2 检查Employee表数据
\echo '2.2 Employee表数据统计:'
\echo '----------------------------------------'

SELECT
    COUNT(*) AS "员工总数",
    COUNT(*) FILTER (WHERE status = 'ACTIVE') AS "在职员工",
    COUNT(*) FILTER (WHERE status = 'RESIGNED') AS "离职员工",
    COUNT(*) FILTER (WHERE gender IS NOT NULL) AS "有性别信息",
    COUNT(*) FILTER (WHERE age IS NOT NULL) AS "有年龄信息"
FROM "Employee";

\echo ''

-- ========================================
-- 第三部分：检查EmployeeEducation表
-- ========================================

\echo '【第三部分】EmployeeEducation表检查'
\echo '========================================'
\echo ''

-- 3.1 检查表字段
\echo '3.1 字段检查:'
\echo '----------------------------------------'

SELECT
    column_name AS "字段名",
    CASE WHEN column_name IS NOT NULL THEN '✓' ELSE '✗' END AS "状态"
FROM (VALUES
    ('id'),
    ('employeeId'),
    ('school'),
    ('major'),
    ('degree'),
    ('educationLevel'),
    ('startDate'),
    ('endDate'),
    ('isHighest'),
    ('description'),
    ('degreeNo'),
    ('diplomaNo'),
    ('educationType'),
    ('graduationDate'),
    ('createdAt'),
    ('updatedAt')
) AS required_fields(field)
LEFT JOIN information_schema.columns c
    ON c.column_name = required_fields.field
    AND c.table_name = 'EmployeeEducation'
    AND c.table_schema = 'public'
ORDER BY required_fields.field;

\echo ''

-- 3.2 检查外键
\echo '3.2 外键约束检查:'
\echo '----------------------------------------'

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'EmployeeEducation'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'employeeId'
        )
        THEN '✓ employeeId外键存在'
        ELSE '✗ employeeId外键缺失'
    END AS "外键状态";

\echo ''

-- 3.3 检查索引
\echo '3.3 索引检查:'
\echo '----------------------------------------'

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'EmployeeEducation'
              AND indexdef LIKE '%employeeId%'
        )
        THEN '✓ employeeId索引存在'
        ELSE '✗ employeeId索引缺失'
    END AS "索引状态1",
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'EmployeeEducation'
              AND indexdef LIKE '%isHighest%'
        )
        THEN '✓ isHighest复合索引存在'
        ELSE '✗ isHighest复合索引缺失'
    END AS "索引状态2";

\echo ''

-- 3.4 检查数据
\echo '3.4 数据统计:'
\echo '----------------------------------------'

SELECT
    COUNT(*) AS "学历记录总数",
    COUNT(DISTINCT "employeeId") AS "有学历的员工数",
    COUNT(*) FILTER (WHERE "isHighest" = true) AS "最高学历标记数"
FROM "EmployeeEducation";

\echo ''

-- ========================================
-- 第四部分：检查EmployeeWorkExperience表
-- ========================================

\echo '【第四部分】EmployeeWorkExperience表检查'
\echo '========================================'
\echo ''

\echo '4.1 字段检查:'
\echo '----------------------------------------'

SELECT
    column_name AS "字段名",
    CASE WHEN column_name IS NOT NULL THEN '✓' ELSE '✗' END AS "状态"
FROM (VALUES
    ('id'),
    ('employeeId'),
    ('company'),
    ('position'),
    ('startDate'),
    ('endDate'),
    ('description'),
    ('reason'),
    ('salary'),
    ('createdAt'),
    ('updatedAt')
) AS required_fields(field)
LEFT JOIN information_schema.columns c
    ON c.column_name = required_fields.field
    AND c.table_name = 'EmployeeWorkExperience'
    AND c.table_schema = 'public'
ORDER BY required_fields.field;

\echo ''

\echo '4.2 数据统计:'
\echo '----------------------------------------'

SELECT
    COUNT(*) AS "工作经历记录总数",
    COUNT(DISTINCT "employeeId") AS "有工作经历的员工数"
FROM "EmployeeWorkExperience";

\echo ''

-- ========================================
-- 第五部分：检查EmployeeFamilyMember表
-- ========================================

\echo '【第五部分】EmployeeFamilyMember表检查'
\echo '========================================'
\echo ''

\echo '5.1 字段检查:'
\echo '----------------------------------------'

SELECT
    column_name AS "字段名",
    CASE WHEN column_name IS NOT NULL THEN '✓' ELSE '✗' END AS "状态"
FROM (VALUES
    ('id'),
    ('employeeId'),
    ('relationship'),
    ('name'),
    ('gender'),
    ('idCard'),
    ('phone'),
    ('workUnit'),
    ('address'),
    ('dateOfBirth'),
    ('isEmergency'),
    ('sortOrder'),
    ('age'),
    ('createdAt'),
    ('updatedAt')
) AS required_fields(field)
LEFT JOIN information_schema.columns c
    ON c.column_name = required_fields.field
    AND c.table_name = 'EmployeeFamilyMember'
    AND c.table_schema = 'public'
ORDER BY required_fields.field;

\echo ''

\echo '5.2 数据统计:'
\echo '----------------------------------------'

SELECT
    COUNT(*) AS "家庭成员记录总数",
    COUNT(DISTINCT "employeeId") AS "有家庭成员的员工数",
    COUNT(*) FILTER (WHERE "isEmergency" = true) AS "紧急联系人数"
FROM "EmployeeFamilyMember";

\echo ''

-- ========================================
-- 第六部分：检查人事信息页签配置表
-- ========================================

\echo '【第六部分】人事信息页签配置检查'
\echo '========================================'
\echo ''

-- 6.1 检查EmployeeInfoTab表
\echo '6.1 EmployeeInfoTab表:'
\echo '----------------------------------------'

SELECT
    code AS "页签代码",
    name AS "页签名称",
    "isSystem" AS "系统内置",
    status AS "状态",
    sort AS "排序"
FROM "EmployeeInfoTab"
WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info')
ORDER BY sort;

\echo ''

-- 6.2 检查是否有重复页签
\echo '6.2 重复页签检查:'
\echo '----------------------------------------'

SELECT
    code AS "页签代码",
    COUNT(*) AS "数量",
    CASE
        WHEN COUNT(*) > 1 THEN '⚠️  有重复'
        ELSE '✓ 正常'
    END AS "状态"
FROM "EmployeeInfoTab"
GROUP BY code
HAVING COUNT(*) > 1
ORDER BY code;

\echo ''

-- 6.3 检查页签分组和字段统计
\echo '6.3 页签配置统计:'
\echo '----------------------------------------'

SELECT
    t.code AS "页签代码",
    t.name AS "页签名称",
    COUNT(DISTINCT g.id) AS "分组数",
    COUNT(DISTINCT f.id) AS "字段数",
    STRING_AGG(DISTINCT g.name, ', ') AS "分组名称"
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."tabId" = t.id
WHERE t.code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info')
GROUP BY t.id, t.code, t.name
ORDER BY t.sort;

\echo ''

-- 6.4 检查关键字段是否存在
\echo '6.4 关键字段检查 (gender, age):'
\echo '----------------------------------------'

SELECT
    t.code AS "页签",
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.isRequired AS "必填",
    f.isHidden AS "隐藏"
FROM "EmployeeInfoTab" t
INNER JOIN "EmployeeInfoTabField" f ON f."tabId" = t.id
WHERE t.code = 'basic_info'
  AND f.fieldCode IN ('gender', 'age')
ORDER BY f.sort;

\echo ''

-- 如果没有找到gender和age字段，给出警告
DO $$
DECLARE
    v_gender_count INTEGER;
    v_age_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_gender_count
    FROM "EmployeeInfoTabField" f
    INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
    WHERE t.code = 'basic_info' AND f.fieldCode = 'gender';

    SELECT COUNT(*) INTO v_age_count
    FROM "EmployeeInfoTabField" f
    INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
    WHERE t.code = 'basic_info' AND f.fieldCode = 'age';

    IF v_gender_count = 0 THEN
        RAISE NOTICE '⚠️  警告: basic_info页签中缺少gender字段配置！';
    END IF;

    IF v_age_count = 0 THEN
        RAISE NOTICE '⚠️  警告: basic_info页签中缺少age字段配置！';
    END IF;
END $$;

\echo ''

-- ========================================
-- 第七部分：数据完整性检查
-- ========================================

\echo '【第七部分】数据完整性检查'
\echo '========================================'
\echo ''

-- 7.1 检查孤立记录
\echo '7.1 孤立记录检查（外键完整性）:'
\echo '----------------------------------------'

SELECT 'EmployeeEducation孤立记录' AS "检查项",
    COUNT(*) AS "数量",
    CASE WHEN COUNT(*) = 0 THEN '✓ 正常' ELSE '✗ 异常' END AS "状态"
FROM "EmployeeEducation" e
WHERE NOT EXISTS (SELECT 1 FROM "Employee" emp WHERE emp.id = e."employeeId")
UNION ALL
SELECT 'EmployeeWorkExperience孤立记录',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ 正常' ELSE '✗ 异常' END
FROM "EmployeeWorkExperience" e
WHERE NOT EXISTS (SELECT 1 FROM "Employee" emp WHERE emp.id = e."employeeId")
UNION ALL
SELECT 'EmployeeFamilyMember孤立记录',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ 正常' ELSE '✗ 异常' END
FROM "EmployeeFamilyMember" e
WHERE NOT EXISTS (SELECT 1 FROM "Employee" emp WHERE emp.id = e."employeeId")
UNION ALL
SELECT 'WorkInfoHistory孤立记录',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN '✓ 正常' ELSE '✗ 异常' END
FROM "WorkInfoHistory" w
WHERE NOT EXISTS (SELECT 1 FROM "Employee" emp WHERE emp.id = w."employeeId");

\echo ''

-- ========================================
-- 第八部分：索引性能检查
-- ========================================

\echo '【第八部分】关键索引检查'
\echo '========================================'
\echo ''

\echo '关键索引状态:'
\echo '----------------------------------------'

-- 检查所有关键索引
SELECT
    tablename AS "表名",
    indexname AS "索引名",
    indexdef AS "索引定义"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Employee', 'EmployeeEducation', 'EmployeeWorkExperience', 'EmployeeFamilyMember', 'WorkInfoHistory')
  AND (
    indexname LIKE '%employeeId%'
    OR indexname LIKE '%orgId%'
    OR indexname LIKE '%isHighest%'
    OR indexname LIKE '%isEmergency%'
    OR indexname LIKE '%effectiveDate%'
  )
ORDER BY tablename, indexname;

\echo ''

-- ========================================
-- 总结
-- ========================================

\echo '========================================'
\echo '✓ 检查完成！'
\echo '========================================'
\echo ''
\echo '如果发现缺失的表或字段，请运行:'
\echo '  psql -U username -d database_name -f prisma/migrations_postgres/20250331_init/init_production.sql'
\echo ''
\echo '如果发现数据完整性问题，请运行:'
\echo '  psql -U username -d database_name -f scripts/fix-employee-fields.sql'
\echo ''
