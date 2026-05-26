-- 查询工时数据
SELECT '=== 所有工时数据（前20条） ===' as info;
SELECT employeeNo, calcAttendanceCode, calcDate, workHours
FROM WorkHourResult
ORDER BY calcDate DESC
LIMIT 20;

-- 统计考勤代码
SELECT '=== 考勤代码统计 ===' as info;
SELECT calcAttendanceCode, COUNT(*) as count, SUM(workHours) as total_hours
FROM WorkHourResult
GROUP BY calcAttendanceCode
ORDER BY count DESC;

-- 查找包含 A04 的数据
SELECT '=== 包含 A04 的工时数据 ===' as info;
SELECT employeeNo, calcAttendanceCode, calcDate, workHours
FROM WorkHourResult
WHERE calcAttendanceCode LIKE '%A04%'
LIMIT 10;
