#!/bin/bash

# 测试金额政策页面的账户API调用

echo "=========================================="
echo "测试1: 获取所有账户（AmountPolicyPage中使用）"
echo "=========================================="
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJuYW1lIjoi57O757uf566h55CG5ZGYIiwiaWF0IjoxNzc5Njc0Njc1LCJleHAiOjE3ODAyNzk0NzV9.vrs5B421PZIuwqrh9-jC4IBS4a6E9L8frpeBr9pr76c"
curl -X GET 'http://localhost:3001/api/account/accounts?pageSize=1000' \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items | length'

echo ""
echo "=========================================="
echo "测试2: 获取SHIFT类型的子账户（AccountSelect中使用）"
echo "=========================================="
curl -X GET 'http://localhost:3001/api/account/accounts?type=SUB&usageType=SHIFT&pageSize=5&sortBy=createdAt&sortOrder=desc' \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items'

echo ""
echo "=========================================="
echo "测试3: 检查账户中是否有usageType字段"
echo "=========================================="
curl -X GET 'http://localhost:3001/api/account/accounts?pageSize=1000' \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items[] | select(.usageType == "SHIFT")'

