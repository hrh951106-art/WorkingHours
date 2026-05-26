#!/bin/bash

# 登录获取token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

echo "Token obtained: ${TOKEN:0:50}..."
echo ""

echo "=== 1. 测试产品列表 API ==="
PRODUCTS=$(curl -s -X GET "http://localhost:3001/api/allocation/products" \
  -H "Authorization: Bearer $TOKEN")
echo "$PRODUCTS" | head -c 300
echo ""

echo ""
echo "=== 2. 获取现有产量记录 ==="
RECORDS=$(curl -s -X GET "http://localhost:3001/api/allocation/production-records?recordDate=2025-01-16" \
  -H "Authorization: Bearer $TOKEN")
echo "$RECORDS" | grep -o '"id":[0-9]*' | head -1

# 获取第一条记录的ID
RECORD_ID=$(echo "$RECORDS" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Record ID to edit: $RECORD_ID"

if [ -z "$RECORD_ID" ]; then
  echo "No records found, creating one..."
  # 创建一条记录
  curl -s -X POST "http://localhost:3001/api/allocation/production-records" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "recordDate": "2025-01-16",
      "orgId": 3,
      "orgName": "测试产线",
      "productId": 2,
      "productCode": "ELECTRONICS",
      "productName": "电子产品",
      "actualQty": 100,
      "source": "MANUAL",
      "recorderId": 1,
      "recorderName": "系统管理员"
    }' > /tmp/create_result.json
  RECORD_ID=$(cat /tmp/create_result.json | grep -o '"id":[0-9]*' | cut -d':' -f2)
  echo "Created record ID: $RECORD_ID"
fi

echo ""
echo "=== 3. 测试更新产量记录 ==="
curl -s -X PUT "http://localhost:3001/api/allocation/production-records/$RECORD_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recordDate": "2025-01-16",
    "orgId": 3,
    "orgName": "测试产线",
    "productId": 1,
    "productCode": "MACHINERY",
    "productName": "机械设备",
    "actualQty": 200,
    "source": "MANUAL",
    "recorderId": 1,
    "recorderName": "系统管理员"
  }' | head -c 500

echo ""
echo ""
echo "=== 4. 验证更新结果 ==="
curl -s -X GET "http://localhost:3001/api/allocation/production-records/$RECORD_ID" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"productId":[0-9]*|"productName":"[^"]*"' | head -2

echo ""
echo "=== Test Complete ==="
