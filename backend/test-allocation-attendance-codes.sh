#!/bin/bash

echo "========== 测试分摊配置出勤代码接口 =========="
echo ""

# 设置API地址
API_BASE="http://localhost:3000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo"

echo "1. 测试接口: $API_BASE/allocation/attendance-codes"
echo ""

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_BASE/allocation/attendance-codes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

http_code=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "HTTP状态码: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✓ 接口调用成功！"
    echo ""
    echo "返回数据:"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
else
    echo "✗ 接口调用失败！"
    echo ""
    echo "响应内容:"
    echo "$body"
fi

echo ""
echo "========== 测试完成 =========="
