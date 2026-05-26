TOKEN=$(cat /tmp/token.txt)
curl -s "http://localhost:3001/api/punch/attendance-punch-pair/calculate-daily?employeeNo=202604003&calcDate=2026-05-12" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
