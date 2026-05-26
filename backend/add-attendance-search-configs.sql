-- 为摆卡结果和工时结果页面添加默认查询条件配置

-- 摆卡结果页面配置（旧配置表，作为备用）
INSERT INTO SearchConditionConfig (pageCode, pageName, fieldCode, fieldName, fieldType, isEnabled, sortOrder, dataSourceCode, createdAt, updatedAt)
VALUES
  ('punch-results', '摆卡结果', 'employeeNo', '员工编号', 'text', 1, 1, NULL, datetime('now'), datetime('now')),
  ('punch-results', '摆卡结果', 'name', '员工姓名', 'text', 1, 2, NULL, datetime('now'), datetime('now')),
  ('punch-results', '摆卡结果', 'orgId', '所属组织', 'organization', 1, 3, NULL, datetime('now'), datetime('now')),
  ('punch-results', '摆卡结果', 'position', '职位', 'select', 0, 4, 'POSITION', datetime('now'), datetime('now')),
  ('punch-results', '摆卡结果', 'employeeType', '员工类型', 'select', 1, 5, 'EMPLOYEE_TYPE', datetime('now'), datetime('now'));

-- 工时结果页面配置（旧配置表，作为备用）
INSERT INTO SearchConditionConfig (pageCode, pageName, fieldCode, fieldName, fieldType, isEnabled, sortOrder, dataSourceCode, createdAt, updatedAt)
VALUES
  ('work-hour-results', '工时结果', 'employeeNo', '员工编号', 'text', 1, 1, NULL, datetime('now'), datetime('now')),
  ('work-hour-results', '工时结果', 'name', '员工姓名', 'text', 1, 2, NULL, datetime('now'), datetime('now')),
  ('work-hour-results', '工时结果', 'orgId', '所属组织', 'organization', 1, 3, NULL, datetime('now'), datetime('now')),
  ('work-hour-results', '工时结果', 'position', '职位', 'select', 0, 4, 'POSITION', datetime('now'), datetime('now')),
  ('work-hour-results', '工时结果', 'employeeType', '员工类型', 'select', 1, 5, 'EMPLOYEE_TYPE', datetime('now'), datetime('now'));

-- 统一查询条件配置（支持多页面）
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES
  ('attendance-employeeNo', '员工编号', 'employeeNo', '员工编号', 'text', NULL, 1, 1, '["punch-results","work-hour-results"]', datetime('now'), datetime('now')),
  ('attendance-name', '员工姓名', 'name', '员工姓名', 'text', NULL, 1, 2, '["punch-results","work-hour-results"]', datetime('now'), datetime('now')),
  ('attendance-orgId', '所属组织', 'orgId', '所属组织', 'organization', NULL, 1, 3, '["punch-results","work-hour-results"]', datetime('now'), datetime('now')),
  ('attendance-position', '职位', 'position', '职位', 'select', 'POSITION', 0, 4, '["punch-results","work-hour-results"]', datetime('now'), datetime('now')),
  ('attendance-employeeType', '员工类型', 'employeeType', '员工类型', 'select', 'EMPLOYEE_TYPE', 1, 5, '["punch-results","work-hour-results"]', datetime('now'), datetime('now')),
  ('attendance-jobLevel', '职级', 'jobLevel', '职级', 'select', 'JOB_LEVEL', 0, 6, '["punch-results","work-hour-results"]', datetime('now'), datetime('now'));
