-- 查询开线计划（2026-05-14）
SELECT '=== 开线计划（2026-05-14） ===' as info;
SELECT id, orgId, orgName, shiftId, shiftName, status, participateInAllocation
FROM LineShift
WHERE scheduleDate >= 1778630400000 AND scheduleDate < 1778803200000
  AND status = 'ACTIVE'
ORDER BY orgId, shiftId;

-- 查看产线与车间的对应关系
SELECT '=== 产线组织结构 ===' as info;
SELECT id, code, name, parentId
FROM Organization
WHERE id IN (7, 8, 9, 10)
ORDER BY id;
