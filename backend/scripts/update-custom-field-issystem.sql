-- 将标准自定义字段标记为系统内置

UPDATE CustomField 
SET isSystem = 1, 
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

SELECT '自定义字段更新完成！' AS result;
SELECT code, name, isSystem FROM CustomField WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation');
