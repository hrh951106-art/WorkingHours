import fetch from 'node-fetch';

async function testAPI() {
  console.log('=== 测试考勤卡工时 API ===\n');

  const response = await fetch('http://localhost:3001/api/attendance-dashboard/work-hour-results?employeeNo=202604003&startDate=2026-05-10&endDate=2026-05-12', {
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzM4MDQ4MzIsImV4cCI6MTc3Mzg5MTIzMn0.9wUkWJPVWqvFpGJKsFJMqR0kLJQFhPJIhJhfvjfHrw0'
    }
  });

  const result = await response.json();

  console.log('API 响应状态:', response.status);
  console.log('\n返回的数据:');
  console.log(JSON.stringify(result, null, 2));

  if (result.data && Array.isArray(result.data)) {
    console.log(`\n共 ${result.data.length} 条汇总记录:`);
    result.data.forEach((item: any, index: number) => {
      console.log(`\n${index + 1}.`);
      console.log(`   劳动力账户: ${item.accountName}`);
      console.log(`   出勤代码: ${item.attendanceCodeName}`);
      console.log(`   总工时: ${item.totalHours} 小时`);
    });
  }
}

testAPI().catch(console.error);
