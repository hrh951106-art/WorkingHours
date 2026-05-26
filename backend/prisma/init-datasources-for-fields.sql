-- 初始化人事信息字段所需的数据源及选项值
-- 为所有下拉选项字段创建数据源和预设选项值

BEGIN TRANSACTION;

-- ==================== 1. 创建数据源 ====================

-- 1.1 性别
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('GENDER', '性别', 'CUSTOM', '员工性别选项', 1, 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.2 婚姻状况
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('MARITAL_STATUS', '婚姻状况', 'CUSTOM', '员工婚姻状况选项', 1, 'ACTIVE', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.3 政治面貌
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('POLITICAL_STATUS', '政治面貌', 'CUSTOM', '员工政治面貌选项', 1, 'ACTIVE', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.4 紧急联系人关系（也用于家庭信息称谓）
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('EMERGENCY_CONTACT_RELATION', '紧急联系人关系', 'CUSTOM', '紧急联系人关系选项', 1, 'ACTIVE', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.5 工作关系
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('EMPLOYMENT_RELATION', '工作关系', 'CUSTOM', '员工工作关系选项', 1, 'ACTIVE', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.6 入职类型
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('ENTRY_TYPE', '入职类型', 'CUSTOM', '员工入职类型选项', 1, 'ACTIVE', 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.7 员工类型
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('EMPLOYEE_TYPE', '员工类型', 'CUSTOM', '员工类型选项', 1, 'ACTIVE', 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.8 职级
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('JOB_LEVEL', '职级', 'CUSTOM', '员工职级选项', 1, 'ACTIVE', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.9 岗位
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('JOB_POST', '岗位', 'CUSTOM', '员工岗位选项', 1, 'ACTIVE', 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.10 成本中心
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('COST_CENTER', '成本中心', 'CUSTOM', '成本中心选项', 1, 'ACTIVE', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.11 职务
INSERT INTO DataSource (code, name, type, description, isSystem, status, sort, createdAt, updatedAt)
VALUES ('POSITION_TITLE', '职务', 'CUSTOM', '员工职务选项', 1, 'ACTIVE', 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 1.12 学历（已存在，只需更新为系统数据源）
UPDATE DataSource SET isSystem = 1, description = '员工学历选项', sort = 12, updatedAt = CURRENT_TIMESTAMP
WHERE code = 'EDUCATION';

-- ==================== 2. 创建数据源选项值 ====================

-- 2.1 性别选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '男', 'MALE', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'GENDER';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '女', 'FEMALE', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'GENDER';

-- 2.2 婚姻状况选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '未婚', 'SINGLE', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'MARITAL_STATUS';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '已婚', 'MARRIED', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'MARITAL_STATUS';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '离异', 'DIVORCED', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'MARITAL_STATUS';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '丧偶', 'WIDOWED', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'MARITAL_STATUS';

-- 2.3 政治面貌选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '群众', 'MASS', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POLITICAL_STATUS';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '党员', 'CCP_MEMBER', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POLITICAL_STATUS';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '团员', 'CYL_MEMBER', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POLITICAL_STATUS';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '民主党派', 'DEMOCRATIC_PARTY', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POLITICAL_STATUS';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '其他', 'OTHER', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POLITICAL_STATUS';

-- 2.4 紧急联系人关系选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '父亲', 'FATHER', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMERGENCY_CONTACT_RELATION';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '母亲', 'MOTHER', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMERGENCY_CONTACT_RELATION';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '配偶', 'SPOUSE', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMERGENCY_CONTACT_RELATION';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '子女', 'CHILD', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMERGENCY_CONTACT_RELATION';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '其他', 'OTHER', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMERGENCY_CONTACT_RELATION';

-- 2.5 工作关系选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '正式员工', 'FORMAL', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMPLOYMENT_RELATION';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '临时员工', 'TEMPORARY', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMPLOYMENT_RELATION';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '实习生', 'INTERN', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMPLOYMENT_RELATION';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '外包', 'OUTSOURCE', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMPLOYMENT_RELATION';

-- 2.6 入职类型选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '校园招聘', 'CAMPUS_RECRUITMENT', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'ENTRY_TYPE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '社会招聘', 'SOCIAL_RECRUITMENT', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'ENTRY_TYPE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '内部推荐', 'INTERNAL_REFERRAL', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'ENTRY_TYPE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '其他', 'OTHER', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'ENTRY_TYPE';

-- 2.7 员工类型选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '全职', 'FULL_TIME', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMPLOYEE_TYPE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '兼职', 'PART_TIME', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMPLOYEE_TYPE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '劳务派遣', 'LABOR_DISPATCH', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'EMPLOYEE_TYPE';

-- 2.8 职级选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'P1', 'P1', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'P2', 'P2', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'P3', 'P3', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'P4', 'P4', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'P5', 'P5', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'P6', 'P6', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'M1', 'M1', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'M2', 'M2', 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, 'M3', 'M3', 9, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_LEVEL';

-- 2.9 岗位选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '技术岗', 'TECHNICAL', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_POST';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '管理岗', 'MANAGEMENT', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_POST';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '销售岗', 'SALES', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_POST';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '行政岗', 'ADMINISTRATIVE', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_POST';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '财务岗', 'FINANCE', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_POST';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '人力资源岗', 'HR', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'JOB_POST';

-- 2.10 成本中心选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '研发中心', 'RD_CENTER', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'COST_CENTER';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '销售中心', 'SALES_CENTER', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'COST_CENTER';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '运营中心', 'OPERATION_CENTER', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'COST_CENTER';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '市场中心', 'MARKETING_CENTER', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'COST_CENTER';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '财务中心', 'FINANCE_CENTER', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'COST_CENTER';

-- 2.11 职务选项
INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '员工', 'EMPLOYEE', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POSITION_TITLE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '主管', 'SUPERVISOR', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POSITION_TITLE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '经理', 'MANAGER', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POSITION_TITLE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '总监', 'DIRECTOR', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POSITION_TITLE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '副总裁', 'VICE_PRESIDENT', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POSITION_TITLE';

INSERT INTO DataSourceOption (dataSourceId, label, value, sort, isActive, createdAt, updatedAt)
SELECT id, '总裁', 'PRESIDENT', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'POSITION_TITLE';

COMMIT TRANSACTION;

-- 验证结果
SELECT '=== 数据源列表 ===' AS '';
SELECT id, code, name, isSystem
FROM DataSource
WHERE code IN ('GENDER', 'MARITAL_STATUS', 'POLITICAL_STATUS', 'EMERGENCY_CONTACT_RELATION',
               'EMPLOYMENT_RELATION', 'ENTRY_TYPE', 'EMPLOYEE_TYPE', 'JOB_LEVEL',
               'JOB_POST', 'COST_CENTER', 'POSITION_TITLE', 'EDUCATION')
ORDER BY sort;

-- 说明：
-- 创建了11个新的数据源（性别、婚姻状况、政治面貌、紧急联系人关系、工作关系、入职类型、员工类型、职级、岗位、成本中心、职务）
-- 更新了学历数据源为系统数据源
-- 每个数据源都预设了常用的选项值
-- 下一步需要将这些数据源关联到对应的字段
