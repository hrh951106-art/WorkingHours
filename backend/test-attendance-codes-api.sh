#!/bin/bash

TOKEN=$(cat /tmp/token.txt)
BASE_URL="http://localhost:3001/api"

echo "========================================="
echo "测试计算出勤代码API"
echo "========================================="
echo ""

echo "【获取计算出勤代码列表】"
curl -s "$BASE_URL/calculate/calculation-attendance-codes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        items = data.get('data', [])
        if isinstance(items, dict) and 'items' in items:
            items = items['items']
        print(f'✅ 成功获取计算出勤代码')
        print(f'数量: {len(items)}')
        print('')
        print('【计算出勤代码列表】')
        for item in items:
            print(f\"  代码: {item.get('code'):10} | 名称: {item.get('name'):20} | 类型: {item.get('type'):20} | 启用金额计算: {item.get('calculateAmount')}\")
    else:
        print(f'❌ 失败: {data.get(\"message\")}')
except Exception as e:
    print(f'❌ 解析失败: {e}')
    print('原始响应:')
    print(sys.stdin.read())
"

echo ""
echo "========================================="
