import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始填充种子数据...');

  // 创建角色
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: '系统管理员',
      description: '拥有系统所有权限',
      functionalPermissions: JSON.stringify(['*']),
      dataScopeType: 'ALL',
      isDefault: false,
      status: 'ACTIVE',
    },
  });

  const hrAdminRole = await prisma.role.upsert({
    where: { code: 'HR_ADMIN' },
    update: {},
    create: {
      code: 'HR_ADMIN',
      name: 'HR管理员',
      description: '人事管理相关权限',
      functionalPermissions: JSON.stringify([
        'hr:org:view',
        'hr:org:edit',
        'hr:emp:view',
        'hr:emp:edit',
        'hr:emp:delete',
      ]),
      dataScopeType: 'ALL',
      isDefault: true, // 设置为默认角色
      status: 'ACTIVE',
    },
  });

  console.log('角色创建完成');

  // 创建管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      email: 'admin@example.com',
      status: 'ACTIVE',
    },
  });

  const hrAdmin = await prisma.user.upsert({
    where: { username: 'hr_admin' },
    update: {},
    create: {
      username: 'hr_admin',
      password: await bcrypt.hash('hr123', 10),
      name: 'HR管理员',
      email: 'hr_admin@example.com',
      status: 'ACTIVE',
    },
  });

  // 分配角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: hrAdmin.id,
        roleId: hrAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: hrAdmin.id,
      roleId: hrAdminRole.id,
    },
  });

  console.log('用户创建完成');

  // 创建根组织
  const rootOrg = await prisma.organization.upsert({
    where: { code: 'ROOT' },
    update: {},
    create: {
      code: 'ROOT',
      name: '集团总部',
      type: 'GROUP',
      level: 1,
      effectiveDate: new Date(),
      leaderName: '总经理',
      status: 'ACTIVE',
    },
  });

  // 创建子组织
  const techOrg = await prisma.organization.upsert({
    where: { code: 'TECH' },
    update: {},
    create: {
      code: 'TECH',
      name: '技术部',
      parentId: rootOrg.id,
      type: 'DEPARTMENT',
      level: 2,
      effectiveDate: new Date(),
      leaderName: '技术总监',
      status: 'ACTIVE',
    },
  });

  const hrOrg = await prisma.organization.upsert({
    where: { code: 'HR' },
    update: {},
    create: {
      code: 'HR',
      name: '人力资源部',
      parentId: rootOrg.id,
      type: 'DEPARTMENT',
      level: 2,
      effectiveDate: new Date(),
      leaderName: 'HR总监',
      status: 'ACTIVE',
    },
  });

  console.log('组织创建完成');

  // 创建示例员工
  const employee1 = await prisma.employee.upsert({
    where: { employeeNo: 'EMP001' },
    update: {},
    create: {
      employeeNo: 'EMP001',
      name: '张三',
      gender: 'MALE',
      idCard: '310101199001011234',
      phone: '13800138001',
      email: 'zhangsan@example.com',
      orgId: techOrg.id,
      entryDate: new Date('2023-01-01'),
      status: 'ACTIVE',
    },
  });

  const employee2 = await prisma.employee.upsert({
    where: { employeeNo: 'EMP002' },
    update: {},
    create: {
      employeeNo: 'EMP002',
      name: '李四',
      gender: 'FEMALE',
      idCard: '310101199002022345',
      phone: '13800138002',
      email: 'lisi@example.com',
      orgId: techOrg.id,
      entryDate: new Date('2023-03-01'),
      status: 'ACTIVE',
    },
  });

  console.log('员工创建完成');

  // 创建正常班次
  const normalShift = await prisma.shift.upsert({
    where: { code: 'NORMAL' },
    update: {},
    create: {
      code: 'NORMAL',
      name: '正常班',
      type: 'NORMAL',
      standardHours: 7.5,
      breakHours: 1.5,
      color: '#1890ff',
      status: 'ACTIVE',
    },
  });

  // 创建班段数据
  await prisma.shiftSegment.createMany({
    data: [
      {
        shiftId: normalShift.id,
        type: 'NORMAL',
        startDate: '+0',
        startTime: '08:00',
        endDate: '+0',
        endTime: '12:00',
        duration: 4,
      },
      {
        shiftId: normalShift.id,
        type: 'REST',
        startDate: '+0',
        startTime: '12:00',
        endDate: '+0',
        endTime: '13:30',
        duration: 1.5,
      },
      {
        shiftId: normalShift.id,
        type: 'NORMAL',
        startDate: '+0',
        startTime: '13:30',
        endDate: '+0',
        endTime: '17:30',
        duration: 4,
      },
    ],
  });

  console.log('班次创建完成');

  // 创建打卡设备
  const device1 = await prisma.punchDevice.upsert({
    where: { code: 'DEV001' },
    update: {},
    create: {
      code: 'DEV001',
      name: '前台考勤机',
      type: 'FACE',
      status: 'NORMAL',
    },
  });

  console.log('设备创建完成');

  console.log('种子数据填充完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
