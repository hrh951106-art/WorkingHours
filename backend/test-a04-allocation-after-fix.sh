#!/bin/bash

echo "=== 测试修复后的 A04 分摊计算 ==="

# 登录
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 登录成功"

# 执行分摊计算
CALC_DATE="2026-05-14"

echo -e "\n执行分摊计算..."
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
echo -e "\n查询分摊结果..."
RESULTS=$(curl -s "http://localhost:3001/api/allocation/results?configId=4&skip=0&take=20" \
  -H "Authorization: Bearer $TOKEN")

echo "结果:"
echo "$RESULTS" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(f\"找到 {len(items)} 条分摊结果\"); [print(f\"- {item.get('sourceEmployeeNo')}: {item.get('sourceHours')}h -> {item.get('targetName')} ({item.get('allocationBasis')}): {item.get('allocatedHours')}h\") for item in items[:20]]" 2>/dev/null || echo "$RESULTS"
