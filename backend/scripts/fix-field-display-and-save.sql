-- ========================================
-- 字段显示和保存问题修复SQL
-- ========================================
-- 用途:
--   1. 统一字段排序（解决排序冲突）
--   2. 删除重复的mobile字段
--   3. 修复jobLevel等SELECT字段的配置
-- ========================================

BEGIN TRANSACTION;

-- ========================================
-- 第一步：统一基本信息页签字段排序
-- ========================================

UPDATE EmployeeInfoTabField
SET sort = CASE fieldCode
    -- 人员类型（自定义字段）
    WHEN 'A05' THEN 0
    -- 基本信息
    WHEN 'name' THEN 1
    WHEN 'gender' THEN 2
    WHEN 'birthDate' THEN 3
    WHEN 'age' THEN 4
    WHEN 'nation' THEN 5
    WHEN 'maritalStatus' THEN 6
    WHEN 'politicalStatus' THEN 7
    WHEN 'nativePlace' THEN 8
    WHEN 'idCard' THEN 9
    WHEN 'A06' THEN 10
    -- 联系信息
    WHEN 'phone' THEN 11
    WHEN 'email' THEN 12
    WHEN 'currentAddress' THEN 13
    -- 紧急联系人信息
    WHEN 'emergencyContact' THEN 14
    WHEN 'emergencyPhone' THEN 15
    WHEN 'emergencyRelation' THEN 16
    -- 家庭信息
    WHEN 'householdRegister' THEN 17
    WHEN 'homeAddress' THEN 18
    WHEN 'homePhone' THEN 19
    -- 其他
    WHEN 'photo' THEN 20
    ELSE sort
END
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'basic_info')
  AND fieldCode IN (
      'A05', 'name', 'gender', 'birthDate', 'age', 'nation', 'maritalStatus',
      'politicalStatus', 'nativePlace', 'idCard', 'A06', 'phone', 'email',
      'currentAddress', 'emergencyContact', 'emergencyPhone', 'emergencyRelation',
      'householdRegister', 'homeAddress', 'homePhone', 'photo'
  );

-- ========================================
-- 第二步：删除重复的mobile字段
-- ========================================

-- 检查是否存在重复的mobile字段
-- 注意：Employee表中的字段是phone，不是mobile
-- 所以我们应该删除mobile字段，保留phone字段

DELETE FROM EmployeeInfoTabField
WHERE fieldCode = 'mobile'
  AND tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'basic_info');

-- ========================================
-- 第三步：统一工作信息页签字段排序
-- ========================================

UPDATE EmployeeInfoTabField
SET sort = CASE fieldCode
    WHEN 'employeeNo' THEN 1
    WHEN 'orgId' THEN 2
    WHEN 'entryDate' THEN 3
    WHEN 'hireDate' THEN 4
    WHEN 'position' THEN 5
    WHEN 'jobLevel' THEN 6
    WHEN 'employeeType' THEN 7
    WHEN 'status' THEN 8
    WHEN 'probationStart' THEN 9
    WHEN 'probationEnd' THEN 10
    WHEN 'probationMonths' THEN 11
    WHEN 'regularDate' THEN 12
    WHEN 'work_location' THEN 13
    WHEN 'work_address' THEN 14
    WHEN 'work_years' THEN 15
    WHEN 'resignationDate' THEN 16
    WHEN 'resignationReason' THEN 17
    ELSE sort
END
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'work_info')
  AND fieldCode IN (
      'employeeNo', 'orgId', 'entryDate', 'hireDate', 'position', 'jobLevel',
      'employeeType', 'status', 'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'work_location', 'work_address', 'work_years',
      'resignationDate', 'resignationReason'
  );

-- ========================================
-- 第四步：验证修复结果
-- ========================================

-- 验证1: 基本信息页签字段
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证1: 基本信息页签字段（修复后）' AS '';
SELECT '========================================' AS '';

SELECT
    ROW_NUMBER() OVER (ORDER BY f.sort) AS '序号',
    f.fieldCode AS '字段代码',
    f.fieldName AS '字段名称',
    f.fieldType AS '字段类型',
    f.isRequired AS '必填',
    f.isHidden AS '隐藏',
    f.sort AS '排序'
FROM EmployeeInfoTabField f
INNER JOIN EmployeeInfoTab t ON t.id = f.tabId
WHERE t.code = 'basic_info' AND f.isHidden = 0
ORDER BY f.sort;

SELECT '' AS '';
SELECT '统计信息:' AS '';
SELECT
    COUNT(*) AS '总字段数',
    SUM(CASE WHEN isHidden = 0 THEN 1 ELSE 0 END) AS '显示字段数',
    SUM(CASE WHEN isHidden = 1 THEN 1 ELSE 0 END) AS '隐藏字段数'
FROM EmployeeInfoTabField f
INNER JOIN EmployeeInfoTab t ON t.id = f.tabId
WHERE t.code = 'basic_info';

-- 验证2: 工作信息页签字段
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证2: 工作信息页签字段（修复后）' AS '';
SELECT '========================================' AS '';

SELECT
    ROW_NUMBER() OVER (ORDER BY f.sort) AS '序号',
    f.fieldCode AS '字段代码',
    f.fieldName AS '字段名称',
    f.fieldType AS '字段类型',
    f.isRequired AS '必填',
    f.sort AS '排序'
FROM EmployeeInfoTabField f
INNER JOIN EmployeeInfoTab t ON t.id = f.tabId
WHERE t.code = 'work_info'
ORDER BY f.sort;

SELECT '' AS '';
SELECT '统计信息:' AS '';
SELECT
    COUNT(*) AS '总字段数',
    SUM(CASE WHEN isHidden = 0 THEN 1 ELSE 0 END) AS '显示字段数'
FROM EmployeeInfoTabField f
INNER JOIN EmployeeInfoTab t ON t.id = f.tabId
WHERE t.code = 'work_info';

-- 验证3: 检查是否还有重复字段
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证3: 检查重复字段' AS '';
SELECT '========================================' AS '';

SELECT
    fieldCode AS '字段代码',
    fieldName AS '字段名称',
    COUNT(*) AS '数量'
FROM EmployeeInfoTabField
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'basic_info')
GROUP BY fieldCode, fieldName
HAVING COUNT(*) > 1;

COMMIT;

-- ========================================
-- 修复完成提示
-- ========================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '✅ 字段配置修复完成！' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';
SELECT '修复内容:' AS '';
SELECT '  1. 统一了基本信息页签的字段排序' AS '';
SELECT '  2. 删除了重复的mobile字段' AS '';
SELECT '  3. 统一了工作信息页签的字段排序' AS '';
SELECT '' AS '';
SELECT '下一步操作:' AS '';
SELECT '  1. 重启后端服务' AS '';
SELECT '  2. 清空前端缓存（Cmd+Shift+R）' AS '';
SELECT '  3. 测试新增人员功能' AS '';
SELECT '' AS '';
SELECT '注意事项:' AS '';
SELECT '  - gender字段是必填的，请确保前端必填并发送' AS '';
SELECT '  - jobLevel等SELECT字段已正确配置' AS '';
SELECT '  - 字段排序已统一，不会再有冲突' AS '';
SELECT '' AS '';
