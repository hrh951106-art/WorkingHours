-- ==================== 添加定义出勤代码映射关系 ====================
-- 用于映射 CalculationAttendanceCode -> DefinitionAttendanceCode
-- 计算模块算出结果后，通过此映射推送到 WorkHourResult 表

-- 查看当前的计算出勤代码
-- SELECT code, name, type FROM CalculationAttendanceCode WHERE status = 'ACTIVE';

-- 查看当前的定义出勤代码
-- SELECT id, code, name, type, calcAttendanceCode FROM DefinitionAttendanceCode;

-- ==================== 精益工时映射 (LEAN_HOURS -> source=1) ====================

-- 1. 工序工时映射（A01 -> A01）
INSERT OR IGNORE INTO DefinitionAttendanceCode (
  code, name, type, unit, calculateHours, priority, color, status,
  calcAttendanceCode, description, calculateAmount, deductMealTime, includeExtraHours
) VALUES (
  'A01', '工序工时', 'LEAN_HOURS', 'HOURS', 1, 0, '#1890ff', 'ACTIVE',
  'A01', '工序作业工时，从计算模块推送', 0, 0, 0
);

-- 2. 线体工时映射（A02 -> A02）
INSERT OR IGNORE INTO DefinitionAttendanceCode (
  code, name, type, unit, calculateHours, priority, color, status,
  calcAttendanceCode, description, calculateAmount, deductMealTime, includeExtraHours
) VALUES (
  'A02', '线体工时', 'LEAN_HOURS', 'HOURS', 1, 1, '#52c41a', 'ACTIVE',
  'A02', '线体作业工时，从计算模块推送', 0, 0, 0
);

-- 3. 车间工时映射（A04 -> A04）
INSERT OR IGNORE INTO DefinitionAttendanceCode (
  code, name, type, unit, calculateHours, priority, color, status,
  calcAttendanceCode, description, calculateAmount, deductMealTime, includeExtraHours
) VALUES (
  'A04', '车间工时', 'LEAN_HOURS', 'HOURS', 1, 2, '#faad14', 'ACTIVE',
  'A04', '车间作业工时，从计算模块推送', 0, 0, 0
);

-- ==================== 考勤工时映射 (ATTENDANCE_HOURS -> source=2) ====================

-- 出勤工时映射（AC_001 -> AC_001）
-- 已存在，无需重复创建

-- ==================== 验证映射关系 ====================
SELECT
  dac.id,
  dac.code AS "定义代码",
  dac.name AS "定义名称",
  dac.type AS "工时类型",
  dac.calcAttendanceCode AS "计算代码",
  cac.name AS "计算名称",
  CASE dac.type
    WHEN 'LEAN_HOURS' THEN '1 (精益工时)'
    WHEN 'ATTENDANCE_HOURS' THEN '2 (考勤工时)'
    ELSE '未知'
  END AS "Source值"
FROM DefinitionAttendanceCode dac
LEFT JOIN CalculationAttendanceCode cac ON dac.calcAttendanceCode = cac.code
WHERE dac.status = 'ACTIVE'
ORDER BY dac.type, dac.priority;
