-- =============================================
-- PostgreSQL 生产环境种子数据迁移文件
-- =============================================
-- 功能：初始化系统运行必需的基础数据
-- 包含：
--   1. 数据源配置（组织类型、学历、工作状态等）
--   2. 人事信息页签配置（5个页签、分组、字段）
--   3. 系统用户和角色
--   4. 组织架构
--   5. 班次配置
--   6. 打卡设备
-- =============================================
-- 使用说明：
--   1. 确保数据库schema已创建（运行 prisma migrate）
--   2. 执行此SQL文件：psql -U postgres -d jy_production -f postgresql-seed-data.sql
--   3. 验证数据导入情况
-- =============================================

BEGIN;

-- =============================================
-- 1. 数据源配置 (DataSource + DataSourceOption)
-- =============================================

-- 1.1 组织类型数据源（内置）
INSERT INTO "DataSource" (id, code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(1, 'ORG_TYPE', '组织类型', 'BUILTIN', '组织架构类型选项', true, 1, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem",
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 组织类型选项
INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 1, '集团', 'GROUP', 1, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 1 AND value = 'GROUP'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 1, '公司', 'COMPANY', 2, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 1 AND value = 'COMPANY'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 1, '部门', 'DEPARTMENT', 3, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 1 AND value = 'DEPARTMENT'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 1, '小组', 'TEAM', 4, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 1 AND value = 'TEAM'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 1, '岗位', 'POSITION', 5, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 1 AND value = 'POSITION'
);

-- 1.2 学历数据源（自定义）
INSERT INTO "DataSource" (id, code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(2, 'EDUCATION', '学历', 'CUSTOM', '员工学历选项', false, 2, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 学历选项
INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 2, '高中', 'HIGH_SCHOOL', 1, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 2 AND value = 'HIGH_SCHOOL'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 2, '大专', 'COLLEGE', 2, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 2 AND value = 'COLLEGE'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 2, '本科', 'BACHELOR', 3, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 2 AND value = 'BACHELOR'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 2, '硕士', 'MASTER', 4, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 2 AND value = 'MASTER'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 2, '博士', 'DOCTOR', 5, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 2 AND value = 'DOCTOR'
);

-- 1.3 工作状态数据源
INSERT INTO "DataSource" (id, code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(3, 'WORK_STATUS', '工作状态', 'CUSTOM', '员工工作状态', false, 3, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 工作状态选项
INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 3, '在职', 'ACTIVE', 1, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 3 AND value = 'ACTIVE'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 3, '试用期', 'PROBATION', 2, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 3 AND value = 'PROBATION'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 3, '请假', 'LEAVE', 3, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 3 AND value = 'LEAVE'
);

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT 3, '离职', 'RESIGNED', 4, true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "DataSourceOption"
  WHERE "dataSourceId" = 3 AND value = 'RESIGNED'
);

-- 1.4 产品数据源（内置）
INSERT INTO "DataSource" (id, code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(4, 'PRODUCT', '产品', 'BUILTIN', '产品选项（来自产品配置）', true, 4, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem",
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 1.5 工序数据源（内置）
INSERT INTO "DataSource" (id, code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(5, 'PROCESS', '工序', 'BUILTIN', '工序选项（来自班次配置）', true, 5, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem",
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();


-- =============================================
-- 2. 人事信息页签配置 (EmployeeInfoTab + Groups + Fields)
-- =============================================

-- 2.1 创建页签
INSERT INTO "EmployeeInfoTab" (id, code, name, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(1, 'basic_info', '基本信息', '员工的基本个人信息', true, 1, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTab" (id, code, name, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(2, 'work_info', '工作信息', '员工的工作相关信息，包括职位、职级、异动历史等', true, 2, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTab" (id, code, name, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(3, 'education_info', '学历信息', '员工的教育背景和学历信息', true, 3, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTab" (id, code, name, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(4, 'work_experience', '工作经历', '员工过往的工作经历', true, 4, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTab" (id, code, name, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES
(5, 'family_info', '家庭信息', '员工家庭成员信息', true, 5, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();


-- 2.2 基本信息页签的分组
INSERT INTO "EmployeeInfoTabGroup" (id, "tabId", code, name, description, sort, status, collapsed, "isSystem", "createdAt", "updatedAt")
VALUES
(1, 1, 'PERSONAL_INFO', '个人资料', '姓名、性别、身份证等基本资料', 1, 'ACTIVE', false, true, NOW(), NOW())
ON CONFLICT ("tabId", code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  collapsed = EXCLUDED.collapsed,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTabGroup" (id, "tabId", code, name, description, sort, status, collapsed, "isSystem", "createdAt", "updatedAt")
VALUES
(2, 1, 'CONTACT_INFO', '联系方式', '电话、邮箱、地址等联系方式', 2, 'ACTIVE', false, true, NOW(), NOW())
ON CONFLICT ("tabId", code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  collapsed = EXCLUDED.collapsed,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTabGroup" (id, "tabId", code, name, description, sort, status, collapsed, "isSystem", "createdAt", "updatedAt")
VALUES
(3, 1, 'PERSONAL_DETAILS', '个人详情', '出生日期、婚姻状况、政治面貌等', 3, 'ACTIVE', true, true, NOW(), NOW())
ON CONFLICT ("tabId", code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  collapsed = EXCLUDED.collapsed,
  "updatedAt" = NOW();


-- 2.3 工作信息页签的分组
INSERT INTO "EmployeeInfoTabGroup" (id, "tabId", code, name, description, sort, status, collapsed, "isSystem", "createdAt", "updatedAt")
VALUES
(4, 2, 'CURRENT_POSITION', '当前职位', '当前职位和岗位信息', 1, 'ACTIVE', false, true, NOW(), NOW())
ON CONFLICT ("tabId", code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  collapsed = EXCLUDED.collapsed,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTabGroup" (id, "tabId", code, name, description, sort, status, collapsed, "isSystem", "createdAt", "updatedAt")
VALUES
(5, 2, 'EMPLOYMENT_INFO', '雇佣信息', '入职日期、员工类型、试用期等', 2, 'ACTIVE', false, true, NOW(), NOW())
ON CONFLICT ("tabId", code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  collapsed = EXCLUDED.collapsed,
  "updatedAt" = NOW();

INSERT INTO "EmployeeInfoTabGroup" (id, "tabId", code, name, description, sort, status, collapsed, "isSystem", "createdAt", "updatedAt")
VALUES
(6, 2, 'ORG_INFO', '组织信息', '所属组织和部门信息', 3, 'ACTIVE', false, true, NOW(), NOW())
ON CONFLICT ("tabId", code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  collapsed = EXCLUDED.collapsed,
  "updatedAt" = NOW();


-- 2.4 基本信息页签的字段
-- 个人资料分组
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 1, 'employeeNo', '员工编号', 'TEXT', true, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'employeeNo'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 1, 'name', '姓名', 'TEXT', true, false, false, 2, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'name'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 1, 'gender', '性别', 'SELECT', true, false, false, 3, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'gender'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 1, 'idCard', '身份证号', 'TEXT', false, false, false, 4, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'idCard'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 1, 'photo', '照片', 'IMAGE', false, false, false, 5, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'photo'
);

-- 联系方式分组
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 2, 'phone', '手机号码', 'TEXT', false, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'phone'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 2, 'email', '电子邮箱', 'TEXT', false, false, false, 2, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'email'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 2, 'currentAddress', '现居住地址', 'TEXT', false, false, false, 3, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'currentAddress'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 2, 'emergencyContact', '紧急联系人', 'TEXT', false, false, false, 4, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'emergencyContact'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 2, 'emergencyPhone', '紧急联系电话', 'TEXT', false, false, false, 5, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'emergencyPhone'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 2, 'emergencyRelation', '紧急联系人关系', 'TEXT', false, false, false, 6, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'emergencyRelation'
);

-- 个人详情分组
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 3, 'birthDate', '出生日期', 'DATE', false, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'birthDate'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 3, 'age', '年龄', 'NUMBER', false, false, false, 2, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'age'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 3, 'maritalStatus', '婚姻状况', 'SELECT', false, false, false, 3, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'maritalStatus'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 3, 'nativePlace', '籍贯', 'TEXT', false, false, false, 4, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'nativePlace'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 3, 'politicalStatus', '政治面貌', 'SELECT', false, false, false, 5, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'politicalStatus'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 1, 3, 'householdRegister', '户口所在地', 'TEXT', false, false, false, 6, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 1 AND "fieldCode" = 'householdRegister'
);


-- 2.5 工作信息页签的字段
-- 当前职位分组
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 4, 'position', '职位', 'TEXT', false, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'position'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 4, 'jobLevel', '职级', 'TEXT', false, false, false, 2, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'jobLevel'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 4, 'employeeType', '员工类型', 'SELECT', false, false, false, 3, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'employeeType'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 4, 'workLocation', '工作地点', 'TEXT', false, false, false, 4, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'workLocation'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 4, 'workAddress', '办公地址', 'TEXT', false, false, false, 5, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'workAddress'
);

-- 雇佣信息分组
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'entryDate', '入职日期', 'DATE', true, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'entryDate'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'hireDate', '受雇日期', 'DATE', false, false, false, 2, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'hireDate'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'probationStart', '试用期开始', 'DATE', false, false, false, 3, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'probationStart'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'probationEnd', '试用期结束', 'DATE', false, false, false, 4, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'probationEnd'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'probationMonths', '试用期月数', 'NUMBER', false, false, false, 5, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'probationMonths'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'regularDate', '转正日期', 'DATE', false, false, false, 6, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'regularDate'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'workYears', '工作年限', 'NUMBER', false, false, false, 7, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'workYears'
);

INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 5, 'status', '员工状态', 'SELECT', true, false, false, 8, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'status'
);

-- 组织信息分组
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 2, 6, 'orgId', '所属组织', 'ORG_SELECT', true, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 2 AND "fieldCode" = 'orgId'
);

-- 学历信息页签字段
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 3, NULL, 'educations', '学历列表', 'CHILD_TABLE', false, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 3 AND "fieldCode" = 'educations'
);

-- 工作经历页签字段
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 4, NULL, 'workExperiences', '工作经历列表', 'CHILD_TABLE', false, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 4 AND "fieldCode" = 'workExperiences'
);

-- 家庭信息页签字段
INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", sort, "createdAt", "updatedAt")
SELECT 5, NULL, 'familyMembers', '家庭成员列表', 'CHILD_TABLE', false, false, false, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EmployeeInfoTabField"
  WHERE "tabId" = 5 AND "fieldCode" = 'familyMembers'
);


-- =============================================
-- 3. 角色配置
-- =============================================

-- 管理员角色
INSERT INTO "Role" (id, code, name, description, "functionalPermissions", "dataScopeType", "isDefault", status, "createdAt", "updatedAt")
VALUES
(1, 'ADMIN', '系统管理员', '拥有系统所有权限', '["*"]', 'ALL', false, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "functionalPermissions" = EXCLUDED."functionalPermissions",
  "dataScopeType" = EXCLUDED."dataScopeType",
  "isDefault" = EXCLUDED."isDefault",
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- HR管理员角色
INSERT INTO "Role" (id, code, name, description, "functionalPermissions", "dataScopeType", "isDefault", status, "createdAt", "updatedAt")
VALUES
(2, 'HR_ADMIN', 'HR管理员', '人事管理相关权限', '["hr:org:view","hr:org:edit","hr:emp:view","hr:emp:edit","hr:emp:delete"]', 'ALL', true, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  "functionalPermissions" = EXCLUDED."functionalPermissions",
  "dataScopeType" = EXCLUDED."dataScopeType",
  "isDefault" = EXCLUDED."isDefault",
  status = EXCLUDED.status,
  "updatedAt" = NOW();


-- =============================================
-- 4. 用户配置
-- =============================================

-- 管理员用户 (密码: admin123，使用bcrypt)
INSERT INTO "User" (id, username, password, name, email, status, "createdAt", "updatedAt")
VALUES
(1, 'admin', '$2b$10$XOPbrlUPQdwdJUpSrIF6Xez9PDqHiV1gZTLVGJVNVc5ZFGD3jOLaq', '系统管理员', 'admin@example.com', 'ACTIVE', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- HR管理员用户 (密码: hr123，使用bcrypt)
INSERT INTO "User" (id, username, password, name, email, status, "createdAt", "updatedAt")
VALUES
(2, 'hr_admin', '$2b$10$rOYvBLnKVcLVdLV2aR6O2uWsKNVlcw5FBQ7xFK8qmQXaOfHuCZ2hK', 'HR管理员', 'hr_admin@example.com', 'ACTIVE', NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  "updatedAt" = NOW();


-- 4.1 用户角色关联
INSERT INTO "UserRole" ("userId", "roleId", "createdAt")
SELECT 1, 1, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "UserRole"
  WHERE "userId" = 1 AND "roleId" = 1
);

INSERT INTO "UserRole" ("userId", "roleId", "createdAt")
SELECT 2, 2, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "UserRole"
  WHERE "userId" = 2 AND "roleId" = 2
);


-- =============================================
-- 5. 组织架构
-- =============================================

-- 根组织：集团总部
INSERT INTO "Organization" (id, code, name, "parentId", type, level, "effectiveDate", "leaderName", status, "createdAt", "updatedAt")
VALUES
(1, 'ROOT', '集团总部', NULL, 'GROUP', 1, NOW(), '总经理', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  level = EXCLUDED.level,
  "effectiveDate" = EXCLUDED."effectiveDate",
  "leaderName" = EXCLUDED."leaderName",
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 子组织：技术部
INSERT INTO "Organization" (id, code, name, "parentId", type, level, "effectiveDate", "leaderName", status, "createdAt", "updatedAt")
VALUES
(2, 'TECH', '技术部', 1, 'DEPARTMENT', 2, NOW(), '技术总监', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  "parentId" = EXCLUDED."parentId",
  type = EXCLUDED.type,
  level = EXCLUDED.level,
  "effectiveDate" = EXCLUDED."effectiveDate",
  "leaderName" = EXCLUDED."leaderName",
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 子组织：人力资源部
INSERT INTO "Organization" (id, code, name, "parentId", type, level, "effectiveDate", "leaderName", status, "createdAt", "updatedAt")
VALUES
(3, 'HR', '人力资源部', 1, 'DEPARTMENT', 2, NOW(), 'HR总监', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  "parentId" = EXCLUDED."parentId",
  type = EXCLUDED.type,
  level = EXCLUDED.level,
  "effectiveDate" = EXCLUDED."effectiveDate",
  "leaderName" = EXCLUDED."leaderName",
  status = EXCLUDED.status,
  "updatedAt" = NOW();


-- =============================================
-- 6. 班次配置
-- =============================================

-- 正常班
INSERT INTO "Shift" (id, code, name, type, "standardHours", "breakHours", color, status, "createdAt", "updatedAt")
VALUES
(1, 'NORMAL', '正常班', 'NORMAL', 7.5, 1.5, '#1890ff', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  "standardHours" = EXCLUDED."standardHours",
  "breakHours" = EXCLUDED."breakHours",
  color = EXCLUDED.color,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 班次段（上午工作、午休、下午工作）
INSERT INTO "ShiftSegment" ("shiftId", type, "startDate", "startTime", "endDate", "endTime", duration, "createdAt", "updatedAt")
SELECT 1, 'NORMAL', '+0', '08:00', '+0', '12:00', 4, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "ShiftSegment"
  WHERE "shiftId" = 1 AND type = 'NORMAL' AND "startTime" = '08:00'
);

INSERT INTO "ShiftSegment" ("shiftId", type, "startDate", "startTime", "endDate", "endTime", duration, "createdAt", "updatedAt")
SELECT 1, 'REST', '+0', '12:00', '+0', '13:30', 1.5, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "ShiftSegment"
  WHERE "shiftId" = 1 AND type = 'REST' AND "startTime" = '12:00'
);

INSERT INTO "ShiftSegment" ("shiftId", type, "startDate", "startTime", "endDate", "endTime", duration, "createdAt", "updatedAt")
SELECT 1, 'NORMAL', '+0', '13:30', '+0', '17:30', 4, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "ShiftSegment"
  WHERE "shiftId" = 1 AND type = 'NORMAL' AND "startTime" = '13:30'
);


-- =============================================
-- 7. 打卡设备
-- =============================================

-- 前台考勤机
INSERT INTO "PunchDevice" (id, code, name, type, "groupId", status, "createdAt", "updatedAt")
VALUES
(1, 'DEV001', '前台考勤机', 'FACE', NULL, 'NORMAL', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  status = EXCLUDED.status,
  "updatedAt" = NOW();


-- =============================================
-- 8. 示例员工
-- =============================================

-- 员工1：张三
INSERT INTO "Employee" (id, "employeeNo", name, gender, "idCard", phone, email, "orgId", "entryDate", status, "customFields", "createdAt", "updatedAt")
VALUES
(1, 'EMP001', '张三', 'MALE', '310101199001011234', '13800138001', 'zhangsan@example.com', 2, '2023-01-01', 'ACTIVE', '{}', NOW(), NOW())
ON CONFLICT ("employeeNo") DO UPDATE SET
  name = EXCLUDED.name,
  gender = EXCLUDED.gender,
  "idCard" = EXCLUDED."idCard",
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "orgId" = EXCLUDED."orgId",
  "entryDate" = EXCLUDED."entryDate",
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 员工2：李四
INSERT INTO "Employee" (id, "employeeNo", name, gender, "idCard", phone, email, "orgId", "entryDate", status, "customFields", "createdAt", "updatedAt")
VALUES
(2, 'EMP002', '李四', 'FEMALE', '310101199002022345', '13800138002', 'lisi@example.com', 2, '2023-03-01', 'ACTIVE', '{}', NOW(), NOW())
ON CONFLICT ("employeeNo") DO UPDATE SET
  name = EXCLUDED.name,
  gender = EXCLUDED.gender,
  "idCard" = EXCLUDED."idCard",
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  "orgId" = EXCLUDED."orgId",
  "entryDate" = EXCLUDED."entryDate",
  status = EXCLUDED.status,
  "updatedAt" = NOW();


COMMIT;

-- =============================================
-- 数据导入完成
-- =============================================
-- 请执行以下查询验证数据：
--
-- 数据源数量：SELECT COUNT(*) FROM "DataSource";
-- 页签数量：SELECT COUNT(*) FROM "EmployeeInfoTab";
-- 用户数量：SELECT COUNT(*) FROM "User";
-- 角色数量：SELECT COUNT(*) FROM "Role";
-- 组织数量：SELECT COUNT(*) FROM "Organization";
-- 班次数量：SELECT COUNT(*) FROM "Shift";
-- 设备数量：SELECT COUNT(*) FROM "PunchDevice";
-- 员工数量：SELECT COUNT(*) FROM "Employee";
-- =============================================
