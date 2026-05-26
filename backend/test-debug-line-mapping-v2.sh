#!/bin/bash
echo "=== 调试产线映射 v2 ==="

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', ''))" 2>/dev/null)

curl -s -X POST "http://localhost:3001/api/allocation/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"configId": 4, "startDate": "2026-05-14", "endDate": "2026-05-14"}' > /dev/null

sleep 2

echo "查看日志..."
tail -50 /tmp/claude/tasks/bde5331.output | grep -E "调试|lineToScope|映射|原始产线|过滤后" | tail -20
