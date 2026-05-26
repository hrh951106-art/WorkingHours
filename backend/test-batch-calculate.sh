#!/bin/bash

# 登录
echo "登录中..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "登录失败"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "登录成功！Token: ${TOKEN:0:20}..."

# 触发批量计算
echo ""
echo "触发批量计算..."
curl -X POST http://localhost:3001/api/calculate/calculate/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-15",
    "endDate": "2026-04-16"
  }'

echo ""
echo "批量计算完成！"
