#!/bin/bash

TOKEN=$(cat /tmp/token.txt)
BASE_URL="http://localhost:3001/api"

echo "========================================="
echo "更新金额政策：AC_001 → A02"
echo "========================================="
echo ""

# 更新金额政策
RESULT=$(curl -s -X PUT "$BASE_URL/amount/policies/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "1.5倍金额",
    "description": "线体工时大桶焊接账户1.5倍",
    "policyType": "MULTIPLY",
    "multiplier": 1.5,
    "accountPath": "///大桶/焊接//",
    "accountPathMatch": "LEVEL",
    "attendanceCodes": ["A02"],
    "priority": 0
  }')

echo "$RESULT" | python3 -m json.tool

if echo "$RESULT" | grep -q '"success":true'; then
  echo ""
  echo "✅ 更新成功！"
  echo ""

  # 验证更新
  sleep 2
  echo "更新后的配置："
  curl -s -X GET "$BASE_URL/amount/policies/1" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "
import json, sys
data = json.load(sys.stdin)['data']
print(f'  出勤代码: {data[\"attendanceCodes\"]}')
print(f'  账户路径: {data[\"accountPath\"]}')
print(f'  匹配模式: {data[\"accountPathMatch\"]}')
print(f'  倍数: {data[\"multiplier\"]}')
"
else
  echo ""
  echo "❌ 更新失败"
  echo "$RESULT" | python3 -c "import json, sys; data = json.load(sys.stdin); print(data.get('message', 'Unknown error'))"
fi
