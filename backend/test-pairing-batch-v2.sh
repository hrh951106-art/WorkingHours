TOKEN=$(cat /tmp/token.txt)
echo "=== Trigger batch punch pairing (correct format) ==="
curl -s -X POST "http://localhost:3001/api/punch/pairing/batch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeNos": ["202604003"],
    "startDate": "2026-05-12T00:00:00.000Z",
    "endDate": "2026-05-12T23:59:59.999Z"
  }' | python3 -m json.tool | head -100
