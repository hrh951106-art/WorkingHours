-- 添加分组和字段

PRAGMA foreign_keys = OFF;

-- 基本信息页签的分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, collapsed, status, createdAt, updatedAt)
SELECT id, 'personal_info', '个人信息', '个人基本资料', 1, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'basic_info'

UNION ALL

SELECT id, 'contact_phone', '联系电话', '联系方式', 2, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'basic_info'

UNION ALL

SELECT id, 'contact_email', '联系邮箱', '邮箱联系方式', 3, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'basic_info'

UNION ALL

SELECT id, 'emergency_contact', '紧急联系人', '紧急情况联系人', 4, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'basic_info';

-- 工作信息页签的分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, collapsed, status, createdAt, updatedAt)
SELECT id, 'position_info', '职位信息', '职位相关信息', 1, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'work_info'

UNION ALL

SELECT id, 'entry_info', '入职信息', '入职相关信息', 2, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'work_info';

-- 学历信息页签的分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, collapsed, status, createdAt, updatedAt)
SELECT id, 'highest_education', '最高学历', '最高学历信息', 1, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'education_info';

-- 工作经历页签的分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, collapsed, status, createdAt, updatedAt)
SELECT id, 'work_experience_group', '工作经历', '工作经历多字段组', 1, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'work_experience';

-- 家庭信息页签的分组
INSERT INTO EmployeeInfoTabGroup (tabId, code, name, description, sort, collapsed, status, createdAt, updatedAt)
SELECT id, 'family_info_group', '家庭成员', '家庭成员多字段组', 1, 0, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM EmployeeInfoTab WHERE code = 'family_info';

PRAGMA foreign_keys = ON;

SELECT '分组创建完成！' AS result;
SELECT COUNT(*) AS '已创建分组数' FROM EmployeeInfoTabGroup WHERE tabId IN (SELECT id FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info'));
