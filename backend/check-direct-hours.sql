-- 查看是否有 A02_LINE 直接工时数据
SELECT employeeNo, calcAttendanceCode, definitionAttendanceCodeStr, calcDate, workHours, shiftId
FROM WorkHourResult
WHERE calcDate >= 1778630400000 AND calcDate < 1778803200000
  AND (calcAttendanceCode = 'A02_LINE' OR definitionAttendanceCodeStr = 'A02_LINE')
LIMIT 20;

-- 查看所有考勤代码
SELECT calcAttendanceCode, definitionAttendanceCodeStr, COUNT(*) as count, SUM(workHours) as total_hours
FROM WorkHourResult
WHERE calcDate >= 1778630400000 AND calcDate < 1778803200000
GROUP BY calcAttendanceCode, definitionAttendanceCodeStr;

-- 查看 2026-05-14 的所有工时数据
SELECT employeeNo, calcAttendanceCode, definitionAttendanceCodeStr, calcDate, workHours
FROM WorkHourResult
WHERE calcDate >= 1778630400000 AND calcDate < 1778803200000
ORDER BY calcAttendanceCode, employeeNo;
