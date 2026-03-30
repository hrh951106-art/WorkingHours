-- 修复分组状态：将所有停用的分组重新启用
-- 说明: 有些分组可能被错误地设置为 INACTIVE 状态，需要重新启用

-- 查看当前状态
SELECT
  g.id,
  g.name,
  g.status,
  g."tabId",
  t.name as "tabName",
  COUNT(f.id) as "fieldCount"
FROM "EmployeeInfoTabGroup" g
LEFT JOIN "EmployeeInfoTab" t ON t.id = g."tabId"
LEFT JOIN "EmployeeInfoTabField" f ON f."groupId" = g.id
GROUP BY g.id, g.name, g.status, g."tabId", t.name
ORDER BY g."tabId", g.id;

-- 启用所有停用的分组
UPDATE "EmployeeInfoTabGroup"
SET "status" = 'ACTIVE'
WHERE "status" != 'ACTIVE';

-- 显示修复结果
SELECT
  '修复后的状态' as "message",
  COUNT(*) as "totalGroups",
  SUM(CASE WHEN "status" = 'ACTIVE' THEN 1 ELSE 0 END) as "activeGroups"
FROM "EmployeeInfoTabGroup";
