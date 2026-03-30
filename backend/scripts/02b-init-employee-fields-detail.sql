-- =====================================================
-- 员工信息字段详细初始化脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 初始化所有页签的内置字段配置
-- 依赖: 必须先执行 02-init-employee-tabs-and-fields.sql
-- =====================================================

\echo '========================================'
\echo '员工信息字段详细初始化'
\echo '========================================'

DO $$
DECLARE
  v_basic_tab_id INTEGER;
  v_work_tab_id INTEGER;
  v_education_tab_id INTEGER;
  v_experience_tab_id INTEGER;
  v_family_tab_id INTEGER;

  v_basic_personal_group_id INTEGER;
  v_basic_contact_group_id INTEGER;
  v_basic_emergency_group_id INTEGER;
  v_work_position_group_id INTEGER;
  v_work_entry_group_id INTEGER;

  v_gender_ds_id INTEGER;
  v_marital_ds_id INTEGER;
  v_political_ds_id INTEGER;
  v_education_level_ds_id INTEGER;
  v_degree_ds_id INTEGER;
  v_education_type_ds_id INTEGER;
  v_change_type_ds_id INTEGER;
  v_employee_type_ds_id INTEGER;
BEGIN
  -- 获取页签ID
  SELECT "id" INTO v_basic_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'basic_info';
  SELECT "id" INTO v_work_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'work_info';
  SELECT "id" INTO v_education_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'education_info';
  SELECT "id" INTO v_experience_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'work_experience';
  SELECT "id" INTO v_family_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'family_info';

  -- 获取分组ID
  SELECT "id" INTO v_basic_personal_group_id FROM "EmployeeInfoTabGroup" WHERE "tabId" = v_basic_tab_id AND "code" = 'personal_info';
  SELECT "id" INTO v_basic_contact_group_id FROM "EmployeeInfoTabGroup" WHERE "tabId" = v_basic_tab_id AND "code" = 'contact_info';
  SELECT "id" INTO v_basic_emergency_group_id FROM "EmployeeInfoTabGroup" WHERE "tabId" = v_basic_tab_id AND "code" = 'emergency_contact';
  SELECT "id" INTO v_work_position_group_id FROM "EmployeeInfoTabGroup" WHERE "tabId" = v_work_tab_id AND "code" = 'position_info';
  SELECT "id" INTO v_work_entry_group_id FROM "EmployeeInfoTabGroup" WHERE "tabId" = v_work_tab_id AND "code" = 'entry_info';

  -- 获取数据源ID
  SELECT "id" INTO v_gender_ds_id FROM "DataSource" WHERE "code" = 'GENDER';
  SELECT "id" INTO v_marital_ds_id FROM "DataSource" WHERE "code" = 'MARITAL_STATUS';
  SELECT "id" INTO v_political_ds_id FROM "DataSource" WHERE "code" = 'POLITICAL_STATUS';
  SELECT "id" INTO v_education_level_ds_id FROM "DataSource" WHERE "code" = 'EDUCATION_LEVEL';
  SELECT "id" INTO v_degree_ds_id FROM "DataSource" WHERE "code" = 'DEGREE';
  SELECT "id" INTO v_education_type_ds_id FROM "DataSource" WHERE "code" = 'EDUCATION_TYPE';
  SELECT "id" INTO v_change_type_ds_id FROM "DataSource" WHERE "code" = 'CHANGE_TYPE';
  SELECT "id" INTO v_employee_type_ds_id FROM "DataSource" WHERE "code" = 'EMPLOYEE_TYPE';

  RAISE NOTICE '开始插入基本信息页签字段...';

  -- =====================================================
  -- 1. 基本信息页签字段
  -- =====================================================

  -- 1.1 个人基本信息组字段
  IF v_basic_tab_id IS NOT NULL AND v_basic_personal_group_id IS NOT NULL THEN
    -- 性别
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'gender', '性别', 'SELECT', false, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "fieldType" = EXCLUDED."fieldType",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 出生日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'birthDate', '出生日期', 'DATE', false, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 年龄（隐藏字段，自动计算）
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'age', '年龄', 'NUMBER', false, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "isHidden" = EXCLUDED."isHidden",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 婚姻状况
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'maritalStatus', '婚姻状况', 'SELECT', false, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 政治面貌
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'politicalStatus', '政治面貌', 'SELECT', false, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 籍贯
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'nativePlace', '籍贯', 'TEXT', false, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 户口所在地
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'householdRegister', '户口所在地', 'TEXT', false, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 照片
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_personal_group_id, 'photo', '照片', 'IMAGE', false, false, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 1.2 联系信息组字段
  IF v_basic_tab_id IS NOT NULL AND v_basic_contact_group_id IS NOT NULL THEN
    -- 手机号
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_contact_group_id, 'phone', '手机号', 'TEXT', false, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 邮箱
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_contact_group_id, 'email', '邮箱', 'TEXT', false, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 现居住地址
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_contact_group_id, 'currentAddress', '现居住地址', 'TEXT', false, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 家庭住址
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_contact_group_id, 'homeAddress', '家庭住址', 'TEXT', false, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 家庭电话
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_contact_group_id, 'homePhone', '家庭电话', 'TEXT', false, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  -- 1.3 紧急联系人组字段
  IF v_basic_tab_id IS NOT NULL AND v_basic_emergency_group_id IS NOT NULL THEN
    -- 紧急联系人
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_emergency_group_id, 'emergencyContact', '紧急联系人', 'TEXT', false, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 紧急联系电话
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_emergency_group_id, 'emergencyPhone', '紧急联系电话', 'TEXT', false, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 紧急联系人关系
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_basic_tab_id, v_basic_emergency_group_id, 'emergencyRelation', '紧急联系人关系', 'TEXT', false, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE '✓ 基本信息页签字段插入完成';

  -- =====================================================
  -- 2. 工作信息页签字段（部分已在02脚本中创建，这里补充）
  -- =====================================================
  RAISE NOTICE '开始插入工作信息页签字段...';

  IF v_work_tab_id IS NOT NULL AND v_work_position_group_id IS NOT NULL THEN
    -- 职位
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_position_group_id, 'position', '职位', 'TEXT', false, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 职级
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_position_group_id, 'jobLevel', '职级', 'TEXT', false, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 员工类型
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_position_group_id, 'employeeType', '员工类型', 'SELECT', false, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 工作地点
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_position_group_id, 'workLocation', '工作地点', 'TEXT', false, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 工作地址
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_position_group_id, 'workAddress', '工作地址', 'TEXT', false, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 组织ID（隐藏字段）
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_position_group_id, 'orgId', '所属组织', 'NUMBER', true, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 异动类型（必填）
    IF v_change_type_ds_id IS NOT NULL THEN
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_tab_id, v_work_position_group_id, 'changeType', '异动类型', 'SELECT', true, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "isRequired" = EXCLUDED."isRequired",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;
    END IF;
  END IF;

  IF v_work_tab_id IS NOT NULL AND v_work_entry_group_id IS NOT NULL THEN
    -- 入职日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_entry_group_id, 'entryDate', '入职日期', 'DATE', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 试用期满日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_entry_group_id, 'hireDate', '试用期满日期', 'DATE', false, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 生效日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_work_tab_id, v_work_entry_group_id, 'effectiveDate', '生效日期', 'DATE', true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "groupId" = EXCLUDED."groupId",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE '✓ 工作信息页签字段插入完成';

  -- =====================================================
  -- 3. 教育信息页签字段
  -- =====================================================
  RAISE NOTICE '开始插入教育信息页签字段...';

  IF v_education_tab_id IS NOT NULL THEN
    -- 毕业院校
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'school', '毕业院校', 'TEXT', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 专业
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'major', '专业', 'TEXT', true, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 学历层次
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'educationLevel', '学历层次', 'SELECT', true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 学位
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'degree', '学位', 'SELECT', false, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 学历类型
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'educationType', '学历类型', 'SELECT', false, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 入学日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'startDate', '入学日期', 'DATE', true, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 毕业日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'endDate', '毕业日期', 'DATE', false, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 是否最高学历
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_education_tab_id, NULL, 'isHighest', '是否最高学历', 'BOOLEAN', false, false, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE '✓ 教育信息页签字段插入完成';

  -- =====================================================
  -- 4. 工作经历页签字段
  -- =====================================================
  RAISE NOTICE '开始插入工作经历页签字段...';

  IF v_experience_tab_id IS NOT NULL THEN
    -- 公司名称
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_experience_tab_id, NULL, 'company', '公司名称', 'TEXT', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 职位
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_experience_tab_id, NULL, 'position', '职位', 'TEXT', true, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 开始日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_experience_tab_id, NULL, 'startDate', '开始日期', 'DATE', true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 结束日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_experience_tab_id, NULL, 'endDate', '结束日期', 'DATE', false, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 薪资
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_experience_tab_id, NULL, 'salary', '薪资', 'TEXT', false, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 离职原因
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_experience_tab_id, NULL, 'reason', '离职原因', 'TEXT', false, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 工作描述
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_experience_tab_id, NULL, 'description', '工作描述', 'TEXTAREA', false, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE '✓ 工作经历页签字段插入完成';

  -- =====================================================
  -- 5. 家庭信息页签字段
  -- =====================================================
  RAISE NOTICE '开始插入家庭信息页签字段...';

  IF v_family_tab_id IS NOT NULL THEN
    -- 关系
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'relationship', '关系', 'TEXT', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 姓名
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'name', '姓名', 'TEXT', true, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "isRequired" = EXCLUDED."isRequired",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 性别
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'gender', '性别', 'SELECT', false, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 身份证号
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'idCard', '身份证号', 'TEXT', false, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 联系电话
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'phone', '联系电话', 'TEXT', false, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 工作单位
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'workUnit', '工作单位', 'TEXT', false, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 居住地址
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'address', '居住地址', 'TEXT', false, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 出生日期
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'dateOfBirth', '出生日期', 'DATE', false, false, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;

    -- 是否紧急联系人
    INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
    VALUES (v_family_tab_id, NULL, 'isEmergency', '是否紧急联系人', 'BOOLEAN', false, false, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
      "fieldName" = EXCLUDED."fieldName",
      "sort" = EXCLUDED."sort",
      "updatedAt" = CURRENT_TIMESTAMP;
  END IF;

  RAISE NOTICE '✓ 家庭信息页签字段插入完成';

  RAISE NOTICE '========================================';
  RAISE NOTICE '所有员工信息字段初始化完成！';
  RAISE NOTICE '========================================';

END $$;

\echo ''
\echo '初始化汇总：'
\echo '1. ✓ 基本信息页签 - 3个分组，16个字段'
\echo '2. ✓ 工作信息页签 - 2个分组，10个字段'
\echo '3. ✓ 教育信息页签 - 8个字段'
\echo '4. ✓ 工作经历页签 - 7个字段'
\echo '5. ✓ 家庭信息页签 - 9个字段'
\echo ''
\echo '总计：5个页签，5个分组，50个内置字段'
\echo ''
