-- ========================================
-- 本地环境完整修复SQL (SQLite)
-- ========================================
-- 用途: 修复本地环境的下拉字段配置问题
-- 问题:
--   1. CustomField表缺少系统内置字段
--   2. EmployeeInfoTabField的fieldType都是SYSTEM
-- ========================================

BEGIN TRANSACTION;

-- ========================================
-- 第一步：插入系统内置CustomField记录
-- ========================================

INSERT OR IGNORE INTO CustomField (
    code, name, type, dataSourceId,
    isRequired, defaultValue, "group", sort,
    isSystem, status, createdAt, updatedAt
)
VALUES
    -- 基本信息字段
    ('gender', '性别', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'gender'),
        true, NULL, '基本信息', 1,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    ('nation', '民族', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'nation'),
        false, NULL, '基本信息', 2,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    ('maritalStatus', '婚姻状况', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'marital_status'),
        true, NULL, '基本信息', 3,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    ('politicalStatus', '政治面貌', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'political_status'),
        false, NULL, '基本信息', 4,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    -- 工作信息字段
    ('jobLevel', '职级', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'job_level'),
        true, NULL, '工作信息', 5,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    ('employeeType', '员工类型', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'employee_type'),
        true, NULL, '工作信息', 6,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    ('employmentStatus', '在职状态', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'employment_status'),
        true, NULL, '工作信息', 7,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    ('resignationReason', '离职原因', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'resignation_reason'),
        false, NULL, '工作信息', 8,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    -- 学历信息字段
    ('educationLevel', '学历层次', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'education_level'),
        true, NULL, '学历信息', 9,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    ('educationType', '学历类型', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'education_type'),
        true, NULL, '学历信息', 10,
        true, 'ACTIVE', datetime('now'), datetime('now')),

    -- 家庭信息字段
    ('familyRelation', '家庭关系', 'SELECT_SINGLE',
        (SELECT id FROM DataSource WHERE code = 'family_relation'),
        true, NULL, '家庭信息', 11,
        true, 'ACTIVE', datetime('now'), datetime('now'));


-- ========================================
-- 第二步：更新EmployeeInfoTabField的fieldType为SELECT
-- ========================================

-- 更新基本信息页签的字段
UPDATE EmployeeInfoTabField
SET fieldType = 'SELECT'
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'basic_info')
  AND fieldCode IN (
      'gender', 'nation', 'maritalStatus', 'politicalStatus'
  );

-- 更新工作信息页签的字段
UPDATE EmployeeInfoTabField
SET fieldType = 'SELECT'
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'work_info')
  AND fieldCode IN (
      'jobLevel', 'employeeType', 'employmentStatus', 'resignationReason'
  );

-- 更新学历信息页签的字段
UPDATE EmployeeInfoTabField
SET fieldType = 'SELECT'
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'education_info')
  AND fieldCode IN (
      'educationLevel', 'educationType'
  );

-- 更新家庭信息页签的字段
UPDATE EmployeeInfoTabField
SET fieldType = 'SELECT'
WHERE tabId = (SELECT id FROM EmployeeInfoTab WHERE code = 'family_info')
  AND fieldCode IN ('familyRelation');


-- ========================================
-- 第三步：验证修复结果
-- ========================================

-- 验证1: CustomField系统内置字段数量
SELECT '========================================' AS '';
SELECT '验证1: CustomField系统内置字段统计' AS '';
SELECT '========================================' AS '';

SELECT
    COUNT(*) AS 'CustomField总数',
    SUM(CASE WHEN isSystem = 1 THEN 1 ELSE 0 END) AS '系统内置字段数',
    SUM(CASE WHEN isSystem = 0 THEN 1 ELSE 0 END) AS '自定义字段数'
FROM CustomField;

-- 验证2: 系统内置CustomField列表
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证2: 系统内置CustomField列表' AS '';
SELECT '========================================' AS '';

SELECT
    code AS '字段代码',
    name AS '字段名称',
    type AS '字段类型',
    dataSourceId AS '数据源ID',
    isSystem AS '系统内置',
    status AS '状态'
FROM CustomField
WHERE isSystem = 1
ORDER BY sort;

-- 验证3: EmployeeInfoTabField字段类型
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证3: EmployeeInfoTabField字段类型验证' AS '';
SELECT '========================================' AS '';

SELECT
    fieldCode AS '字段代码',
    fieldName AS '字段名称',
    fieldType AS '当前类型',
    CASE
        WHEN fieldType = 'SELECT' THEN '✅ 正确'
        ELSE '❌ 错误'
    END AS '状态'
FROM EmployeeInfoTabField
WHERE fieldCode IN (
    'gender', 'nation', 'maritalStatus', 'politicalStatus',
    'educationLevel', 'educationType', 'jobLevel', 'employeeType',
    'employmentStatus', 'resignationReason', 'familyRelation'
)
ORDER BY fieldCode;

-- 验证4: 数据源关联完整性
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '验证4: 数据源关联完整性检查' AS '';
SELECT '========================================' AS '';

SELECT
    cf.code AS '字段代码',
    cf.name AS '字段名称',
    d.code AS '数据源代码',
    d.name AS '数据源名称',
    COUNT(o.id) AS '选项数量',
    CASE
        WHEN COUNT(o.id) > 0 THEN '✅ 有选项'
        ELSE '❌ 无选项'
    END AS '状态'
FROM CustomField cf
INNER JOIN DataSource d ON d.id = cf.dataSourceId
LEFT JOIN DataSourceOption o ON o.dataSourceId = d.id
WHERE cf.isSystem = 1
GROUP BY cf.id, cf.code, cf.name, d.code, d.name
ORDER BY cf.code;

COMMIT;

-- ========================================
-- 修复完成提示
-- ========================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '✅ 本地环境修复完成！' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';
SELECT '修复内容:' AS '';
SELECT '  1. 创建了11个系统内置CustomField记录' AS '';
SELECT '  2. 更新了所有下拉字段的fieldType为SELECT' AS '';
SELECT '' AS '';
SELECT '下一步操作:' AS '';
SELECT '  1. 重启应用' AS '';
SELECT '  2. 测试前端下拉框是否正常显示' AS '';
SELECT '  3. 如果有问题，请检查应用日志' AS '';
SELECT '' AS '';
