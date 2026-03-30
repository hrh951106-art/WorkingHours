-- 将标准数据源的type更新为BUILTIN

UPDATE DataSource 
SET type = 'BUILTIN', 
    updatedAt = CURRENT_TIMESTAMP 
WHERE code IN (
  'gender', 
  'nation', 
  'marital_status', 
  'political_status', 
  'job_level', 
  'employee_type', 
  'employment_status', 
  'resignation_reason', 
  'education_level', 
  'education_type', 
  'family_relation'
);

SELECT '数据源类型更新完成！' AS result;
SELECT code, name, type FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');
