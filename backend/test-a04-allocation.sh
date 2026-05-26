#!/bin/bash

echo "=== 测试 A04 分摊计算 ==="

# 使用已知有效的 token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo"

# 先登录获取新 token
echo "1. 登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

NEW_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', ''))" 2>/dev/null)

if [ ! -z "$NEW_TOKEN" ]; then
  TOKEN="$NEW_TOKEN"
  echo "✅ 登录成功，获取新 token"
else
  echo "⚠️  使用现有 token"
fi

# 执行分摊计算
echo -e "\n2. 执行分摊计算..."
CALC_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/allocation/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "configId": 4,
    "recordDate": "2025-05-10"
  }')

echo "计算响应:"
echo "$CALC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CALC_RESPONSE"

# 等待一下让计算完成
sleep 2

# 查询结果
echo -e "\n3. 查询分摊结果..."
RESULTS=$(curl -s "http://localhost:3001/api/allocation/results?configId=4&skip=0&take=10" \
  -H "Authorization: Bearer $TOKEN")

echo "结果:"
echo "$RESULTS" | python3 -m json.tool 2>/dev/null || echo "$RESULTS"
