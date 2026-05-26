#!/bin/bash

# 测试批量摆卡API的删除旧数据功能

echo "========================================"
echo "测试批量摆卡删除旧数据"
echo "========================================"
echo ""

# 1. 获取Token
echo "1. 登录获取Token..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.access_token')

echo "Token: ${TOKEN:0:20}..."
echo ""

# 2. 检查摆卡前的数据
echo "2. 摆卡前的数据统计:"
BEFORE_COUNT=$(curl -s "http://localhost:3001/api/punch/pairing?employeeNo=202605002&pairDate=2026-05-09" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')
echo "   2026-05-09 的摆卡记录数: $BEFORE_COUNT"
echo ""

# 3. 执行批量摆卡（会先删除旧数据）
echo "3. 执行批量摆卡..."
curl -s -X POST http://localhost:3001/api/punch/pairing/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pairDate":"2026-05-09","employeeNos":["202605002"]}' | jq '.'
echo ""

# 4. 检查摆卡后的数据
echo "4. 摆卡后的数据统计:"
AFTER_COUNT=$(curl -s "http://localhost:3001/api/punch/pairing?employeeNo=202605002&pairDate=2026-05-09" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')
echo "   2026-05-09 的摆卡记录数: $AFTER_COUNT"
echo ""

# 5. 再次执行批量摆卡，验证是否删除旧数据
echo "5. 再次执行批量摆卡（应该会先删除旧数据）..."
curl -s -X POST http://localhost:3001/api/punch/pairing/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pairDate":"2026-05-09","employeeNos":["202605002"]}' | jq '.'
echo ""

# 6. 最终检查
echo "6. 最终数据统计:"
FINAL_COUNT=$(curl -s "http://localhost:3001/api/punch/pairing?employeeNo=202605002&pairDate=2026-05-09" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')
echo "   2026-05-09 的摆卡记录数: $FINAL_COUNT"
echo ""

echo "========================================"
echo "✅ 测试完成"
echo "========================================"
echo ""
echo "验证结果："
echo "  - 摆卡前: $BEFORE_COUNT 条"
echo "  - 第一次摆卡后: $AFTER_COUNT 条"
echo "  - 第二次摆卡后: $FINAL_COUNT 条"
echo ""
if [ "$FINAL_COUNT" -eq "$AFTER_COUNT" ]; then
  echo "✅ 删除功能正常：再次摆卡没有产生重复数据"
else
  echo "❌ 删除功能异常：数据数量不一致"
fi
