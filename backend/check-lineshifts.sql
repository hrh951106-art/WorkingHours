-- 查看开线计划
.schema LineShift

-- 查看开线计划数据
SELECT id, scheduleDate, shiftId, orgId, orgName, status
FROM LineShift
WHERE status = 'ACTIVE'
ORDER BY scheduleDate DESC
LIMIT 10;

-- 统计不同组织的开线计划
SELECT orgId, orgName, COUNT(*) as count
FROM LineShift
WHERE status = 'ACTIVE'
GROUP BY orgId, orgName;
