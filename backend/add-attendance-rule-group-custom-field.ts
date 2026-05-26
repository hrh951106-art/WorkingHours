import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  try {
    // 1. 检查是否已存在考勤规则组数据源
    let attendanceRuleGroupDataSource = await prisma.dataSource.findFirst({
      where: { code: 'ATTENDANCE_RULE_GROUP' }
    });

    if (!attendanceRuleGroupDataSource) {
      console.log('创建考勤规则组数据源...');

      // 获取所有有效的考勤规则组
      const ruleGroups = await prisma.attendanceRuleGroup.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          code: true
        }
      });

      console.log(`找到 ${ruleGroups.length} 个考勤规则组`);

      // 创建数据源
      attendanceRuleGroupDataSource = await prisma.dataSource.create({
        data: {
          code: 'ATTENDANCE_RULE_GROUP',
          name: '考勤规则组',
          type: 'SYSTEM',
          description: '考勤规则组选项，从考勤规则组配置中同步',
          isSystem: true,
          status: 'ACTIVE',
          sort: 23,
          options: {
            create: ruleGroups.map(rg => ({
              label: rg.name,
              value: rg.id.toString(),
              sort: 0,
              isActive: true
            }))
          }
        }
      });

      console.log(`数据源创建成功: ID=${attendanceRuleGroupDataSource.id}`);
    } else {
      console.log(`数据源已存在: ID=${attendanceRuleGroupDataSource.id}`);

      // 更新数据源选项
      const ruleGroups = await prisma.attendanceRuleGroup.findMany({
        where: {
          deletedAt: null,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          name: true,
          code: true
        }
      });

      // 删除旧的选项
      await prisma.dataSourceOption.deleteMany({
        where: { dataSourceId: attendanceRuleGroupDataSource.id }
      });

      // 创建新的选项
      await prisma.dataSourceOption.createMany({
        data: ruleGroups.map(rg => ({
          dataSourceId: attendanceRuleGroupDataSource.id,
          label: rg.name,
          value: rg.id.toString(),
          sort: 0,
          isActive: true
        }))
      });

      console.log(`数据源选项已更新: ${ruleGroups.length} 个选项`);
    }

    // 2. 检查是否已存在考勤规则组自定义字段
    let attendanceRuleGroupField = await prisma.customField.findFirst({
      where: { code: 'attendanceRuleGroup' }
    });

    if (!attendanceRuleGroupField) {
      console.log('创建考勤规则组自定义字段...');

      attendanceRuleGroupField = await prisma.customField.create({
        data: {
          code: 'attendanceRuleGroup',
          name: '考勤规则组',
          type: 'SELECT_SINGLE',
          dataSourceId: attendanceRuleGroupDataSource.id,
          isRequired: false,
          defaultValue: '',
          group: '默认分组',
          isSystem: false,
          status: 'ACTIVE',
          sort: 5,
          options: '[]'
        }
      });

      console.log(`自定义字段创建成功: ID=${attendanceRuleGroupField.id}`);
    } else {
      console.log(`自定义字段已存在: ID=${attendanceRuleGroupField.id}`);

      // 更新数据源关联
      await prisma.customField.update({
        where: { id: attendanceRuleGroupField.id },
        data: { dataSourceId: attendanceRuleGroupDataSource.id }
      });

      console.log(`自定义字段数据源已更新`);
    }

    // 3. 验证创建结果
    const finalDataSource = await prisma.dataSource.findFirst({
      where: { code: 'ATTENDANCE_RULE_GROUP' },
      include: { options: true }
    });

    const finalField = await prisma.customField.findFirst({
      where: { code: 'attendanceRuleGroup' }
    });

    console.log('\n创建结果:');
    console.log('数据源:', {
      id: finalDataSource?.id,
      code: finalDataSource?.code,
      name: finalDataSource?.name,
      optionsCount: finalDataSource?.options.length
    });

    console.log('自定义字段:', {
      id: finalField?.id,
      code: finalField?.code,
      name: finalField?.name,
      dataSourceId: finalField?.dataSourceId
    });

    console.log('\n数据源选项列表:');
    finalDataSource?.options.forEach(opt => {
      console.log(`  - ${opt.label} (${opt.value})`);
    });

    await prisma.$disconnect();
    console.log('\n完成！');
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
