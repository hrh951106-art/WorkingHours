-- 为排班管理页面和打卡记录页面添加查询条件配置

-- ==================== 排班管理页面 (schedule-management) ====================
-- 员工工号
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, description, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES (
  'schedule-management-employeeNo',
  '排班管理-工号',
  '',
  'employeeNo',
  '工号',
  'text',
  NULL,
  1,
  1,
  '["schedule-management"]',
  datetime('now'),
  datetime('now')
);

-- 员工姓名
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, description, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES (
  'schedule-management-name',
  '排班管理-姓名',
  '',
  'name',
  '姓名',
  'text',
  NULL,
  1,
  2,
  '["schedule-management"]',
  datetime('now'),
  datetime('now')
);

-- 所属组织
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, description, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES (
  'schedule-management-orgId',
  '排班管理-所属组织',
  '',
  'orgId',
  '所属组织',
  'organization',
  NULL,
  1,
  3,
  '["schedule-management"]',
  datetime('now'),
  datetime('now')
);

-- ==================== 打卡记录页面 (punch-records) ====================
-- 员工工号
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, description, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES (
  'punch-records-employeeNo',
  '打卡记录-工号',
  '',
  'employeeNo',
  '工号',
  'text',
  NULL,
  1,
  1,
  '["punch-records"]',
  datetime('now'),
  datetime('now')
);

-- 员工姓名
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, description, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES (
  'punch-records-name',
  '打卡记录-姓名',
  '',
  'name',
  '姓名',
  'text',
  NULL,
  1,
  2,
  '["punch-records"]',
  datetime('now'),
  datetime('now')
);

-- 打卡类型
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, description, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES (
  'punch-records-punchType',
  '打卡记录-打卡类型',
  '',
  'punchType',
  '打卡类型',
  'select',
  'PUNCH_TYPE',
  1,
  3,
  '["punch-records"]',
  datetime('now'),
  datetime('now')
);

-- 来源
INSERT INTO UnifiedSearchConditionConfig (configCode, configName, description, fieldCode, fieldName, fieldType, dataSourceCode, isEnabled, sortOrder, applicablePages, createdAt, updatedAt)
VALUES (
  'punch-records-source',
  '打卡记录-来源',
  '',
  'source',
  '来源',
  'select',
  'PUNCH_SOURCE',
  1,
  4,
  '["punch-records"]',
  datetime('now'),
  datetime('now')
);
