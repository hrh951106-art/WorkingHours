-- ========================================
-- 修复字段类型不匹配问题
-- ========================================
-- 问题: EmployeeInfoTabField中使用SELECT类型，但CustomField中使用SELECT_SINGLE类型
-- 前端只识别SELECT_SINGLE和SELECT_MULTI，导致SELECT类型字段不显示
-- ========================================

BEGIN TRANSACTION;

-- ========================================
-- 第一步：更新所有SELECT类型为SELECT_SINGLE
-- ========================================

UPDATE EmployeeInfoTabField
SET fieldType = 'SELECT_SINGLE'
WHERE fieldType = 'SELECT';

-- ========================================
-- 第二步：验证修复结果
-- ========================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证: 修复后的字段类型分布' AS '';
SELECT '========================================' AS '';

SELECT DISTINCT
    fieldType AS '字段类型',
    COUNT(*) AS '数量'
FROM EmployeeInfoTabField
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info'))
GROUP BY fieldType
ORDER BY fieldType;

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证: 基本信息页签的SELECT字段' AS '';
SELECT '========================================' AS '';

SELECT
    f.fieldCode AS '字段代码',
    f.fieldName AS '字段名称',
    f.fieldType AS '字段类型（修复后）',
    cf.code AS 'CustomField代码',
    cf.type AS 'CustomField类型',
    CASE
        WHEN f.fieldType = cf.type THEN '✅ 匹配'
        ELSE '❌ 不匹配'
    END AS '类型匹配状态'
FROM EmployeeInfoTabField f
INNER JOIN EmployeeInfoTab t ON t.id = f.tabId
LEFT JOIN CustomField cf ON cf.code = f.fieldCode
WHERE t.code = 'basic_info'
  AND f.fieldType IN ('SELECT_SINGLE', 'SELECT_MULTI')
ORDER BY f.sort;

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证: 工作信息页签的SELECT字段' AS '';
SELECT '========================================' AS '';

SELECT
    f.fieldCode AS '字段代码',
    f.fieldName AS '字段名称',
    f.fieldType AS '字段类型（修复后）',
    cf.code AS 'CustomField代码',
    cf.type AS 'CustomField类型',
    CASE
        WHEN f.fieldType = cf.type THEN '✅ 匹配'
        ELSE '❌ 不匹配'
    END AS '类型匹配状态'
FROM EmployeeInfoTabField f
INNER JOIN EmployeeInfoTab t ON t.id = f.tabId
LEFT JOIN CustomField cf ON cf.code = f.fieldCode
WHERE t.code = 'work_info'
  AND f.fieldType IN ('SELECT_SINGLE', 'SELECT_MULTI')
ORDER BY f.sort;

COMMIT;

-- ========================================
-- 修复完成提示
-- ========================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '✅ 字段类型修复完成！' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';
SELECT '修复内容:' AS '';
SELECT '  将所有SELECT类型改为SELECT_SINGLE' AS '';
SELECT '' AS '';
SELECT '修复的字段:' AS '';
SELECT '  - gender (性别)' AS '';
SELECT '  - nation (民族)' AS '';
SELECT '  - maritalStatus (婚姻状况)' AS '';
SELECT '  - politicalStatus (政治面貌)' AS '';
SELECT '  - educationLevel (学历层次)' AS '';
SELECT '  - educationType (学历类型)' AS '';
SELECT '  - jobLevel (职级)' AS '';
SELECT '  - employeeType (员工类型)' AS '';
SELECT '  - resignationReason (离职原因)' AS '';
SELECT '  - familyRelation (家庭关系)' AS '';
SELECT '' AS '';
SELECT '下一步操作:' AS '';
SELECT '  1. 重启后端服务' AS '';
SELECT '  2. 清空前端缓存（Cmd+Shift+R）' AS '';
SELECT '  3. 刷新新增人员页面' AS '';
SELECT '  4. 验证所有字段正常显示' AS '';
SELECT '' AS '';
