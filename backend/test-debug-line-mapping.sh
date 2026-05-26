#!/bin/bash
echo "=== 调试产线映射 ==="

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', ''))" 2>/dev/null)

CALC_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/allocation/calculate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"configId": 4, "startDate": "2026-05-14", "endDate": "2026-05-14"}')

echo "$CALC_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CALC_RESPONSE"
