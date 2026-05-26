-- 查看 WorkHourResult 中 A04 数据的详细信息
SELECT employeeNo, calcAttendanceCode, definitionAttendanceCodeStr, 
       calcDate, workHours, accountId, accountName
FROM WorkHourResult
WHERE calcAttendanceCode = 'A04'
LIMIT 5;
