-- 创建缺失的数据源

-- PUNCH_TYPE: 打卡类型
INSERT INTO DataSource (code, name, type, isSystem, status, sort, createdAt, updatedAt)
VALUES (
  'PUNCH_TYPE',
  '打卡类型',
  'SYSTEM',
  1,
  'ACTIVE',
  0,
  datetime('now'),
  datetime('now')
);

-- 获取刚创建的DataSource ID
-- 为 PUNCH_TYPE 添加选项 (需要先获取dataSourceId)
-- 注意：这里假设插入后ID为连续的，实际使用时可能需要调整

-- 先查询现有DataSource的数量，确定新的dataSourceId
-- SELECT id FROM DataSource WHERE code = 'PUNCH_TYPE';

-- PUNCH_SOURCE: 打卡来源
INSERT INTO DataSource (code, name, type, isSystem, status, sort, createdAt, updatedAt)
VALUES (
  'PUNCH_SOURCE',
  '打卡来源',
  'SYSTEM',
  1,
  'ACTIVE',
  0,
  datetime('now'),
  datetime('now')
);
