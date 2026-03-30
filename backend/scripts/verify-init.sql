-- 验证初始化结果

.mode column
.headers on

-- 查看页签
SELECT '=== 页签 ===' AS '';
SELECT code, name, description FROM EmployeeInfoTab WHERE code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info') ORDER BY sort;

-- 查看分组
SELECT '' AS '';
SELECT '=== 分组 ===' AS '';
SELECT t.code AS tab_code, g.code, g.name FROM EmployeeInfoTabGroup g 
JOIN EmployeeInfoTab t ON g.tabId = t.id 
WHERE t.code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info') 
ORDER BY t.sort, g.sort;

-- 查看字段统计
SELECT '' AS '';
SELECT '=== 字段统计 ===' AS '';
SELECT 
  t.code AS tab_code,
  t.name AS tab_name,
  COUNT(f.id) AS field_count
FROM EmployeeInfoTab t
LEFT JOIN EmployeeInfoTabField f ON t.id = f.tabId
WHERE t.code IN ('basic_info', 'work_info', 'education_info', 'work_experience', 'family_info')
GROUP BY t.code, t.name
ORDER BY t.sort;

-- 查看数据源统计
SELECT '' AS '';
SELECT '=== 数据源统计 ===' AS '';
SELECT COUNT(*) AS data_source_count FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');

-- 查看数据源选项统计
SELECT '' AS '';
SELECT '=== 数据源选项统计 ===' AS '';
SELECT COUNT(*) AS data_source_option_count FROM DataSourceOption WHERE dataSourceId IN (SELECT id FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation'));

-- 查看自定义字段统计
SELECT '' AS '';
SELECT '=== 自定义字段统计 ===' AS '';
SELECT COUNT(*) AS custom_field_count FROM CustomField WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');
