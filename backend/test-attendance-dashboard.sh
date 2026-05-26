#!/bin/bash

# 登录并获取 token
echo "登录获取 Token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

# 提取 token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取 Token"
  exit 1
fi

echo "✅ 登录成功"
echo "Token: ${TOKEN:0:20}..."
echo ""

# 测试参数
EMPLOYEE_NO="202604003"
START_DATE="2026-05-01"
END_DATE="2026-05-31"

echo "======================================"
echo "测试考勤看板 API"
echo "员工: $EMPLOYEE_NO"
echo "日期范围: $START_DATE ~ $END_DATE"
echo "======================================"
echo ""

# 测试 1: 获取所有数据（推荐接口）
echo "1️⃣  测试 /attendance-dashboard/all 接口..."
echo ""
curl -s "http://localhost:3001/api/attendance-dashboard/all?employeeNo=$EMPLOYEE_NO&startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  | head -100

echo ""
echo ""

# 测试 2: 获取打卡数据
echo "2️⃣  测试 /attendance-dashboard/punch-data 接口..."
echo ""
curl -s "http://localhost:3001/api/attendance-dashboard/punch-data?employeeNo=$EMPLOYEE_NO&startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  | head -50

echo ""
echo ""

# 测试 3: 获取工时结果
echo "3️⃣  测试 /attendance-dashboard/work-hour-results 接口..."
echo ""
curl -s "http://localhost:3001/api/attendance-dashboard/work-hour-results?employeeNo=$EMPLOYEE_NO&startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  | head -50

echo ""
echo ""

# 测试 4: 获取排班数据
echo "4️⃣  测试 /attendance-dashboard/schedules 接口..."
echo ""
curl -s "http://localhost:3001/api/attendance-dashboard/schedules?employeeNo=$EMPLOYEE_NO&startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  | head -50

echo ""
echo ""

# 测试 5: 获取汇总数据
echo "5️⃣  测试 /attendance-dashboard/summary 接口..."
echo ""
curl -s "http://localhost:3001/api/attendance-dashboard/summary?employeeNo=$EMPLOYEE_NO&startDate=$START_DATE&endDate=$END_DATE" \
  -H "Authorization: Bearer $TOKEN"

echo ""
echo ""
echo "======================================"
echo "✅ API 测试完成"
echo "======================================"
