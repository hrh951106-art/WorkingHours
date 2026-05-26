import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEmployeeCreate() {
  // 模拟前端发送的数据
  const testData = {
    employeeNo: 'TEST2026001',
    name: '测试员工',
    gender: 'MALE',
    nation: '汉族',  // 不在 Employee 表中
    positionTitle: '工程师',  // 不在 Employee 表中
    orgId: 1,
    entryDate: '2026-01-01',
    phone: '13800138000',
    email: 'test@example.com',
    maritalStatus: 'SINGLE',
    jobLevel: 'L1',
    employeeType: 'FULL_TIME',
    costCenter: 'CC001',  // 在 WorkInfoHistory 表中
    employmentRelation: 'LABOR',  // 在 WorkInfoHistory 表中
    jobPost: 'JP001',  // 不在 WorkInfoHistory 表中
    probationPeriod: 6,  // 不在 WorkInfoHistory 表中
  };

  // 检查字段会如何被分类
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

  console.log('=== 测试数据分类 ===');
  console.log('\n原始数据:', JSON.stringify(testData, null, 2));

  const employeeData: any = {};
  const workInfoData: any = {};
  const finalCustomFields: any = {};

  Object.keys(testData).forEach(key => {
    const value = testData[key];

    if (employeeFields.includes(key)) {
      employeeData[key] = value;
      console.log(`✓ Employee 字段: ${key} = ${value}`);
    } else if (workInfoFields.includes(key)) {
      workInfoData[key] = value;
      console.log(`✓ WorkInfo 字段: ${key} = ${value}`);
    } else {
      finalCustomFields[key] = value;
      console.log(`✗ Custom 字段: ${key} = ${value}`);
    }
  });

  console.log('\n=== 分类结果 ===');
  console.log('Employee 数据:', JSON.stringify(employeeData, null, 2));
  console.log('WorkInfo 数据:', JSON.stringify(workInfoData, null, 2));
  console.log('CustomFields 数据:', JSON.stringify(finalCustomFields, null, 2));

  console.log('\n=== 数据库字段检查 ===');
  console.log('Employee 表有 nation 字段?', false);
  console.log('Employee 表有 positionTitle 字段?', false);
  console.log('WorkInfoHistory 表有 jobPost 字段?', false);
  console.log('WorkInfoHistory 表有 probationPeriod 字段?', false);
}

testEmployeeCreate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
