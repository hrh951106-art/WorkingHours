-- ================================================================
-- 数据源配置验证脚本 - PostgreSQL 生产环境
--
-- 功能说明：
-- 1. 验证所有必需的数据源是否已正确配置
-- 2. 检查数据源选项数量
-- 3. 识别缺失的数据源
--
-- 执行方式：
-- psql -U username -d jy_production -f 005-verify-datasources.sql
-- ================================================================

BEGIN;

-- ================================================================
-- 数据源配置检查
-- ================================================================

-- 创建临时表存储必需的数据源配置
CREATE TEMPORARY TABLE required_datasources AS
SELECT 'JOB_LEVEL' AS code, '职级' AS name
UNION ALL SELECT 'POSITION', '职位'
UNION ALL SELECT 'EMPLOYEE_TYPE', '员工类型'
UNION ALL SELECT 'education_level', '学历层次'
UNION ALL SELECT 'education_type', '学历类型'
UNION ALL SELECT 'marital_status', '婚姻状况'
UNION ALL SELECT 'political_status', '政治面貌'
UNION ALL SELECT 'nation', '民族'
UNION ALL SELECT 'gender', '性别'
UNION ALL SELECT 'emergency_relation', '紧急联系人关系'
UNION ALL SELECT 'family_relation', '家庭成员关系'
UNION ALL SELECT 'change_type', '异动类型'
UNION ALL SELECT 'employment_status', '在职状态';

-- ================================================================
-- 验证报告
-- ================================================================

-- 1. 检查数据源是否存在
SELECT
    rd.code AS "数据源代码",
    rd.name AS "数据源名称",
    CASE
        WHEN ds.id IS NOT NULL THEN '✓ 存在'
        ELSE '✗ 缺失'
    END AS "状态",
    COALESCE(ds_opt.count, 0) AS "选项数量"
FROM required_datasources rd
LEFT JOIN "DataSource" ds ON ds.code = rd.code
LEFT JOIN (
    SELECT "dataSourceId", COUNT(*) AS count
    FROM "DataSourceOption"
    WHERE "isActive" = true
    GROUP BY "dataSourceId"
) ds_opt ON ds_opt."dataSourceId" = ds.id
ORDER BY rd.code;

-- 2. 识别缺失的数据源
SELECT
    '✗ 缺失的数据源' AS "检查项",
    string_agg(rd.code || '(' || rd.name || ')', ', ' ORDER BY rd.code) AS "详情"
FROM required_datasources rd
LEFT JOIN "DataSource" ds ON ds.code = rd.code
WHERE ds.id IS NULL;

-- 3. 统计信息
SELECT
    COUNT(*) AS "总数据源数",
    SUM(CASE WHEN ds.id IS NOT NULL THEN 1 ELSE 0 END) AS "已配置数",
    SUM(CASE WHEN ds.id IS NULL THEN 1 ELSE 0 END) AS "缺失数",
    ROUND(100.0 * SUM(CASE WHEN ds.id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) AS "完成率(%)"
FROM required_datasources rd
LEFT JOIN "DataSource" ds ON ds.code = rd.code;

COMMIT;

-- ================================================================
-- 如果发现缺失数据源，请参考以下步骤补充：
-- ================================================================
--
-- 1. 通过管理界面添加缺失的数据源
-- 2. 或使用以下 SQL 添加（需要根据实际情况调整）
--
-- 示例：添加民族数据源
-- INSERT INTO "DataSource" (code, name, type, status, "createdAt", "updatedAt")
-- VALUES ('nation', '民族', 'BUILTIN', 'ACTIVE', NOW(), NOW());
--
-- 添加数据源选项
-- INSERT INTO "DataSourceOption" ("dataSourceId", value, label, sort, "isActive", "createdAt", "updatedAt")
-- VALUES
--   ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'han', '汉族', 1, true, NOW(), NOW()),
--   ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'zhuang', '壮族', 2, true, NOW(), NOW()),
--   -- 更多选项...
--   ((SELECT id FROM "DataSource" WHERE code = 'nation'), 'other', '其他', 99, true, NOW(), NOW());
--
-- ================================================================
