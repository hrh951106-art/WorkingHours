-- ================================================================
-- 数据源初始化脚本 - PostgreSQL 生产环境
--
-- 功能说明：
-- 初始化人事模块所需的所有数据源及其选项
--
-- 执行方式：
-- psql -U username -d jy_production -f 003-init-datasources.sql
--
-- 注意事项：
-- 1. 此脚本只添加不存在的数据源和选项
-- 2. 重复执行是安全的（使用 INSERT ... ON CONFLICT DO NOTHING）
-- 3. 建议在应用启动前执行
-- ================================================================

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
    SELECT 1 FROM "DataSourceOption"
    WHERE "dataSourceId" = (SELECT id FROM "DataSource" WHERE code = 'change_type')
    AND value = v.value
);

COMMIT;

-- ================================================================
-- 执行结果验证
-- ================================================================

-- 查看已创建的数据源
SELECT
    ds.code AS "数据源代码",
    ds.name AS "数据源名称",
    COUNT(dso.id) AS "选项数量"
FROM "DataSource" ds
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id AND dso."isActive" = true
WHERE ds.code IN (
    'gender', 'nation', 'marital_status', 'political_status',
    'JOB_LEVEL', 'POSITION', 'EMPLOYEE_TYPE',
    'education_level', 'education_type',
    'employment_status', 'emergency_relation', 'family_relation', 'change_type'
)
GROUP BY ds.code, ds.name
ORDER BY ds.code;

-- ================================================================
-- 注意事项
-- ================================================================
--
-- 1. 本脚本创建的数据源都是 BUILTIN 类型，系统内置数据源
-- 2. 所有数据源的选项都是不可删除的（通过管理界面控制）
-- 3. 如需修改选项，请通过管理界面进行
-- 4. 脚本可以重复执行，不会重复插入已存在的数据
--
-- ================================================================
