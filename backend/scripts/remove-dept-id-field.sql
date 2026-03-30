-- 删除工作信息页签的"所属部门"字段
-- 这个字段不应该在工作信息中显示

-- 1. 删除 dept_id 字段配置（从工作信息页签）
DELETE FROM EmployeeInfoTabField
WHERE fieldCode = 'dept_id'
AND groupId IN (
  SELECT id FROM EmployeeInfoTabGroup
  WHERE tabId IN (
    SELECT id FROM EmployeeInfoTab
    WHERE code = 'work_info'
  )
);

-- 2. 验证删除结果
SELECT
  t.name AS tab_name,
  t.code AS tab_code,
  g.name AS group_name,
  f.fieldName,
  f.fieldCode
FROM EmployeeInfoTab t
LEFT JOIN EmployeeInfoTabGroup g ON g.tabId = t.id
LEFT JOIN EmployeeInfoTabField f ON f.groupId = g.id
WHERE t.code = 'work_info'
ORDER BY g.sort, f.sort;
