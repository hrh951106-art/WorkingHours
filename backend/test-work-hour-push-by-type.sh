#!/bin/bash

# ==================== 工时结果按类型推送测试脚本 ====================

echo "=========================================="
echo "工时结果按类型推送功能测试"
echo "=========================================="
echo ""

# 配置
API_BASE="http://localhost:3000"
TOKEN="your_token_here"

# 测试日期（使用最近的日期）
TEST_DATE=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d yesterday +%Y-%m-%d)
echo "测试日期: $TEST_DATE"
echo ""

# ==================== 测试场景1: 只计算考勤工时 ====================
echo "=========================================="
echo "场景1: 只计算考勤工时"
echo "=========================================="
echo ""

echo "1.1 删除该日期的所有旧数据（包含精益和考勤）"
echo "DELETE /calculate/calc-results?startDate=$TEST_DATE&endDate=$TEST_DATE"
# curl -X DELETE "$API_BASE/calculate/calc-results?startDate=$TEST_DATE&endDate=$TEST_DATE" \
#   -H "Authorization: Bearer $TOKEN"
echo ""

echo "1.2 只计算考勤工时"
echo "POST /calculate/attendance-work-hours-by-date-range"
echo "{"
echo "  \"employeeNos\": [\"202604003\"],"
echo "  \"startDate\": \"$TEST_DATE\","
echo "  \"endDate\": \"$TEST_DATE\""
echo "}"
# curl -X POST "$API_BASE/calculate/attendance-work-hours-by-date-range" \
#   -H "Authorization: Bearer $TOKEN" \
#   -H "Content-Type: application/json" \
#   -d "{\"employeeNos\": [\"202604003\"], \"startDate\": \"$TEST_DATE\", \"endDate\": \"$TEST_DATE\"}"
echo ""

echo "1.3 验证结果：应该只有 source=2 的考勤工时数据"
echo "查询: SELECT employeeNo, calcDate, definitionAttendanceCodeStr, calcAttendanceCode, source, workHours"
echo "      FROM WorkHourResult"
echo "      WHERE calcDate = '$TEST_DATE' AND employeeNo = '202604003'"
echo ""
echo ""

# ==================== 测试场景2: 只计算精益工时 ====================
echo "=========================================="
echo "场景2: 只计算精益工时"
echo "=========================================="
echo ""

echo "2.1 删除该日期的所有旧数据"
echo "DELETE /calculate/calc-results?startDate=$TEST_DATE&endDate=$TEST_DATE"
# curl -X DELETE "$API_BASE/calculate/calc-results?startDate=$TEST_DATE&endDate=$TEST_DATE" \
#   -H "Authorization: Bearer $TOKEN"
echo ""

echo "2.2 只计算精益工时"
echo "POST /calculate/batch"
echo "{"
echo "  \"startDate\": \"$TEST_DATE\","
echo "  \"endDate\": \"$TEST_DATE\","
echo "  \"employeeNos\": [\"202604003\"]"
echo "}"
# curl -X POST "$API_BASE/calculate/batch" \
#   -H "Authorization: Bearer $TOKEN" \
#   -H "Content-Type: application/json" \
#   -d "{\"startDate\": \"$TEST_DATE\", \"endDate\": \"$TEST_DATE\", \"employeeNos\": [\"202604003\"]}"
echo ""

echo "2.3 验证结果：应该只有 source=1 的精益工时数据"
echo "查询: SELECT employeeNo, calcDate, definitionAttendanceCodeStr, calcAttendanceCode, source, workHours"
echo "      FROM WorkHourResult"
echo "      WHERE calcDate = '$TEST_DATE' AND employeeNo = '202604003'"
echo ""
echo ""

# ==================== 数据验证查询 ====================
echo "=========================================="
echo "数据验证 SQL 查询"
echo "=========================================="
echo ""

echo "-- 查看该员工该日期的所有工时数据"
echo "SELECT"
echo "  employeeNo,"
echo "  calcDate,"
echo "  definitionAttendanceCodeStr AS '定义代码',"
echo "  calcAttendanceCode AS '计算代码',"
echo "  workHours,"
echo "  CASE source"
echo "    WHEN 1 THEN '精益工时'"
echo "    WHEN 2 THEN '考勤工时'"
echo "  END AS '工时类型',"
echo "  source,"
echo "  sourceBatchId,"
echo "  createdAt"
echo "FROM WorkHourResult"
echo "WHERE calcDate = '$TEST_DATE'"
echo "  AND employeeNo = '202604003'"
echo "  AND sourceType = 'CALCULATED'"
echo "ORDER BY source, definitionAttendanceCodeStr;"
echo ""

echo "-- 统计各类型的工时数据"
echo "SELECT"
echo "  calcDate,"
echo "  source,"
echo "  CASE source"
echo "    WHEN 1 THEN '精益工时'"
echo "    WHEN 2 THEN '考勤工时'"
echo "  END AS '工时类型',"
echo "  COUNT(*) AS count,"
echo "  SUM(workHours) AS totalHours"
echo "FROM WorkHourResult"
echo "WHERE calcDate = '$TEST_DATE'"
echo "  AND sourceType = 'CALCULATED'"
echo "GROUP BY calcDate, source;"
echo ""

echo "=========================================="
echo "测试说明"
echo "=========================================="
echo ""
echo "预期结果："
echo ""
echo "场景1（只计算考勤工时）:"
echo "  - 推送时只删除 source=2 的旧数据"
echo "  - 只插入 source=2 的新数据"
echo "  - 不影响 source=1 的精益工时数据"
echo ""
echo "场景2（只计算精益工时）:"
echo "  - 推送时只删除 source=1 的旧数据"
echo "  - 只插入 source=1 的新数据"
echo "  - 不影响 source=2 的考勤工时数据"
echo ""
echo "关键日志："
echo "  [WorkHourPushService] 员工 202604003 日期 $TEST_DATE 涉及的工时类型: 考勤工时(source=2)"
echo "  [WorkHourPushService] 删除结果: count=X, 类型: 考勤工时(source=2)"
echo ""
echo "=========================================="
