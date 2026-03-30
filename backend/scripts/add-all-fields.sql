-- 添加所有字段

PRAGMA foreign_keys = OFF;

-- ========== 基本信息页签字段 ==========

-- 个人信息分组字段
INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'employee_no', '工号', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'name', '姓名', 'SYSTEM', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'gender', '性别', 'CUSTOM', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'id_card', '身份证号', 'SYSTEM', 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'birth_date', '出生日期', 'SYSTEM', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'age', '年龄', 'SYSTEM', 0, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'nation', '民族', 'CUSTOM', 0, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'marital_status', '婚姻状况', 'CUSTOM', 1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'political_status', '政治面貌', 'CUSTOM', 0, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'native_place', '籍贯', 'SYSTEM', 0, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'household_register', '户口所在地', 'SYSTEM', 0, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'current_address', '现居住地址', 'SYSTEM', 0, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info'

UNION ALL

SELECT t.id, g.id, 'photo', '照片', 'SYSTEM', 0, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'personal_info';

-- 联系电话分组字段
INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'mobile', '手机号码', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'contact_phone';

-- 联系邮箱分组字段
INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'email', '邮箱', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'contact_email';

-- 紧急联系人分组字段
INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'emergency_contact', '紧急联系人', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'emergency_contact'

UNION ALL

SELECT t.id, g.id, 'emergency_phone', '紧急联系电话', 'SYSTEM', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'emergency_contact'

UNION ALL

SELECT t.id, g.id, 'emergency_relation', '紧急联系人关系', 'SYSTEM', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'emergency_contact'

UNION ALL

SELECT t.id, g.id, 'home_address', '家庭住址', 'SYSTEM', 0, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'emergency_contact'

UNION ALL

SELECT t.id, g.id, 'home_phone', '家庭电话', 'SYSTEM', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'basic_info' AND g.code = 'emergency_contact';

-- ========== 工作信息页签字段 ==========

-- 职位信息分组字段
INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'org_id', '所属组织', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'position_info'

UNION ALL

SELECT t.id, g.id, 'dept_id', '所属部门', 'SYSTEM', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'position_info'

UNION ALL

SELECT t.id, g.id, 'position', '职位', 'SYSTEM', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'position_info'

UNION ALL

SELECT t.id, g.id, 'job_level', '职级', 'CUSTOM', 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'position_info'

UNION ALL

SELECT t.id, g.id, 'employee_type', '员工类型', 'CUSTOM', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'position_info'

UNION ALL

SELECT t.id, g.id, 'work_location', '工作地点', 'SYSTEM', 0, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'position_info'

UNION ALL

SELECT t.id, g.id, 'work_address', '办公地址', 'SYSTEM', 0, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'position_info';

-- 入职信息分组字段
INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'entry_date', '入职日期', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'hire_date', '受雇日期', 'SYSTEM', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'probation_start', '试用期开始', 'SYSTEM', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'probation_end', '试用期结束', 'SYSTEM', 0, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'probation_months', '试用期月数', 'SYSTEM', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'regular_date', '转正日期', 'SYSTEM', 0, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'status', '在职状态', 'CUSTOM', 1, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'resignation_date', '离职日期', 'SYSTEM', 0, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'resignation_reason', '离职原因', 'CUSTOM', 0, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info'

UNION ALL

SELECT t.id, g.id, 'work_years', '工作年限', 'SYSTEM', 0, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_info' AND g.code = 'entry_info';

-- ========== 学历信息页签字段 ==========

-- 最高学历分组字段
INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'education_level', '学历层次', 'CUSTOM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'education_info' AND g.code = 'highest_education'

UNION ALL

SELECT t.id, g.id, 'education_type', '学历类型', 'CUSTOM', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'education_info' AND g.code = 'highest_education'

UNION ALL

SELECT t.id, g.id, 'graduate_school', '毕业院校', 'SYSTEM', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'education_info' AND g.code = 'highest_education'

UNION ALL

SELECT t.id, g.id, 'major', '专业', 'SYSTEM', 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'education_info' AND g.code = 'highest_education'

UNION ALL

SELECT t.id, g.id, 'graduation_date', '毕业时间', 'SYSTEM', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'education_info' AND g.code = 'highest_education'

UNION ALL

SELECT t.id, g.id, 'degree_no', '学位证书号', 'SYSTEM', 0, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'education_info' AND g.code = 'highest_education'

UNION ALL

SELECT t.id, g.id, 'diploma_no', '毕业证书号', 'SYSTEM', 0, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'education_info' AND g.code = 'highest_education';

-- ========== 工作经历页签字段 ==========

INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'exp_company', '公司名称', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

UNION ALL

SELECT t.id, g.id, 'exp_position', '职位', 'SYSTEM', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

UNION ALL

SELECT t.id, g.id, 'exp_start', '开始时间', 'SYSTEM', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

UNION ALL

SELECT t.id, g.id, 'exp_end', '结束时间', 'SYSTEM', 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

UNION ALL

SELECT t.id, g.id, 'exp_salary', '离职时薪资', 'SYSTEM', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

UNION ALL

SELECT t.id, g.id, 'exp_reason', '离职原因', 'SYSTEM', 0, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_experience' AND g.code = 'work_experience_group'

UNION ALL

SELECT t.id, g.id, 'exp_description', '工作描述', 'SYSTEM', 0, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'work_experience' AND g.code = 'work_experience_group';

-- ========== 家庭信息页签字段 ==========

INSERT OR IGNORE INTO EmployeeInfoTabField (tabId, groupId, fieldCode, fieldName, fieldType, isRequired, sort, createdAt, updatedAt)
SELECT t.id, g.id, 'member_name', '成员姓名', 'SYSTEM', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'family_info' AND g.code = 'family_info_group'

UNION ALL

SELECT t.id, g.id, 'member_relation', '关系', 'CUSTOM', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'family_info' AND g.code = 'family_info_group'

UNION ALL

SELECT t.id, g.id, 'member_age', '年龄', 'SYSTEM', 0, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'family_info' AND g.code = 'family_info_group'

UNION ALL

SELECT t.id, g.id, 'member_work', '工作单位', 'SYSTEM', 0, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'family_info' AND g.code = 'family_info_group'

UNION ALL

SELECT t.id, g.id, 'member_phone', '联系电话', 'SYSTEM', 0, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'family_info' AND g.code = 'family_info_group'

UNION ALL

SELECT t.id, g.id, 'member_address', '居住地址', 'SYSTEM', 0, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM EmployeeInfoTab t, EmployeeInfoTabGroup g 
WHERE t.code = 'family_info' AND g.code = 'family_info_group';

PRAGMA foreign_keys = ON;

SELECT '所有字段创建完成！' AS result;
SELECT COUNT(*) AS '已创建字段数' FROM EmployeeInfoTabField WHERE tabId IN (SELECT id FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info'));
