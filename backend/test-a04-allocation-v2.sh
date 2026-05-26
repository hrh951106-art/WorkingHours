#!/bin/bash

echo "=== 测试 A04 分摊计算 v2 ==="

# 登录获取 token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"

# 先查询工时数据的实际日期
echo -e "\n1. 查询工时数据日期..."
DATE_DATA=$(sqlite3 prisma/dev.db "SELECT DISTINCT calcDate FROM WorkHourResult WHERE calcAttendanceCode = 'A04' ORDER BY calcDate DESC LIMIT 1")
echo "工时日期: $DATE_DATA"

# 使用工时数据的实际日期
CALC_DATE=$(echo $DATE_DATA | python3 -c "import sys; ts=int(sys.stdin.read()); from datetime import datetime; print(datetime.fromtimestamp(ts/1000).strftime('%Y-%m-%d'))")
echo "格式化日期: $CALC_DATE"

# 执行分摊计算（传入 startDate 和 endDate）
echo -e "\n2. 执行分摊计算..."
CALC_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/allocation/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"configId\": 4,
    \"startDate\": \"$CALC_DATE\",
    \"endDate\": \"$CALC_DATE\"
  }")

echo "计算响应:"
echo "$CALC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CALC_RESPONSE"

# 等待计算完成
sleep 3

# 查询结果
echo -e "\n3. 查询分摊结果..."
RESULTS=$(curl -s "http://localhost:3001/api/allocation/results?configId=4&skip=0&take=10" \
  -H "Authorization: Bearer $TOKEN")

echo "结果:"
echo "$RESULTS" | python3 -m json.tool 2>/dev/null || echo "$RESULTS"
