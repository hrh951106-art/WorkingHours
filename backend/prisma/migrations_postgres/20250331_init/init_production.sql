-- ========================================
-- JY精益工时管理系统 - 生产环境初始化脚本
-- ========================================
-- 版本: v1.0.0
-- 日期: 2025-03-31
-- 数据库: PostgreSQL 14+
-- 说明: 此脚本用于全新生产环境的初始化
--       包含表结构、种子数据、重复数据清理、索引创建
-- ========================================

-- ========================================
-- 第一部分: 表结构迁移
-- ========================================

\echo '【步骤 1/6】创建表结构...'

-- 这里引用已创建的表结构迁移
\i migration.sql

-- ========================================
-- 第二部分: 种子数据插入
-- ========================================

\echo '【步骤 2/6】插入种子数据...'

-- DataSource & DataSourceOption
\echo '  - 插入数据源配置...'
INSERT INTO "DataSource" VALUES (1, 'GENDER', '性别', 'DICT', '员工性别', true, 'ACTIVE', 1, NOW(), NOW());
INSERT INTO "DataSource" VALUES (2, 'EDUCATION', '学历', 'DICT', '员工学历水平', true, 'ACTIVE', 2, NOW(), NOW());
INSERT INTO "DataSource" VALUES (3, 'NATION', '民族', 'DICT', '员工民族', true, 'ACTIVE', 3, NOW(), NOW());
INSERT INTO "DataSource" VALUES (4, 'POLITICAL_STATUS', '政治面貌', 'DICT', '员工政治面貌', true, 'ACTIVE', 4, NOW(), NOW());
INSERT INTO "DataSource" VALUES (5, 'MARITAL_STATUS', '婚姻状况', 'DICT', '员工婚姻状况', true, 'ACTIVE', 5, NOW(), NOW());
INSERT INTO "DataSource" VALUES (6, 'EMPLOYEE_TYPE', '员工类型', 'DICT', '员工类型分类', true, 'ACTIVE', 6, NOW(), NOW());
INSERT INTO "DataSource" VALUES (7, 'WORK_STATUS', '工作状态', 'DICT', '员工当前工作状态', true, 'ACTIVE', 7, NOW(), NOW());
INSERT INTO "DataSource" VALUES (8, 'LEAVE_TYPE', '请假类型', 'DICT', '请假类型分类', true, 'ACTIVE', 8, NOW(), NOW());
INSERT INTO "DataSource" VALUES (9, 'OVERTIME_TYPE', '加班类型', 'DICT', '加班类型分类', true, 'ACTIVE', 9, NOW(), NOW());
INSERT INTO "DataSource" VALUES (10, 'HOLIDAY_TYPE', '节假日类型', 'DICT', '节假日类型', true, 'ACTIVE', 10, NOW(), NOW());
INSERT INTO "DataSource" VALUES (11, 'SHIFT_TYPE', '班次类型', 'DICT', '班次类型', true, 'ACTIVE', 11, NOW(), NOW());

INSERT INTO "DataSourceOption" VALUES (1, 1, '男', 'MALE', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (2, 1, '女', 'FEMALE', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (3, 2, '初中', 'JUNIOR_HIGH', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (4, 2, '高中', 'HIGH_SCHOOL', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (5, 2, '大专', 'COLLEGE', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (6, 2, '本科', 'BACHELOR', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (7, 2, '硕士', 'MASTER', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (8, 2, '博士', 'DOCTOR', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (9, 3, '汉族', 'HAN', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (10, 11, '标准班', 'STANDARD', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (11, 11, '早班', 'MORNING', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (12, 11, '中班', 'AFTERNOON', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (13, 11, '晚班', 'NIGHT', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (14, 11, '弹性班', 'FLEXIBLE', 5, true, NOW(), NOW());

-- Role
\echo '  - 插入系统角色...'
INSERT INTO "Role" VALUES (1, 'SUPER_ADMIN', '超级管理员', '系统超级管理员，拥有所有权限', '[]', 'ALL', false, 'ACTIVE', NOW(), NOW(), NULL, NULL, NULL);
INSERT INTO "Role" VALUES (2, 'HR_ADMIN', '人事管理员', '人事模块管理员', '[]', 'ALL', false, 'ACTIVE', NOW(), NOW(), NULL, NULL, NULL);
INSERT INTO "Role" VALUES (3, 'ATTENDANCE_ADMIN', '考勤管理员', '考勤模块管理员', '[]', 'ALL', false, 'ACTIVE', NOW(), NOW(), NULL, NULL, NULL);
INSERT INTO "Role" VALUES (4, 'USER', '普通用户', '系统普通用户', '[]', 'SELF', true, 'ACTIVE', NOW(), NOW(), NULL, NULL, NULL);

-- User
\echo '  - 插入系统用户...'
INSERT INTO "User" VALUES (1, 'admin', '$2b$10$VK4dEqPfsqJ8fE8kQYQ2VuH5J3kFJE9WqeCfO7TUKHN9PYFcGxOYq', '系统管理员', 'admin@jy.com', 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (2, 'testuser', '$2b$10$VK4dEqPfsqJ8fE8kQYQ2VuH5J3kFJE9WqeCfO7TUKHN9PYFcGxOYq', '测试用户', 'test@jy.com', 'ACTIVE', NOW(), NOW());

-- UserRole
\echo '  - 分配用户角色...'
INSERT INTO "UserRole" VALUES (1, 1, 1, NOW());
INSERT INTO "UserRole" VALUES (2, 2, 4, NOW());

-- Organization
\echo '  - 插入组织架构...'
INSERT INTO "Organization" VALUES (1, 'ROOT', '公司总部', NULL, 'COMPANY', NULL, NULL, 0, '2020-01-01 00:00:00.000+00', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (2, 'TECH', '技术部', 1, 'DEPARTMENT', NULL, NULL, 1, '2020-01-01 00:00:00.000+00', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (3, 'HR', '人事部', 1, 'DEPARTMENT', NULL, NULL, 1, '2020-01-01 00:00:00.000+00', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (4, 'FINANCE', '财务部', 1, 'DEPARTMENT', NULL, NULL, 1, '2020-01-01 00:00:00.000+00', NULL, 'ACTIVE', NOW(), NOW());

-- Shift
\echo '  - 插入班次配置...'
INSERT INTO "Shift" VALUES (1, 'STANDARD', '标准班', 'FULL_DAY', 8, 1, '#4CAF50', 'ACTIVE', NOW(), NOW());
INSERT INTO "Shift" VALUES (2, 'MORNING', '早班', 'FULL_DAY', 8, 1, '#2196F3', 'ACTIVE', NOW(), NOW());
INSERT INTO "Shift" VALUES (3, 'AFTERNOON', '中班', 'FULL_DAY', 8, 1, '#FF9800', 'ACTIVE', NOW(), NOW());
INSERT INTO "Shift" VALUES (4, 'NIGHT', '晚班', 'FULL_DAY', 8, 1, '#9C27B0', 'ACTIVE', NOW(), NOW());
INSERT INTO "Shift" VALUES (5, 'FLEXIBLE', '弹性班', 'FLEXIBLE', 8, 0, '#FFC107', 'ACTIVE', NOW(), NOW());

-- EmployeeInfoTab, Group, Field (完整的人事信息配置)
\echo '  - 插入人事信息页签配置...'

-- Tab 1: basic_info (基本信息)
INSERT INTO "EmployeeInfoTab" VALUES (1, 'basic_info', '基本信息', '员工的基本个人信息', true, 1, 'ACTIVE', NOW(), NOW());

INSERT INTO "EmployeeInfoTabGroup" VALUES (1, 1, 'basic', '基础资料', '基础信息字段', 1, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (2, 1, 'contact', '联系方式', '联系信息字段', 2, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (3, 1, 'personal', '个人详情', '其他个人信息', 3, 'ACTIVE', false, true, NOW(), NOW());

INSERT INTO "EmployeeInfoTabField" VALUES (1, 1, 1, 'name', '姓名', 'TEXT', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (2, 1, 1, 'employeeNo', '员工编号', 'TEXT', true, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (3, 1, 1, 'gender', '性别', 'SELECT', true, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (4, 1, 1, 'birthDate', '出生日期', 'DATE', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (5, 1, 1, 'age', '年龄', 'NUMBER', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (6, 1, 1, 'nation', '民族', 'SELECT', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (7, 1, 1, 'idCard', '身份证号', 'TEXT', false, false, 7, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (8, 1, 2, 'phone', '手机号码', 'TEXT', true, false, 8, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (9, 1, 2, 'email', '电子邮箱', 'TEXT', false, false, 9, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (10, 1, 2, 'currentAddress', '现居住地', 'TEXT', false, false, 10, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (11, 1, 2, 'homeAddress', '家庭住址', 'TEXT', false, false, 11, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (12, 1, 2, 'homePhone', '家庭电话', 'TEXT', false, false, 12, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (13, 1, 3, 'maritalStatus', '婚姻状况', 'SELECT', false, false, 13, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (14, 1, 3, 'politicalStatus', '政治面貌', 'SELECT', false, false, 14, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (15, 1, 3, 'nativePlace', '籍贯', 'TEXT', false, false, 15, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (16, 1, 3, 'householdRegister', '户口所在地', 'TEXT', false, false, 16, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (17, 1, 3, 'photo', '证件照', 'IMAGE', false, false, 17, NOW(), NOW());

-- Tab 2: work_info (工作信息)
INSERT INTO "EmployeeInfoTab" VALUES (2, 'work_info', '工作信息', '与工作相关的信息', true, 2, 'ACTIVE', NOW(), NOW());

INSERT INTO "EmployeeInfoTabGroup" VALUES (4, 2, 'position', '岗位信息', '岗位相关信息', 1, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (5, 2, 'department', '部门信息', '部门相关信息', 2, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (6, 2, 'attendance', '考勤设置', '考勤相关设置', 3, 'ACTIVE', false, true, NOW(), NOW());

INSERT INTO "EmployeeInfoTabField" VALUES (18, 2, 4, 'orgId', '所属部门', 'ORG_SELECT', true, false, 18, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (19, 2, 4, 'position', '职位', 'TEXT', false, false, 19, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (20, 2, 4, 'entryDate', '入职日期', 'DATE', true, false, 20, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (21, 2, 5, 'employeeType', '员工类型', 'SELECT', false, false, 21, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (22, 2, 5, 'workStatus', '工作状态', 'SELECT', false, false, 22, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (23, 2, 6, 'shiftId', '默认班次', 'SELECT', false, false, 23, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (24, 2, 6, 'punchDeviceId', '打卡设备', 'SELECT', false, false, 24, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (25, 2, 6, 'status', '在职状态', 'SELECT', true, false, 25, NOW(), NOW());

-- Tab 3: education_info (学历信息 - 子表)
INSERT INTO "EmployeeInfoTab" VALUES (3, 'education_info', '学历信息', '教育经历信息', true, 3, 'ACTIVE', NOW(), NOW());

-- Tab 4: work_experience (工作经历 - 子表)
INSERT INTO "EmployeeInfoTab" VALUES (4, 'work_experience', '工作经历', '过往工作经历', true, 4, 'ACTIVE', NOW(), NOW());

-- Tab 5: family_info (家庭信息 - 子表)
INSERT INTO "EmployeeInfoTab" VALUES (5, 'family_info', '家庭信息', '家庭成员信息', true, 5, 'ACTIVE', NOW(), NOW());

-- CustomField
\echo '  - 插入自定义字段配置...'
INSERT INTO "CustomField" VALUES (1, 'emergency_contact', '紧急联系人', 'TEXT', NULL, NULL, false, NULL, 'basic', 1, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (2, 'emergency_phone', '紧急联系电话', 'TEXT', NULL, NULL, false, NULL, 'basic', 2, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (3, 'emergency_relation', '紧急联系人关系', 'TEXT', NULL, NULL, false, NULL, 'basic', 3, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (4, 'skill_certificates', '技能证书', 'TEXT', NULL, NULL, false, NULL, 'work', 4, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (5, 'language_skills', '语言能力', 'TEXT', NULL, NULL, false, NULL, 'work', 5, false, 'ACTIVE', NOW(), NOW());

-- PunchDevice
\echo '  - 插入打卡设备配置...'
INSERT INTO "PunchDevice" VALUES (1, 'DEV001', '主门打卡机', 'BIOMETRIC', '192.168.1.100', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (2, 'DEV002', '侧门打卡机', 'CARD', '192.168.1.101', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (3, 'DEV003', '移动打卡', 'MOBILE', NULL, NULL, 'ACTIVE', NOW(), NOW());

-- ========================================
-- 第三部分: 重复数据清理
-- ========================================

\echo '【步骤 3/6】清理重复数据（如果存在）...'

-- 清理可能存在的大写代码重复页签
DELETE FROM "EmployeeInfoTabField" WHERE "tabId" IN (
  SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

DELETE FROM "EmployeeInfoTabGroup" WHERE "tabId" IN (
  SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

DELETE FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY');

-- ========================================
-- 第四部分: 创建性能优化索引
-- ========================================

\echo '【步骤 4/6】创建性能优化索引...'

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_user_username ON "User"(username);
CREATE INDEX IF NOT EXISTS idx_user_status ON "User"(status);

-- 角色表索引
CREATE INDEX IF NOT EXISTS idx_role_code ON "Role"(code);
CREATE INDEX IF NOT EXISTS idx_role_status ON "Role"(status);

-- 员工表索引
CREATE INDEX IF NOT EXISTS idx_employee_org_id ON "Employee"(org_id);
CREATE INDEX IF NOT EXISTS idx_employee_status ON "Employee"(status);
CREATE INDEX IF NOT EXISTS idx_employee_employee_no ON "Employee"(employeeNo);
CREATE INDEX IF NOT EXISTS idx_employee_entry_date ON "Employee"(entryDate);

-- 组织架构索引
CREATE INDEX IF NOT EXISTS idx_org_code ON "Organization"(code);
CREATE INDEX IF NOT EXISTS idx_org_parent_id ON "Organization"(parentId);
CREATE INDEX IF NOT EXISTS idx_org_type ON "Organization"(type);
CREATE INDEX IF NOT EXISTS idx_org_status ON "Organization"(status);

-- 班次索引
CREATE INDEX IF NOT EXISTS idx_shift_code ON "Shift"(code);
CREATE INDEX IF NOT EXISTS idx_shift_status ON "Shift"(status);

-- 打卡设备索引
CREATE INDEX IF NOT EXISTS idx_device_code ON "PunchDevice"(code);
CREATE INDEX IF NOT EXISTS idx_device_status ON "PunchDevice"(status);

-- 人事页签索引
CREATE INDEX IF NOT EXISTS idx_tab_code ON "EmployeeInfoTab"(code);
CREATE INDEX IF NOT EXISTS idx_tab_status ON "EmployeeInfoTab"(status);

-- 人事分组索引
CREATE INDEX IF NOT EXISTS idx_group_tab_id ON "EmployeeInfoTabGroup"(tabId);
CREATE INDEX IF NOT EXISTS idx_group_status ON "EmployeeInfoTabGroup"(status);

-- 人事字段索引
CREATE INDEX IF NOT EXISTS idx_field_tab_id ON "EmployeeInfoTabField"(tabId);
CREATE INDEX IF NOT EXISTS idx_field_group_id ON "EmployeeInfoTabField"(groupId);

-- 数据源索引
CREATE INDEX IF NOT EXISTS idx_datasource_code ON "DataSource"(code);
CREATE INDEX IF NOT EXISTS idx_datasource_status ON "DataSource"(status);

-- ========================================
-- 第五部分: 重置序列
-- ========================================

\echo '【步骤 5/6】重置序列...'

SELECT setval('"User_id_seq"', (SELECT MAX(id) FROM "User"), true);
SELECT setval('"Role_id_seq"', (SELECT MAX(id) FROM "Role"), true);
SELECT setval('"UserRole_id_seq"', (SELECT MAX(id) FROM "UserRole"), true);
SELECT setval('"Organization_id_seq"', (SELECT MAX(id) FROM "Organization"), true);
SELECT setval('"Employee_id_seq"', (SELECT MAX(id) FROM "Employee"), true);
SELECT setval('"DataSource_id_seq"', (SELECT MAX(id) FROM "DataSource"), true);
SELECT setval('"Shift_id_seq"', (SELECT MAX(id) FROM "Shift"), true);
SELECT setval('"ShiftProperty_id_seq"', (SELECT MAX(id) FROM "ShiftProperty"), true);
SELECT setval('"PunchDevice_id_seq"', (SELECT MAX(id) FROM "PunchDevice"), true);
SELECT setval('"EmployeeInfoTab_id_seq"', (SELECT MAX(id) FROM "EmployeeInfoTab"), true);
SELECT setval('"EmployeeInfoTabGroup_id_seq"', (SELECT MAX(id) FROM "EmployeeInfoTabGroup"), true);
SELECT setval('"EmployeeInfoTabField_id_seq"', (SELECT MAX(id) FROM "EmployeeInfoTabField"), true);
SELECT setval('"CustomField_id_seq"', (SELECT MAX(id) FROM "CustomField"), true);

-- ========================================
-- 第六部分: 验证和统计
-- ========================================

\echo '【步骤 6/6】验证安装...'

-- 显示安装统计信息
SELECT '=== 安装统计 ===' AS info;
SELECT '用户数量' AS item, COUNT(*) AS count FROM "User"
UNION ALL
SELECT '角色数量', COUNT(*) FROM "Role"
UNION ALL
SELECT '组织数量', COUNT(*) FROM "Organization"
UNION ALL
SELECT '班次数量', COUNT(*) FROM "Shift"
UNION ALL
SELECT '页签数量', COUNT(*) FROM "EmployeeInfoTab"
UNION ALL
SELECT '分组数量', COUNT(*) FROM "EmployeeInfoTabGroup"
UNION ALL
SELECT '字段数量', COUNT(*) FROM "EmployeeInfoTabField"
UNION ALL
SELECT '数据源数量', COUNT(*) FROM "DataSource"
UNION ALL
SELECT '打卡设备数量', COUNT(*) FROM "PunchDevice"
UNION ALL
SELECT '自定义字段数量', COUNT(*) FROM "CustomField";

-- 验证没有重复的页签代码
SELECT '=== 重复检查 ===' AS info;
SELECT code, COUNT(*) AS count
FROM "EmployeeInfoTab"
WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'basic_info', 'work_info')
GROUP BY code
HAVING COUNT(*) > 1;

-- 显示默认管理员账号信息
SELECT '=== 默认账号 ===' AS info;
SELECT id, username, name, email, status
FROM "User"
WHERE username = 'admin';

\echo ''
\echo '========================================'
\echo '✓ 生产环境初始化完成！'
\echo '========================================'
\echo ''
\echo '默认登录账号：'
\echo '  用户名: admin'
\echo '  密码: admin123'
\echo ''
\echo '⚠️  安全提醒：'
\echo '  1. 请立即修改默认管理员密码'
\echo '  2. 请修改 .env.production 中的 JWT_SECRET'
\echo '  3. 请配置数据库备份策略'
\echo '========================================'
