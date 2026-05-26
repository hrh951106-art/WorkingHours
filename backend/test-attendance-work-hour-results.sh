#!/bin/bash

TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "=== 测试考勤工时结果API ==="
curl -s -X GET "http://localhost:3001/api/calculate/work-hour-results?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50

echo ""
echo "=== 测试考勤摆卡结果API ==="
curl -s -X GET "http://localhost:3001/api/punch/attendance-punch/results?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -50
