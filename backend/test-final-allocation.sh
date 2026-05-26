#!/bin/bash
echo "=== 最终测试 A04 分摊计算 ==="

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
echo -e "\n执行分摊计算..."
CALC_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/allocation/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "configId": 4,
    "startDate": "2026-05-14",
    "endDate": "2026-05-14"
  }')

echo "$CALC_RESPONSE" | python3 -m json.tool 2>/dev/null | head -20 || echo "$CALC_RESPONSE"

# 等待计算完成
sleep 3

# 查询结果
echo -e "\n查询分摊结果..."
RESULTS=$(curl -s "http://localhost:3001/api/allocation/results?configId=4&skip=0&take=50" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESULTS" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(f\"✅ 找到 {len(items)} 条分摊结果\"); [print(f\"{i+1}. 员工 {item.get('sourceEmployeeNo')}: {item.get('sourceHours')}h -> {item.get('targetName')}: {item.get('allocatedHours'):.2f}h ({item.get('allocationBasis')})\") for i, item in enumerate(items[:20])]" 2>/dev/null || echo "$RESULTS"

# 查看详细日志
echo -e "\n查看后端日志..."
tail -100 /tmp/claude/tasks/bde5331.output | grep -E "调试|lineToScope|原始产线|过滤后|生成分摊结果" | tail -20
