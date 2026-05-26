#!/bin/bash

# 登录获取token
echo "=== 登录 ==="
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

# 尝试解析token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  # 尝试其他密码
  LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"123456"}')
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "登录失败，无法获取token"
  echo "响应: $LOGIN_RESPONSE"
  exit 1
fi

echo "Token已获取"
echo ""

# 调用my-requests接口
echo "=== 调用 /api/support/my-requests ==="
curl -s -X GET "http://localhost:3001/api/support/my-requests?page=1&pageSize=50" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
