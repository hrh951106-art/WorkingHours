#!/bin/bash

# 登录获取token
echo "=== 登录获取token ==="
LOGIN_RESPONSE=$(curl -s -X POST 'http://localhost:3001/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')

echo "$LOGIN_RESPONSE" | python3 -m json.tool

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

echo ""
echo "=== 测试工时查询API ==="
curl -s "http://localhost:3001/api/allocation/work-hours?page=1&pageSize=5" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

