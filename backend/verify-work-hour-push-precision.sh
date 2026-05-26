#!/bin/bash

# ==================== 工时推送精确性验证脚本 ====================

echo "=========================================="
echo "工时推送精确性验证"
echo "=========================================="
echo ""

# 配置
DB_PATH="prisma/dev.db"
TEST_EMPLOYEE_1="202604003"
TEST_EMPLOYEE_2="202604004"
TEST_DATE="2025-01-15"

echo "测试配置:"
echo "  员工1: $TEST_EMPLOYEE_1"
echo "  员工2: $TEST_EMPLOYEE_2"
echo "  日期: $TEST_DATE"
echo ""

# ==================== 步骤1: 准备测试数据 ====================
echo "=========================================="
echo "步骤1: 准备测试数据"
echo "=========================================="
echo ""

echo "1.1 查看当前 WorkHourResult 表中的数据（清理前）"
echo ""
sqlite3 "$DB_PATH" <<EOF
SELECT
  employeeNo,
  calcDate,
  definitionAttendanceCodeStr AS '定义代码',
  calcAttendanceCode AS '计算代码',
  workHours,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  source,
  createdAt
FROM WorkHourResult
WHERE calcDate = '$TEST_DATE'
  AND employeeNo IN ('$TEST_EMPLOYEE_1', '$TEST_EMPLOYEE_2')
ORDER BY employeeNo, source;
EOF
echo ""

# ==================== 步骤2: 验证场景1 ====================
echo "=========================================="
echo "场景1: 只计算 $TEST_EMPLOYEE_1 的考勤工时"
echo "=========================================="
echo ""

echo "2.1 调用计算 API（只计算考勤工时）"
echo "POST /calculate/attendance-work-hours"
echo "{"
echo "  \"employeeNos\": [\"$TEST_EMPLOYEE_1\"],"
echo "  \"calcDate\": \"$TEST_DATE\""
echo "}"
echo ""

echo "2.2 验证结果："
echo "  ✅ $TEST_EMPLOYEE_1 的考勤工时(source=2)应该被更新"
echo "  ✅ $TEST_EMPLOYEE_1 的精益工时(source=1)应该保持不变"
echo "  ✅ $TEST_EMPLOYEE_2 的所有数据应该保持不变"
echo ""

echo "2.3 查看更新后的数据："
sqlite3 "$DB_PATH" <<EOF
SELECT
  employeeNo,
  calcDate,
  definitionAttendanceCodeStr AS '定义代码',
  calcAttendanceCode AS '计算代码',
  workHours,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  source,
  createdAt,
  '← 如果是新的，说明考勤工时被更新' AS '说明'
FROM WorkHourResult
WHERE calcDate = '$TEST_DATE'
  AND employeeNo IN ('$TEST_EMPLOYEE_1', '$TEST_EMPLOYEE_2')
ORDER BY employeeNo, source;
EOF
echo ""

# ==================== 步骤3: 验证场景2 ====================
echo "=========================================="
echo "场景2: 只计算 $TEST_EMPLOYEE_2 的精益工时"
echo "=========================================="
echo ""

echo "3.1 调用计算 API（只计算精益工时）"
echo "POST /calculate/batch"
echo "{"
echo "  \"startDate\": \"$TEST_DATE\","
echo "  \"endDate\": \"$TEST_DATE\","
echo "  \"employeeNos\": [\"$TEST_EMPLOYEE_2\"]"
echo "}"
echo ""

echo "3.2 验证结果："
echo "  ✅ $TEST_EMPLOYEE_2 的精益工时(source=1)应该被更新"
echo "  ✅ $TEST_EMPLOYEE_2 的考勤工时(source=2)应该保持不变"
echo "  ✅ $TEST_EMPLOYEE_1 的所有数据应该保持不变"
echo ""

echo "3.3 查看更新后的数据："
sqlite3 "$DB_PATH" <<EOF
SELECT
  employeeNo,
  calcDate,
  definitionAttendanceCodeStr AS '定义代码',
  calcAttendanceCode AS '计算代码',
  workHours,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  source,
  createdAt,
  '← 如果是新的，说明精益工时被更新' AS '说明'
FROM WorkHourResult
WHERE calcDate = '$TEST_DATE'
  AND employeeNo IN ('$TEST_EMPLOYEE_1', '$TEST_EMPLOYEE_2')
ORDER BY employeeNo, source;
EOF
echo ""

# ==================== 步骤4: 统计验证 ====================
echo "=========================================="
echo "统计验证：确认数据的独立性"
echo "=========================================="
echo ""

echo "4.1 统计每个员工每天的工时数据量："
sqlite3 "$DB_PATH" <<EOF
SELECT
  employeeNo,
  calcDate,
  source,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  COUNT(*) AS '记录数',
  SUM(workHours) AS '总工时',
  MAX(createdAt) AS '最后更新时间'
FROM WorkHourResult
WHERE calcDate = '$TEST_DATE'
  AND employeeNo IN ('$TEST_EMPLOYEE_1', '$TEST_EMPLOYEE_2')
  AND sourceType = 'CALCULATED'
GROUP BY employeeNo, calcDate, source
ORDER BY employeeNo, source;
EOF
echo ""

echo "4.2 验证批次ID（同一次推送应该有相同的批次ID）："
sqlite3 "$DB_PATH" <<EOF
SELECT
  employeeNo,
  calcDate,
  source,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  sourceBatchId AS '批次ID',
  COUNT(*) AS '该批次的记录数',
  MIN(createdAt) AS '最早创建',
  MAX(createdAt) AS '最晚创建'
FROM WorkHourResult
WHERE calcDate = '$TEST_DATE'
  AND employeeNo IN ('$TEST_EMPLOYEE_1', '$TEST_EMPLOYEE_2')
  AND sourceType = 'CALCULATED'
  AND sourceBatchId IS NOT NULL
GROUP BY employeeNo, calcDate, source, sourceBatchId
ORDER BY employeeNo, source;
EOF
echo ""

# ==================== 验证清单 ====================
echo "=========================================="
echo "验证清单"
echo "=========================================="
echo ""

echo "请确认以下点："
echo ""
echo "场景1验证（只计算 $TEST_EMPLOYEE_1 的考勤工时）:"
echo "  [ ] $TEST_EMPLOYEE_1 的考勤工时(source=2)被更新（有新的 createdAt）"
echo "  [ ] $TEST_EMPLOYEE_1 的精益工时(source=1)保持不变（ createdAt 更早）"
echo "  [ ] $TEST_EMPLOYEE_2 的所有数据保持不变"
echo "  [ ] 日志显示：涉及的工时类型: 考勤工时(source=2)"
echo ""
echo "场景2验证（只计算 $TEST_EMPLOYEE_2 的精益工时）:"
echo "  [ ] $TEST_EMPLOYEE_2 的精益工时(source=1)被更新（有新的 createdAt）"
echo "  [ ] $TEST_EMPLOYEE_2 的考勤工时(source=2)保持不变（ createdAt 更早）"
echo "  [ ] $TEST_EMPLOYEE_1 的所有数据保持不变"
echo "  [ ] 日志显示：涉及的工时类型: 精益工时(source=1)"
echo ""
echo "独立性验证:"
echo "  [ ] 不同员工的数据互不影响"
echo "  [ ] 不同类型的数据互不影响"
echo "  [ ] sourceBatchId 正确标识每次推送"
echo ""

# ==================== 关键日志说明 ====================
echo "=========================================="
echo "关键日志说明"
echo "=========================================="
echo ""

echo "推送时的日志应该显示："
echo ""
echo "场景1日志（只计算考勤工时）:"
echo "  [WorkHourPushService] 分组数量: 1"
echo "  [WorkHourPushService] 员工 $TEST_EMPLOYEE_1 日期 $TEST_DATE 涉及的工时类型: 考勤工时(source=2)"
echo "  [WorkHourPushService] 删除结果: count=X, 类型: 考勤工时(source=2)"
echo ""
echo "场景2日志（只计算精益工时）:"
echo "  [WorkHourPushService] 分组数量: 1"
echo "  [WorkHourPushService] 员工 $TEST_EMPLOYEE_2 日期 $TEST_DATE 涉及的工时类型: 精益工时(source=1)"
echo "  [WorkHourPushService] 删除结果: count=Y, 类型: 精益工时(source=1)"
echo ""

echo "=========================================="
echo "关键点"
echo "=========================================="
echo ""
echo "1. 按员工精确:"
echo "   - 只删除指定员工的数据"
echo "   - 不影响其他员工"
echo ""
echo "2. 按日期精确:"
echo "   - 只删除指定日期的数据"
echo "   - 不影响其他日期"
echo ""
echo "3. 按类型精确:"
echo "   - 只删除涉及的类型"
echo "   - 不影响其他类型"
echo ""
echo "4. 三维度精确:"
echo "   WHERE employeeNo = '张三'"
echo "     AND calcDate = '2025-01-15'"
echo "     AND source IN (2)"
echo ""
echo "=========================================="
