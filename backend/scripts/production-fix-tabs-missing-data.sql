-- ================================================================================
-- 人事信息配置页签数据修复SQL
-- ================================================================================
-- 问题：教育信息、工作经历、家庭信息页签没有分组和字段
-- ================================================================================

BEGIN;

-- ================================================================================
-- 第一步：检查并创建页签（如果缺失）
-- ================================================================================

SELECT '=== Step 1: 检查并创建页签 ===' AS info;

INSERT INTO "EmployeeInfoTab" (code, name, sort, status, createdAt, updatedAt)
SELECT 'education_info', '学历信息', 3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "EmployeeInfoTab" WHERE code = 'education_info');

INSERT INTO "EmployeeInfoTab" (code, name, sort, status, createdAt, updatedAt)
SELECT 'work_experience', '工作经历', 4, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "EmployeeInfoTab" WHERE code = 'work_experience');

INSERT INTO "EmployeeInfoTab" (code, name, sort, status, createdAt, updatedAt)
SELECT 'family_info', '家庭信息', 5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "EmployeeInfoTab" WHERE code = 'family_info');

-- 验证页签创建
SELECT id, code, name, sort, status
FROM "EmployeeInfoTab"
WHERE code IN ('education_info', 'work_experience', 'family_info')
ORDER BY sort;

-- ================================================================================
-- 第二步：为教育信息页签创建分组和字段
-- ================================================================================

SELECT '=== Step 2: 创建教育信息页签分组和字段 ===' AS info;

-- 2.1 创建分组
INSERT INTO "EmployeeInfoTabGroup" (
    "tabId",
    code,
    name,
    sort,
    status,
    createdAt,
    updatedAt
)
SELECT
    t.id,
    'highest_education',
    '最高学历',
    1,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
WHERE t.code = 'education_info'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabGroup" g
    JOIN "EmployeeInfoTab" t2 ON t2.id = g."tabId"
    WHERE t2.code = 'education_info'
    AND g.code = 'highest_education'
);

-- 2.2 创建字段
INSERT INTO "EmployeeInfoTabField" (
    "groupId",
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    createdAt,
    updatedAt
)
SELECT
    g.id,
    UNNEST(ARRAY[
        'educationLevel',
        'educationType',
        'graduateSchool',
        'major',
        'graduationDate',
        'degreeNo',
        'diplomaNo'
    ]) AS fieldCode,
    UNNEST(ARRAY[
        '学历层次',
        '学历类型',
        '毕业院校',
        '专业',
        '毕业时间',
        '学位证书号',
        '毕业证书号'
    ]) AS fieldName,
    'SYSTEM' AS fieldType,
    UNNEST(ARRAY[true, false, false, false, false, false, false]) AS isRequired,
    UNNEST(ARRAY[false, false, false, false, false, false, false]) AS isHidden,
    UNNEST(ARRAY[1, 2, 3, 4, 5, 6, 7]) AS sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
WHERE t.code = 'education_info'
AND g.code = 'highest_education'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabField" f
    WHERE f."groupId" = g.id
    LIMIT 1
);

-- 验证教育信息配置
SELECT
    'education_info' AS tabCode,
    g.code AS groupCode,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'education_info'
GROUP BY t.code, g.code;

-- ================================================================================
-- 第三步：为工作经历页签创建分组和字段
-- ================================================================================

SELECT '=== Step 3: 创建工作经历页签分组和字段 ===' AS info;

-- 3.1 创建分组
INSERT INTO "EmployeeInfoTabGroup" (
    "tabId",
    code,
    name,
    sort,
    status,
    createdAt,
    updatedAt
)
SELECT
    t.id,
    'work_experience_group',
    '工作经历',
    1,
    'INACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
WHERE t.code = 'work_experience'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabGroup" g
    JOIN "EmployeeInfoTab" t2 ON t2.id = g."tabId"
    WHERE t2.code = 'work_experience'
    AND g.code = 'work_experience_group'
);

-- 3.2 创建字段
INSERT INTO "EmployeeInfoTabField" (
    "groupId",
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    createdAt,
    updatedAt
)
SELECT
    g.id,
    UNNEST(ARRAY[
        'exp_company',
        'exp_position',
        'exp_start',
        'exp_end',
        'exp_salary',
        'exp_reason',
        'exp_description'
    ]) AS fieldCode,
    UNNEST(ARRAY[
        '公司名称',
        '职位',
        '开始时间',
        '结束时间',
        '离职时薪资',
        '离职原因',
        '工作描述'
    ]) AS fieldName,
    'SYSTEM' AS fieldType,
    UNNEST(ARRAY[true, true, true, true, false, false, false]) AS isRequired,
    UNNEST(ARRAY[false, false, false, false, false, false, false]) AS isHidden,
    UNNEST(ARRAY[1, 2, 3, 4, 5, 6, 7]) AS sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
WHERE t.code = 'work_experience'
AND g.code = 'work_experience_group'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabField" f
    WHERE f."groupId" = g.id
    LIMIT 1
);

-- 验证工作经历配置
SELECT
    'work_experience' AS tabCode,
    g.code AS groupCode,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'work_experience'
GROUP BY t.code, g.code;

-- ================================================================================
-- 第四步：为家庭信息页签创建分组和字段
-- ================================================================================

SELECT '=== Step 4: 创建家庭信息页签分组和字段 ===' AS info;

-- 4.1 创建分组
INSERT INTO "EmployeeInfoTabGroup" (
    "tabId",
    code,
    name,
    sort,
    status,
    createdAt,
    updatedAt
)
SELECT
    t.id,
    'family_info_group',
    '家庭成员',
    1,
    'INACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
WHERE t.code = 'family_info'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabGroup" g
    JOIN "EmployeeInfoTab" t2 ON t2.id = g."tabId"
    WHERE t2.code = 'family_info'
    AND g.code = 'family_info_group'
);

-- 4.2 创建字段
INSERT INTO "EmployeeInfoTabField" (
    "groupId",
    fieldCode,
    fieldName,
    fieldType,
    isRequired,
    isHidden,
    sort,
    createdAt,
    updatedAt
)
SELECT
    g.id,
    UNNEST(ARRAY[
        'member_name',
        'member_relation',
        'member_age',
        'member_work',
        'member_phone',
        'member_address'
    ]) AS fieldCode,
    UNNEST(ARRAY[
        '成员姓名',
        '关系',
        '年龄',
        '工作单位',
        '联系电话',
        '居住地址'
    ]) AS fieldName,
    'SYSTEM' AS fieldType,
    UNNEST(ARRAY[true, true, false, false, false, false]) AS isRequired,
    UNNEST(ARRAY[false, false, false, false, false, false]) AS isHidden,
    UNNEST(ARRAY[1, 2, 3, 4, 5, 6]) AS sort,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
WHERE t.code = 'family_info'
AND g.code = 'family_info_group'
AND NOT EXISTS (
    SELECT 1 FROM "EmployeeInfoTabField" f
    WHERE f."groupId" = g.id
    LIMIT 1
);

-- 验证家庭信息配置
SELECT
    'family_info' AS tabCode,
    g.code AS groupCode,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'family_info'
GROUP BY t.code, g.code;

COMMIT;

-- ================================================================================
-- 最终验证
-- ================================================================================

SELECT '=== 最终验证结果 ===' AS info;

WITH tab_summary AS (
    SELECT
        t.code AS tabCode,
        t.name AS tabName,
        COUNT(DISTINCT g.id) AS groupCount,
        COUNT(f.id) AS fieldCount,
        CASE
            WHEN COUNT(DISTINCT g.id) = 0 THEN '✗ 无分组，页面无法渲染'
            WHEN COUNT(f.id) = 0 THEN '✗ 无字段，无法配置'
            ELSE '✓ 配置完整'
        END AS status
    FROM "EmployeeInfoTab" t
    LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
    LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
    WHERE t.code IN ('education_info', 'work_experience', 'family_info')
    GROUP BY t.code, t.name
)
SELECT
    tabCode,
    tabName,
    groupCount,
    fieldCount,
    status
FROM tab_summary
ORDER BY tabCode;

/*
执行后预期结果：

tabCode          tabName  groupCount  fieldCount  status
---------------  -------  -----------  ----------  --------
education_info   学历信息       1           7        ✓ 配置完整
work_experience  工作经历       1           7        ✓ 配置完整
family_info      家庭信息       1           6        ✓ 配置完整

所有页签都应该显示 "✓ 配置完整"

下一步：
1. 刷新人事信息配置页面
2. 应该能看到三个页签的分组和字段
3. 可以正常配置字段属性
4. 新增人员时这三个页签可以正常使用
*/
