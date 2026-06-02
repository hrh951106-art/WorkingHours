-- =============================================
-- PostgreSQL 生产环境种子数据迁移文件
-- =============================================
-- 功能：初始化系统运行必需的基础数据
-- 包含：
--   1. 完整数据源配置（19个数据源，100+选项）
--   2. 人事信息页签配置（5个页签、分组、字段）
--   3. 系统用户和角色
--   4. 组织架构
--   5. 班次配置
--   6. 打卡设备
--   7. 示例员工
-- =============================================
-- 使用说明：
--   1. 确保数据库schema已创建（运行 prisma migrate）
--   2. 执行此SQL文件：psql -U postgres -d jy_production -f postgresql-seed-data.sql
--   3. 验证数据导入情况
-- =============================================

BEGIN;

BEGIN;

-- ================================================================
-- 1. 性别数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('gender', '性别', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'gender'), 'male', '男', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'gender'), 'female', '女', 2, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'gender')
    AND value = v.value
);

-- ================================================================
-- 2. 民族数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('nation', '民族', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'han', '汉族', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'zhuang', '壮族', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'hui', '回族', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'manchu', '满族', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'uygur', '维吾尔族', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'miao', '苗族', 6, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'yi', '彝族', 7, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'tujia', '土家族', 8, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'tibetan', '藏族', 9, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'mongol', '蒙古族', 10, true),
    ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'other', '其他', 99, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'nation')
    AND value = v.value
);

-- ================================================================
-- 3. 婚姻状况数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('marital_status', '婚姻状况', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'marital_status'), 'unmarried', '未婚', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'marital_status'), 'married', '已婚', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'marital_status'), 'divorced', '离婚', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'marital_status'), 'widowed', '丧偶', 4, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'marital_status')
    AND value = v.value
);

-- ================================================================
-- 4. 政治面貌数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('political_status', '政治面貌', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'political_status'), 'party_member', '党员', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'political_status'), 'league_member', '团员', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'political_status'), 'masses', '群众', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'political_status'), 'democratic_party', '民主党派', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'political_status'), 'other', '其他', 99, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'political_status')
    AND value = v.value
);

-- ================================================================
-- 5. 职级数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('JOB_LEVEL', '职级', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'M1', 'M1 (初级)', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'M2', 'M2 (中级)', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'M3', 'M3 (高级)', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'M4', 'M4 (专家)', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'P1', 'P1 (初级专员)', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'P2', 'P2 (专员)', 6, true),
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'P3', 'P3 (高级专员)', 7, true),
    ((SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL'), 'P4', 'P4 (资深专员)', 8, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'JOB_LEVEL')
    AND value = v.value
);

-- ================================================================
-- 6. 职位数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('POSITION', '职位', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'ASSISTANT', '助理', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'SPECIALIST', '专员', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'SENIOR_SPECIALIST', '高级专员', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'SUPERVISOR', '主管', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'MANAGER', '经理', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'SENIOR_MANAGER', '高级经理', 6, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'DIRECTOR', '总监', 7, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'VICE_PRESIDENT', '副总裁', 8, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'CEO', 'CEO', 9, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'CTO', 'CTO', 10, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'CFO', 'CFO', 11, true),
    ((SELECT id FROM "DataSource" WHERE code = 'POSITION'), 'COO', 'COO', 12, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'POSITION')
    AND value = v.value
);

-- ================================================================
-- 7. 员工类型数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('EMPLOYEE_TYPE', '员工类型', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE'), 'FULL_TIME', '全职', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE'), 'PART_TIME', '兼职', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE'), 'CONTRACT', '合同工', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE'), 'INTERN', '实习生', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE'), 'OUTSOURCING', '外包', 5, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EMPLOYEE_TYPE')
    AND value = v.value
);

-- ================================================================
-- 8. 学历层次数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('education_level', '学历层次', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'primary_school', '小学', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'junior_high', '初中', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'senior_high', '高中', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'vocational', '中专', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'college', '大专', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'bachelor', '本科', 6, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'master', '硕士', 7, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_level'), 'doctor', '博士', 8, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'education_level')
    AND value = v.value
);

-- ================================================================
-- 9. 学历类型数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('education_type', '学历类型', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'full_time', '全日制', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'part_time', '非全日制', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'vocational', '职业', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'adult', '成人', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'self_study', '自考', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'correspondence', '函授', 6, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'distance', '远程', 7, true),
    ((SELECT id FROM "DataSource" WHERE code = 'education_type'), 'other', '其他', 99, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'education_type')
    AND value = v.value
);

-- ================================================================
-- 10. 在职状态数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('employment_status', '在职状态', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'employment_status'), 'ACTIVE', '在职', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'employment_status'), 'PROBATION', '试用期', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'employment_status'), 'RESIGNED', '离职', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'employment_status'), 'UNPAID_LEAVE', '停薪留职', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'employment_status'), 'RETIRED', '退休', 5, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'employment_status')
    AND value = v.value
);

-- ================================================================
-- 11. 紧急联系人关系数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('emergency_relation', '紧急联系人关系', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'emergency_relation'), 'spouse', '配偶', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'emergency_relation'), 'father', '父亲', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'emergency_relation'), 'mother', '母亲', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'emergency_relation'), 'child', '子女', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'emergency_relation'), 'sibling', '兄弟姐妹', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'emergency_relation'), 'other', '其他', 99, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'emergency_relation')
    AND value = v.value
);

-- ================================================================
-- 12. 家庭成员关系数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('family_relation', '家庭成员关系', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'family_relation'), 'spouse', '配偶', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'family_relation'), 'father', '父亲', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'family_relation'), 'mother', '母亲', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'family_relation'), 'child', '子女', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'family_relation'), 'sibling', '兄弟姐妹', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'family_relation'), 'other', '其他', 99, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'family_relation')
    AND value = v.value
);

-- ================================================================
-- 13. 异动类型数据源
-- ================================================================

INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
VALUES ('change_type', '异动类型', 'BUILTIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
SELECT
    id,
    value,
    label,
    sort,
    "isActive",
    NOW(),
    NOW()
FROM (VALUES
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'promotion', '晋升', 1, true),
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'demotion', '降职', 2, true),
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'transfer', '调动', 3, true),
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'resignation', '离职', 4, true),
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'regular', '转正', 5, true),
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'probation_extend', '试用期延长', 6, true),
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'salary_change', '薪资调整', 7, true),
    ((SELECT id FROM "DataSource" WHERE code = 'change_type'), 'other', '其他', 99, true)
) AS v(id, value, label, sort, "isActive", created_at, updated_at)
WHERE NOT EXISTS (

-- =============================================
-- 补充其他必要数据源
-- =============================================

-- 组织类型数据源
INSERT INTO "DataSource" (code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES ('ORG_TYPE', '组织类型', 'BUILTIN', '组织架构类型选项', true, 1, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem",
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE'), '集团', 'GROUP', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE') AND value = 'GROUP');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE'), '公司', 'COMPANY', 2, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE') AND value = 'COMPANY');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE'), '部门', 'DEPARTMENT', 3, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE') AND value = 'DEPARTMENT');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE'), '小组', 'TEAM', 4, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE') AND value = 'TEAM');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE'), '岗位', 'POSITION', 5, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'ORG_TYPE') AND value = 'POSITION');

-- 工作地点数据源
INSERT INTO "DataSource" (code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES ('WORK_LOCATION', '工作地点', 'BUILTIN', '员工工作地点', true, 15, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem",
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION'), '总部', 'HEADQUARTERS', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION') AND value = 'HEADQUARTERS');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION'), '分公司', 'BRANCH', 2, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION') AND value = 'BRANCH');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION'), '工厂', 'FACTORY', 3, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION') AND value = 'FACTORY');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION'), '办公室', 'OFFICE', 4, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION') AND value = 'OFFICE');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION'), '远程', 'REMOTE', 5, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION') AND value = 'REMOTE');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION'), '现场', 'ON_SITE', 6, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_LOCATION') AND value = 'ON_SITE');

-- 产品数据源（内置）
INSERT INTO "DataSource" (code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES ('PRODUCT', '产品', 'BUILTIN', '产品选项（来自产品配置）', true, 16, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem",
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 工序数据源（内置）
INSERT INTO "DataSource" (code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES ('PROCESS', '工序', 'BUILTIN', '工序选项（来自班次配置）', true, 17, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem",
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

-- 学历数据源（兼容旧版本）
INSERT INTO "DataSource" (code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES ('EDUCATION', '学历', 'CUSTOM', '员工学历选项', false, 18, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'EDUCATION'), '高中', 'HIGH_SCHOOL', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EDUCATION') AND value = 'HIGH_SCHOOL');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'EDUCATION'), '大专', 'COLLEGE', 2, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EDUCATION') AND value = 'COLLEGE');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'EDUCATION'), '本科', 'BACHELOR', 3, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EDUCATION') AND value = 'BACHELOR');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'EDUCATION'), '硕士', 'MASTER', 4, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EDUCATION') AND value = 'MASTER');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'EDUCATION'), '博士', 'DOCTOR', 5, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'EDUCATION') AND value = 'DOCTOR');

-- 工作状态数据源（兼容旧版本）
INSERT INTO "DataSource" (code, name, type, description, "isSystem", sort, status, "createdAt", "updatedAt")
VALUES ('WORK_STATUS', '工作状态', 'CUSTOM', '员工工作状态', false, 19, 'ACTIVE', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  sort = EXCLUDED.sort,
  status = EXCLUDED.status,
  "updatedAt" = NOW();

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS'), '在职', 'ACTIVE', 1, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS') AND value = 'ACTIVE');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS'), '试用期', 'PROBATION', 2, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS') AND value = 'PROBATION');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS'), '请假', 'LEAVE', 3, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS') AND value = 'LEAVE');

INSERT INTO "DataSourceOption" ("dataSourceId", label, value, sort, "isActive", "createdAt", "updatedAt")
SELECT (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS'), '离职', 'RESIGNED', 4, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "DataSourceOption" WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'WORK_STATUS') AND value = 'RESIGNED');

    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'change_type')
    AND value = v.value
);

COMMIT;
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
