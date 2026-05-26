#!/bin/bash

# 获取token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

echo "Token obtained"
echo ""

# 清理现有配置
echo "=== 清理现有配置 ==="
curl -s -X GET "http://localhost:3001/api/earned-hours-allocation/configs" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":[0-9]*' | cut -d':' -f2 | while read id; do
  echo "Deleting config $id..."
  curl -s -X DELETE "http://localhost:3001/api/earned-hours-allocation/configs/$id" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
done

echo ""
echo "=== 创建新的测试配置（带筛选条件） ==="
curl -s -X POST "http://localhost:3001/api/earned-hours-allocation/configs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "configCode": "EARNED_WITH_FILTER",
    "configName": "挣得工时规则（带筛选条件）",
    "orgId": 1,
    "effectiveStartTime": "2025-01-01",
    "status": "DRAFT",
    "description": "测试筛选条件功能",
    "createdById": 1,
    "createdByName": "Admin",
    "sourceConfig": {
      "filterGroups": [
        {
          "id": "group_1",
          "employeeFilter": {
            "fieldGroups": [
              {
                "id": "fg_1",
                "conditions": [
                  {
                    "fieldCode": "organization",
                    "fieldName": "产线",
                    "fieldType": "organization",
                    "operator": "in",
                    "value": ["1", "2"]
                  }
                ]
              }
            ]
          },
          "workHoursFilter": {
            "hierarchySelections": [
              {
                "levelId": 1,
                "level": 1,
                "levelName": "工厂",
                "valueIds": [1]
              }
            ],
            "attendanceCodes": ["NORMAL", "OVERTIME"]
          }
        }
      ]
    }
  }' | python3 -m json.tool 2>&1 | head -50

echo ""
echo "=== 验证配置列表 ==="
curl -s -X GET "http://localhost:3001/api/earned-hours-allocation/configs" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool 2>&1 | head -80
