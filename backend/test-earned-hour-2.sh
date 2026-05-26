#!/bin/bash

# 获取token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

echo "=== 创建新的测试配置 ==="
CREATE_RESULT=$(curl -s -X POST "http://localhost:3001/api/earned-hours-allocation/configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "configCode": "TEST_002",
    "configName": "测试配置2",
    "orgId": 1,
    "effectiveStartTime": "2025-01-01",
    "status": "DRAFT",
    "description": "测试配置2",
    "createdById": 1,
    "createdByName": "Admin"
  }')

CONFIG_ID=$(echo "$CREATE_RESULT" | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
echo "Created config ID: $CONFIG_ID"

if [ ! -z "$CONFIG_ID" ]; then
  echo ""
  echo "=== 测试删除 DRAFT 状态的配置 ==="
  curl -s -X DELETE "http://localhost:3001/api/earned-hours-allocation/configs/$CONFIG_ID" \
    -H "Authorization: Bearer $TOKEN"
  echo ""

  echo ""
  echo "=== 验证删除后的配置列表 ==="
  curl -s -X GET "http://localhost:3001/api/earned-hours-allocation/configs" \
    -H "Authorization: Bearer $TOKEN" | grep -o '"total":[0-9]*'
fi
