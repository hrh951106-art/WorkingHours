#!/bin/bash

# 获取token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

echo "Token obtained: ${TOKEN:0:50}..."
echo ""

# 测试创建配置
echo "=== 测试创建挣得工时配置 ==="
CREATE_RESULT=$(curl -s -X POST "http://localhost:3001/api/earned-hours-allocation/configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "configCode": "TEST_001",
    "configName": "测试配置",
    "orgId": 1,
    "effectiveStartTime": "2025-01-01",
    "status": "DRAFT",
    "description": "测试配置描述",
    "createdById": 1,
    "createdByName": "Admin",
    "sourceConfig": {
      "sourceType": "PRODUCTION_RECORD",
      "productionFilter": "{}",
      "accountFilter": "{}"
    }
  }')

echo "$CREATE_RESULT" | head -c 500
echo ""

# 获取创建的配置ID
CONFIG_ID=$(echo "$CREATE_RESULT" | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
echo "Created config ID: $CONFIG_ID"

echo ""
echo "=== 再次获取配置列表 ==="
curl -s -X GET "http://localhost:3001/api/earned-hours-allocation/configs" \
  -H "Authorization: Bearer $TOKEN" | head -c 500
echo ""

if [ ! -z "$CONFIG_ID" ]; then
  echo ""
  echo "=== 测试更新配置 ==="
  curl -s -X PUT "http://localhost:3001/api/earned-hours-allocation/configs/$CONFIG_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "configCode": "TEST_001",
      "configName": "测试配置（已更新）",
      "orgId": 1,
      "effectiveStartTime": "2025-01-01",
      "status": "ACTIVE",
      "description": "更新后的描述"
    }' | head -c 500
  echo ""

  echo ""
  echo "=== 测试删除配置 ==="
  curl -s -X DELETE "http://localhost:3001/api/earned-hours-allocation/configs/$CONFIG_ID" \
    -H "Authorization: Bearer $TOKEN"
  echo ""
fi
