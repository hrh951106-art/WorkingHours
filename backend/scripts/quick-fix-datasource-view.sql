-- ========================================
-- 系统内置字段数据源快速修复方案（SQL视图）
-- ========================================
-- 方案: 创建视图包含数据源关联
-- 时间: 5分钟立即生效
-- 优点: 无需修改代码，即时生效
-- ========================================

\echo ''
\echo '========================================'
\echo '系统内置字段数据源快速修复（SQL视图）'
\echo '========================================'
\echo ''

\echo '【步骤 1】创建包含数据源的查询视图'
\echo '----------------------------------------'

-- 创建视图：关联EmployeeInfoTabField与CustomField和DataSource
CREATE OR REPLACE VIEW v_employee_info_tabs_with_datasource AS
SELECT
    t.id AS tab_id,
    t.code AS tab_code,
    t.name AS tab_name,
    t.sort AS tab_sort,
    t.status AS tab_status,

    g.id AS group_id,
    g.code AS group_code,
    g.name AS group_name,
    g.sort AS group_sort,
    g.status AS group_status,

    f.id AS field_id,
    f.field_code AS field_code,
    f.field_name AS field_name,
    f.field_type AS field_type,
    f.isRequired AS is_required,
    f.sort AS field_sort,
    f.status AS field_status,

    cf.id AS custom_field_id,
    cf.type AS custom_field_type,
    cf.data_source_id,
    d.code AS datasource_code,
    d.name AS datasource_name,
    d.type AS datasource_type
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g.tab_id = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f.tab_id = t.id AND (f.group_id IS NULL OR f.group_id = g.id)
LEFT JOIN "CustomField" cf ON cf.code = f.field_code
LEFT JOIN "DataSource" d ON d.id = cf.data_source_id
WHERE t.status = 'ACTIVE'
  AND (g.status IS NULL OR g.status = 'ACTIVE')
  AND (f.status IS NULL OR f.status = 'ACTIVE');

\echo '✓ 视图创建完成'

\echo ''

\echo '【步骤 2】创建带选项的完整查询函数'
\echo '----------------------------------------'

CREATE OR REPLACE FUNCTION get_employee_info_tabs_with_datasource()
RETURNS TABLE (
    tab_id INTEGER,
    tab_code VARCHAR,
    tab_name VARCHAR,
    tab_sort INTEGER,

    group_id INTEGER,
    group_code VARCHAR,
    group_name VARCHAR,
    group_sort INTEGER,

    field_id INTEGER,
    field_code VARCHAR,
    field_name VARCHAR,
    field_type VARCHAR,
    is_required BOOLEAN,
    field_sort INTEGER,

    datasource_code VARCHAR,
    datasource_name VARCHAR,
    datasource_type VARCHAR,

    options JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH tab_fields AS (
        SELECT
            t.id AS tab_id,
            t.code AS tab_code,
            t.name AS tab_name,
            t.sort AS tab_sort,

            g.id AS group_id,
            g.code AS group_code,
            g.name AS group_name,
            g.sort AS group_sort,

            f.id AS field_id,
            f.field_code,
            f.field_name,
            f.field_type,
            f.isRequired AS is_required,
            f.sort AS field_sort,

            cf.data_source_id,
            d.code AS datasource_code,
            d.name AS datasource_name,
            d.type AS datasource_type
        FROM "EmployeeInfoTab" t
        LEFT JOIN "EmployeeInfoTabGroup" g ON g.tab_id = t.id
        LEFT JOIN "EmployeeInfoTabField" f ON f.tab_id = t.id AND (f.group_id IS NULL OR f.group_id = g.id)
        LEFT JOIN "CustomField" cf ON cf.code = f.field_code
        LEFT JOIN "DataSource" d ON d.id = cf.data_source_id
        WHERE t.status = 'ACTIVE'
          AND (g.status IS NULL OR g.status = 'ACTIVE')
          AND (f.status IS NULL OR f.status = 'ACTIVE')
    )
    SELECT
        tf.tab_id,
        tf.tab_code,
        tf.tab_name,
        tf.tab_sort,

        tf.group_id,
        tf.group_code,
        tf.group_name,
        tf.group_sort,

        tf.field_id,
        tf.field_code,
        tf.field_name,
        tf.field_type,
        tf.is_required,
        tf.field_sort,

        tf.datasource_code,
        tf.datasource_name,
        tf.datasource_type,

        (
            SELECT json_agg(json_build_object(
                'id', o.id,
                'label', o.label,
                'value', o.value,
                'sort', o.sort,
                'isActive', o."isActive"
            ) ORDER BY o.sort)
            FROM "DataSourceOption" o
            WHERE o.data_source_id = tf.data_source_id
              AND o."isActive" = true
        ) AS options
    FROM tab_fields tf
    ORDER BY tf.tab_sort, tf.group_sort, tf.field_sort;
END;
$$ LANGUAGE plpgsql;

\echo '✓ 查询函数创建完成'

\echo ''

\echo '【步骤 3】验证视图创建结果'
\echo '----------------------------------------'

\echo '3.1 检查视图中的字段:'
\echo ''

SELECT
    field_code,
    field_name,
    field_type,
    datasource_code,
    datasource_name
FROM v_employee_info_tabs_with_datasource
WHERE field_code IN ('gender', 'nation', 'maritalStatus', 'politicalStatus', 'educationLevel', 'employeeType')
ORDER BY field_code
LIMIT 20;

\echo ''

\echo '3.2 检查函数返回的数据（包含选项）:'
\echo ''

SELECT
    field_code,
    field_name,
    field_type,
    datasource_code,
    datasource_name,
    jsonb_pretty(options) AS options_preview
FROM get_employee_info_tabs_with_datasource()
WHERE field_code IN ('gender', 'nation', 'maritalStatus')
  AND datasource_code IS NOT NULL
LIMIT 10;

\echo ''

\echo '【步骤 4】为后端API创建专用查询函数'
\echo '----------------------------------------'

-- 这个函数返回符合现有API格式的数据
CREATE OR REPLACE FUNCTION get_employee_info_tabs_display()
RETURNS SETOF JSON AS $$
DECLARE
    tab_record RECORD;
    group_record RECORD;
    field_record RECORD;
    result JSON;
    groups JSONB := '[]'::JSONB;
    fields JSONB;
BEGIN
    -- 遍历每个页签
    FOR tab_record IN
        SELECT DISTINCT tab_id, tab_code, tab_name
        FROM get_employee_info_tabs_with_datasource()
        ORDER BY tab_code
    LOOP
        fields := '[]'::JSONB;

        -- 获取该页签的所有字段（包括分组和未分组的）
        FOR field_record IN
            SELECT
                field_id,
                field_code,
                field_name,
                field_type,
                is_required,
                field_sort,
                group_id,
                group_code,
                group_name,
                datasource_code,
                datasource_name,
                options
            FROM get_employee_info_tabs_with_datasource()
            WHERE tab_id = tab_record.tab_id
            ORDER BY COALESCE(group_sort, 999), field_sort
        LOOP
            -- 构建字段对象
            fields := fields || jsonb_build_object(
                'id', field_record.field_id,
                'fieldCode', field_record.field_code,
                'fieldName', field_record.field_name,
                'fieldType', field_record.field_type,
                'isRequired', field_record.is_required,
                'sort', field_record.field_sort,
                'groupId', field_record.group_id,
                'groupCode', field_record.group_code,
                'groupName', field_record.group_name,
                'type', CASE
                    WHEN field_record.datasource_code IS NOT NULL THEN 'SELECT'
                    ELSE field_record.field_type
                END,
                'dataSource', CASE
                    WHEN field_record.datasource_code IS NOT NULL THEN
                        jsonb_build_object(
                            'code', field_record.datasource_code,
                            'name', field_record.datasource_name,
                            'type', field_record.datasource_type,
                            'options', COALESCE(field_record.options, '[]'::JSONB)
                        )
                    ELSE NULL
                END
            );
        END LOOP;

        -- 返回该页签的完整配置
        SELECT jsonb_build_object(
            'id', tab_record.tab_id,
            'code', tab_record.tab_code,
            'name', tab_record.tab_name,
            'fields', fields
        ) INTO result;

        RETURN NEXT result;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

\echo '✓ API查询函数创建完成'

\echo ''

\echo '【步骤 5】测试API查询函数'
\echo '----------------------------------------'

\echo '5.1 测试basic_info页签的数据:'
\echo ''

SELECT
    code,
    name,
    jsonb_array_length(fields) AS field_count
FROM get_employee_info_tabs_display()
WHERE code = 'basic_info';

\echo ''

\echo '5.2 检查gender字段的完整数据:'
\echo ''

SELECT
    field->>'fieldCode' AS field_code,
    field->>'fieldName' AS field_name,
    field->>'fieldType' AS field_type,
    field->>'type' AS effective_type,
    field->'dataSource'->>'code' AS datasource_code,
    field->'dataSource'->>'name' AS datasource_name,
    jsonb_array_length(field->'dataSource'->'options') AS option_count
FROM get_employee_info_tabs_display() t,
     jsonb_array_elements(t.fields) field
WHERE field->>'fieldCode' = 'gender';

\echo ''

\echo '========================================'
\echo '✓ 快速修复完成！'
\echo '========================================'
\echo ''

\echo '视图和函数已创建，现在可以：'
\echo ''
\echo '1. 使用视图查询:'
\echo '   SELECT * FROM v_employee_info_tabs_with_datasource'
\echo ''
\echo '2. 使用函数查询（推荐）:'
\echo '   SELECT * FROM get_employee_info_tabs_with_datasource()'
\echo ''
\echo '3. 使用API格式查询:'
\echo '   SELECT * FROM get_employee_info_tabs_display()'
\echo ''
\echo '下一步：修改后端代码调用新函数'
\echo '----------------------------------------'
\echo '在 src/modules/hr/employee-info-tab.service.ts 中，'
\echo '修改 getTabsForDisplay 方法使用新函数：'
\echo ''
\echo 'async getTabsForDisplay() {'
\echo '  // 使用原生SQL调用新创建的函数'
\echo '  const result = await this.prisma.$queryRaw`'
\echo '    SELECT * FROM get_employee_info_tabs_display()'
\echo '  `;'
\echo '  return result;'
\echo '}'
\echo ''
\echo '或者：如果不修改代码，创建新的API端点'
\echo '----------------------------------------'
\echo '在 hr.controller.ts 添加新端点：'
\echo ''
\echo '@Get(''employee-info-tabs/with-datasource'')'
\echo '@ApiOperation({ summary: ''获取包含数据源的页签配置（修复版）'' })'
\echo 'async getTabsWithDataSource() {'
\echo '  return this.hrService.getTabsWithDataSource();'
\echo '}'
\echo ''
\echo '并在 hr.service.ts 添加：'
\echo ''
\echo 'async getTabsWithDataSource() {'
\echo '  const result = await this.prisma.$queryRaw`'
\echo '    SELECT * FROM get_employee_info_tabs_display()'
\echo '  `;'
\echo '  return result;'
\echo '}'
\echo ''
\echo '========================================'
