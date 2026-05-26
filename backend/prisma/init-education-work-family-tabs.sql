-- 初始化学历信息、工作经历、家庭信息页签的分组和字段

BEGIN TRANSACTION;

-- ==================== 1. 学历信息页签 (tabId=3) ====================

-- 创建学历信息分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, isSystem, status, collapsed, createdAt, updatedAt)
VALUES (3, 'EDUCATION_INFO', '学历信息', '记录员工的学历相关信息', 1, 1, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 获取新插入的分组ID
-- 学历信息字段
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 3, id, 'schoolName', '学校名称', 'TEXT', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EDUCATION_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 3, id, 'major', '专业', 'TEXT', 1, 0, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EDUCATION_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 3, id, 'education', '学历', 'TEXT', 1, 0, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EDUCATION_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 3, id, 'educationLength', '学制', 'TEXT', 0, 0, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EDUCATION_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 3, id, 'startDate', '开始时间', 'DATE', 1, 0, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EDUCATION_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 3, id, 'endDate', '结束时间', 'DATE', 1, 0, 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EDUCATION_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 3, id, 'isHighest', '是否最高学历', 'BOOLEAN', 0, 0, 1, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'EDUCATION_INFO';

-- ==================== 2. 工作经历页签 (tabId=4) ====================

-- 创建工作经历分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, isSystem, status, collapsed, createdAt, updatedAt)
VALUES (4, 'WORK_EXPERIENCE', '工作经历', '记录员工的工作经历信息', 1, 1, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 工作经历字段
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 4, id, 'companyName', '公司名称', 'TEXT', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'WORK_EXPERIENCE';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 4, id, 'position', '职位', 'TEXT', 1, 0, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'WORK_EXPERIENCE';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 4, id, 'startDate', '开始时间', 'DATE', 1, 0, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'WORK_EXPERIENCE';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 4, id, 'endDate', '结束时间', 'DATE', 0, 0, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'WORK_EXPERIENCE';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 4, id, 'jobDescription', '工作内容', 'TEXTAREA', 0, 0, 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'WORK_EXPERIENCE';

-- ==================== 3. 家庭信息页签 (tabId=5) ====================

-- 创建家庭成员信息分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, isSystem, status, collapsed, createdAt, updatedAt)
VALUES (5, 'FAMILY_MEMBER_INFO', '家庭成员信息', '记录员工的家庭成员信息', 1, 1, 'ACTIVE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 家庭成员信息字段
INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 5, id, 'relation', '称谓', 'TEXT', 1, 0, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'FAMILY_MEMBER_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 5, id, 'name', '姓名', 'TEXT', 1, 0, 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'FAMILY_MEMBER_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 5, id, 'workUnit', '工作单位', 'TEXT', 0, 0, 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'FAMILY_MEMBER_INFO';

INSERT INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, isHidden, isSystem, sort, createdAt, updatedAt)
SELECT 5, id, 'phone', '联系电话', 'TEXT', 0, 0, 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM EmployeeInfoTabGroup WHERE code = 'FAMILY_MEMBER_INFO';

-- ==================== 验证结果 ====================

SELECT '=== 初始化后的页签分组情况 ===' AS '';
SELECT
  t.id AS tabId,
  t.code AS tabCode,
  t.name AS tabName,
  g.id AS groupId,
  g.code AS groupCode,
  g.name AS groupName,
  COUNT(f.id) AS fieldCount
FROM EmployeeInfoTab t
LEFT JOIN EmployeeInfoTabGroup g ON g.tabId = t.id
LEFT JOIN EmployeeInfoTabField f ON f.groupId = g.id
WHERE t.id IN (3, 4, 5)
GROUP BY t.id, g.id
ORDER BY t.id, g.sort;

SELECT '=== 学历信息字段 ===' AS '';
SELECT fieldCode, fieldName, sort, isRequired
FROM EmployeeInfoTabField
WHERE tabId = 3
ORDER BY sort;

SELECT '=== 工作经历字段 ===' AS '';
SELECT fieldCode, fieldName, sort, isRequired
FROM EmployeeInfoTabField
WHERE tabId = 4
ORDER BY sort;

SELECT '=== 家庭信息字段 ===' AS '';
SELECT fieldCode, fieldName, sort, isRequired
FROM EmployeeInfoTabField
WHERE tabId = 5
ORDER BY sort;

COMMIT TRANSACTION;

-- 说明：
-- 执行此脚本后：
-- 1. 学历信息页签将包含7个字段：学校名称、专业、学历、学制、开始时间、结束时间、是否最高学历
-- 2. 工作经历页签将包含5个字段：公司名称、职位、开始时间、结束时间、工作内容
-- 3. 家庭信息页签将包含4个字段：称谓、姓名、工作单位、联系电话
