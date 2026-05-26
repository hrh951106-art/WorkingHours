#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "========================================="
echo "完整测试考勤工时金额计算"
echo "========================================="
echo ""

# 登录
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "✅ 登录成功"
echo ""

# 1. 先删除旧数据
echo "步骤 1: 清理旧数据..."
curl -s -X DELETE "$BASE_URL/calculate/results/delete-by-date-range" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNos": ["202604003"],
    "startDate": "2026-05-12",
    "endDate": "2026-05-12"
  }' > /dev/null

echo "旧数据已清理"
echo ""

# 2. 执行考勤工时计算
echo "步骤 2: 执行考勤工时计算..."
CALC_RESULT=$(curl -s -X POST "$BASE_URL/calculate/attendance-work-hours/calculate-by-date-range" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNos": ["202604003"],
    "startDate": "2026-05-12",
    "endDate": "2026-05-12"
  }')

echo "计算结果: $CALC_RESULT"
echo ""

# 3. 等待推送完成
echo "步骤 3: 等待数据推送..."
sleep 3
echo ""

# 4. 查询 CalcResult 中的数据
echo "步骤 4: 查询 CalcResult 中的数据..."
CALC_RESULTS=$(curl -s -X GET "$BASE_URL/calculate/results?employeeNo=202604003&startDate=2026-05-12&endDate=2026-05-12&limit=50" \
  -H "Authorization: Bearer $TOKEN")

echo "$CALC_RESULTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)['data']['items']
print(f'总共 {len(data)} 条 CalcResult 记录')
print('')
for item in data:
    code = item.get('calculationAttendanceCode', {}).get('code', 'N/A')
    atype = item.get('calculationAttendanceCode', {}).get('type', 'N/A')
    hours = item.get('actualHours', 0)
    amount = item.get('amount', 0)
    account = item.get('accountName', 'N/A')
    print(f'ID: {item[\"id\"]}')
    print(f'  出勤代码: {code} ({atype})')
    print(f'  工时: {hours} 小时')
    print(f'  金额: {amount}')
    print(f'  账户: {account}')
    print('')
"
echo ""

# 5. 查询 WorkHourResult 中的数据
echo "步骤 5: 查询 WorkHourResult 中的数据..."
WORK_HOUR_RESULTS=$(curl -s -X GET "$BASE_URL/calculate/work-hour-results?employeeNo=202604003&startDate=2026-05-12&endDate=2026-05-12&limit=50" \
  -H "Authorization: Bearer $TOKEN")

echo "$WORK_HOUR_RESULTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)['data']['items']
print(f'总共 {len(data)} 条 WorkHourResult 记录')
print('')
for item in data:
    code = item.get('calculationAttendanceCode', {}).get('code', 'N/A')
    atype = item.get('calculationAttendanceCode', {}).get('type', 'N/A')
    hours = item.get('workHours', 0)
    amount = item.get('amount', 0)
    source = item.get('source', 'N/A')
    print(f'ID: {item[\"id\"]}')
    print(f'  出勤代码: {code} ({atype})')
    print(f'  工时: {hours} 小时')
    print(f'  金额: {amount}')
    print(f'  来源: {source} (1=精益工时, 2=考勤工时)')
    print('')
"
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
echo ""
echo "预期结果:"
echo "- CalcResult 中应该有金额数据（精益工时和考勤工时）"
echo "- WorkHourResult 中应该有金额数据（考勤工时）"
echo "- 考勤工时金额 = 5小时 × 30系数 × 1.5倍 = 225"
echo ""
