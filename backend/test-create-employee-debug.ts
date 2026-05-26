// 模拟前端发送的数据
const frontendData = {
  employeeNo: '202605009',
  name: '测试员工',
  gender: 'MALE',
  nation: '汉族',  // 前端发送时使用驼峰命名
  positionTitle: '工程师',  // 前端发送时使用驼峰命名
  orgId: 1,
  entryDate: '2026-01-01',
  phone: '13800138000',
  email: 'test@example.com',
  maritalStatus: 'SINGLE',
  jobLevel: 'L1',
  employeeType: 'FULL_TIME',
  costCenter: 'CC001',
  employmentRelation: 'LABOR',
  jobPost: 'JP001',
  probationPeriod: 6,
};

// 后端的字段定义
const employeeFields = [
  'employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'orgId', 'entryDate',
  'status', 'birthDate', 'age', 'maritalStatus', 'nativePlace', 'politicalStatus',
  'householdRegister', 'currentAddress', 'photo', 'emergencyContact',
  'emergencyPhone', 'emergencyRelation', 'homeAddress', 'homePhone', 'customFields'
];

const workInfoFields = [
  'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
  'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
  'regularDate', 'resignationDate', 'resignationReason', 'workYears',
  'costCenter', 'employmentRelation',
  'orgId', 'effectiveDate', 'isCurrent', 'reason'
];

const workInfoCustomFieldKeys = [
  'probationPeriod', 'jobPost', 'usageStartDate', 'serviceYearsStartDate', 'estimatedProbationEndDate'
];

console.log('=== 前端发送的数据 ===');
console.log(JSON.stringify(frontendData, null, 2));

const employeeData: any = {};
const workInfoData: any = {};
const finalCustomFields: any = {};
const workInfoCustomFields: any = {};

Object.keys(frontendData).forEach(key => {
  const value = frontendData[key];

  if (employeeFields.includes(key)) {
    employeeData[key] = value;
    console.log(`✓ Employee 字段: ${key} = ${value}`);
  } else if (workInfoFields.includes(key)) {
    workInfoData[key] = value;
    console.log(`✓ WorkInfo 字段: ${key} = ${value}`);
  } else if (workInfoCustomFieldKeys.includes(key)) {
    workInfoCustomFields[key] = value;
    console.log(`✓ WorkInfo Custom 字段: ${key} = ${value}`);
  } else {
    finalCustomFields[key] = value;
    console.log(`✗ Employee Custom 字段: ${key} = ${value}`);
  }
});

console.log('\n=== 分类结果 ===');
console.log('employeeData:', JSON.stringify(employeeData, null, 2));
console.log('workInfoData:', JSON.stringify(workInfoData, null, 2));
console.log('workInfoCustomFields:', JSON.stringify(workInfoCustomFields, null, 2));
console.log('finalCustomFields:', JSON.stringify(finalCustomFields, null, 2));
