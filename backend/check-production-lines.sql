-- 查看所有产线
SELECT id, code, name, orgId, workshopId, status
FROM ProductionLine
WHERE deletedAt IS NULL AND status = 'ACTIVE'
LIMIT 20;

-- 查看车间 5（W1总装车间）的产线
SELECT id, code, name, orgId, workshopId
FROM ProductionLine
WHERE (workshopId = 5 OR orgId = 5) AND deletedAt IS NULL;
