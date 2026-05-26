-- 人事信息配置 - 工作信息页签重新分组配置
-- 目的：按照新需求重新组织工作信息页签的分组和字段

BEGIN TRANSACTION;

-- ==================== 第一步：更新分组名称和代码 ====================

-- 1. 将"当前职位"改名为"任职记录"
UPDATE EmployeeInfoTabGroup
SET code = 'POSITION_RECORD', name = '任职记录', description = '记录员工的职位信息', updatedAt = CURRENT_TIMESTAMP
WHERE id = 4;

-- 2. 将"雇佣信息"改名为"就业详细信息"
UPDATE EmployeeInfoTabGroup
SET code = 'EMPLOYMENT_DETAILS', name = '就业详细信息', description = '记录员工的就业详细信息', updatedAt = CURRENT_TIMESTAMP
WHERE id = 5;

-- 3. 删除"组织信息"分组（其字段将被重新分配）
DELETE FROM EmployeeInfoTabField WHERE groupId = 6;
DELETE FROM EmployeeInfoTabGroup WHERE id = 6;

-- ==================== 第二步：新增"入职信息"分组 ====================

INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, isSystem, status, collapsed, createdAt, updatedAt)
VALUES (2, 'ENTRY_INFO', '入职信息', '记录员工的入职相关信息', 1, 1, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ==================== 第三步：重新配置字段 ====================

-- 1. 配置"入职信息"分组的字段（使用子查询获取新插入的分组ID）
-- 工号（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'employeeNo', '工号', 'SYSTEM', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'ENTRY_INFO';

-- 工作关系（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'employmentRelation', '工作关系', 'SYSTEM', 1, 0, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'ENTRY_INFO';

-- 入职日期（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, g.id, 'entryDate', '入职日期', 'SYSTEM', 1, 0, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup g
WHERE g.code = 'ENTRY_INFO';

-- 入职类型（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, g.id, 'entryType', '入职类型', 'SYSTEM', 1, 0, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup g
WHERE g.code = 'ENTRY_INFO';

-- 员工类型（从当前职位移动 - 假设ID为20）
UPDATE EmployeeInfoTabField
SET groupId = (SELECT id FROM EmployeeInfoTabGroup WHERE code = 'ENTRY_INFO'),
    sort = 5,
    updatedAt = CURRENT_TIMESTAMP
WHERE id = 20;

-- 2. 配置"任职记录"分组的字段
-- 组织（从组织信息移动，并改名为所属组织）
UPDATE EmployeeInfoTabField
SET fieldName = '所属组织',
    sort = 1,
    updatedAt = CURRENT_TIMESTAMP
WHERE id = 31;

-- 职务（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'positionTitle', '职务', 'SYSTEM', 1, 0, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'POSITION_RECORD';

-- 职级（保留在当前职位，改名为职级）
UPDATE EmployeeInfoTabField
SET sort = 3,
    updatedAt = CURRENT_TIMESTAMP
WHERE id = 19;

-- 成本中心（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'costCenter', '成本中心', 'SYSTEM', 0, 0, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'POSITION_RECORD';

-- 岗位（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'jobPost', '岗位', 'SYSTEM', 0, 0, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'POSITION_RECORD';

-- 3. 配置"就业详细信息"分组的字段
-- 转正日期（保留在雇佣信息）
UPDATE EmployeeInfoTabField
SET sort = 1,
    updatedAt = CURRENT_TIMESTAMP
WHERE id = 28;

-- 试用期周期（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'probationPeriod', '试用期周期', 'SYSTEM', 0, 0, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EMPLOYMENT_DETAILS';

-- 使用开始日期（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'usageStartDate', '使用开始日期', 'SYSTEM', 1, 0, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EMPLOYMENT_DETAILS';

-- 工龄开始日期（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'serviceYearsStartDate', '工龄开始日期', 'SYSTEM', 1, 0, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EMPLOYMENT_DETAILS';

-- 预计试用结束日期（新增系统字段）
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 2, id, 'estimatedProbationEndDate', '预计试用结束日期', 'SYSTEM', 0, 0, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EMPLOYMENT_DETAILS';

-- 4. 删除不再需要的旧字段
DELETE FROM EmployeeInfoTabField WHERE id IN (18, 21, 22, 24, 25, 26, 27, 29, 30);
-- 这些字段是：职位、工作地点、办公地址、受雇日期、试用期开始、试用期结束、试用期月数、工作年限、员工状态

-- ==================== 第四步：验证结果 ====================

SELECT '=== 迁移后的分组情况 ===' AS '';
SELECT
  g.id,
  g.code AS groupCode,
  g.name AS groupName,
  COUNT(f.id) AS fieldCount
FROM EmployeeInfoTabGroup g
LEFT JOIN EmployeeInfoTabField f ON f.groupId = g.id
WHERE g.tabId = 2
GROUP BY g.id
ORDER BY g.sort;

SELECT '=== 入职信息分组字段 ===' AS '';
SELECT fieldCode, fieldName, sort
FROM EmployeeInfoTabField
WHERE tabId = 2 AND groupId = (SELECT id FROM EmployeeInfoTabGroup WHERE code = 'ENTRY_INFO')
ORDER BY sort;

SELECT '=== 任职记录分组字段 ===' AS '';
SELECT fieldCode, fieldName, sort
FROM EmployeeInfoTabField
WHERE tabId = 2 AND groupId = (SELECT id FROM EmployeeInfoTabGroup WHERE code = 'POSITION_RECORD')
ORDER BY sort;

SELECT '=== 就业详细信息分组字段 ===' AS '';
SELECT fieldCode, fieldName, sort
FROM EmployeeInfoTabField
WHERE tabId = 2 AND groupId = (SELECT id FROM EmployeeInfoTabGroup WHERE code = 'EMPLOYMENT_DETAILS')
ORDER BY sort;

COMMIT TRANSACTION;

-- 说明：
-- 执行此脚本后，"工作信息"页签将包含三个分组：
-- 1. 入职信息：工号、工作关系、入职日期、入职类型、员工类型
-- 2. 任职记录：所属组织、职务、职级、成本中心、岗位
-- 3. 就业详细信息：转正日期、试用期周期、使用开始日期、工龄开始日期、预计试用结束日期
