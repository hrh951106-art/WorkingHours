-- =====================================================
-- 人事模块基础数据初始化脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 初始化人事模块相关的基础数据，包括数据源、字段配置等
-- =====================================================

\echo '========================================'
\echo '人事模块基础数据初始化'
\echo '========================================'

-- =====================================================
-- 1. 异动类型（changeType）数据源
-- =====================================================
\echo '1. 创建异动类型数据源...'

INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'CHANGE_TYPE',
  '异动类型',
  'CUSTOM',
  '员工工作信息异动类型选项',
  true,
  10,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

-- 获取数据源ID
DO $$
DECLARE
  v_change_type_ds_id INTEGER;
BEGIN
  SELECT "id" INTO v_change_type_ds_id FROM "DataSource" WHERE "code" = 'CHANGE_TYPE';

  IF v_change_type_ds_id IS NOT NULL THEN
    -- 插入异动类型选项
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_change_type_ds_id, '入职', 'ENTRY', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '转正', 'REGULAR', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '晋升', 'PROMOTION', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '降职', 'DEMOTION', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '调岗', 'TRANSFER', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '离职', 'RESIGNATION', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '合同续签', 'CONTRACT_RENEWAL', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '工资调整', 'SALARY_ADJUSTMENT', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '职位调整', 'POSITION_CHANGE', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_change_type_ds_id, '其他', 'OTHER', 99, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;

    RAISE NOTICE '✓ 异动类型数据源创建成功，添加了 10 个选项';
  END IF;
END $$;

-- =====================================================
-- 2. 确保工作信息页签存在
-- =====================================================
\echo '2. 确保工作信息页签存在...'

INSERT INTO "EmployeeInfoTab" ("code", "name", "description", "icon", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'work_info',
  '工作信息',
  '员工工作信息管理，支持版本控制',
  'BankOutlined',
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

-- =====================================================
-- 3. 工作信息页签字段组配置
-- =====================================================
\echo '3. 配置工作信息字段组...'

DO $$
DECLARE
  v_work_info_tab_id INTEGER;
BEGIN
  SELECT "id" INTO v_work_info_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'work_info';

  IF v_work_info_tab_id IS NOT NULL THEN
    -- 职位信息组
    INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt")
    VALUES (
      v_work_info_tab_id,
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

    -- 入职信息组
    INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt")
    VALUES (
      v_work_info_tab_id,
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

    RAISE NOTICE '✓ 工作信息字段组配置成功';
  END IF;
END $$;

-- =====================================================
-- 4. 工作信息页签字段配置
-- =====================================================
\echo '4. 配置工作信息字段...'

DO $$
DECLARE
  v_work_info_tab_id INTEGER;
  v_position_group_id INTEGER;
  v_entry_group_id INTEGER;
  v_change_type_ds_id INTEGER;
BEGIN
  -- 获取ID
  SELECT "id" INTO v_work_info_tab_id FROM "EmployeeInfoTab" WHERE "code" = 'work_info';
  SELECT "id" INTO v_position_group_id FROM "EmployeeInfoTabGroup" WHERE "tabId" = v_work_info_tab_id AND "code" = 'position_info';
  SELECT "id" INTO v_entry_group_id FROM "EmployeeInfoTabGroup" WHERE "tabId" = v_work_info_tab_id AND "code" = 'entry_info';
  SELECT "id" INTO v_change_type_ds_id FROM "DataSource" WHERE "code" = 'CHANGE_TYPE';

  IF v_work_info_tab_id IS NOT NULL THEN
    -- 职位信息字段
    IF v_position_group_id IS NOT NULL THEN
      -- 职位
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_position_group_id, 'position', '职位', 'TEXT', false, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 职级
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_position_group_id, 'jobLevel', '职级', 'TEXT', false, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 员工类型
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_position_group_id, 'employeeType', '员工类型', 'TEXT', false, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 工作地点
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_position_group_id, 'workLocation', '工作地点', 'TEXT', false, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 工作地址
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_position_group_id, 'workAddress', '工作地址', 'TEXT', false, false, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 组织ID（隐藏字段）
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_position_group_id, 'orgId', '所属组织', 'NUMBER', true, false, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "isRequired" = EXCLUDED."isRequired",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 异动类型（重要：新增字段）
      IF v_change_type_ds_id IS NOT NULL THEN
        INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
        VALUES (v_work_info_tab_id, v_position_group_id, 'changeType', '异动类型', 'SELECT', true, false, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
          "fieldName" = EXCLUDED."fieldName",
          "groupId" = EXCLUDED."groupId",
          "isRequired" = EXCLUDED."isRequired",
          "fieldType" = EXCLUDED."fieldType",
          "sort" = EXCLUDED."sort",
          "updatedAt" = CURRENT_TIMESTAMP;
      END IF;
    END IF;

    -- 入职信息字段
    IF v_entry_group_id IS NOT NULL THEN
      -- 入职日期
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_entry_group_id, 'entryDate', '入职日期', 'DATE', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "isRequired" = EXCLUDED."isRequired",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 试用期满日期
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_entry_group_id, 'hireDate', '试用期满日期', 'DATE', false, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;

      -- 生效日期（用于版本管理）
      INSERT INTO "EmployeeInfoTabField" ("tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "sort", "createdAt", "updatedAt")
      VALUES (v_work_info_tab_id, v_entry_group_id, 'effectiveDate', '生效日期', 'DATE', true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("tabId", "fieldCode") DO UPDATE SET
        "fieldName" = EXCLUDED."fieldName",
        "groupId" = EXCLUDED."groupId",
        "isRequired" = EXCLUDED."isRequired",
        "sort" = EXCLUDED."sort",
        "updatedAt" = CURRENT_TIMESTAMP;
    END IF;

    RAISE NOTICE '✓ 工作信息字段配置成功';
  END IF;
END $$;

-- =====================================================
-- 5. 常用员工类型数据源（可选）
-- =====================================================
\echo '5. 创建员工类型数据源（可选）...'

INSERT INTO "DataSource" ("code", "name", "type", "description", "isSystem", "sort", "status", "createdAt", "updatedAt")
VALUES (
  'EMPLOYEE_TYPE',
  '员工类型',
  'CUSTOM',
  '员工类型分类选项',
  true,
  11,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort" = EXCLUDED."sort",
  "updatedAt" = CURRENT_TIMESTAMP;

DO $$
DECLARE
  v_employee_type_ds_id INTEGER;
BEGIN
  SELECT "id" INTO v_employee_type_ds_id FROM "DataSource" WHERE "code" = 'EMPLOYEE_TYPE';

  IF v_employee_type_ds_id IS NOT NULL THEN
    INSERT INTO "DataSourceOption" ("dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt")
    VALUES
      (v_employee_type_ds_id, '正式员工', 'FULL_TIME', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_employee_type_ds_id, '试用期员工', 'PROBATION', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_employee_type_ds_id, '实习生', 'INTERN', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_employee_type_ds_id, '临时工', 'TEMPORARY', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (v_employee_type_ds_id, '外包员工', 'CONTRACTOR', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("dataSourceId", "value") DO UPDATE SET
      "label" = EXCLUDED."label",
      "sort" = EXCLUDED."sort",
      "isActive" = EXCLUDED."isActive",
      "updatedAt" = CURRENT_TIMESTAMP;

    RAISE NOTICE '✓ 员工类型数据源创建成功，添加了 5 个选项';
  END IF;
END $$;

-- =====================================================
-- 6. 工时基础配置系统配置（已存在于04脚本，这里做验证）
-- =====================================================
\echo '6. 验证工时基础配置...'

INSERT INTO "SystemConfig" ("configKey", "configValue", "category", "description", "createdAt", "updatedAt")
VALUES
  ('workInfoVersionEnabled', 'true', 'HR', '是否启用工作信息版本管理', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workInfoChangeTypeRequired', 'true', 'HR', '工作信息异动类型是否必填', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("configKey") DO UPDATE SET
  "configValue" = EXCLUDED."configValue",
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;

\echo '========================================'
\echo '人事模块基础数据初始化完成！'
\echo '========================================'
\echo ''
\echo '已初始化内容：'
\echo '1. ✓ 异动类型数据源（10个选项）'
\echo '2. ✓ 工作信息页签'
\echo '3. ✓ 职位信息字段组'
\echo '4. ✓ 入职信息字段组'
\echo '5. ✓ 工作信息字段（包括异动类型）'
\echo '6. ✓ 员工类型数据源（5个选项）'
\echo '7. ✓ 工作信息版本管理配置'
\echo ''
