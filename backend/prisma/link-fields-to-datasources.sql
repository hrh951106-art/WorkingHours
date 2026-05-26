-- 将字段关联到数据源
-- 更新字段的 fieldType 为 DATASOURCE，并设置对应的 dataSourceId

BEGIN TRANSACTION;

-- ==================== 1. 基本信息页签字段 ====================

-- 性别
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'GENDER'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'gender';

-- 婚姻状况
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'MARITAL_STATUS'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'maritalStatus';

-- 政治面貌
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'POLITICAL_STATUS'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'politicalStatus';

-- 紧急联系人关系
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'EMERGENCY_CONTACT_RELATION'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'emergencyRelation';

-- ==================== 2. 工作信息页签字段 ====================

-- 工作关系
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'EMPLOYMENT_RELATION'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'employmentRelation';

-- 入职类型
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'ENTRY_TYPE'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'entryType';

-- 员工类型
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'EMPLOYEE_TYPE'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'employeeType';

-- 职级
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'JOB_LEVEL'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'jobLevel';

-- 岗位
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'JOB_POST'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'jobPost';

-- 成本中心
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'COST_CENTER'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'costCenter';

-- 职务
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'POSITION_TITLE'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'positionTitle';

-- ==================== 3. 学历信息页签字段 ====================

-- 学历
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'EDUCATION'),
    updatedAt = CURRENT_TIMESTAMP
WHERE fieldCode = 'education';

-- ==================== 4. 家庭信息页签字段 ====================

-- 称谓（使用紧急联系人关系数据源）
UPDATE EmployeeInfoTabField
SET fieldType = 'DATASOURCE',
    dataSourceId = (SELECT id FROM DataSource WHERE code = 'EMERGENCY_CONTACT_RELATION'),
    updatedAt = CURRENT_TIMESTAMP
WHERE tabId = 5 AND fieldCode = 'relation';

COMMIT TRANSACTION;

-- ==================== 验证结果 ====================

SELECT '=== 字段关联数据源情况 ===' AS '';
SELECT
  f.tabId,
  t.name AS tabName,
  f.fieldCode,
  f.fieldName,
  f.fieldType,
  d.code AS dataSourceCode,
  d.name AS dataSourceName
FROM EmployeeInfoTabField f
JOIN EmployeeInfoTab t ON t.id = f.tabId
LEFT JOIN DataSource d ON d.id = f.dataSourceId
WHERE f.fieldType = 'DATASOURCE'
ORDER BY f.tabId, f.sort;

-- 说明：
-- 已将所有下拉选项字段关联到对应的数据源
-- 字段的 fieldType 已更新为 'DATASOURCE'
-- 可以通过查找项管理来维护这些数据源的选项值
