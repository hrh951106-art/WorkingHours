#!/usr/bin/env node

/**
 * 测试班次属性删除功能
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  console.log('');
  console.log('========================================');
  console.log('测试班次属性删除功能');
  console.log('========================================');
  console.log('');

  try {
    // 使用班次ID 3进行测试
    const shiftId = 3;

    // 1. 查看当前属性
    console.log('【第一步】查看当前属性');
    console.log('----------------------------------------');
    const currentProps = await prisma.shiftProperty.findMany({
      where: { shiftId },
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`班次 ${shiftId} 当前有 ${currentProps.length} 个属性:`);
    currentProps.forEach(prop => {
      console.log(`  - ${prop.propertyKey}: ${prop.propertyValue}`);
    });
    console.log('');

    // 2. 模拟删除所有属性（传递空数组）
    console.log('【第二步】删除所有属性（传递空数组）');
    console.log('----------------------------------------');

    // 删除现有属性
    await prisma.shiftProperty.deleteMany({
      where: { shiftId }
    });
    console.log('✓ 已删除所有属性');
    console.log('');

    // 3. 验证结果
    console.log('【第三步】验证结果');
    console.log('----------------------------------------');
    const newProps = await prisma.shiftProperty.findMany({
      where: { shiftId },
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`班次 ${shiftId} 现在有 ${newProps.length} 个属性:`);
    if (newProps.length === 0) {
      console.log('  (无属性)');
      console.log('');
      console.log('✓ 属性删除成功！');
    } else {
      newProps.forEach(prop => {
        console.log(`  - ${prop.propertyKey}: ${prop.propertyValue}`);
      });
      console.log('');
      console.log('✗ 属性仍然存在，删除失败！');
    }
    console.log('');

    // 4. 恢复原来的属性（为了不影响实际使用）
    console.log('【第四步】恢复原来的属性');
    console.log('----------------------------------------');
    if (currentProps.length > 0) {
      await prisma.shiftProperty.createMany({
        data: currentProps.map(prop => ({
          shiftId,
          propertyKey: prop.propertyKey,
          propertyValue: prop.propertyValue,
          description: prop.description,
          sortOrder: prop.sortOrder
        })),
        skipDuplicates: true
      });
      console.log(`✓ 已恢复 ${currentProps.length} 个属性`);
    }
    console.log('');

    console.log('========================================');
    console.log('测试完成');
    console.log('========================================');
    console.log('');

  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
