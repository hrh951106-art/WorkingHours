-- ========================================
-- 诊断和修复性别/年龄字段问题
-- ========================================
-- 用途: 检查并修复人事信息页签配置中缺失的字段
-- 使用: psql -U username -d database_name -f fix-employee-fields.sql
-- ========================================

\echo ''
\echo '========================================'
\echo '诊断：性别和年龄字段问题'
\echo '========================================'
\echo ''

-- ========================================
-- 第一部分：检查问题
-- ========================================

\echo '【1】检查基本信息页签的字段配置'
\echo '----------------------------------------'

SELECT
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    f.isRequired,
    g.code AS groupCode,
    g.name AS groupName
FROM "EmployeeInfoTabField" f
LEFT JOIN "EmployeeInfoTabGroup" g ON g.id = f."groupId"
WHERE f."tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'basic_info')
  AND f.fieldCode IN ('gender', 'age')
ORDER BY f.sort;

\echo ''
\echo '【2】检查Employee表的实际字段'
\echo '----------------------------------------'

-- PostgreSQL 查询表结构
SELECT
    column_name AS fieldCode,
    data_type AS fieldType,
    is_nullable AS isRequired
FROM information_schema.columns
WHERE table_name = 'Employee'
  AND column_name IN ('gender', 'age')
ORDER BY ordinal_position;

\echo ''
\echo '【3】查找可能的重复字段（大小写不匹配）'
\echo '----------------------------------------'

SELECT
    f.fieldCode,
    f.fieldName,
    '字段代码大小写可能不匹配' AS issue
FROM "EmployeeInfoTabField" f
WHERE f."tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'basic_info')
  AND (f.fieldCode ~* 'gender' OR f.fieldCode ~* 'age')
  AND f.fieldCode NOT IN ('gender', 'age');

\echo ''
\echo '【4】检查是否有重复的页签（大小写问题）'
\echo '----------------------------------------'

SELECT
    code,
    name,
    COUNT(*) AS duplicateCount
FROM "EmployeeInfoTab"
WHERE code IN ('basic_info', 'BASIC_INFO', 'work_info', 'WORK_INFO')
GROUP BY code, name
HAVING COUNT(*) > 1;

\echo ''

-- ========================================
-- 第二部分：自动修复
-- ========================================

\echo '========================================'
\echo '开始修复...'
\echo '========================================'
\echo ''

-- 修复1: 确保基本信息页签包含 gender 和 age 字段
\echo '【修复1】添加缺失的 gender 和 age 字段...'
\echo '----------------------------------------'

-- 获取基本信息页签和个人信息分组的ID
DO $$
DECLARE
    v_tab_id INTEGER;
    v_group_id INTEGER;
    v_gender_count INTEGER;
    v_age_count INTEGER;
BEGIN
    -- 获取页签ID
    SELECT id INTO v_tab_id FROM "EmployeeInfoTab" WHERE code = 'basic_info' LIMIT 1;

    IF v_tab_id IS NULL THEN
        RAISE NOTICE '错误: 未找到 basic_info 页签';
    ELSE
        -- 获取或创建个人信息分组
        SELECT id INTO v_group_id
        FROM "EmployeeInfoTabGroup"
        WHERE "tabId" = v_tab_id AND code = 'personal_info'
        LIMIT 1;

        IF v_group_id IS NULL THEN
            RAISE NOTICE '创建 personal_info 分组';
            INSERT INTO "EmployeeInfoTabGroup" ("tabId", code, name, description, sort, status, "isSystem", "createdAt", "updatedAt")
            VALUES (v_tab_id, 'personal_info', '个人信息', '员工基本个人信息', 1, 'ACTIVE', true, NOW(), NOW())
            RETURNING id INTO v_group_id;
        END IF;

        -- 检查gender字段是否存在
        SELECT COUNT(*) INTO v_gender_count
        FROM "EmployeeInfoTabField"
        WHERE "tabId" = v_tab_id AND fieldCode = 'gender';

        IF v_gender_count = 0 THEN
            RAISE NOTICE '添加 gender 字段';
            INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", fieldCode, fieldName, fieldType, isRequired, isHidden, sort, "createdAt", "updatedAt")
            VALUES (v_tab_id, v_group_id, 'gender', '性别', 'SYSTEM', true, false, 3, NOW(), NOW());
        ELSE
            RAISE NOTICE 'gender 字段已存在';
        END IF;

        -- 检查age字段是否存在
        SELECT COUNT(*) INTO v_age_count
        FROM "EmployeeInfoTabField"
        WHERE "tabId" = v_tab_id AND fieldCode = 'age';

        IF v_age_count = 0 THEN
            RAISE NOTICE '添加 age 字段';
            INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", fieldCode, fieldName, fieldType, isRequired, isHidden, sort, "createdAt", "updatedAt")
            VALUES (v_tab_id, v_group_id, 'age', '年龄', 'SYSTEM', true, false, 5, NOW(), NOW());
        ELSE
            RAISE NOTICE 'age 字段已存在';
        END IF;
    END IF;

END $$;

\echo ''

-- 修复2: 删除重复的大写代码页签（如果存在）
\echo '【修复2】删除重复的大写代码页签...'
\echo '----------------------------------------'

DELETE FROM "EmployeeInfoTabField"
WHERE "tabId" IN (
    SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

DELETE FROM "EmployeeInfoTabGroup"
WHERE "tabId" IN (
    SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

DELETE FROM "EmployeeInfoTab"
WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY');

\echo '已删除重复的大写代码页签'
\echo ''

-- ========================================
-- 第三部分：验证修复结果
-- ========================================

\echo '========================================'
\echo '验证修复结果'
\echo '========================================'
\echo ''

\echo '【验证1】确认 gender 和 age 字段已添加'
\echo '----------------------------------------'

SELECT
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    f.isRequired,
    g.name AS groupName
FROM "EmployeeInfoTabField" f
LEFT JOIN "EmployeeInfoTabGroup" g ON g.id = f."groupId"
WHERE f."tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'basic_info')
  AND f.fieldCode IN ('gender', 'age')
ORDER BY f.sort;

\echo ''
\echo '【验证2】确认没有重复的页签'
\echo '----------------------------------------'

SELECT
    code,
    name,
    COUNT(*) AS count
FROM "EmployeeInfoTab"
WHERE code IN ('basic_info', 'BASIC_INFO', 'work_info', 'WORK_INFO', 'education_info', 'EDUCATION', 'work_experience', 'WORK_EXPERIENCE', 'family_info', 'FAMILY')
GROUP BY code, name
ORDER BY code;

\echo ''
\echo '【验证3】显示基本信息页签的所有字段'
\echo '----------------------------------------'

SELECT
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    CASE WHEN f.isRequired THEN '是' ELSE '否' END AS "必填",
    g.name AS "分组",
    f.sort
FROM "EmployeeInfoTabField" f
LEFT JOIN "EmployeeInfoTabGroup" g ON g.id = f."groupId"
WHERE f."tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'basic_info')
ORDER BY g.sort, f.sort;

\echo ''
\echo '========================================'
\echo '✓ 修复完成！'
\echo '========================================'
\echo ''
\echo '如果问题仍然存在，请检查：'
\echo '  1. 前端代码是否正确使用 fieldCode="gender" 和 fieldCode="age"'
\echo '  2. API 接口返回的数据结构是否正确'
\echo '  3. 浏览器控制台是否有相关错误信息'
\echo ''
