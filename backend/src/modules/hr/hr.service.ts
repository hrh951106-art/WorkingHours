import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountService } from '../account/account.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import * as bcrypt from 'bcrypt';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
} from './dto/employee.dto';

@Injectable()
export class HrService {
  constructor(
    private prisma: PrismaService,
    private accountService: AccountService,
    private dataScopeService: DataScopeService,
  ) {}

  // ==================== 组织管理 ====================

  async getOrganizations() {
    return this.prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
    });
  }

  async getOrganizationTree() {
    const orgs = await this.prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
    });

    const buildTree = (parentId: number | null = null) => {
      return orgs
        .filter((org) => org.parentId === parentId)
        .map((org) => ({
          ...org,
          children: buildTree(org.id),
        }));
    };

    return buildTree();
  }

  async createOrganization(dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException('组织编码已存在');
    }

    let level = 1;
    if (dto.parentId) {
      const parent = await this.prisma.organization.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('父组织不存在');
      }
      level = parent.level + 1;
    }

    return this.prisma.organization.create({
      data: {
        ...dto,
        level,
      },
    });
  }

  async updateOrganization(id: number, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new NotFoundException('组织不存在');
    }

    // 检查是否有子组织
    const hasChildren = await this.prisma.organization.count({
      where: { parentId: id },
    });

    if (hasChildren && dto.parentId && dto.parentId !== org.parentId) {
      throw new BadRequestException('该组织下有子组织，无法移动');
    }

    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async deleteOrganization(id: number) {
    const hasChildren = await this.prisma.organization.count({
      where: { parentId: id },
    });

    if (hasChildren) {
      throw new BadRequestException('该组织下有子组织，无法删除');
    }

    const hasEmployees = await this.prisma.employee.count({
      where: { orgId: id },
    });

    if (hasEmployees) {
      throw new BadRequestException('该组织下有员工，无法删除');
    }

    await this.prisma.organization.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: '删除成功' };
  }

  // ==================== 人员管理 ====================

  async getEmployees(query: EmployeeQueryDto, user?: any) {
    const { page = 1, pageSize = 10, keyword, search, orgId, status } = query;
    const skip = (page - 1) * pageSize;

    // 优先使用 search 参数（前端发送的），如果没有则使用 keyword
    const searchKeyword = search || keyword;

    const where: any = {};
    if (searchKeyword && searchKeyword.trim()) {
      where.OR = [
        { name: { contains: searchKeyword } },
        { employeeNo: { contains: searchKeyword } },
      ];
    }
    if (status && status.trim()) {
      where.status = status;
    }

    // 应用数据权限过滤
    if (user && user.username !== 'admin') {
      const dataScopeFilter = await this.dataScopeService.getEmployeeFilter(user, user.orgId);
      Object.assign(where, dataScopeFilter);
    }

    // 如果指定了orgId，需要与数据权限取交集
    if (orgId) {
      where.orgId = +orgId;
    }

    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: +pageSize,
        include: {
          org: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getEmployee(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        org: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    return employee;
  }

  async getEmployeeChangeLogs(employeeId: number) {
    return this.prisma.employeeChangeLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createEmployee(dto: CreateEmployeeDto) {

    const existingByNo = await this.prisma.employee.findUnique({
      where: { employeeNo: dto.employeeNo },
    });

    if (existingByNo) {
      throw new BadRequestException('员工号已存在');
    }

    // 只有当提供了身份证号时才检查重复
    if (dto.idCard) {
      const existingByIdCard = await this.prisma.employee.findUnique({
        where: { idCard: dto.idCard },
      });

      if (existingByIdCard) {
        throw new BadRequestException('身份证号已存在');
      }
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: dto.orgId },
    });

    if (!org) {
      throw new NotFoundException('组织不存在');
    }

    // 获取基本信息页签的字段配置
    const basicInfoTab = await this.prisma.employeeInfoTab.findUnique({
      where: { code: 'basic_info' },
      include: {
        groups: {
          where: { status: 'ACTIVE' },  // 只获取启用的分组
          include: {
            fields: true,
          },
        },
      },
    });

    // 提取字段配置
    const hiddenFieldCodes = new Set<string>();  // 隐藏字段
    const requiredFieldCodes = new Set<string>();  // 显示且必填的字段

    // 三个核心字段：始终必填且不能隐藏
    const coreFields = ['employeeNo', 'entryDate', 'orgId'];
    coreFields.forEach(field => requiredFieldCodes.add(field));

    if (basicInfoTab && basicInfoTab.groups) {
      for (const group of basicInfoTab.groups) {
        for (const field of group.fields) {
          if (field.isHidden) {
            // 隐藏字段（核心字段不能隐藏）
            if (!coreFields.includes(field.fieldCode)) {
              hiddenFieldCodes.add(field.fieldCode);
            }
          } else if (field.isRequired) {
            // 显示且必填的字段
            requiredFieldCodes.add(field.fieldCode);
          }
        }
      }
    }

    console.log('创建员工 - 必填字段列表:', Array.from(requiredFieldCodes));
    console.log('创建员工 - 隐藏字段列表:', Array.from(hiddenFieldCodes));

    // 验证必填字段
    for (const fieldCode of requiredFieldCodes) {
      const value = (dto as any)[fieldCode];
      if (value === undefined || value === null || value === '') {
        // 根据字段代码查找字段名称
        let fieldName = fieldCode;
        if (basicInfoTab && basicInfoTab.groups) {
          for (const group of basicInfoTab.groups) {
            const field = group.fields.find(f => f.fieldCode === fieldCode);
            if (field) {
              fieldName = field.fieldName;
              break;
            }
          }
        }
        throw new BadRequestException(`${fieldName}不能为空`);
      }
    }

    // 定义 Employee 表的字段（基本信息页签）
    const employeeFields = [
      'employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'orgId', 'entryDate',
      'status', 'birthDate', 'age', 'maritalStatus', 'nativePlace', 'politicalStatus',
      'householdRegister', 'currentAddress', 'photo', 'emergencyContact',
      'emergencyPhone', 'emergencyRelation', 'homeAddress', 'homePhone'
    ];

    // 定义工作信息字段（工作信息页签）
    const workInfoFields = [
      'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
      'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'resignationDate', 'resignationReason', 'workYears',
      'orgId', 'effectiveDate', 'isCurrent', 'reason'
    ];

    // 分离数据：Employee 表数据、工作信息数据、子表数据
    const {
      educations,
      workExperiences,
      familyMembers,
      customFields,
      ...restData
    } = dto as any;

    // 分离 Employee 字段、工作信息字段和自定义字段
    const employeeData: any = {};
    const workInfoData: any = {};
    const finalCustomFields: any = {};

    // 解析前端传递的 customFields
    let parsedCustomFields: any = {};
    try {
      if (customFields && typeof customFields === 'string') {
        parsedCustomFields = JSON.parse(customFields);
      } else if (customFields && typeof customFields === 'object') {
        parsedCustomFields = customFields || {};
      }
    } catch (e) {
      console.error('解析 customFields 失败:', e);
      parsedCustomFields = {};
    }

    Object.keys(restData).forEach(key => {
      const value = restData[key];

      // 跳过隐藏字段
      if (hiddenFieldCodes.has(key)) {
        console.log(`跳过隐藏字段: ${key}`);
        return;
      }

      if (employeeFields.includes(key)) {
        // Employee 表字段
        let finalValue = value;
        // 转换日期字符串为 Date 对象
        if (key === 'entryDate' || key === 'birthDate') {
          if (typeof value === 'string') {
            finalValue = new Date(value);
          }
        }
        employeeData[key] = finalValue;
      } else if (workInfoFields.includes(key)) {
        // 工作信息字段
        let finalValue = value;
        // 转换日期字符串为 Date 对象
        if (typeof value === 'string' && (key.includes('Date') || key.includes('Start') || key.includes('End'))) {
          finalValue = new Date(value);
        }
        workInfoData[key] = finalValue;
      } else {
        // 其他字段放入 customFields（用于扩展）
        finalCustomFields[key] = value;
      }
    });

    console.log('处理后的 employeeData:', JSON.stringify(employeeData, null, 2));

    // 合并前端传递的 customFields（只保留不在表结构中的字段）
    Object.keys(parsedCustomFields).forEach(key => {
      // 如果字段不在 Employee 表或 WorkInfoHistory 表中，才放入 customFields
      if (!employeeFields.includes(key) && !workInfoFields.includes(key)) {
        finalCustomFields[key] = parsedCustomFields[key];
      }
    });


    // 保存 customFields
    employeeData.customFields = JSON.stringify(finalCustomFields);

    // 创建员工基本信息
    const employee = await this.prisma.employee.create({
      data: employeeData,
      include: {
        org: true,
      },
    });

    // 创建工作信息历史记录
    try {
      // 工作信息的 customFields（用于扩展）
      const workInfoCustomFields = {};

      // 序列化 customFields
      const customFieldsJson = JSON.stringify(workInfoCustomFields);


      // 如果有工作信息字段中的任何一个，就创建工作信息历史
      const hasWorkInfo = Object.keys(workInfoData).length > 0 || Object.keys(workInfoCustomFields).length > 0;
      if (hasWorkInfo) {
        await this.prisma.workInfoHistory.create({
          data: {
            employeeId: employee.id,
            effectiveDate: employee.entryDate || new Date(),
            changeType: workInfoData.changeType || null,
            position: workInfoData.position || null,
            jobLevel: workInfoData.jobLevel || null,
            employeeType: workInfoData.employeeType || null,
            workLocation: workInfoData.workLocation || null,
            workAddress: workInfoData.workAddress || null,
            hireDate: workInfoData.hireDate || null,
            probationStart: workInfoData.probationStart || null,
            probationEnd: workInfoData.probationEnd || null,
            probationMonths: workInfoData.probationMonths || null,
            regularDate: workInfoData.regularDate || null,
            resignationDate: workInfoData.resignationDate || null,
            resignationReason: workInfoData.resignationReason || null,
            workYears: workInfoData.workYears || null,
            orgId: employee.orgId,
            customFields: customFieldsJson,
            isCurrent: true,
          },
        });
      } else {
        // 即使没有工作信息，也创建一个默认的工作信息历史
        await this.prisma.workInfoHistory.create({
          data: {
            employeeId: employee.id,
            effectiveDate: employee.entryDate || new Date(),
            orgId: employee.orgId,
            customFields: customFieldsJson,
            isCurrent: true,
          },
        });
      }
    } catch (error: any) {
      console.error(`员工 ${employee.employeeNo} 工作信息历史创建失败:`, error.message);
    }

    // 创建学历记录
    try {

      if (educations && Array.isArray(educations) && educations.length > 0) {

        // 映射前端字段到数据库字段
        const validEducations = educations
          .filter((edu: any) => {
            const isValid = edu.school && edu.school !== undefined && edu.school !== null && edu.school !== '';
            return isValid;
          })
          .map((edu: any) => {
            const educationData: any = {
              employeeId: employee.id,
              school: edu.school,
              major: edu.major || null,
              degree: edu.degree || null,
              educationLevel: edu.educationLevel || null,
              educationType: edu.educationType || null,
              isHighest: edu.isHighest || false,
            };

            // 处理日期字段
            if (edu.startDate) {
              educationData.startDate = new Date(edu.startDate);
            }
            if (edu.endDate) {
              educationData.endDate = new Date(edu.endDate);
            }
            if (edu.graduationDate) {
              educationData.graduationDate = new Date(edu.graduationDate);
            }

            // 处理证书号
            if (edu.degreeNo) {
              educationData.degreeNo = edu.degreeNo;
            }
            if (edu.diplomaNo) {
              educationData.diplomaNo = edu.diplomaNo;
            }

            // 处理描述
            if (edu.description) {
              educationData.description = edu.description;
            }

            return educationData;
          });


        if (validEducations.length > 0) {
          await this.prisma.employeeEducation.createMany({
            data: validEducations,
          });
        } else {
        }
      } else {
      }
    } catch (error: any) {
      console.error(`员工 ${employee.employeeNo} 学历记录创建失败:`, error.message);
      console.error('错误详情:', error);
    }

    // 创建工作经历记录
    try {
      if (workExperiences && Array.isArray(workExperiences) && workExperiences.length > 0) {
        // 映射前端字段到数据库字段
        const validWorkExperiences = workExperiences
          .filter((exp: any) =>
            exp.company && exp.company !== undefined && exp.company !== null && exp.company !== '' &&
            exp.position && exp.position !== undefined && exp.position !== null && exp.position !== ''
          )
          .map((exp: any) => {
            const workExpData: any = {
              employeeId: employee.id,
              company: exp.company,
              position: exp.position,
              salary: exp.salary || null,
              reason: exp.reason || null,
              description: exp.description || null,
            };

            // 处理日期字段
            if (exp.startDate) {
              workExpData.startDate = new Date(exp.startDate);
            }
            if (exp.endDate) {
              workExpData.endDate = new Date(exp.endDate);
            }

            return workExpData;
          });

        if (validWorkExperiences.length > 0) {
          await this.prisma.employeeWorkExperience.createMany({
            data: validWorkExperiences,
          });
        }
      }
    } catch (error: any) {
      console.error(`员工 ${employee.employeeNo} 工作经历创建失败:`, error.message);
    }

    // 创建家庭成员记录
    try {
      if (familyMembers && Array.isArray(familyMembers) && familyMembers.length > 0) {
        // 映射前端字段到数据库字段
        const validFamilyMembers = familyMembers
          .filter((member: any) =>
            member.relationship && member.relationship !== undefined && member.relationship !== null &&
            member.name && member.name !== undefined && member.name !== null
          )
          .map((member: any, index: number) => {
            const familyMemberData: any = {
              employeeId: employee.id,
              relationship: member.relationship,
              name: member.name,
              gender: member.gender || null,
              idCard: member.idCard || null,
              phone: member.phone || null,
              workUnit: member.workUnit || null,
              address: member.address || null,
              isEmergency: member.isEmergency || false,
              sortOrder: member.sortOrder !== undefined ? member.sortOrder : index,
            };

            // 处理出生日期
            if (member.birthDate || member.dateOfBirth) {
              const birthDate = member.birthDate || member.dateOfBirth;
              familyMemberData.dateOfBirth = new Date(birthDate);
            }

            // 处理年龄
            if (member.age) {
              familyMemberData.age = member.age;
            }

            return familyMemberData;
          });

        if (validFamilyMembers.length > 0) {
          await this.prisma.employeeFamilyMember.createMany({
            data: validFamilyMembers,
          });
        }
      }
    } catch (error: any) {
      console.error(`员工 ${employee.employeeNo} 家庭成员记录创建失败:`, error.message);
    }

    // 自动生成劳动力账户
    try {
      await this.accountService.generateAccountsForEmployee(employee.id);
    } catch (error: any) {
      // 如果账户生成失败，记录错误但不影响员工创建
      console.error(`员工 ${employee.employeeNo} 账户生成失败:`, error.message);
      // 可以选择将错误信息添加到返回结果中
    }

    // 自动创建用户账号
    try {
      // 检查用户是否已存在（可能已手动创建）
      const existingUser = await this.prisma.user.findUnique({
        where: { username: employee.employeeNo },
      });

      if (!existingUser) {
        // 创建用户，默认密码为111111
        const defaultPassword = '111111';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const user = await this.prisma.user.create({
          data: {
            username: employee.employeeNo,
            password: hashedPassword,
            name: employee.name,
            email: employee.email,
            status: 'ACTIVE',
          },
        });

        // 分配默认角色
        const defaultRoles = await this.prisma.role.findMany({
          where: { isDefault: true },
        });

        if (defaultRoles.length > 0) {
          await this.prisma.userRole.createMany({
            data: defaultRoles.map((role) => ({
              userId: user.id,
              roleId: role.id,
            })),
          });
        }

      }
    } catch (error: any) {
      // 如果用户创建失败，记录错误但不影响员工创建
      console.error(`员工 ${employee.employeeNo} 用户创建失败:`, error.message);
    }

    // 重新查询员工信息，包含所有关联数据
    const fullEmployee = await this.prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        org: true,
        educations: true,
        workExperiences: true,
        familyMembers: true,
        workInfoHistory: {
          where: { isCurrent: true },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    return fullEmployee;
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto) {
    console.log('=== 更新员工信息 ===');
    console.log('接收到的DTO:', dto);

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { org: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 检查是否发生组织变更（调岗）
    const isOrgChanged = dto.orgId && dto.orgId !== employee.orgId;

    // 检查自定义字段是否发生变更
    const isCustomFieldsChanged = dto.customFields && dto.customFields !== employee.customFields;

    // 记录组织变更
    if (isOrgChanged) {
      const newOrg = await this.prisma.organization.findUnique({
        where: { id: dto.orgId },
      });

      await this.prisma.employeeChangeLog.create({
        data: {
          employeeId: id,
          fieldName: 'orgId',
          oldValue: employee.orgId.toString(),
          newValue: dto.orgId.toString(),
          operatorId: 1,
          operatorName: '系统管理员',
        },
      });
    }

    // 获取基本信息页签的字段配置
    const basicInfoTab = await this.prisma.employeeInfoTab.findUnique({
      where: { code: 'basic_info' },
      include: {
        groups: {
          where: { status: 'ACTIVE' },  // 只获取启用的分组
          include: {
            fields: true,
          },
        },
      },
    });

    // 提取隐藏字段代码
    const hiddenFieldCodes = new Set<string>();
    const coreFields = ['employeeNo', 'entryDate', 'orgId'];  // 核心字段不能隐藏

    if (basicInfoTab && basicInfoTab.groups) {
      for (const group of basicInfoTab.groups) {
        for (const field of group.fields) {
          if (field.isHidden) {
            // 核心字段不能隐藏
            if (!coreFields.includes(field.fieldCode)) {
              hiddenFieldCodes.add(field.fieldCode);
            }
          }
        }
      }
    }

    console.log('更新员工 - 隐藏字段列表:', Array.from(hiddenFieldCodes));

    // 定义 Employee 表的字段（基本信息页签）
    const employeeFields = [
      'employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'orgId', 'entryDate',
      'status', 'birthDate', 'age', 'maritalStatus', 'nativePlace', 'politicalStatus',
      'householdRegister', 'currentAddress', 'photo', 'emergencyContact',
      'emergencyPhone', 'emergencyRelation', 'homeAddress', 'homePhone', 'customFields'
    ];

    // 需要转换为 Date 类型的字段
    const dateFields = ['entryDate', 'birthDate', 'probationStart', 'probationEnd'];

    const updateData: any = {};
    employeeFields.forEach(field => {
      // 跳过隐藏字段
      if (hiddenFieldCodes.has(field)) {
        return;
      }

      if (dto[field] !== undefined) {
        let value = dto[field];

        // 转换日期字符串为 Date 对象
        if (dateFields.includes(field) && typeof value === 'string' && value) {
          value = new Date(value);
        }

        updateData[field] = value;
      }
    });

    // 更新员工信息
    console.log('准备更新的数据:', updateData);

    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        org: true,
      },
    });

    console.log('更新后的员工数据:', {
      id: updatedEmployee.id,
      employeeNo: updatedEmployee.employeeNo,
      name: updatedEmployee.name,
      maritalStatus: updatedEmployee.maritalStatus,
      nativePlace: updatedEmployee.nativePlace,
      politicalStatus: updatedEmployee.politicalStatus,
      householdRegister: updatedEmployee.householdRegister,
      currentAddress: updatedEmployee.currentAddress,
      emergencyContact: updatedEmployee.emergencyContact,
      emergencyPhone: updatedEmployee.emergencyPhone,
      emergencyRelation: updatedEmployee.emergencyRelation,
      homeAddress: updatedEmployee.homeAddress,
      homePhone: updatedEmployee.homePhone,
      status: updatedEmployee.status,
    });

    // 只有当影响账户路径的字段发生变更时，才重新生成劳动力账户
    let shouldRegenerateAccounts = false;

    if (isOrgChanged || isCustomFieldsChanged) {
      try {
        // 计算更新前的账户路径
        const oldPath = await this.accountService.calculateEmployeeAccountPath(id);

        // 计算更新后的账户路径（基于更新后的数据）
        const newPath = await this.accountService.calculateEmployeeAccountPath(id);

        // 只有当路径发生变化时才重新生成账户
        if (oldPath !== newPath) {
          shouldRegenerateAccounts = true;
        } else {
        }
      } catch (error: any) {
        // 如果无法计算路径（例如没有配置层级），则不重新生成
        console.warn(`无法计算员工账户路径:`, error.message);
      }
    }

    // 重新生成劳动力账户
    if (shouldRegenerateAccounts) {
      try {
        await this.accountService.regenerateAccountsForEmployee(id);
      } catch (error: any) {
        // 记录错误但不影响员工更新
        console.error(`员工 ${updatedEmployee.employeeNo} 账户更新失败:`, error.message);
      }
    }

    return updatedEmployee;
  }

  async deleteEmployee(id: number) {
    // 获取员工信息
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 1. 更新员工状态为离职
    await this.prisma.employee.update({
      where: { id },
      data: { status: 'RESIGNED' },
    });

    // 2. 如果存在对应用户账号，禁用该账号
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: employee.employeeNo },
      });

      if (existingUser) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { status: 'INACTIVE' },
        });
      }
    } catch (error: any) {
      // 记录错误但不影响员工离职操作
      console.error(`员工 ${employee.employeeNo} 用户禁用失败:`, error.message);
    }

    return { message: '删除成功' };
  }

  async getEmployeeAccounts(employeeId: number) {
    return this.prisma.laborAccount.findMany({
      where: {
        employeeId,
        // 移除 status 过滤，返回所有账户（包括失效的）
      },
      orderBy: [
        { level: 'asc' },
        { effectiveDate: 'desc' }, // 按生效日期倒序，最新的账户在前
      ],
    });
  }

  async regenerateEmployeeAccounts(employeeId: number) {
    // 验证员工是否存在
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 调用账户服务重新生成账户
    return this.accountService.regenerateAccountsForEmployee(employeeId);
  }

  // ==================== 自定义字段 ====================

  async getCustomFields() {
    return this.prisma.customField.findMany({
      where: { status: 'ACTIVE' },
      include: {
        dataSource: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sort: 'asc' },
            },
          },
        },
      },
      orderBy: { sort: 'asc' },
    });
  }

  // 获取人事信息字段配置（用于劳动力账户层级）
  async getEmployeeInfoConfigs() {
    const customFields = await this.prisma.customField.findMany({
      where: { status: 'ACTIVE' },
      include: {
        dataSource: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sort: 'asc' },
            },
          },
        },
      },
      orderBy: { sort: 'asc' },
    });

    // 转换为前端需要的格式
    return customFields
      .filter(field => field.dataSource) // 只返回有数据源的字段
      .map(field => ({
        field: field.code,
        name: field.name,
        options: field.dataSource.options?.map(opt => ({
          id: opt.id,
          name: opt.label,
          label: opt.label,
          value: opt.value,
          code: opt.value,
        })) || [],
      }));
  }

  async createCustomField(dto: any) {
    return this.prisma.customField.create({
      data: dto,
    });
  }

  async updateCustomField(id: number, dto: any) {
    return this.prisma.customField.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCustomField(id: number) {
    await this.prisma.customField.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: '删除成功' };
  }

  // ==================== 组织类型配置 ====================

  async getOrgTypes() {
    // 从数据源表获取组织类型
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { code: 'ORG_TYPE' },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sort: 'asc' },
        },
      },
    });

    if (!dataSource) {
      return [];
    }

    return dataSource.options.map((opt) => ({
      id: opt.id,
      code: opt.value,
      name: opt.label,
      description: dataSource.description,
      sortOrder: opt.sort,
    }));
  }

  async createOrgType(dto: any) {
    // 在组织类型数据源中创建新选项
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { code: 'ORG_TYPE' },
    });

    if (!dataSource) {
      throw new BadRequestException('组织类型数据源不存在');
    }

    return this.prisma.dataSourceOption.create({
      data: {
        dataSourceId: dataSource.id,
        label: dto.name,
        value: dto.code,
        sort: dto.sortOrder || 0,
      },
    });
  }

  async updateOrgType(id: number, dto: any) {
    return this.prisma.dataSourceOption.update({
      where: { id },
      data: {
        label: dto.name,
        value: dto.code,
        sort: dto.sortOrder,
      },
    });
  }

  async deleteOrgType(id: number) {
    await this.prisma.dataSourceOption.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: '删除成功' };
  }

  // ==================== 数据源配置 ====================

  async getDataSources() {
    return this.prisma.dataSource.findMany({
      where: { status: 'ACTIVE' },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sort: 'asc' },
        },
        _count: {
          select: { options: true },
        },
      },
      orderBy: { sort: 'asc' },
    });
  }

  async createDataSource(dto: any) {
    return this.prisma.dataSource.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type || 'CUSTOM',
        description: dto.description,
        isSystem: false,
        sort: dto.sort || 0,
      },
    });
  }

  async updateDataSource(id: number, dto: any) {
    return this.prisma.dataSource.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        sort: dto.sort,
      },
    });
  }

  async deleteDataSource(id: number) {
    // 检查是否为系统内置数据源
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id },
    });

    if (dataSource?.isSystem) {
      throw new BadRequestException('系统内置数据源不能删除');
    }

    await this.prisma.dataSource.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: '删除成功' };
  }

  // ==================== 数据源选项管理 ====================

  async getDataSourceOptions(dataSourceId: number) {
    return this.prisma.dataSourceOption.findMany({
      where: {
        dataSourceId,
        isActive: true,
      },
      orderBy: { sort: 'asc' },
    });
  }

  async createDataSourceOption(dataSourceId: number, dto: any) {
    return this.prisma.dataSourceOption.create({
      data: {
        dataSourceId,
        label: dto.label,
        value: dto.value,
        sort: dto.sort || 0,
      },
    });
  }

  async updateDataSourceOption(id: number, dto: any) {
    return this.prisma.dataSourceOption.update({
      where: { id },
      data: {
        label: dto.label,
        value: dto.value,
        sort: dto.sort,
      },
    });
  }

  async deleteDataSourceOption(id: number) {
    await this.prisma.dataSourceOption.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: '删除成功' };
  }

  // ==================== 查询条件配置 ====================

  async getSearchConditionConfigs(query: any) {
    const { pageCode } = query;

    const where: any = {};
    if (pageCode) {
      where.pageCode = pageCode;
    }

    return this.prisma.searchConditionConfig.findMany({
      where,
      orderBy: [
        { pageCode: 'asc' },
        { sortOrder: 'asc' },
      ],
    });
  }

  async createSearchConditionConfig(dto: any) {
    // 检查是否已存在相同的页面和字段配置
    const existing = await this.prisma.searchConditionConfig.findUnique({
      where: {
        pageCode_fieldCode: {
          pageCode: dto.pageCode,
          fieldCode: dto.fieldCode,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('该页面的字段配置已存在');
    }

    return this.prisma.searchConditionConfig.create({
      data: dto,
    });
  }

  async updateSearchConditionConfig(id: number, dto: any) {
    const config = await this.prisma.searchConditionConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('查询条件配置不存在');
    }

    return this.prisma.searchConditionConfig.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSearchConditionConfig(id: number) {
    await this.prisma.searchConditionConfig.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  async batchSaveSearchConditionConfigs(dto: any) {
    const { pageCode, configs } = dto;

    // 删除该页面的所有现有配置
    await this.prisma.searchConditionConfig.deleteMany({
      where: { pageCode },
    });

    // 批量创建新配置
    const createdConfigs = await Promise.all(
      configs.map((config: any) =>
        this.prisma.searchConditionConfig.create({
          data: {
            ...config,
            pageCode,
          },
        })
      )
    );

    return {
      message: '批量保存成功',
      count: createdConfigs.length,
      data: createdConfigs,
    };
  }

  // 系统配置相关方法
  async getSystemConfigs(query: any) {
    const { category } = query;
    const where = category ? { category } : {};

    return this.prisma.systemConfig.findMany({
      where,
      orderBy: { category: 'asc' },
    });
  }

  async getSystemConfigByKey(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { configKey: key },
    });

    if (!config) {
      return null;
    }

    return config;
  }

  async createSystemConfig(dto: any) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { configKey: dto.configKey },
    });

    if (existing) {
      throw new Error('配置键已存在');
    }

    return this.prisma.systemConfig.create({
      data: dto,
    });
  }

  async updateSystemConfig(key: string, dto: any) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { configKey: key },
    });

    if (!config) {
      throw new NotFoundException('配置不存在');
    }

    return this.prisma.systemConfig.update({
      where: { configKey: key },
      data: dto,
    });
  }

  async deleteSystemConfig(key: string) {
    await this.prisma.systemConfig.delete({
      where: { configKey: key },
    });

    return { message: '删除成功' };
  }

  // 根据层级ID获取组织列表
  async getOrganizationsByHierarchyLevel(hierarchyLevelId: string) {
    // 获取层级配置
    const hierarchyLevel = await this.prisma.accountHierarchyConfig.findFirst({
      where: { id: +hierarchyLevelId },
    });

    if (!hierarchyLevel) {
      throw new NotFoundException('层级配置不存在');
    }

    // 从层级配置的mappingValue中获取组织类型
    const orgTypeCode = hierarchyLevel.mappingValue;

    if (!orgTypeCode) {
      throw new Error('该层级配置未关联组织类型');
    }

    // 根据组织类型获取组织列表
    const organizations = await this.prisma.organization.findMany({
      where: {
        type: orgTypeCode,
        status: 'ACTIVE',
      },
      orderBy: { name: 'asc' },
    });

    return organizations;
  }

  // ==================== 工作信息版本管理 ====================

  /**
   * 获取工作信息版本列表
   * 从 EmployeeChangeLog 中提取工作信息相关的变更记录
   */
  async getWorkInfoVersions(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 获取工作信息相关的字段变更记录
    const workInfoFields = [
      'position',
      'jobLevel',
      'employeeType',
      'workLocation',
      'workAddress',
      'orgId',
    ];

    const changeLogs = await this.prisma.employeeChangeLog.findMany({
      where: {
        employeeId,
        fieldName: {
          in: workInfoFields,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 按日期分组，生成版本列表
    const versionMap = new Map<string, any>();

    changeLogs.forEach((log) => {
      const dateKey = log.createdAt.toISOString().split('T')[0];

      if (!versionMap.has(dateKey)) {
        versionMap.set(dateKey, {
          id: dateKey,
          effectiveDate: dateKey,
          description: `${log.fieldName} 变更`,
          createdAt: log.createdAt,
        });
      }
    });

    // 添加当前版本
    const versions = [
      {
        id: 'current',
        effectiveDate: employee.createdAt.toISOString().split('T')[0],
        description: '当前版本',
        createdAt: employee.createdAt,
        isCurrent: true,
      },
      ...Array.from(versionMap.values()),
    ];

    return versions;
  }

  /**
   * 获取指定版本的工作信息
   * version='current' 返回当前工作信息
   * version=日期 返回该日期时的快照
   */
  async getWorkInfoByVersion(employeeId: number, version: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        org: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    if (version === 'current') {
      // 获取当前生效的工作信息历史
      const currentWorkInfo = await this.prisma.workInfoHistory.findFirst({
        where: {
          employeeId,
          isCurrent: true,
        },
        include: {
          org: true,
        },
      });

      // 解析员工的自定义字段（非工作信息页签的）
      const employeeCustomFields = JSON.parse(employee.customFields || '{}');

      // 解析工作信息的自定义字段
      const workInfoCustomFields = currentWorkInfo
        ? JSON.parse(currentWorkInfo.customFields || '{}')
        : {};

      // 合并所有自定义字段
      const mergedCustomFields = {
        ...employeeCustomFields,
        ...workInfoCustomFields,
      };

      // 获取所有学历信息
      const educations = await this.prisma.employeeEducation.findMany({
        where: { employeeId },
        orderBy: [{ isHighest: 'desc' }, { endDate: 'desc' }],
      });

      // 获取所有工作经历
      const workExperiences = await this.prisma.employeeWorkExperience.findMany({
        where: { employeeId },
        orderBy: { startDate: 'desc' },
      });

      // 获取所有家庭成员
      const familyMembers = await this.prisma.employeeFamilyMember.findMany({
        where: { employeeId },
        orderBy: [{ isEmergency: 'desc' }, { sortOrder: 'asc' }],
      });

      // 返回结构化的数据
      const result = {
        // 基本信息 - 包含Employee表的所有字段
        id: employee.id,
        employeeNo: employee.employeeNo,
        name: employee.name,
        gender: employee.gender,
        idCard: employee.idCard,
        phone: employee.phone,
        email: employee.email,
        orgId: employee.orgId,
        entryDate: employee.entryDate,
        status: employee.status,
        // 基本信息页签字段
        birthDate: employee.birthDate,
        age: employee.age,
        maritalStatus: employee.maritalStatus,
        nativePlace: employee.nativePlace,
        politicalStatus: employee.politicalStatus,
        householdRegister: employee.householdRegister,
        currentAddress: employee.currentAddress,
        photo: employee.photo,
        emergencyContact: employee.emergencyContact,
        emergencyPhone: employee.emergencyPhone,
        emergencyRelation: employee.emergencyRelation,
        homeAddress: employee.homeAddress,
        homePhone: employee.homePhone,
        customFields: JSON.stringify(mergedCustomFields),
        // 当前工作信息
        currentWorkInfo: currentWorkInfo ? {
          ...currentWorkInfo,
          customFields: workInfoCustomFields, // 解析后的自定义字段
        } : null,
        // 学历列表
        educations,
        // 工作经历列表
        workExperiences,
        // 家庭成员列表
        familyMembers,
      };

      return result;
    }

    // 如果是历史版本，查找该日期的变更记录
    const versionDate = new Date(version);
    const changeLogs = await this.prisma.employeeChangeLog.findMany({
      where: {
        employeeId,
        createdAt: {
          lte: versionDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 构建历史快照
    const snapshot: any = {
      id: employeeId,
      employeeNo: employee.employeeNo,
      name: employee.name,
      customFields: JSON.parse(employee.customFields || '{}'),
    };

    // 应用变更记录，回溯到指定时间点的状态
    changeLogs.forEach((log) => {
      if (log.fieldName === 'position') {
        snapshot.position = log.oldValue;
      } else if (log.fieldName === 'jobLevel') {
        snapshot.jobLevel = log.oldValue;
      } else if (log.fieldName === 'employeeType') {
        snapshot.employeeType = log.oldValue;
      } else if (log.fieldName === 'orgId') {
        snapshot.orgId = log.oldValue ? +log.oldValue : null;
      } else if (log.fieldName === 'workLocation') {
        snapshot.workLocation = log.oldValue;
      } else if (log.fieldName === 'workAddress') {
        snapshot.workAddress = log.oldValue;
      }
    });

    return snapshot;
  }

  /**
   * 更新当前工作信息
   * 更新员工信息并记录变更日志
   * - 职位信息（支持时间轴）：保存到 customFields 并记录变更日志
   * - 入职信息（不支持时间轴）：直接更新员工表字段
   */
  async updateCurrentWorkInfo(employeeId: number, dto: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 职位信息字段（支持时间轴）
    const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType'];

    // 入职信息字段（不支持时间轴）
    const entryInfoFields = ['entryDate', 'hireDate'];

    // 解析数据
    const newCustomFields = JSON.parse(dto.customFields || '{}');
    const entryInfo = dto.entryInfo || {};

    // 解析当前的 customFields
    const currentCustomFields = JSON.parse(employee.customFields || '{}');

    // 获取工作信息页签的所有自定义字段代码
    const workInfoTab = await this.prisma.employeeInfoTab.findUnique({
      where: { code: 'work_info' },
      include: {
        groups: {
          include: {
            fields: {
              where: { fieldType: 'CUSTOM' },
            },
          },
        },
      },
    });

    // 提取工作信息页签的自定义字段代码
    const workInfoCustomFieldCodes = new Set<string>();
    if (workInfoTab) {
      for (const group of workInfoTab.groups) {
        for (const field of group.fields) {
          workInfoCustomFieldCodes.add(field.fieldCode);
        }
      }
    }

    // 1. 分离自定义字段：工作信息的 vs 其他页签的
    const workInfoCustomFields: any = {};
    const otherCustomFields: any = {};

    for (const [key, value] of Object.entries(newCustomFields)) {
      if (workInfoCustomFieldCodes.has(key)) {
        workInfoCustomFields[key] = value;
      } else {
        otherCustomFields[key] = value;
      }
    }

    // 2. 合并其他页签的自定义字段
    const mergedCustomFields = {
      ...currentCustomFields,
      ...otherCustomFields,
    };

    // 3. 获取当前工作信息记录
    const currentWorkInfo = await this.prisma.workInfoHistory.findFirst({
      where: { employeeId, isCurrent: true },
    });

    if (currentWorkInfo) {
      // 更新当前工作信息
      const workInfoUpdateData: any = {};

      // 更新标准字段
      for (const field of positionInfoFields) {
        if (newCustomFields[field] !== undefined) {
          workInfoUpdateData[field] = newCustomFields[field];
        }
      }

      // 更新工作信息的自定义字段
      const currentWorkInfoCustomFields = JSON.parse(currentWorkInfo.customFields || '{}');
      const mergedWorkInfoCustomFields = {
        ...currentWorkInfoCustomFields,
        ...workInfoCustomFields,
      };
      workInfoUpdateData.customFields = JSON.stringify(mergedWorkInfoCustomFields);

      // 更新工作信息
      await this.prisma.workInfoHistory.update({
        where: { id: currentWorkInfo.id },
        data: workInfoUpdateData,
      });

      // 记录职位信息变更日志
      for (const field of positionInfoFields) {
        const oldValue = currentCustomFields[field];
        const newValue = newCustomFields[field];

        if (oldValue !== newValue && newValue !== undefined) {
          await this.prisma.employeeChangeLog.create({
            data: {
              employeeId,
              fieldName: field,
              oldValue: oldValue?.toString() || null,
              newValue: newValue?.toString() || null,
              operatorId: 1, // TODO: 从请求上下文获取当前用户
              operatorName: '系统',
            },
          });
        }
      }
    }

    // 4. 更新员工信息（入职信息 + 其他页签的自定义字段）
    // 从 mergedCustomFields 中移除不属于 Employee 表的字段
    const validEmployeeCustomFields: any = {};
    const employeeTableFields = ['status', 'entryDate', 'hireDate', 'resignationDate', 'resignationReason'];
    for (const [key, value] of Object.entries(mergedCustomFields)) {
      if (!employeeTableFields.includes(key)) {
        validEmployeeCustomFields[key] = value;
      }
    }

    const employeeUpdateData: any = {
      customFields: JSON.stringify(validEmployeeCustomFields),
    };

    // 更新入职日期
    if (entryInfo.entryDate !== undefined) {
      employeeUpdateData.entryDate = new Date(entryInfo.entryDate);
    }

    // 更新受雇日期（保存在 customFields 中）
    if (entryInfo.hireDate !== undefined) {
      validEmployeeCustomFields.hireDate = entryInfo.hireDate;
      employeeUpdateData.customFields = JSON.stringify(validEmployeeCustomFields);
    }

    // 更新员工信息
    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: employeeUpdateData,
    });

    return {
      ...updated,
      customFields: mergedCustomFields,
    };
  }

  /**
   * 创建工作信息新版本
   * 创建一个带生效日期的新版本记录
   * - 职位信息（支持时间轴）：记录变更日志
   * - 入职信息（不支持时间轴）：直接更新员工字段，不参与版本管理
   */
  async createWorkInfoVersion(employeeId: number, dto: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    const { effectiveDate, customFields, entryInfo } = dto;

    if (!effectiveDate) {
      throw new BadRequestException('生效日期不能为空');
    }

    // 职位信息字段（支持时间轴）
    const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType'];

    // 解析新的 customFields
    const newCustomFields = JSON.parse(customFields || '{}');
    const currentCustomFields = JSON.parse(employee.customFields || '{}');

    // 获取工作信息页签的所有自定义字段代码
    const workInfoTab = await this.prisma.employeeInfoTab.findUnique({
      where: { code: 'work_info' },
      include: {
        groups: {
          include: {
            fields: {
              where: { fieldType: 'CUSTOM' },
            },
          },
        },
      },
    });

    // 提取工作信息页签的自定义字段代码
    const workInfoCustomFieldCodes = new Set<string>();
    if (workInfoTab) {
      for (const group of workInfoTab.groups) {
        for (const field of group.fields) {
          workInfoCustomFieldCodes.add(field.fieldCode);
        }
      }
    }

    // 分离自定义字段：工作信息的 vs 其他页签的
    const workInfoCustomFields: any = {};
    const otherCustomFields: any = {};

    for (const [key, value] of Object.entries(newCustomFields)) {
      if (workInfoCustomFieldCodes.has(key)) {
        workInfoCustomFields[key] = value;
      } else {
        otherCustomFields[key] = value;
      }
    }

    // 1. 记录职位信息变更（带生效日期）
    for (const field of positionInfoFields) {
      const oldValue = currentCustomFields[field];
      const newValue = newCustomFields[field];

      if (oldValue !== newValue && newValue !== undefined) {
        await this.prisma.employeeChangeLog.create({
          data: {
            employeeId,
            fieldName: field,
            oldValue: oldValue?.toString() || null,
            newValue: newValue?.toString() || null,
            operatorId: 1, // TODO: 从请求上下文获取当前用户
            operatorName: '系统',
            createdAt: new Date(effectiveDate), // 使用生效日期作为创建时间
          },
        });
      }
    }

    // 2. 合并其他页签的自定义字段
    const mergedCustomFields = {
      ...currentCustomFields,
      ...otherCustomFields,
    };

    // 3. 创建新的工作信息历史记录
    const newWorkInfoData: any = {
      employeeId,
      effectiveDate: new Date(effectiveDate),
      isCurrent: true,
      customFields: JSON.stringify(workInfoCustomFields),
    };

    // 只设置 WorkInfoHistory 表中实际存在的职位信息字段
    const validWorkInfoFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType'];
    for (const field of validWorkInfoFields) {
      if (newCustomFields[field] !== undefined) {
        newWorkInfoData[field] = newCustomFields[field];
      }
    }

    // 将旧版本设为非当前
    await this.prisma.workInfoHistory.updateMany({
      where: { employeeId, isCurrent: true },
      data: { isCurrent: false },
    });

    // 创建新版本
    await this.prisma.workInfoHistory.create({
      data: newWorkInfoData,
    });

    // 4. 更新员工信息（入职信息 + 其他页签的自定义字段）
    const employeeUpdateData: any = {
      customFields: JSON.stringify(mergedCustomFields),
    };

    // 处理入职信息（直接更新，不参与版本管理）
    if (entryInfo) {
      if (entryInfo.entryDate !== undefined) {
        employeeUpdateData.entryDate = new Date(entryInfo.entryDate);
      }
      if (entryInfo.hireDate !== undefined) {
        mergedCustomFields.hireDate = entryInfo.hireDate;
        employeeUpdateData.customFields = JSON.stringify(mergedCustomFields);
      }
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: employeeUpdateData,
    });

    return {
      ...updated,
      customFields: mergedCustomFields,
      effectiveDate,
    };
  }

  // ==================== 工作信息历史管理 ====================

  /**
   * 获取工作信息历史列表
   */
  async getWorkInfoHistoryList(employeeId: number) {
    const history = await this.prisma.workInfoHistory.findMany({
      where: { employeeId },
      orderBy: [{ effectiveDate: 'desc' }],
      include: {
        org: true,
      },
    });

    return history;
  }

  /**
   * 创建工作信息历史记录
   */
  async createWorkInfoHistory(employeeId: number, dto: any) {
    // 如果创建的是当前生效的记录，先将其他当前记录设为非当前
    if (dto.isCurrent) {
      await this.prisma.workInfoHistory.updateMany({
        where: { employeeId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    return this.prisma.workInfoHistory.create({
      data: {
        employeeId,
        ...dto,
      },
      include: {
        org: true,
      },
    });
  }

  /**
   * 更新指定的工作信息历史记录
   * 用于更正历史版本，不记录变更日志
   */
  async updateWorkInfoHistory(historyId: number, dto: any) {
    // 验证记录是否存在
    const workInfoHistory = await this.prisma.workInfoHistory.findUnique({
      where: { id: historyId },
    });

    if (!workInfoHistory) {
      throw new NotFoundException('工作信息记录不存在');
    }

    const { customFields, entryInfo } = dto;

    // 职位信息字段（支持时间轴）
    const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType'];

    // 入职信息字段（不支持时间轴）
    const entryInfoFields = ['entryDate', 'hireDate'];

    // 解析 customFields
    const newCustomFields = JSON.parse(customFields || '{}');
    const currentCustomFields = JSON.parse(workInfoHistory.customFields || '{}');

    // 准备更新数据
    const updateData: any = {};

    // 更新标准字段
    for (const field of positionInfoFields) {
      if (newCustomFields[field] !== undefined) {
        updateData[field] = newCustomFields[field];
      }
    }

    // 更新 customFields（只保留自定义字段，不包括标准字段）
    const workInfoCustomFields = { ...currentCustomFields };
    for (const field of positionInfoFields) {
      if (newCustomFields[field] !== undefined) {
        delete workInfoCustomFields[field];
      }
    }

    // 合并其他自定义字段
    for (const [key, value] of Object.entries(newCustomFields)) {
      if (!positionInfoFields.includes(key)) {
        workInfoCustomFields[key] = value;
      }
    }

    updateData.customFields = JSON.stringify(workInfoCustomFields);

    // 更新记录
    return this.prisma.workInfoHistory.update({
      where: { id: historyId },
      data: updateData,
      include: {
        org: true,
      },
    });
  }

  /**
   * 删除工作信息历史记录
   */
  async deleteWorkInfoHistory(id: number) {
    await this.prisma.workInfoHistory.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // ==================== 学历信息管理 ====================

  /**
   * 获取员工学历列表
   */
  async getEmployeeEducations(employeeId: number) {
    return this.prisma.employeeEducation.findMany({
      where: { employeeId },
      orderBy: [{ isHighest: 'desc' }, { endDate: 'desc' }],
    });
  }

  /**
   * 创建学历信息
   */
  async createEmployeeEducation(employeeId: number, dto: any) {
    // 如果设置的是最高学历，先将其他学历设为非最高
    if (dto.isHighest) {
      await this.prisma.employeeEducation.updateMany({
        where: { employeeId, isHighest: true },
        data: { isHighest: false },
      });
    }

    return this.prisma.employeeEducation.create({
      data: {
        employeeId,
        ...dto,
      },
    });
  }

  /**
   * 更新学历信息
   */
  async updateEmployeeEducation(id: number, dto: any) {
    const education = await this.prisma.employeeEducation.findUnique({
      where: { id },
    });

    if (!education) {
      throw new NotFoundException('学历信息不存在');
    }

    // 如果设置的是最高学历，先将其他学历设为非最高
    if (dto.isHighest) {
      await this.prisma.employeeEducation.updateMany({
        where: {
          employeeId: education.employeeId,
          isHighest: true,
          id: { not: id },
        },
        data: { isHighest: false },
      });
    }

    return this.prisma.employeeEducation.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除学历信息
   */
  async deleteEmployeeEducation(id: number) {
    await this.prisma.employeeEducation.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // ==================== 工作经历管理 ====================

  /**
   * 获取员工工作经历列表
   */
  async getEmployeeWorkExperiences(employeeId: number) {
    return this.prisma.employeeWorkExperience.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
    });
  }

  /**
   * 创建工作经历
   */
  async createEmployeeWorkExperience(employeeId: number, dto: any) {
    return this.prisma.employeeWorkExperience.create({
      data: {
        employeeId,
        ...dto,
      },
    });
  }

  /**
   * 更新工作经历
   */
  async updateEmployeeWorkExperience(id: number, dto: any) {
    return this.prisma.employeeWorkExperience.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除工作经历
   */
  async deleteEmployeeWorkExperience(id: number) {
    await this.prisma.employeeWorkExperience.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // ==================== 家庭成员管理 ====================

  /**
   * 获取员工家庭成员列表
   */
  async getEmployeeFamilyMembers(employeeId: number) {
    return this.prisma.employeeFamilyMember.findMany({
      where: { employeeId },
      orderBy: [{ isEmergency: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * 创建家庭成员
   */
  async createEmployeeFamilyMember(employeeId: number, dto: any) {
    return this.prisma.employeeFamilyMember.create({
      data: {
        employeeId,
        ...dto,
      },
    });
  }

  /**
   * 更新家庭成员
   */
  async updateEmployeeFamilyMember(id: number, dto: any) {
    return this.prisma.employeeFamilyMember.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除家庭成员
   */
  async deleteEmployeeFamilyMember(id: number) {
    await this.prisma.employeeFamilyMember.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}
