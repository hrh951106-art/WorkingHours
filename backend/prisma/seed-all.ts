import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 统一种子数据入口
 * 按顺序执行所有种子数据初始化，确保数据依赖关系正确
 */
async function main() {
  console.log('========================================');
  console.log('开始初始化所有种子数据...');
  console.log('========================================\n');

  try {
    // 第一步：初始化数据源（组织类型、学历、工作状态等基础数据）
    console.log('【步骤 1/2】初始化数据源...');
    console.log('----------------------------------------');
    await import('./seed-datasources');
    console.log('✓ 数据源初始化完成\n');

    // 等待一下确保数据源已提交
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 第二步：初始化主要业务数据（用户、组织、员工、班次等）
    console.log('【步骤 2/2】初始化业务数据...');
    console.log('----------------------------------------');
    await import('./seed');
    console.log('✓ 业务数据初始化完成\n');

    console.log('========================================');
    console.log('✓ 所有种子数据初始化完成！');
    console.log('========================================');
    console.log('\n默认账户信息：');
    console.log('  管理员 - admin / admin123');
    console.log('  HR管理员 - hr_admin / hr123');
    console.log('\n基础数据包括：');
    console.log('  - 角色：系统管理员、HR管理员');
    console.log('  - 组织类型：集团、公司、部门、小组、岗位');
    console.log('  - 组织：集团总部、技术部、人力资源部');
    console.log('  - 员工：张三、李四');
    console.log('  - 班次：正常班（8:00-17:30）');
    console.log('  - 设备：前台考勤机');
    console.log('  - 数据源：学历、工作状态等');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ 种子数据初始化失败！');
    console.error('========================================');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
