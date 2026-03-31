#!/usr/bin/env node
/**
 * 员工信息相关表完整性检查脚本（开发环境）
 * 检查: Employee, EmployeeEducation, EmployeeWorkExperience, EmployeeFamilyMember,
 *       WorkInfoHistory, EmployeeInfoTab, EmployeeInfoTabGroup, EmployeeInfoTabField
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllTables() {
  console.log('========================================');
  console.log('员工信息相关表完整性检查（开发环境）');
  console.log('========================================');
  console.log('');

  let totalIssues = 0;

  // ========================================
  // 1. 检查Employee表
  // ========================================
  console.log('【1】Employee表检查');
  console.log('----------------------------------------');

  try {
    const employeeCount = await prisma.employee.count();
    const activeCount = await prisma.employee.count({ where: { status: 'ACTIVE' } });

    console.log('✓ Employee表存在');
    console.log(`  总员工数: ${employeeCount}`);
    console.log(`  在职员工: ${activeCount}`);
    console.log(`  离职员工: ${employeeCount - activeCount}`);

    // 检查关键字段
    const sampleEmployee = await prisma.employee.findFirst();
    if (sampleEmployee) {
      console.log('');
      console.log('  关键字段示例:');
      console.log(`    - name: ${sampleEmployee.name || '(空)'}`);
      console.log(`    - gender: ${sampleEmployee.gender || '(空)'}`);
      console.log(`    - age: ${sampleEmployee.age || '(空)'}`);
      console.log(`    - phone: ${sampleEmployee.phone || '(空)'}`);
    }
  } catch (error) {
    console.log('✗ Employee表检查失败:', error.message);
    totalIssues++;
  }

  console.log('');

  // ========================================
  // 2. 检查EmployeeEducation表
  // ========================================
  console.log('【2】EmployeeEducation表检查');
  console.log('----------------------------------------');

  try {
    const eduCount = await prisma.employeeEducation.count();
    const uniqueEmployees = await prisma.employeeEducation.findMany({
      distinct: ['employeeId'],
      select: { employeeId: true }
    });

    console.log('✓ EmployeeEducation表存在');
    console.log(`  学历记录总数: ${eduCount}`);
    console.log(`  有学历员工数: ${uniqueEmployees.length}`);

    // 检查最高学历标记
    const highestCount = await prisma.employeeEducation.count({
      where: { isHighest: true }
    });
    console.log(`  最高学历标记数: ${highestCount}`);
  } catch (error) {
    console.log('✗ EmployeeEducation表检查失败:', error.message);
    totalIssues++;
  }

  console.log('');

  // ========================================
  // 3. 检查EmployeeWorkExperience表
  // ========================================
  console.log('【3】EmployeeWorkExperience表检查');
  console.log('----------------------------------------');

  try {
    const workCount = await prisma.employeeWorkExperience.count();
    const uniqueEmployees = await prisma.employeeWorkExperience.findMany({
      distinct: ['employeeId'],
      select: { employeeId: true }
    });

    console.log('✓ EmployeeWorkExperience表存在');
    console.log(`  工作经历记录总数: ${workCount}`);
    console.log(`  有工作经历员工数: ${uniqueEmployees.length}`);
  } catch (error) {
    console.log('✗ EmployeeWorkExperience表检查失败:', error.message);
    totalIssues++;
  }

  console.log('');

  // ========================================
  // 4. 检查EmployeeFamilyMember表
  // ========================================
  console.log('【4】EmployeeFamilyMember表检查');
  console.log('----------------------------------------');

  try {
    const familyCount = await prisma.employeeFamilyMember.count();
    const uniqueEmployees = await prisma.employeeFamilyMember.findMany({
      distinct: ['employeeId'],
      select: { employeeId: true }
    });
    const emergencyCount = await prisma.employeeFamilyMember.count({
      where: { isEmergency: true }
    });

    console.log('✓ EmployeeFamilyMember表存在');
    console.log(`  家庭成员记录总数: ${familyCount}`);
    console.log(`  有家庭成员员工数: ${uniqueEmployees.length}`);
    console.log(`  紧急联系人数: ${emergencyCount}`);
  } catch (error) {
    console.log('✗ EmployeeFamilyMember表检查失败:', error.message);
    totalIssues++;
  }

  console.log('');

  // ========================================
  // 5. 检查WorkInfoHistory表
  // ========================================
  console.log('【5】WorkInfoHistory表检查');
  console.log('----------------------------------------');

  try {
    const historyCount = await prisma.workInfoHistory.count();
    const uniqueEmployees = await prisma.workInfoHistory.findMany({
      distinct: ['employeeId'],
      select: { employeeId: true }
    });
    const currentCount = await prisma.workInfoHistory.count({
      where: { isCurrent: true }
    });

    console.log('✓ WorkInfoHistory表存在');
    console.log(`  历史记录总数: ${historyCount}`);
    console.log(`  有历史记录员工数: ${uniqueEmployees.length}`);
    console.log(`  当前记录数: ${currentCount}`);
  } catch (error) {
    console.log('✗ WorkInfoHistory表检查失败:', error.message);
    totalIssues++;
  }

  console.log('');

  // ========================================
  // 6. 检查人事信息页签配置
  // ========================================
  console.log('【6】人事信息页签配置检查');
  console.log('----------------------------------------');

  try {
    const tabs = await prisma.employeeInfoTab.findMany({
      where: {
        code: {
          in: ['basic_info', 'work_info', 'education_info', 'work_experience', 'family_info']
        }
      },
      include: {
        groups: {
          include: {
            fields: true
          }
        },
        fields: true
      },
      orderBy: { sort: 'asc' }
    });

    if (tabs.length === 5) {
      console.log('✓ 5个系统页签全部存在');
    } else {
      console.log(`⚠️  只找到 ${tabs.length}/5 个系统页签`);
      totalIssues++;
    }

    console.log('');
    tabs.forEach(tab => {
      const groupCount = tab.groups?.length || 0;
      const fieldCount = tab.fields?.length || 0;
      console.log(`  ${tab.name} (${tab.code}):`);
      console.log(`    - 分组数: ${groupCount}`);
      console.log(`    - 字段数: ${fieldCount}`);

      // 检查basic_info页签是否有gender和age字段
      if (tab.code === 'basic_info') {
        const genderField = tab.fields?.find(f => f.fieldCode === 'gender');
        const ageField = tab.fields?.find(f => f.fieldCode === 'age');

        if (!genderField) {
          console.log(`    ⚠️  缺少 gender 字段！`);
          totalIssues++;
        }
        if (!ageField) {
          console.log(`    ⚠️  缺少 age 字段！`);
          totalIssues++;
        }
        if (genderField && ageField) {
          console.log(`    ✓ gender和age字段都存在`);
        }
      }
    });

    // 检查是否有重复页签
    console.log('');
    const allTabs = await prisma.employeeInfoTab.findMany();
    const duplicates = allTabs.filter((tab, index) =>
      allTabs.some((t, i) => i !== index && t.code.toLowerCase() === tab.code.toLowerCase())
    );

    if (duplicates.length > 0) {
      console.log('⚠️  发现重复的页签代码:');
      duplicates.forEach(tab => {
        console.log(`    - ${tab.code} (${tab.name})`);
      });
      totalIssues++;
    } else {
      console.log('✓ 没有重复的页签');
    }

  } catch (error) {
    console.log('✗ 人事信息页签配置检查失败:', error.message);
    totalIssues++;
  }

  console.log('');

  // ========================================
  // 7. 数据完整性检查
  // ========================================
  console.log('【7】数据完整性检查');
  console.log('----------------------------------------');

  try {
    // 检查孤立记录（简化版）
    const allEmployeeIds = await prisma.employee.findMany({
      select: { id: true },
      orderBy: { id: 'asc' }
    });

    const employeeIds = new Set(allEmployeeIds.map(e => e.id));
    let orphanCount = 0;

    // EmployeeEducation
    const educations = await prisma.employeeEducation.findMany({
      select: { employeeId: true }
    });
    const orphanEdus = educations.filter(e => !employeeIds.has(e.employeeId));
    if (orphanEdus.length > 0) {
      console.log(`⚠️  EmployeeEducation有 ${orphanEdus.length} 条孤立记录`);
      totalIssues++;
    } else {
      console.log('✓ EmployeeEducation无孤立记录');
    }

    // EmployeeWorkExperience
    const workExps = await prisma.employeeWorkExperience.findMany({
      select: { employeeId: true }
    });
    const orphanWorks = workExps.filter(e => !employeeIds.has(e.employeeId));
    if (orphanWorks.length > 0) {
      console.log(`⚠️  EmployeeWorkExperience有 ${orphanWorks.length} 条孤立记录`);
      totalIssues++;
    } else {
      console.log('✓ EmployeeWorkExperience无孤立记录');
    }

    // EmployeeFamilyMember
    const families = await prisma.employeeFamilyMember.findMany({
      select: { employeeId: true }
    });
    const orphanFamilies = families.filter(e => !employeeIds.has(e.employeeId));
    if (orphanFamilies.length > 0) {
      console.log(`⚠️  EmployeeFamilyMember有 ${orphanFamilies.length} 条孤立记录`);
      totalIssues++;
    } else {
      console.log('✓ EmployeeFamilyMember无孤立记录');
    }

  } catch (error) {
    console.log('✗ 数据完整性检查失败:', error.message);
  }

  console.log('');

  // ========================================
  // 总结
  // ========================================
  console.log('========================================');
  console.log('检查完成！');
  console.log('========================================');
  console.log('');

  if (totalIssues === 0) {
    console.log('✅ 所有检查通过！数据库结构完整。');
  } else {
    console.log(`⚠️  发现 ${totalIssues} 个问题需要处理。`);
    console.log('');
    console.log('建议操作:');
    console.log('  1. 运行: npm run prisma:seed:employee-tabs');
    console.log('  2. 或者运行: npm run prisma:seed:all');
    console.log('  3. 如需生产环境修复，运行 scripts/fix-employee-fields.sql');
  }

  console.log('');

  await prisma.$disconnect();
}

// 运行检查
checkAllTables().catch(error => {
  console.error('检查脚本执行失败:', error);
  process.exit(1);
});
