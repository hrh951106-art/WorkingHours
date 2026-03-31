-- ========================================
-- 系统内置字段数据源问题排查脚本
-- ========================================
-- 问题: 系统内置的下拉字段无法从查找项获取数据源
-- 排查: DataSource、DataSourceOption、CustomField、EmployeeInfoTabField
-- ========================================

\echo ''
\echo '========================================'
\echo '数据源配置完整性排查'
\echo '========================================'
\echo ''

-- ========================================
-- 第一部分：检查数据源主表
-- ========================================

\echo '【第一部分】DataSource表检查'
\echo '========================================'
\echo ''

\echo '1.1 检查所有系统内置数据源:'
\echo '----------------------------------------'

SELECT
    id AS "ID",
    code AS "代码",
    name AS "名称",
    type AS "类型",
    "isSystem" AS "系统内置",
    status AS "状态",
    sort AS "排序"
FROM "DataSource"
WHERE "isSystem" = true
ORDER BY sort;

\echo ''

\echo '1.2 检查每个数据源的选项数量:'
\echo '----------------------------------------'

SELECT
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) = 0 THEN '⚠️  无选项'
        ELSE '✓ 正常'
    END AS "状态"
FROM "DataSource" d
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE d."isSystem" = true
GROUP BY d.id, d.code, d.name, d.sort
ORDER BY d.sort;

\echo ''

-- ========================================
-- 第二部分：检查数据源选项详情
-- ========================================

\echo '【第二部分】DataSourceOption表检查'
\echo '========================================'
\echo ''

\echo '2.1 检查性别数据源选项:'
\echo '----------------------------------------'

SELECT
    d.code AS "数据源",
    o.label AS "显示名称",
    o.value AS "值",
    o."isActive" AS "激活",
    o.sort AS "排序"
FROM "DataSource" d
INNER JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE d.code = 'GENDER'
ORDER BY o.sort;

\echo ''

\echo '2.2 检查学历数据源选项:'
\echo '----------------------------------------'

SELECT
    d.code AS "数据源",
    o.label AS "显示名称",
    o.value AS "值",
    o."isActive" AS "激活",
    o.sort AS "排序"
FROM "DataSource" d
INNER JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE d.code = 'EDUCATION'
ORDER BY o.sort;

\echo ''

\echo '2.3 检查所有数据源选项（总览）:'
\echo '----------------------------------------'

SELECT
    d.code AS "数据源代码",
    STRING_AGG(o.label, ', ' ORDER BY o.sort) AS "选项列表"
FROM "DataSource" d
INNER JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
GROUP BY d.code, d.name
ORDER BY d.code;

\echo ''

-- ========================================
-- 第三部分：检查CustomField配置
-- ========================================

\echo '【第三部分】CustomField表检查'
\echo '========================================'
\echo ''

\echo '3.1 检查CustomField中的数据源关联:'
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
    cf.status AS "状态"
FROM "CustomField" cf
LEFT JOIN "DataSource" d ON d.id = cf."dataSourceId"
WHERE cf."dataSourceId" IS NOT NULL
ORDER BY cf.sort;

\echo ''

\echo '3.2 检查CustomField中缺失数据源的配置:'
\echo '----------------------------------------'

SELECT
    cf.code AS "字段代码",
    cf.name AS "字段名称",
    cf.type AS "字段类型",
    '应该关联数据源' AS "问题"
FROM "CustomField" cf
WHERE cf.type IN ('SELECT', 'RADIO', 'CHECKBOX', 'MULTI_SELECT')
  AND cf."dataSourceId" IS NULL;

\echo ''

-- ========================================
-- 第四部分：检查EmployeeInfoTabField配置
-- ========================================

\echo '【第四部分】EmployeeInfoTabField表检查'
\echo '========================================'
\echo ''

\echo '4.1 检查需要数据源的页签字段:'
\echo '----------------------------------------'

SELECT
    t.code AS "页签代码",
    t.name AS "页签名称",
    g.code AS "分组代码",
    g.name AS "分组名称",
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "字段类型"
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."tabId" = t.id AND (f."groupId" IS NULL OR f."groupId" = g.id)
WHERE t.code IN ('basic_info', 'work_info')
  AND f.fieldCode IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType')
ORDER BY t.sort, g.sort, f.sort;

\echo ''

\echo '4.2 检查页签字段的fieldType是否正确:'
\echo '----------------------------------------'

-- 检查应该使用数据源的字段类型
SELECT
    f.fieldCode AS "字段代码",
    f.fieldName AS "字段名称",
    f.fieldType AS "当前类型",
    CASE
        WHEN f.fieldCode = 'gender' THEN '应该是: SELECT或SYSTEM'
        WHEN f.fieldCode = 'nation' THEN '应该是: SELECT'
        WHEN f.fieldCode = 'maritalStatus' THEN '应该是: SELECT'
        WHEN f.fieldCode = 'politicalStatus' THEN '应该是: SELECT'
        WHEN f.fieldCode = 'educationLevel' THEN '应该是: SELECT'
        ELSE '未知'
    END AS "建议类型"
FROM "EmployeeInfoTabField" f
INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
WHERE t.code IN ('basic_info', 'work_info')
  AND f.fieldCode IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType')
ORDER BY f.fieldCode;

\echo ''

-- ========================================
-- 第五部分：关键数据验证
-- ========================================

\echo '【第五部分】关键数据验证'
\echo '========================================'
\echo ''

\echo '5.1 验证性别数据源完整性:'
\echo '----------------------------------------'

DO $$
DECLARE
    v_datasource_count INTEGER;
    v_option_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_datasource_count FROM "DataSource" WHERE code = 'GENDER';
    SELECT COUNT(*) INTO v_option_count FROM "DataSourceOption" o
    INNER JOIN "DataSource" d ON d.id = o."dataSourceId"
    WHERE d.code = 'GENDER';

    RAISE NOTICE 'GENDER数据源: % (应该存在)', CASE WHEN v_datasource_count > 0 THEN '✓ 存在' ELSE '✗ 缺失' END;
    RAISE NOTICE 'GENDER选项数: % (应该>=2)', v_option_count;

    IF v_datasource_count = 0 THEN
        RAISE NOTICE '⚠️  警告: GENDER数据源不存在！';
    END IF;

    IF v_option_count < 2 THEN
        RAISE NOTICE '⚠️  警告: GENDER数据源选项不足！';
    END IF;
END $$;

\echo ''

\echo '5.2 验证学历数据源完整性:'
\echo '----------------------------------------'

DO $$
DECLARE
    v_datasource_count INTEGER;
    v_option_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_datasource_count FROM "DataSource" WHERE code = 'EDUCATION';
    SELECT COUNT(*) INTO v_option_count FROM "DataSourceOption" o
    INNER JOIN "DataSource" d ON d.id = o."dataSourceId"
    WHERE d.code = 'EDUCATION';

    RAISE NOTICE 'EDUCATION数据源: % (应该存在)', CASE WHEN v_datasource_count > 0 THEN '✓ 存在' ELSE '✗ 缺失' END;
    RAISE NOTICE 'EDUCATION选项数: % (应该>=4)', v_option_count;

    IF v_datasource_count = 0 THEN
        RAISE NOTICE '⚠️  警告: EDUCATION数据源不存在！';
    END IF;

    IF v_option_count < 4 THEN
        RAISE NOTICE '⚠️  警告: EDUCATION数据源选项不足！';
    END IF;
END $$;

\echo ''

-- ========================================
-- 第六部分：检查可能的SQL迁移问题
-- ========================================

\echo '【第六部分】SQL迁移执行检查'
\echo '========================================'
\echo ''

\echo '6.1 检查种子数据是否插入:'
\echo '----------------------------------------'

SELECT
    'DataSource表记录数' AS "检查项",
    COUNT(*) AS "数量",
    CASE WHEN COUNT(*) >= 11 THEN '✓ 正常' ELSE '✗ 缺失' END AS "状态"
FROM "DataSource"
WHERE "isSystem" = true
UNION ALL
SELECT
    'DataSourceOption表记录数',
    COUNT(*),
    CASE WHEN COUNT(*) >= 30 THEN '✓ 正常' ELSE '✗ 缺失' END
FROM "DataSourceOption"
UNION ALL
SELECT
    'CustomField表记录数',
    COUNT(*),
    CASE WHEN COUNT(*) >= 5 THEN '✓ 正常' ELSE '✗ 缺失' END
FROM "CustomField";

\echo ''

\echo '6.2 检查数据源与选项的关联完整性:'
\echo '----------------------------------------'

SELECT
    d.id AS "数据源ID",
    d.code AS "数据源代码",
    d.name AS "数据源名称",
    COUNT(o.id) AS "选项数量",
    CASE
        WHEN COUNT(o.id) = 0 THEN '⚠️  无选项'
        ELSE '✓ 正常'
    END AS "状态"
FROM "DataSource" d
LEFT JOIN "DataSourceOption" o ON o."dataSourceId" = d.id
WHERE d."isSystem" = true
GROUP BY d.id, d.code, d.name
ORDER BY d.sort;

\echo ''

-- ========================================
-- 第七部分：前端API数据模拟
-- ========================================

\echo '【第七部分】前端API数据模拟'
\echo '========================================'
\echo ''

\echo '7.1 模拟前端获取数据源列表:'
\echo '----------------------------------------'

SELECT
    json_build_object(
        'id', d.id,
        'code', d.code,
        'name', d.name,
        'type', d.type,
        'options', (
            SELECT json_agg(
                json_build_object(
                    'id', o.id,
                    'label', o.label,
                    'value', o.value,
                    'sort', o.sort
                ) ORDER BY o.sort
            )
            FROM "DataSourceOption" o
            WHERE o."dataSourceId" = d.id
        )
    ) AS "数据源JSON"
FROM "DataSource" d
WHERE d.code IN ('GENDER', 'EDUCATION', 'NATION')
ORDER BY d.sort;

\echo ''

-- ========================================
-- 第八部分：问题诊断总结
-- ========================================

\echo '【第八部分】问题诊断总结'
\echo '========================================'
\echo ''

\echo '可能的问题和解决方案:'
\echo ''
\echo '问题1: DataSource表缺少数据'
\echo '  诊断: 检查DataSource表是否包含11个系统内置数据源'
\echo '  解决: 运行种子数据脚本插入数据源'
\echo '  SQL: INSERT INTO "DataSource" ...'
\echo ''
\echo '问题2: DataSourceOption表缺少选项'
\echo '  诊断: 检查每个数据源是否有足够的选项'
\echo '  解决: 运行种子数据脚本插入数据源选项'
\echo '  SQL: INSERT INTO "DataSourceOption" ...'
\echo ''
\echo '问题3: CustomField未关联数据源'
\echo '  诊断: 检查CustomField表的dataSourceId字段'
\echo '  解决: 更新CustomField设置正确的dataSourceId'
\echo '  SQL: UPDATE "CustomField" SET "dataSourceId" = ... WHERE code = ...'
\echo ''
\echo '问题4: EmployeeInfoTabField的fieldType不正确'
\echo '  诊断: 检查需要下拉的字段fieldType是否为SELECT'
\echo '  解决: 更新EmployeeInfoTabField设置正确的fieldType'
\echo '  SQL: UPDATE "EmployeeInfoTabField" SET fieldType = "SELECT" WHERE fieldCode = ...'
\echo ''
\echo '问题5: 前端API查询逻辑错误'
\echo '  诊断: 检查API是否正确查询了DataSource和DataSourceOption'
\echo '  解决: 修改后端API代码，确保正确关联查询'
\echo ''

\echo '========================================'
\echo '✓ 检查完成！'
\echo '========================================'
\echo ''
\echo '下一步操作建议:'
\echo '  1. 如果数据源缺失，运行: prisma/seed-datasources.ts'
\echo '  2. 如果选项缺失，检查种子数据脚本'
\echo '  3. 如果字段未关联，运行修复脚本'
\echo '  4. 如果API问题，检查后端查询代码'
\echo ''
