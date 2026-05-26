#!/bin/bash

# 登录获取token
echo "=== 考勤工时计算测试 ==="
TOKEN=$(curl -s -X POST 'http://localhost:3001/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

echo ""
echo "=== 测试计算202604003员工在2026-05-13的考勤工时 ==="
curl -s -X POST "http://localhost:3001/api/calculate/attendance-work-hours/calculate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNo": "202604003",
    "calcDate": "2026-05-13"
  }' | python3 -m json.tool | head -100

