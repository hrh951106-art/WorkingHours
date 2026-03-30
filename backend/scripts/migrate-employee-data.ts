import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateEmployeeData() {
  console.log('开始迁移员工数据...');

  const employees = await prisma.employee.findMany();
  console.log(`找到 ${employees.length} 个员工`);

  for (const employee of employees) {
    console.log(`处理员工: ${employee.name} (${employee.employeeNo})`);

    const customFields = JSON.parse(employee.customFields || '{}');

    // 1. 创建工作信息历史记录（当前生效）
    if (customFields.position || customFields.jobLevel || customFields.employeeType) {
      await prisma.workInfoHistory.create({
        data: {
          employeeId: employee.id,
          effectiveDate: employee.entryDate,
          position: customFields.position || null,
          jobLevel: customFields.jobLevel || null,
          employeeType: customFields.employeeType || null,
          orgId: customFields.orgId || employee.orgId,
          workLocation: customFields.workLocation || null,
          workAddress: customFields.workAddress || null,
          isCurrent: true,
        },
      });
      console.log(`  ✓ 创建工作信息历史记录`);
    }

    // 2. 学历信息（如果有）
    if (customFields.educations && Array.isArray(customFields.educations)) {
      for (const edu of customFields.educations) {
        await prisma.employeeEducation.create({
          data: {
            employeeId: employee.id,
            ...edu,
          },
        });
      }
      console.log(`  ✓ 迁移 ${customFields.educations.length} 条学历记录`);
    }

    // 3. 工作经历（如果有）
    if (customFields.workExperiences && Array.isArray(customFields.workExperiences)) {
      for (const exp of customFields.workExperiences) {
        await prisma.employeeWorkExperience.create({
          data: {
            employeeId: employee.id,
            ...exp,
          },
        });
      }
      console.log(`  ✓ 迁移 ${customFields.workExperiences.length} 条工作经历`);
    }

    // 4. 家庭成员（如果有）
    if (customFields.familyMembers && Array.isArray(customFields.familyMembers)) {
      for (const member of customFields.familyMembers) {
        await prisma.employeeFamilyMember.create({
          data: {
            employeeId: employee.id,
            ...member,
          },
        });
      }
      console.log(`  ✓ 迁移 ${customFields.familyMembers.length} 条家庭成员记录`);
    }
  }

  console.log('迁移完成！');
}

migrateEmployeeData()
  .catch((e) => {
    console.error('迁移失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
