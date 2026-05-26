#!/bin/bash

# 测试生成劳动力账户API
echo "测试 /hr/employees/1/accounts/regenerate 接口..."

curl -X POST http://localhost:3001/api/hr/employees/1/accounts/regenerate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo" \
  -H "Content-Type: application/json" \
  -v 2>&1
