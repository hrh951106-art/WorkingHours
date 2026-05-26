-- 查询直接工时数据（A02_LINE）
SELECT '=== A02_LINE 直接工时（2026-05-14） ===' as info;
SELECT employeeNo, calcAttendanceCode, definitionAttendanceCodeStr, calcDate, workHours, 
       shiftId, accountId, accountName
FROM WorkHourResult
WHERE definitionAttendanceCodeStr = 'A02_LINE'
  AND calcDate >= 1778630400000 AND calcDate < 1778803200000
ORDER BY employeeNo, shiftId;

-- 统计车间维度的直接工时
SELECT '=== 直接工时按账户统计 ===' as info;
SELECT accountId, accountName, COUNT(*) as count, SUM(workHours) as total_hours
FROM WorkHourResult
WHERE definitionAttendanceCodeStr = 'A02_LINE'
  AND calcDate >= 1778630400000 AND calcDate < 1778803200000
GROUP BY accountId, accountName;
