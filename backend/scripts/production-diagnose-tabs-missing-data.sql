-- ================================================================================
-- 人事信息配置页签数据诊断SQL
-- ================================================================================
-- 问题：教育信息、工作经历、家庭信息页签没有分组和字段
-- ================================================================================

-- ================================================================================
-- 第一步：检查三个页签是否存在
-- ================================================================================

SELECT '=== Step 1: 检查页签是否存在 ===' AS step;

SELECT
    id,
    code,
    name,
    sort,
    status
FROM "EmployeeInfoTab"
WHERE code IN ('education_info', 'work_experience', 'family_info')
ORDER BY sort;

-- 预期结果：应该返回3条记录
-- 如果返回0条或部分记录，说明页签缺失

-- ================================================================================
-- 第二步：检查页签的分组配置
-- ================================================================================

SELECT '=== Step 2: 检查分组配置 ===' AS step;

SELECT
    t.code AS tabCode,
    t.name AS tabName,
    g.id AS groupId,
    g.code AS groupCode,
    g.name AS groupName,
    g.sort AS groupSort,
    g.status AS groupStatus
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
WHERE t.code IN ('education_info', 'work_experience', 'family_info')
ORDER BY t.sort, g.sort;

-- 预期结果：
-- - education_info: 应该有1个或多个分组
-- - work_experience: 应该有1个或多个分组
-- - family_info: 应该有1个或多个分组

-- 如果g.id全部为NULL，说明没有分组，这就是问题所在！

-- ================================================================================
-- 第三步：检查页签的字段配置
-- ================================================================================

SELECT '=== Step 3: 检查字段配置 ===' AS step;

SELECT
    t.code AS tabCode,
    t.name AS tabName,
    g.code AS groupCode,
    g.name AS groupName,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code IN ('education_info', 'work_experience', 'family_info')
GROUP BY t.code, t.name, g.code, g.name, g.id
ORDER BY t.sort, g.sort;

-- 预期结果：每个分组应该有字段（fieldCount > 0）
-- 如果fieldCount为0或NULL，说明没有字段

-- ================================================================================
-- 第四步：详细字段列表
-- ================================================================================

SELECT '=== Step 4: 详细字段列表 ===' AS step;

SELECT
    t.code AS tabCode,
    g.code AS groupCode,
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    f.isRequired,
    f.isHidden,
    f.sort
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code IN ('education_info', 'work_experience', 'family_info')
ORDER BY t.sort, g.sort, f.sort;

-- 查看具体的字段配置

-- ================================================================================
-- 第五步：与基本信息页签对比
-- ================================================================================

SELECT '=== Step 5: 与基本信息页签对比 ===' AS step;

-- 基本信息页签的分组和字段统计
SELECT
    'basic_info' AS tabCode,
    COUNT(DISTINCT g.id) AS groupCount,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'basic_info'
GROUP BY t.code

UNION ALL

-- 教育信息页签
SELECT
    'education_info' AS tabCode,
    COUNT(DISTINCT g.id) AS groupCount,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'education_info'
GROUP BY t.code

UNION ALL

-- 工作经历页签
SELECT
    'work_experience' AS tabCode,
    COUNT(DISTINCT g.id) AS groupCount,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'work_experience'
GROUP BY t.code

UNION ALL

-- 家庭信息页签
SELECT
    'family_info' AS tabCode,
    COUNT(DISTINCT g.id) AS groupCount,
    COUNT(f.id) AS fieldCount
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code = 'family_info'
GROUP BY t.code;

-- 对比分析：
-- - basic_info 应该有 groupCount > 0 和 fieldCount > 0
-- - 如果其他三个页签是 0 或 NULL，说明缺少数据

-- ================================================================================
-- 第六步：检查API返回结构模拟
-- ================================================================================

SELECT '=== Step 6: 模拟API返回结构 ===' AS step;

SELECT
    t.code AS tabCode,
    t.name AS tabName,
    CASE
        WHEN COUNT(DISTINCT g.id) = 0 THEN '⚠️ 无分组，前端无法渲染'
        WHEN COUNT(f.id) = 0 THEN '⚠️ 无字段，前端无法配置'
        ELSE '✓ 配置正常'
    END AS apiStatus,
    COUNT(DISTINCT g.id) AS groupCount,
    COUNT(f.id) AS fieldCount,
    CASE
        WHEN COUNT(DISTINCT g.id) = 0 THEN 'groups返回空数组或null'
        ELSE 'groups返回包含分组的数组'
    END AS groupsStructure
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
WHERE t.code IN ('education_info', 'work_experience', 'family_info')
GROUP BY t.code, t.name
ORDER BY t.sort;

-- ================================================================================
-- 诊断结论
-- ================================================================================

/*
根据以上查询结果，判断问题：

情况1：页签不存在（Step 1返回0条）
→ 需要创建EmployeeInfoTab记录

情况2：页签存在但无分组（Step 2中groupId为NULL）
→ 需要创建EmployeeInfoTabGroup记录

情况3：有分组但无字段（Step 3中fieldCount为0）
→ 需要创建EmployeeInfoTabField记录

情况4：有分组和字段数量正常
→ 可能是前端代码问题或权限问题

根据实际诊断结果，执行对应的修复方案。
*/
