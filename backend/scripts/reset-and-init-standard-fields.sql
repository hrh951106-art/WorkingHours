-- =====================================================
-- 清理和重新初始化标准字段
-- =====================================================

PRAGMA foreign_keys = OFF;

-- 清理现有数据（按依赖关系倒序删除）
DELETE FROM EmployeeInfoTabField WHERE tabId IN (SELECT id FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info'));
DELETE FROM EmployeeInfoTabGroup WHERE tabId IN (SELECT id FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info'));
DELETE FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info');
DELETE FROM CustomField WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');
DELETE FROM DataSourceOption WHERE dataSourceId IN (SELECT id FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation'));
DELETE FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');

-- 创建数据源
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES 
('gender', '性别', 'SELECT', '员工性别', 1, 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('nation', '民族', 'SELECT', '员工民族', 1, 'ACTIVE', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('marital_status', '婚姻状况', 'SELECT', '员工婚姻状况', 1, 'ACTIVE', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('political_status', '政治面貌', 'SELECT', '员工政治面貌', 1, 'ACTIVE', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('job_level', '职级', 'SELECT', '员工职级', 1, 'ACTIVE', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('employee_type', '员工类型', 'SELECT', '员工类型', 1, 'ACTIVE', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('employment_status', '在职状态', 'SELECT', '员工在职状态', 1, 'ACTIVE', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('resignation_reason', '离职原因', 'SELECT', '员工离职原因', 1, 'ACTIVE', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('education_level', '学历层次', 'SELECT', '最高学历层次', 1, 'ACTIVE', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('education_type', '学历类型', 'SELECT', '学历类型', 1, 'ACTIVE', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('family_relation', '家庭关系', 'SELECT', '家庭成员关系', 1, 'ACTIVE', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 性别选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'male', '男', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'gender'
UNION ALL
SELECT id, 'female', '女', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'gender';

-- 民族选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('han', '汉族', 1),
  ('hui', '回族', 2),
  ('manchu', '满族', 3),
  ('uygur', '维吾尔族', 4),
  ('mongol', '蒙古族', 5),
  ('tibetan', '藏族', 6),
  ('zhuang', '壮族', 7),
  ('other', '其他', 99)
) AS v(value, label, sort)
WHERE ds.code = 'nation';

-- 婚姻状况选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('unmarried', '未婚', 1),
  ('married', '已婚', 2),
  ('divorced', '离异', 3),
  ('widowed', '丧偶', 4)
) AS v(value, label, sort)
WHERE ds.code = 'marital_status';

-- 政治面貌选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('party_member', '党员', 1),
  ('league_member', '团员', 2),
  ('mass', '群众', 3),
  ('democratic_party', '民主党派', 4),
  ('none', '无党派人士', 5)
) AS v(value, label, sort)
WHERE ds.code = 'political_status';

-- 职级选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('P1', 'P1', 1), ('P2', 'P2', 2), ('P3', 'P3', 3), ('P4', 'P4', 4), ('P5', 'P5', 5),
  ('M1', 'M1', 6), ('M2', 'M2', 7), ('M3', 'M3', 8), ('M4', 'M4', 9), ('M5', 'M5', 10)
) AS v(value, label, sort)
WHERE ds.code = 'job_level';

-- 员工类型选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('formal', '正式员工', 1),
  ('probation', '试用期员工', 2),
  ('intern', '实习生', 3),
  ('labor_dispatch', '劳务派遣', 4),
  ('outsourcing', '外包人员', 5),
  ('consultant', '顾问', 6),
  ('part_time', '兼职', 7)
) AS v(value, label, sort)
WHERE ds.code = 'employee_type';

-- 在职状态选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('active', '在职', 1),
  ('probation', '试用期', 2),
  ('resigned', '离职', 3),
  ('unpaid_leave', '停薪留职', 4),
  ('retired', '退休', 5),
  ('terminated', '开除', 6)
) AS v(value, label, sort)
WHERE ds.code = 'employment_status';

-- 离职原因选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('personal', '个人原因', 1),
  ('company', '公司原因', 2),
  ('retirement', '退休', 3),
  ('contract_expired', '合同到期', 4),
  ('probation_failed', '试用期不合格', 5),
  ('misconduct', '严重违纪', 6),
  ('mutual_agreement', '协商解除', 7)
) AS v(value, label, sort)
WHERE ds.code = 'resignation_reason';

-- 学历层次选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('doctor', '博士研究生', 1),
  ('master', '硕士研究生', 2),
  ('bachelor', '本科', 3),
  ('college', '专科', 4),
  ('high_school', '高中', 5),
  ('middle_school', '初中', 6),
  ('primary_school', '小学', 7),
  ('other', '其他', 8)
) AS v(value, label, sort)
WHERE ds.code = 'education_level';

-- 学历类型选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('full_time', '全日制', 1),
  ('in_service', '在职', 2),
  ('self_taught', '自考', 3),
  ('correspondence', '函授', 4),
  ('evening_university', '夜大', 5),
  ('tv_university', '电大', 6),
  ('online_education', '网教', 7),
  ('other', '其他', 8)
) AS v(value, label, sort)
WHERE ds.code = 'education_type';

-- 家庭关系选项
INSERT INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT ds.id, v.value, v.label, v.sort, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP 
FROM DataSource ds
CROSS JOIN (VALUES 
  ('spouse', '配偶', 1),
  ('father', '父亲', 2),
  ('mother', '母亲', 3),
  ('son', '儿子', 4),
  ('daughter', '女儿', 5),
  ('brother', '兄弟', 6),
  ('sister', '姐妹', 7),
  ('grandfather', '祖父', 8),
  ('grandmother', '祖母', 9),
  ('other', '其他', 99)
) AS v(value, label, sort)
WHERE ds.code = 'family_relation';

-- 创建自定义字段
INSERT INTO CustomField (code, name, type, dataSourceId, isRequired, status, sort, "group", createdAt, updatedAt)
SELECT 'gender', '性别', 'SELECT_SINGLE', id, 1, 'ACTIVE', 1, '基本信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'gender'

UNION ALL

SELECT 'nation', '民族', 'SELECT_SINGLE', id, 0, 'ACTIVE', 2, '基本信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation'

UNION ALL

SELECT 'marital_status', '婚姻状况', 'SELECT_SINGLE', id, 1, 'ACTIVE', 3, '基本信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'marital_status'

UNION ALL

SELECT 'political_status', '政治面貌', 'SELECT_SINGLE', id, 0, 'ACTIVE', 4, '基本信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'political_status'

UNION ALL

SELECT 'job_level', '职级', 'SELECT_SINGLE', id, 1, 'ACTIVE', 5, '工作信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level'

UNION ALL

SELECT 'employee_type', '员工类型', 'SELECT_SINGLE', id, 1, 'ACTIVE', 6, '工作信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type'

UNION ALL

SELECT 'employment_status', '在职状态', 'SELECT_SINGLE', id, 1, 'ACTIVE', 7, '工作信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employment_status'

UNION ALL

SELECT 'resignation_reason', '离职原因', 'SELECT_SINGLE', id, 0, 'ACTIVE', 8, '工作信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason'

UNION ALL

SELECT 'education_level', '学历层次', 'SELECT_SINGLE', id, 1, 'ACTIVE', 9, '学历信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level'

UNION ALL

SELECT 'education_type', '学历类型', 'SELECT_SINGLE', id, 1, 'ACTIVE', 10, '学历信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type'

UNION ALL

SELECT 'family_relation', '家庭关系', 'SELECT_SINGLE', id, 1, 'ACTIVE', 11, '家庭信息', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';

-- 创建页签
INSERT INTO EmployeeInfoTab (code, name, description, isSystem, sort, status, createdAt, updatedAt)
VALUES 
('basic_info', '基本信息', '员工基本个人信息', 1, 1, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('work_info', '工作信息', '员工工作相关信息', 1, 2, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('education_info', '学历信息', '员工教育背景信息', 1, 3, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('work_experience', '工作经历', '员工过往工作经历', 1, 4, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('family_info', '家庭信息', '员工家庭成员信息', 1, 5, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

PRAGMA foreign_keys = ON;

-- 显示结果
SELECT '数据源和页签初始化完成！' AS result;
SELECT COUNT(*) AS '已创建数据源数' FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');
SELECT COUNT(*) AS '已创建数据源选项数' FROM DataSourceOption WHERE dataSourceId IN (SELECT id FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation'));
SELECT COUNT(*) AS '已创建自定义字段数' FROM CustomField WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');
SELECT COUNT(*) AS '已创建页签数' FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info');
