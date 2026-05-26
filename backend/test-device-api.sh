#!/bin/bash

echo "=== 测试设备管理 API ==="
echo ""

# 1. 登录获取 token
echo "1. 登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "登录失败"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "登录成功，Token: ${TOKEN:0:20}..."
echo ""

# 2. 获取设备列表
echo "2. 获取设备列表..."
DEVICES_RESPONSE=$(curl -s http://localhost:3001/api/punch/devices \
  -H "Authorization: Bearer $TOKEN")

echo "响应："
echo $DEVICES_RESPONSE | python3 -m json.tool 2>/dev/null || echo $DEVICES_RESPONSE
echo ""

# 3. 检查响应结构
DEVICE_COUNT=$(echo $DEVICES_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data) if isinstance(data, list) else 'Not a list')" 2>/dev/null)

if [ "$DEVICE_COUNT" = "Not a list" ]; then
  echo "⚠️  警告：响应不是数组格式"
  echo "完整响应："
  echo $DEVICES_RESPONSE
else
  echo "✓ 设备列表正常，共 $DEVICE_COUNT 个设备"
fi

echo ""
echo "=== 测试完成 ==="
