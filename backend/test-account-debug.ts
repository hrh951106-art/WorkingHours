import { PrismaService } from './src/database/prisma.service';

async function test() {
  const prisma = new PrismaService();

  try {
    console.log('=== 检查WorkInfoHistory状态 ===\n');

    // 检查WorkInfoHistory
    const workInfoHistory = await prisma.workInfoHistory.findFirst({
      where: {
        employeeId: 5,
        isCurrent: true,
      },
    });

    if (workInfoHistory) {
      console.log('✅ WorkInfoHistory存在:');
      console.log(`   ID: ${workInfoHistory.id}`);
      console.log(`   employeeType: ${workInfoHistory.employeeType || '(空)'}`);
      console.log(`   isCurrent: ${workInfoHistory.isCurrent}`);

      const customFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};
      console.log(`   customFields.jobPost: ${customFields.jobPost || '(空)'}`);
    } else {
      console.log('❌ WorkInfoHistory不存在或isCurrent=false');
    }

    // 检查Employee
    console.log('\n=== 检查Employee状态 ===\n');
    const employee = await prisma.employee.findUnique({
      where: { id: 5 },
      select: { customFields: true },
    });

    if (employee) {
      const empCustomFields = typeof employee.customFields === 'string'
        ? JSON.parse(employee.customFields)
        : employee.customFields || {};
      console.log('Employee.customFields:', JSON.stringify(empCustomFields, null, 2));
    }

    // 模拟合并customFields的逻辑
    console.log('\n=== 模拟合并customFields ===\n');
    const customFields = typeof employee?.customFields === 'string'
      ? JSON.parse(employee.customFields)
      : employee?.customFields || {};

    console.log('1. 初始customFields:', JSON.stringify(customFields, null, 2));

    if (workInfoHistory) {
      const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};

      console.log('2. WorkInfoHistory.customFields:', JSON.stringify(workInfoCustomFields, null, 2));

      Object.assign(customFields, workInfoCustomFields);

      console.log('3. 合并后customFields:', JSON.stringify(customFields, null, 2));

      if (workInfoHistory.employeeType && !customFields.employeeType) {
        customFields.employeeType = workInfoHistory.employeeType;
        console.log('4. 添加employeeType后:', JSON.stringify(customFields, null, 2));
      }
    }

    console.log('\n=== 最终customFields中的关键字段 ===\n');
    console.log(`employeeType: ${customFields.employeeType || '(未设置)'}`);
    console.log(`jobPost: ${customFields.jobPost || '(未设置)'}`);
    console.log(`A01: ${customFields.A01 || '(未设置)'}`);

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
