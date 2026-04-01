-- ========================================
-- 人员信息和工时管理系统字段查询SQL
-- ========================================
-- 用途: 查询人员信息表、工作信息表字段及下拉数据源映射关系
-- 问题排查: 生产环境下拉字段有数据源但无法选择值
-- ========================================

\echo ''
\echo '========================================'
\echo '人员信息和工时管理系统字段查询'
\echo '========================================'
\echo ''

-- ========================================
-- 第一部分：Employee表字段结构
-- ========================================

\echo '【第一部分】Employee表字段结构'
\echo '========================================'
\echo ''

SELECT
    column_name AS "字段名",
    data_type AS "数据类型",
    is_nullable AS "可空",
    column_default AS "默认值",
    CASE
        WHEN column_name IN ('id', 'employeeNo', 'name', 'gender', 'orgId', 'entryDate', 'status')
        THEN '★ 必填'
        ELSE '  可选'
    END AS "重要性"
FROM information_schema.columns
WHERE table_name = 'Employee'
  AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''

-- ========================================
-- 第二部分：WorkInfoHistory表字段结构
-- ========================================

\echo '【第二部分】WorkInfoHistory表字段结构'
\echo '========================================'
\echo ''

SELECT
    column_name AS "字段名",
    data_type AS "数据类型",
    is_nullable AS "可空",
    column_default AS "默认值"
FROM information_schema.columns
WHERE table_name = 'WorkInfoHistory'
  AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''

-- ========================================
-- 第三部分：数据源及选项查询
-- ========================================

\echo '【第三部分】所有数据源及选项详情'
\echo '========================================'
\echo ''

\echo '3.1 系统内置数据源列表:'
\echo '----------------------------------------'

SELECT
    d.id AS "数据源ID",
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    d.type AS "类型",
    d."isSystem" AS "系统内置",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) = 0 THEN '⚠️ 无选项'
        ELSE '✓ 正常'
    END AS "状态"
FROM "DataSource" d
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = true
WHERE d."isSystem" = true
GROUP BY d.id, d.code, d.name, d.type, d."isSystem"
ORDER BY d.sort;

\echo ''

\echo '3.2 自定义数据源列表:'
\echo '----------------------------------------'

SELECT
    d.id AS "数据源ID",
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    d.type AS "类型",
    COUNT(o.id) AS "选项数量"
FROM "DataSource" d
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = true
WHERE d."isSystem" = false
GROUP BY d.id, d.code, d.name, d.type
ORDER BY d.code;

\echo ''

\echo '3.3 数据源选项详情（关键字段）:'
\echo '----------------------------------------'

SELECT
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    o.label AS "选项名称",
    o.value AS "选项值",
    o."isActive" AS "激活状态",
    o.sort AS "排序"
FROM "DataSource" d
INNER JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE d.code IN (
    'gender',          -- 性别
    'marital_status',  -- 婚姻状况
    'political_status',-- 政治面貌
    'education_level', -- 学历层次
    'employee_type',   -- 员工类型
    'job_level',       -- 职级
    'POSITION',        -- 职位
    'JOB_LEVEL',       -- 职级
    'EMPLOYEE_TYPE'    -- 员工类型
)
ORDER BY d.code, o.sort;

\echo ''

-- ========================================
-- 第四部分：CustomField（自定义字段）配置
-- ========================================

\echo '【第四部分】CustomField（自定义字段）配置'
\echo '========================================'
\echo ''

\echo '4.1 所有CustomField字段:'
\echo '----------------------------------------'

SELECT
    cf.id AS "ID",
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    cf.type AS "字段类型",
    cf."dataSourceId" AS "数据源ID",
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    cf."isRequired" AS "必填",
    cf."isSystem" AS "系统内置",
    cf.status AS "状态"
FROM "CustomField" cf
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
ORDER BY cf.sort;

\echo ''

\echo '4.2 CustomField数据源关联验证:'
\echo '----------------------------------------'

SELECT
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    cf.type AS "字段类型",
    CASE
        WHEN cf."dataSourceId" IS NULL THEN '✗ 未关联'
        WHEN d.id IS NULL THEN '✗ 数据源不存在'
        ELSE '✓ 已关联'
    END AS "关联状态",
    COALESCE(d.code, 'N/A') AS "数据源代码",
    COALESCE(d.name, 'N/A') AS "数据源名称",
    COUNT(o.id) AS "选项数量"
FROM "CustomField" cf
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = true
WHERE cf.type IN ('SELECT', 'SELECT_SINGLE', 'RADIO', 'CHECKBOX')
GROUP BY cf.id, cf.code, cf.name, cf.type, cf."dataSourceId", d.id, d.code, d.name
ORDER BY cf.code;

\echo ''

-- ========================================
-- 第五部分：EmployeeInfoTab（员工信息页签）配置
-- ========================================

\echo '【第五部分】EmployeeInfoTab（员工信息页签）配置'
\echo '========================================'
\echo ''

\echo '5.1 所有页签:'
\echo '----------------------------------------'

SELECT
    id AS "页签ID",
    code AS "页签代码",
    name AS "页签名称",
    description AS "描述",
    "isSystem" AS "系统内置",
    sort AS "排序",
    status AS "状态"
FROM "EmployeeInfoTab"
ORDER BY sort;

\echo ''

\echo '5.2 页签分组:'
\echo '----------------------------------------'

SELECT
    t.code AS "页签代码",
    t.name AS "页签名称",
    g.code AS "分组代码",
    g.name AS "分组名称",
    g.description AS "分组描述",
    g.sort AS "排序",
    g.status AS "状态"
FROM "EmployeeInfoTab" t
INNER JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
ORDER BY t.sort, g.sort;

\echo ''

\echo '5.3 页签字段完整列表:'
\echo '----------------------------------------'

SELECT
    t.code AS "页签代码",
    t.name AS "页签名称",
    g.code AS "分组代码",
    g.name AS "分组名称",
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "字段类型",
    f."isRequired" AS "必填",
    f."isHidden" AS "隐藏",
    f.sort AS "排序"
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."tabId" = t.id AND (f."groupId" IS NULL OR f."groupId" = g.id)
ORDER BY t.sort, g.sort, f.sort;

\echo ''

-- ========================================
-- 第六部分：字段映射关系（Employee <-> EmployeeInfoTabField）
-- ========================================

\echo '【第六部分】Employee字段与页签字段映射关系'
\echo '========================================'
\echo ''

\echo '6.1 基本信息页签字段映射:'
\echo '----------------------------------------'

SELECT
    f.fieldCode AS "页签字段代码",
    f.fieldName AS "页签字段名称",
    f.fieldType AS "字段类型",
    CASE
        WHEN e.column_name IS NOT NULL THEN '✓ 在Employee表'
        ELSE '  不在Employee表'
    END AS "Employee表字段",
    e.data_type AS "数据类型",
    CASE
        WHEN cf.id IS NOT NULL THEN
            '✓ 自定义字段(' || COALESCE(d.code, '无数据源') || ')'
        ELSE '  非自定义字段'
    END AS "自定义字段"
FROM "EmployeeInfoTabField" f
INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
LEFT JOIN information_schema.columns e ON e.table_name = 'Employee'
    AND e.column_name = f.fieldCode
    AND e.table_schema = 'public'
LEFT JOIN "CustomField" cf ON cf.code = f.fieldCode
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
WHERE t.code = 'basic_info'
ORDER BY f.sort;

\echo ''

\echo '6.2 工作信息页签字段映射:'
\echo '----------------------------------------'

SELECT
    f.fieldCode AS "页签字段代码",
    f.fieldName AS "页签字段名称",
    f.fieldType AS "字段类型",
    CASE
        WHEN e.column_name IS NOT NULL THEN '✓ 在Employee表'
        WHEN w.column_name IS NOT NULL THEN '✓ 在WorkInfoHistory表'
        ELSE '  不在主表'
    END AS "表字段",
    COALESCE(e.data_type, w.data_type) AS "数据类型",
    CASE
        WHEN cf.id IS NOT NULL THEN
            '✓ 自定义字段(' || COALESCE(d.code, '无数据源') || ')'
        ELSE '  非自定义字段'
    END AS "自定义字段"
FROM "EmployeeInfoTabField" f
INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
LEFT JOIN information_schema.columns e ON e.table_name = 'Employee'
    AND e.column_name = f.fieldCode
    AND e.table_schema = 'public'
LEFT JOIN information_schema.columns w ON w.table_name = 'WorkInfoHistory'
    AND w.column_name = f.fieldCode
    AND w.table_schema = 'public'
LEFT JOIN "CustomField" cf ON cf.code = f.fieldCode
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
WHERE t.code = 'work_info'
ORDER BY f.sort;

\echo ''

-- ========================================
-- 第七部分：下拉字段数据源完整性检查
-- ========================================

\echo '【第七部分】下拉字段数据源完整性检查'
\echo '========================================'
\echo ''

\echo '7.1 检查所有应该有数据源的下拉字段:'
\echo '----------------------------------------'

SELECT
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "当前类型",
    CASE
        WHEN cf."dataSourceId" IS NULL THEN '✗ 无数据源'
        WHEN d.id IS NOT NULL THEN '✓ 有数据源'
        ELSE '✗ 数据源不存在'
    END AS "数据源状态",
    COALESCE(d.code, 'N/A') AS "数据源代码",
    COALESCE(d.name, 'N/A') AS "数据源名称",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) = 0 THEN '⚠️ 无选项'
        WHEN COUNT(o.id) > 0 THEN '✓ 有选项'
        ELSE 'N/A'
    END AS "选项状态"
FROM "EmployeeInfoTabField" f
INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
LEFT JOIN "CustomField" cf ON cf.code = f.fieldCode
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = true
WHERE f.fieldType IN ('SELECT', 'SELECT_SINGLE', 'RADIO', 'CHECKBOX', 'CUSTOM')
   OR f.fieldCode IN (
       'gender', 'nation', 'maritalStatus', 'politicalStatus',
       'educationLevel', 'employeeType', 'position', 'jobLevel',
       'workStatus', 'employmentStatus', 'resignationReason',
       'educationType', 'familyRelation'
   )
GROUP BY f.fieldCode, f.fieldName, f.fieldType, cf."dataSourceId", d.id, d.code, d.name
ORDER BY f.fieldCode;

\echo ''

-- ========================================
-- 第八部分：问题诊断汇总
-- ========================================

\echo '【第八部分】问题诊断汇总'
\echo '========================================'
\echo ''

\echo '8.1 缺失数据源的下拉字段:'
\echo '----------------------------------------'

SELECT
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "字段类型",
    'CustomField未关联数据源' AS "问题"
FROM "EmployeeInfoTabField" f
LEFT JOIN "CustomField" cf ON cf.code = f.fieldCode
WHERE f.fieldType IN ('SELECT', 'SELECT_SINGLE', 'RADIO', 'CHECKBOX', 'CUSTOM')
  AND (cf."dataSourceId" IS NULL OR cf.id IS NULL)
ORDER BY f.fieldCode;

\echo ''

\echo '8.2 数据源选项为空的字段:'
\echo '----------------------------------------'

SELECT
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    '数据源无选项' AS "问题"
FROM "CustomField" cf
INNER JOIN "DataSource" d ON d.id = cf."dataSourceId"
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = true
WHERE cf.type IN ('SELECT', 'SELECT_SINGLE', 'RADIO', 'CHECKBOX')
GROUP BY cf.id, cf.code, cf.name, d.code, d.name
HAVING COUNT(o.id) = 0
ORDER BY cf.code;

\echo ''

\echo '8.3 字段命名不一致检查:'
\echo '----------------------------------------'

SELECT
    f.fieldCode AS "页签字段代码",
    cf.code AS "CustomField代码",
    CASE
        WHEN f.fieldCode != cf.code THEN '⚠️ 不一致'
        ELSE '✓ 一致'
    END AS "一致性"
FROM "EmployeeInfoTabField" f
INNER JOIN "CustomField" cf ON cf.code = f.fieldCode
WHERE f.fieldCode != cf.code
   OR f.fieldCode IN ('marital_status', 'political_status', 'education_level',
                      'employee_type', 'job_level', 'resignation_reason')
ORDER BY f.fieldCode;

\echo ''

\echo '========================================'
\echo '✓ 查询完成！'
\echo '========================================'
\echo ''

-- ========================================
-- 第九部分：关键字段汇总视图（用于快速验证）
-- ========================================

\echo '【第九部分】关键字段数据源验证（生产环境必查）'
\echo '========================================'
\echo ''

SELECT
    '关键字段数据源验证' AS "验证项",
    json_agg(
        json_build_object(
            '字段代码', key_field.field_code,
            '字段名称', key_field.field_name,
            '数据源代码', key_field.datasource_code,
            '数据源名称', key_field.datasource_name,
            '选项数量', key_field.option_count,
            '状态', CASE
                WHEN key_field.option_count > 0 THEN '✓ 正常'
                ELSE '✗ 无选项'
            END
        ) ORDER BY key_field.field_code
    ) AS "验证结果"
FROM (
    SELECT
        cf.code AS field_code,
        cf.name AS field_name,
        d.code AS datasource_code,
        d.name AS datasource_name,
        COUNT(o.id) AS option_count
    FROM "CustomField" cf
    INNER JOIN "DataSource" d ON d.id = cf."dataSourceId"
    LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id AND o."isActive" = true
    WHERE cf.code IN (
        'gender', 'nation', 'maritalStatus', 'politicalStatus',
        'educationLevel', 'employeeType', 'position', 'jobLevel',
        'workStatus', 'employmentStatus', 'resignationReason',
        'educationType', 'familyRelation'
    )
    GROUP BY cf.id, cf.code, cf.name, d.code, d.name
) key_field;

\echo ''
\echo '========================================'
