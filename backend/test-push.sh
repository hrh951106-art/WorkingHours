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

echo "登录成功！"

# 查询 CalcResult ID
echo ""
echo "查询 CalcResult ID..."
CALC_RESULT_IDS=$(sqlite3 prisma/dev.db "SELECT id FROM CalcResult WHERE id >= 36 ORDER BY id;")
echo "找到 CalcResult IDs: $CALC_RESULT_IDS"

# 手动触发推送
echo ""
echo "手动触发推送..."
curl -X POST http://localhost:3001/api/calculate/work-hours/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"calcResultIds\": [36, 37, 38, 39]
  }"

echo ""
echo "推送完成！"
