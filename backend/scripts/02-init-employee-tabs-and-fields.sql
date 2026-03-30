-- =====================================================
-- 员工信息页签、字段分组及字段初始化脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 初始化所有员工信息页签、字段分组和内置字段配置
-- =====================================================

\echo '========================================'
\echo '员工信息页签和字段初始化'
\echo '========================================'

-- =====================================================
-- 1. 创建数据源
-- =====================================================
\echo '1. 创建相关数据源...'

-- 1.1 性别数据源（内置）
INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'GENDER',
  '性别',
  'BUILTIN',
  '员工性别选项',
  true,
  1,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.2 婚姻状况数据源
INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'MARITAL_STATUS',
  '婚姻状况',
  'CUSTOM',
  '员工婚姻状况选项',
  true,
  2,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.3 政治面貌数据源
INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'POLITICAL_STATUS',
  '政治面貌',
  'CUSTOM',
  '员工政治面貌选项',
  true,
  3,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.4 学历层次数据源
INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'EDUCATION_LEVEL',
  '学历层次',
  'CUSTOM',
  '员工学历层次选项',
  true,
  4,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.5 学位数据源
INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'DEGREE',
  '学位',
  'CUSTOM',
  '员工学位选项',
  true,
  5,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 1.6 学历类型数据源
INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'EDUCATION_TYPE',
  '学历类型',
  'CUSTOM',
  '员工学历类型选项（全日制、非全日制等）',
  true,
  6,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- =====================================================
-- 2. 初始化数据源选项
-- =====================================================
\echo '2. 初始化数据源选项...'

DO $$
DECLARE
  v_gender_ds_id INTEGER;
  v_marital_ds_id INTEGER;
  v_political_ds_id INTEGER;
  v_education_level_ds_id INTEGER;
  v_degree_ds_id INTEGER;
  v_education_type_ds_id INTEGER;
  v_employee_type_ds_id INTEGER;
BEGIN
  -- 获取数据源ID
  SELECT "id" INTO v_gender_ds_id FROM "DataSource" WHERE "code" = 'GENDER';
  SELECT "id" INTO v_marital_ds_id FROM "DataSource" WHERE "code" = 'MARITAL_STATUS';
  SELECT "id" INTO v_political_ds_id FROM "DataSource" WHERE "code" = 'POLITICAL_STATUS';
  SELECT "id" INTO v_education_level_ds_id FROM "DataSource" WHERE "code" = 'EDUCATION_LEVEL';
  SELECT "id" INTO v_degree_ds_id FROM "DataSource" WHERE "code" = 'DEGREE';
  SELECT "id" INTO v_education_type_ds_id FROM "DataSource" WHERE "code" = 'EDUCATION_TYPE';

  -- 2.1 性别选项
  IF v_gender_ds_id IS NOT NULL THEN
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_gender_ds_id, '男', 'MALE', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_gender_ds_id, '女', 'FEMALE', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 2.2 婚姻状况选项
  IF v_marital_ds_id IS NOT NULL THEN
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_marital_ds_id, '未婚', 'SINGLE', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_marital_ds_id, '已婚', 'MARRIED', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_marital_ds_id, '离异', 'DIVORCED', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_marital_ds_id, '丧偶', 'WIDOWED', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 2.3 政治面貌选项
  IF v_political_ds_id IS NOT NULL THEN
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_political_ds_id, '群众', 'MASS', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_political_ds_id, '团员', 'LEAGUE_MEMBER', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_political_ds_id, '党员', 'PARTY_MEMBER', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_political_ds_id, '民主党派', 'DEMOCRATIC_PARTY', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_political_ds_id, '无党派人士', 'NON_PARTISAN', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 2.4 学历层次选项
  IF v_education_level_ds_id IS NOT NULL THEN
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_education_level_ds_id, '初中', 'JUNIOR_HIGH', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_level_ds_id, '高中', 'HIGH_SCHOOL', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_level_ds_id, '中专', 'SECONDARY', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_level_ds_id, '大专', 'COLLEGE', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_level_ds_id, '本科', 'BACHELOR', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_level_ds_id, '硕士', 'MASTER', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_level_ds_id, '博士', 'DOCTOR', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 2.5 学位选项
  IF v_degree_ds_id IS NOT NULL THEN
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_degree_ds_id, '学士', 'BACHELOR', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_degree_ds_id, '硕士', 'MASTER', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_degree_ds_id, '博士', 'DOCTOR', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 2.6 学历类型选项
  IF v_education_type_ds_id IS NOT NULL THEN
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_education_type_ds_id, '全日制', 'FULL_TIME', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_type_ds_id, '非全日制', 'PART_TIME', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_education_type_ds_id, '在职', 'ON_JOB', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE '✓ 数据源选项初始化完成';
END $$;

-- =====================================================
-- 3. 创建员工信息页签
-- =====================================================
\echo '3. 创建员工信息页签...'

-- 3.1 基本信息页签
INSERT INTO "EmployeeInfoTab" ("code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'basic_info',
  '基本信息',
  '员工的基本个人信息',
  true,
  1,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 3.2 工作信息页签（已在02脚本中创建，这里确保存在）
INSERT INTO "EmployeeInfoTab" ("code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'work_info',
  '工作信息',
  '员工工作信息管理，支持版本控制',
  true,
  2,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 3.3 教育信息页签
INSERT INTO "EmployeeInfoTab" ("code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'education_info',
  '教育信息',
  '员工的学历和教育背景信息',
  true,
  3,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 3.4 工作经历页签
INSERT INTO "EmployeeInfoTab" ("code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'work_experience',
  '工作经历',
  '员工的工作经历和职业发展历史',
  true,
  4,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 3.5 家庭信息页签
INSERT INTO "EmployeeInfoTab" ("code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'family_info',
  '家庭信息',
  '员工的家庭成员和紧急联系人信息',
  true,
  5,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- =====================================================
-- 4. 创建字段分组
-- =====================================================
\echo '4. 创建字段分组...'

DO $$
DECLARE
  v_basic_tab_id INTEGER;
  v_work_tab_id INTEGER;
  v_education_tab_id INTEGER;
  v_experience_tab_id INTEGER;
  v_family_tab_id INTEGER;
BEGIN
  -- 获取页签ID
  SELECT "id" INTO v_basic_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'basic_info';
  SELECT "id" INTO v_work_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'work_info';
  SELECT "id" INTO v_education_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'education_info';
  SELECT "id" INTO v_experience_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'work_experience';
  SELECT "id" INTO v_family_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'family_info';

  -- 4.1 基本信息页签分组
  IF v_basic_tab_id IS NOT NULL THEN
    -- 个人基本信息组
    INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt")
    VALUES (
      v_basic_tab_id,
      'personal_info',
      '个人基本信息',
      '员工的基本个人信息',
      1,
      'ACTIVE',
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("tabId", "code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 联系信息组
    INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt")
    VALUES (
      v_basic_tab_id,
      'contact_info',
      '联系信息',
      '员工的联系方式和地址信息',
      2,
      'ACTIVE',
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("tabId", "code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 紧急联系人组
    INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt")
    VALUES (
      v_basic_tab_id,
      'emergency_contact',
      '紧急联系人',
      '紧急联系人信息',
      3,
      'ACTIVE',
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("tabId", "code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 4.2 工作信息页签分组（已在02脚本中创建，这里确保）
  IF v_work_tab_id IS NOT NULL THEN
    INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt")
    VALUES (
      v_work_tab_id,
      'position_info',
      '职位信息',
      '员工的职位、职级、类型等信息',
      1,
      'ACTIVE',
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("tabId", "code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt")
    VALUES (
      v_work_tab_id,
      'entry_info',
      '入职信息',
      '员工的入职相关日期信息',
      2,
      'ACTIVE',
      false,
      true,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("tabId", "code") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE '✓ 字段分组创建完成';
END $$;

\echo '========================================'
\echo '员工信息页签和字段初始化完成！'
\echo '========================================'
