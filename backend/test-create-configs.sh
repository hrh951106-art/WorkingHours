#!/bin/bash

# Login and get token
TOKEN=$(curl -s http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Create configs
curl -s -X POST "http://localhost:3001/api/hr/unified-search-condition-configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"configCode":"emp-list-name","configName":"员工列表-姓名","fieldCode":"name","fieldName":"姓名","fieldType":"text","isEnabled":true,"sortOrder":1,"applicablePages":["employee-list"]}'

curl -s -X POST "http://localhost:3001/api/hr/unified-search-condition-configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"configCode":"emp-list-gender","configName":"员工列表-性别","fieldCode":"gender","fieldName":"性别","fieldType":"select","dataSourceCode":"GENDER","isEnabled":true,"sortOrder":2,"applicablePages":["employee-list"]}'

# Get all configs
curl -s "http://localhost:3001/api/hr/unified-search-condition-configs" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
