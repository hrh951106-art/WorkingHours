import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

async function checkFieldTypes() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查页签字段类型 ===\n');

  // 获取工作信息页签
  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            where: { isHidden: false },
            orderBy: { id: 'asc' },
          },
        },
      },
    },
  });

  if (!workInfoTab) {
    console.log('未找到工作信息页签');
    await app.close();
    return;
  }

  console.log('工作信息页签字段:');
  console.log('========================================');

  workInfoTab.groups.forEach((group, groupIdx) => {
    console.log(`\n分组 ${groupIdx + 1}: ${group.name}`);
    console.log('----------------------------------------');

    if (!group.fields || group.fields.length === 0) {
      console.log('  (无字段)');
      return;
    }

    group.fields.forEach((field) => {
      console.log(`  ${field.fieldCode}:`);
      console.log(`    fieldType: "${field.fieldType}"`);
      console.log(`    fieldName: "${field.fieldName}"`);
      console.log(`    isRequired: ${field.isRequired}`);
    });
  });

  console.log('\n=== 关键发现 ===');
  console.log('如果 fieldType 是小写 (system/custom) 而不是大写 (SYSTEM/CUSTOM),');
  console.log('则前端的条件判断 if (field.fieldType === \'SYSTEM\') 将永远不匹配!');

  await app.close();
}

checkFieldTypes().catch(console.error);
