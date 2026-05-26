import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查班次属性数据 ===\n');

  // 1. 查询所有班次
  console.log('1. 查询所有班次:');
  const shifts = await prisma.shift.findMany({
    where: { status: 'ACTIVE' },
    include: {
      properties: true,
      segments: true,
    },
  });

  console.log(`  找到 ${shifts.length} 个班次:\n`);

  shifts.forEach((shift) => {
    console.log(`  班次 [${shift.code}] ${shift.name} (ID: ${shift.id}):`);
    console.log(`    类型: ${shift.type}`);
    console.log(`    标准工时: ${shift.standardHours}h`);
    console.log(`    班段数: ${shift.segments.length}`);
    console.log(`    属性数: ${shift.properties.length}`);

    if (shift.properties.length > 0) {
      console.log(`    属性详情:`);
      shift.properties.forEach((prop) => {
        console.log(`      - ${prop.propertyKey}: ${prop.propertyValue} (${prop.description || '-'})`);
      });
    } else {
      console.log(`    属性: (无)`);
    }
    console.log('');
  });

  // 2. 查询班次属性定义
  console.log('\n2. 查询班次属性定义:');
  const propertyDefinitions = await prisma.shiftPropertyDefinition.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`  找到 ${propertyDefinitions.length} 个属性定义:\n`);
  propertyDefinitions.forEach((def) => {
    console.log(`  - [${def.propertyKey}] ${def.name}`);
    console.log(`    描述: ${def.description || '-'}`);
    console.log(`    排序: ${def.sortOrder}`);
    console.log('');
  });

  // 3. 检查是否有ShiftProperty表中没有关联到有效Shift的孤儿数据
  console.log('\n3. 检查孤儿属性数据:');
  const orphanProperties = await prisma.shiftProperty.findMany({
    where: {
      shift: {
        status: 'INACTIVE',
      },
    },
  });

  if (orphanProperties.length > 0) {
    console.log(`  找到 ${orphanProperties.length} 个孤儿属性:\n`);
    orphanProperties.forEach((prop) => {
      console.log(`  - Shift ID: ${prop.shiftId}, Property: ${prop.propertyKey}`);
    });
  } else {
    console.log('  没有孤儿属性数据');
  }
}

main()
  .then(() => console.log('\n查询完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
