import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 初始化人事信息页签配置数据
 *
 * 包含系统内置的页签、分组和字段配置
 * 用于账户层级的员工信息展示和编辑
 */
async function main() {
  console.log('开始初始化人事信息页签配置...');

  try {
    // ========================================
    // 1. 创建页签 (Tabs)
    // ========================================

    const basicInfoTab = await prisma.employeeInfoTab.upsert({
      where: { code: 'basic_info' },
      update: {},
      create: {
        code: 'basic_info',
        name: '基本信息',
        description: '员工的基本个人信息',
        isSystem: true,
        sort: 1,
        status: 'ACTIVE',
      },
    });

    const workInfoTab = await prisma.employeeInfoTab.upsert({
      where: { code: 'work_info' },
      update: {},
      create: {
        code: 'work_info',
        name: '工作信息',
        description: '员工的工作相关信息，包括职位、职级、异动历史等',
        isSystem: true,
        sort: 2,
        status: 'ACTIVE',
      },
    });

    const educationTab = await prisma.employeeInfoTab.upsert({
      where: { code: 'education_info' },
      update: {},
      create: {
        code: 'education_info',
        name: '学历信息',
        description: '员工的教育背景和学历信息',
        isSystem: true,
        sort: 3,
        status: 'ACTIVE',
      },
    });

    const workExperienceTab = await prisma.employeeInfoTab.upsert({
      where: { code: 'work_experience' },
      update: {},
      create: {
        code: 'work_experience',
        name: '工作经历',
        description: '员工过往的工作经历',
        isSystem: true,
        sort: 4,
        status: 'ACTIVE',
      },
    });

    const familyTab = await prisma.employeeInfoTab.upsert({
      where: { code: 'family_info' },
      update: {},
      create: {
        code: 'family_info',
        name: '家庭信息',
        description: '员工家庭成员信息',
        isSystem: true,
        sort: 5,
        status: 'ACTIVE',
      },
    });

    console.log('✓ 创建/更新页签完成');

    // ========================================
    // 2. 创建分组 (Groups) 和 字段 (Fields)
    // ========================================

    // 2.1 基本信息 - 分组和字段
    const basicGroup1 = await prisma.employeeInfoTabGroup.upsert({
      where: {
        tabId_code: {
          tabId: basicInfoTab.id,
          code: 'PERSONAL_INFO',
        },
      },
      update: {},
      create: {
        tabId: basicInfoTab.id,
        code: 'PERSONAL_INFO',
        name: '个人资料',
        description: '姓名、性别、身份证等基本资料',
        sort: 1,
        status: 'ACTIVE',
        collapsed: false,
        isSystem: true,
      },
    });

    const basicGroup2 = await prisma.employeeInfoTabGroup.upsert({
      where: {
        tabId_code: {
          tabId: basicInfoTab.id,
          code: 'CONTACT_INFO',
        },
      },
      update: {},
      create: {
        tabId: basicInfoTab.id,
        code: 'CONTACT_INFO',
        name: '联系方式',
        description: '电话、邮箱、地址等联系方式',
        sort: 2,
        status: 'ACTIVE',
        collapsed: false,
        isSystem: true,
      },
    });

    const basicGroup3 = await prisma.employeeInfoTabGroup.upsert({
      where: {
        tabId_code: {
          tabId: basicInfoTab.id,
          code: 'PERSONAL_DETAILS',
        },
      },
      update: {},
      create: {
        tabId: basicInfoTab.id,
        code: 'PERSONAL_DETAILS',
        name: '个人详情',
        description: '出生日期、婚姻状况、政治面貌等',
        sort: 3,
        status: 'ACTIVE',
        collapsed: true,
        isSystem: true,
      },
    });

    // 基本信息字段
    const basicFields = [
      // 个人资料分组
      { groupId: basicGroup1.id, fieldCode: 'employeeNo', fieldName: '员工编号', fieldType: 'TEXT', isRequired: true, sort: 1 },
      { groupId: basicGroup1.id, fieldCode: 'name', fieldName: '姓名', fieldType: 'TEXT', isRequired: true, sort: 2 },
      { groupId: basicGroup1.id, fieldCode: 'gender', fieldName: '性别', fieldType: 'SELECT', isRequired: true, sort: 3 },
      { groupId: basicGroup1.id, fieldCode: 'idCard', fieldName: '身份证号', fieldType: 'TEXT', isRequired: false, sort: 4 },
      { groupId: basicGroup1.id, fieldCode: 'photo', fieldName: '照片', fieldType: 'IMAGE', isRequired: false, sort: 5 },

      // 联系方式分组
      { groupId: basicGroup2.id, fieldCode: 'phone', fieldName: '手机号码', fieldType: 'TEXT', isRequired: false, sort: 1 },
      { groupId: basicGroup2.id, fieldCode: 'email', fieldName: '电子邮箱', fieldType: 'TEXT', isRequired: false, sort: 2 },
      { groupId: basicGroup2.id, fieldCode: 'currentAddress', fieldName: '现居住地址', fieldType: 'TEXT', isRequired: false, sort: 3 },
      { groupId: basicGroup2.id, fieldCode: 'emergencyContact', fieldName: '紧急联系人', fieldType: 'TEXT', isRequired: false, sort: 4 },
      { groupId: basicGroup2.id, fieldCode: 'emergencyPhone', fieldName: '紧急联系电话', fieldType: 'TEXT', isRequired: false, sort: 5 },
      { groupId: basicGroup2.id, fieldCode: 'emergencyRelation', fieldName: '紧急联系人关系', fieldType: 'TEXT', isRequired: false, sort: 6 },

      // 个人详情分组
      { groupId: basicGroup3.id, fieldCode: 'birthDate', fieldName: '出生日期', fieldType: 'DATE', isRequired: false, sort: 1 },
      { groupId: basicGroup3.id, fieldCode: 'age', fieldName: '年龄', fieldType: 'NUMBER', isRequired: false, sort: 2 },
      { groupId: basicGroup3.id, fieldCode: 'maritalStatus', fieldName: '婚姻状况', fieldType: 'SELECT', isRequired: false, sort: 3 },
      { groupId: basicGroup3.id, fieldCode: 'nativePlace', fieldName: '籍贯', fieldType: 'TEXT', isRequired: false, sort: 4 },
      { groupId: basicGroup3.id, fieldCode: 'politicalStatus', fieldName: '政治面貌', fieldType: 'SELECT', isRequired: false, sort: 5 },
      { groupId: basicGroup3.id, fieldCode: 'householdRegister', fieldName: '户口所在地', fieldType: 'TEXT', isRequired: false, sort: 6 },
    ];

    for (const field of basicFields) {
      await prisma.employeeInfoTabField.upsert({
        where: {
          tabId_fieldCode: {
            tabId: basicInfoTab.id,
            fieldCode: field.fieldCode,
          },
        },
        update: {},
        create: {
          tabId: basicInfoTab.id,
          groupId: field.groupId,
          fieldCode: field.fieldCode,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isHidden: false,
          sort: field.sort,
        },
      });
    }

    // 2.2 工作信息 - 分组和字段
    const workGroup1 = await prisma.employeeInfoTabGroup.upsert({
      where: {
        tabId_code: {
          tabId: workInfoTab.id,
          code: 'CURRENT_POSITION',
        },
      },
      update: {},
      create: {
        tabId: workInfoTab.id,
        code: 'CURRENT_POSITION',
        name: '当前职位',
        description: '当前职位和岗位信息',
        sort: 1,
        status: 'ACTIVE',
        collapsed: false,
        isSystem: true,
      },
    });

    const workGroup2 = await prisma.employeeInfoTabGroup.upsert({
      where: {
        tabId_code: {
          tabId: workInfoTab.id,
          code: 'EMPLOYMENT_INFO',
        },
      },
      update: {},
      create: {
        tabId: workInfoTab.id,
        code: 'EMPLOYMENT_INFO',
        name: '雇佣信息',
        description: '入职日期、员工类型、试用期等',
        sort: 2,
        status: 'ACTIVE',
        collapsed: false,
        isSystem: true,
      },
    });

    const workGroup3 = await prisma.employeeInfoTabGroup.upsert({
      where: {
        tabId_code: {
          tabId: workInfoTab.id,
          code: 'ORG_INFO',
        },
      },
      update: {},
      create: {
        tabId: workInfoTab.id,
        code: 'ORG_INFO',
        name: '组织信息',
        description: '所属组织和部门信息',
        sort: 3,
        status: 'ACTIVE',
        collapsed: false,
        isSystem: true,
      },
    });

    // 工作信息字段
    const workFields = [
      // 当前职位分组
      { groupId: workGroup1.id, fieldCode: 'position', fieldName: '职位', fieldType: 'TEXT', isRequired: false, sort: 1 },
      { groupId: workGroup1.id, fieldCode: 'jobLevel', fieldName: '职级', fieldType: 'TEXT', isRequired: false, sort: 2 },
      { groupId: workGroup1.id, fieldCode: 'employeeType', fieldName: '员工类型', fieldType: 'SELECT', isRequired: false, sort: 3 },
      { groupId: workGroup1.id, fieldCode: 'workLocation', fieldName: '工作地点', fieldType: 'TEXT', isRequired: false, sort: 4 },
      { groupId: workGroup1.id, fieldCode: 'workAddress', fieldName: '办公地址', fieldType: 'TEXT', isRequired: false, sort: 5 },

      // 雇佣信息分组
      { groupId: workGroup2.id, fieldCode: 'entryDate', fieldName: '入职日期', fieldType: 'DATE', isRequired: true, sort: 1 },
      { groupId: workGroup2.id, fieldCode: 'hireDate', fieldName: '受雇日期', fieldType: 'DATE', isRequired: false, sort: 2 },
      { groupId: workGroup2.id, fieldCode: 'probationStart', fieldName: '试用期开始', fieldType: 'DATE', isRequired: false, sort: 3 },
      { groupId: workGroup2.id, fieldCode: 'probationEnd', fieldName: '试用期结束', fieldType: 'DATE', isRequired: false, sort: 4 },
      { groupId: workGroup2.id, fieldCode: 'probationMonths', fieldName: '试用期月数', fieldType: 'NUMBER', isRequired: false, sort: 5 },
      { groupId: workGroup2.id, fieldCode: 'regularDate', fieldName: '转正日期', fieldType: 'DATE', isRequired: false, sort: 6 },
      { groupId: workGroup2.id, fieldCode: 'workYears', fieldName: '工作年限', fieldType: 'NUMBER', isRequired: false, sort: 7 },
      { groupId: workGroup2.id, fieldCode: 'status', fieldName: '员工状态', fieldType: 'SELECT', isRequired: true, sort: 8 },

      // 组织信息分组
      { groupId: workGroup3.id, fieldCode: 'orgId', fieldName: '所属组织', fieldType: 'ORG_SELECT', isRequired: true, sort: 1 },
    ];

    for (const field of workFields) {
      await prisma.employeeInfoTabField.upsert({
        where: {
          tabId_fieldCode: {
            tabId: workInfoTab.id,
            fieldCode: field.fieldCode,
          },
        },
        update: {},
        create: {
          tabId: workInfoTab.id,
          groupId: field.groupId,
          fieldCode: field.fieldCode,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isHidden: false,
          sort: field.sort,
        },
      });
    }

    // 2.3 学历信息 - 页签说明（提示用户使用子表）
    const eduFields = [
      { tabId: educationTab.id, groupId: null, fieldCode: 'educations', fieldName: '学历列表', fieldType: 'CHILD_TABLE', isRequired: false, sort: 1 },
    ];

    for (const field of eduFields) {
      await prisma.employeeInfoTabField.upsert({
        where: {
          tabId_fieldCode: {
            tabId: educationTab.id,
            fieldCode: field.fieldCode,
          },
        },
        update: {},
        create: {
          tabId: field.tabId,
          groupId: field.groupId,
          fieldCode: field.fieldCode,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isHidden: false,
          sort: field.sort,
        },
      });
    }

    // 2.4 工作经历 - 页签说明
    const expFields = [
      { tabId: workExperienceTab.id, groupId: null, fieldCode: 'workExperiences', fieldName: '工作经历列表', fieldType: 'CHILD_TABLE', isRequired: false, sort: 1 },
    ];

    for (const field of expFields) {
      await prisma.employeeInfoTabField.upsert({
        where: {
          tabId_fieldCode: {
            tabId: workExperienceTab.id,
            fieldCode: field.fieldCode,
          },
        },
        update: {},
        create: {
          tabId: field.tabId,
          groupId: field.groupId,
          fieldCode: field.fieldCode,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isHidden: false,
          sort: field.sort,
        },
      });
    }

    // 2.5 家庭信息 - 页签说明
    const familyFields = [
      { tabId: familyTab.id, groupId: null, fieldCode: 'familyMembers', fieldName: '家庭成员列表', fieldType: 'CHILD_TABLE', isRequired: false, sort: 1 },
    ];

    for (const field of familyFields) {
      await prisma.employeeInfoTabField.upsert({
        where: {
          tabId_fieldCode: {
            tabId: familyTab.id,
            fieldCode: field.fieldCode,
          },
        },
        update: {},
        create: {
          tabId: field.tabId,
          groupId: field.groupId,
          fieldCode: field.fieldCode,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          isHidden: false,
          sort: field.sort,
        },
      });
    }

    console.log('✓ 创建/更新分组和字段完成');

    // ========================================
    // 3. 统计信息
    // ========================================
    const tabCount = await prisma.employeeInfoTab.count();
    const groupCount = await prisma.employeeInfoTabGroup.count();
    const fieldCount = await prisma.employeeInfoTabField.count();

    console.log('\n========================================');
    console.log('✓ 人事信息页签配置初始化完成！');
    console.log('========================================');
    console.log(`页签数量: ${tabCount}`);
    console.log(`分组数量: ${groupCount}`);
    console.log(`字段数量: ${fieldCount}`);
    console.log('\n已创建的页签:');
    console.log('  1. 基本信息 - 个人资料、联系方式、个人详情');
    console.log('  2. 工作信息 - 当前职位、雇佣信息、组织信息');
    console.log('  3. 学历信息 - 子表展示');
    console.log('  4. 工作经历 - 子表展示');
    console.log('  5. 家庭信息 - 子表展示');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n========================================');
    console.error('✗ 人事信息页签配置初始化失败！');
    console.error('========================================');
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
