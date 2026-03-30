-- 验证最终结果

.mode column
.headers on

-- 验证数据源
SELECT '' AS '';
SELECT '=== 数据源类型验证 ===' AS '';
SELECT code, name, type, isSystem FROM DataSource 
WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation')
ORDER BY sort;

-- 验证自定义字段
SELECT '' AS '';
SELECT '=== 自定义字段验证 ===' AS '';
SELECT code, name, isSystem FROM CustomField 
WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation')
ORDER BY code;
