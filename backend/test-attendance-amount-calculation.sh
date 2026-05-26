#!/bin/bash

# 测试考勤工时金额计算功能
# 该脚本测试考勤工时计算时是否正确计算并保存金额

BASE_URL="http://localhost:3001/api"
TOKEN=""

echo "========================================="
echo "考勤工时金额计算功能测试"
echo "========================================="
echo ""

# 1. 登录获取 token
echo "步骤 1: 登录系统..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"
echo ""

# 2. 获取一个测试员工
echo "步骤 2: 获取测试员工信息..."
EMPLOYEES=$(curl -s -X GET "$BASE_URL/hr/employees?limit=5" \
  -H "Authorization: Bearer $TOKEN")

# 获取第一个员工的工号
EMPLOYEE_NO=$(echo $EMPLOYEES | grep -o '"employeeNo":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$EMPLOYEE_NO" ]; then
  echo "❌ 未找到员工信息"
  exit 1
fi

echo "✅ 找到测试员工: $EMPLOYEE_NO"
echo ""

# 3. 检查该员工是否有人员系数配置
echo "步骤 3: 检查人员系数配置..."
COEFFICIENT=$(curl -s -X GET "$BASE_URL/amount/employee-coefficient/employee/$EMPLOYEE_NO" \
  -H "Authorization: Bearer $TOKEN")

COEFFICIENT_VALUE=$(echo $COEFFICIENT | grep -o '"coefficient":[0-9.]*' | head -1 | cut -d':' -f2)

if [ -z "$COEFFICIENT_VALUE" ]; then
  echo "⚠️  该员工未配置人员系数，金额计算结果将为 0"
else
  echo "✅ 该员工已配置人员系数: $COEFFICIENT_VALUE"
fi
echo ""

# 4. 检查计算出勤代码是否启用金额计算
echo "步骤 4: 检查出勤代码金额计算配置..."
ATTENDANCE_CODES=$(curl -s -X GET "$BASE_URL/calculation/attendance-codes" \
  -H "Authorization: Bearer $TOKEN")

# 查找启用金额计算的考勤工时代码
CALC_AMOUNT_CODES=$(echo $ATTENDANCE_CODES | jq -r '.data[] | select(.calculateAmount == true and .type == "ATTENDANCE_HOURS") | .code' | head -5)

if [ -z "$CALC_AMOUNT_CODES" ]; then
  echo "⚠️  未找到启用金额计算的考勤工时代码"
else
  echo "✅ 找到启用金额计算的考勤工时代码:"
  echo "$CALC_AMOUNT_CODES" | while read code; do
    echo "   - $code"
  done
fi
echo ""

# 5. 执行考勤工时计算
echo "步骤 5: 执行考勤工时计算..."
TEST_DATE=$(date +%Y-%m-%d)

CALCULATE_RESPONSE=$(curl -s -X POST "$BASE_URL/calculate/attendance-work-hours/calculate-by-date-range" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employeeNos\": [\"$EMPLOYEE_NO\"],
    \"startDate\": \"$TEST_DATE\",
    \"endDate\": \"$TEST_DATE\"
  }")

echo "计算响应: $CALCULATE_RESPONSE"
echo ""

# 6. 检查 CalcResult 中的金额字段
echo "步骤 6: 检查 CalcResult 中的金额数据..."
CALC_RESULTS=$(curl -s -X GET "$BASE_URL/calculate/results?employeeNo=$EMPLOYEE_NO&startDate=$TEST_DATE&endDate=$TEST_DATE" \
  -H "Authorization: Bearer $TOKEN")

echo "计算结果:"
echo "$CALC_RESULTS" | jq '.data[] | {
  id,
  employeeNo,
  calcDate,
  attendanceCode: .calculationAttendanceCode.code,
  workHours: .actualHours,
  amount,
  accountName
}' 2>/dev/null || echo "$CALC_RESULTS"
echo ""

# 7. 检查 WorkHourResult 中的金额字段
echo "步骤 7: 检查 WorkHourResult 中的金额数据..."
WORK_HOUR_RESULTS=$(curl -s -X GET "$BASE_URL/calculate/work-hour-results?employeeNo=$EMPLOYEE_NO&startDate=$TEST_DATE&endDate=$TEST_DATE" \
  -H "Authorization: Bearer $TOKEN")

echo "工时结果:"
echo "$WORK_HOUR_RESULTS" | jq '.data[] | {
  employeeNo,
  calcDate,
  attendanceCode: .definitionAttendanceCodeStr,
  workHours,
  amount,
  source,
  sourceType
}' 2>/dev/null || echo "$WORK_HOUR_RESULTS"
echo ""

# 8. 统计金额信息
echo "步骤 8: 统计金额信息..."
TOTAL_AMOUNT=$(echo "$CALC_RESULTS" | jq '[.data[].amount] | add' 2>/dev/null || echo "0")

echo "✅ 测试完成"
echo ""
echo "========================================="
echo "测试结果摘要"
echo "========================================="
echo "测试员工: $EMPLOYEE_NO"
echo "测试日期: $TEST_DATE"
echo "人员系数: $COEFFICIENT_VALUE"
echo "总金额: $TOTAL_AMOUNT"
echo ""
echo "说明:"
echo "- 如果人员系数未配置，金额将为 0"
echo "- 如果出勤代码未启用金额计算，金额将为 0"
echo "- 金额计算公式: 工时数 × 人员系数 × 金额规则系数(如果有)"
echo "========================================="
