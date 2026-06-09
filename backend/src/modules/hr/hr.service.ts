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
    const {
      page = 1,
      pageSize = 10,
      keyword,
      search,
      orgId,
      status,
      employeeNo,
      name,
      employeeType,
      entryDate
    } = query;
    const skip = (page - 1) * pageSize;

    // 优先使用单独字段查询，如果没有则使用关键字搜索
    const searchKeyword = search || keyword;

    const where: any = {};

    // 单独字段查询（优先级更高）
    if (employeeNo) {
      where.employeeNo = { contains: employeeNo };
    }
    if (name) {
      where.name = { contains: name };
    }
    if (employeeType) {
      where.employeeType = employeeType;
    }
    if (entryDate) {
      // 支持 entryDate 单独查询
      const date = new Date(entryDate);
      where.entryDate = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lte: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    // 如果没有单独字段查询，则使用关键字搜索
    if (!employeeNo && !name && !employeeType && !entryDate && searchKeyword && searchKeyword.trim()) {
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

  /**
   * 获取员工选择列表（不需要权限，用于下拉选择）
   * 应用数据权限过滤，只返回用户有权查看的员工
   */
  async getEmployeeSelectList(
    params: {
      status?: string;
      keyword?: string;
      pageSize?: number;
    },
    user?: any
  ) {
    const { status = 'ACTIVE', keyword, pageSize = 1000 } = params;

    const where: any = {};

    if (status && status.trim()) {
      where.status = status;
    }

    if (keyword && keyword.trim()) {
      where.OR = [
        { name: { contains: keyword } },
        { employeeNo: { contains: keyword } },
      ];
    }

    // 应用数据权限过滤
    if (user && user.username !== 'admin') {
      const dataScopeFilter = await this.dataScopeService.getEmployeeFilter(user, user.orgId);
      Object.assign(where, dataScopeFilter);
    }

    const items = await this.prisma.employee.findMany({
      where,
      take: +pageSize,
      include: {
        org: true,
      },
      orderBy: { employeeNo: 'asc' },
    });

    return {
      items,
      total: items.length,
    };
  }

  async getEmployeeChangeLogs(employeeId: number) {
    return this.prisma.employeeChangeLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 自动生成员工工号
   * 规则：年月 + 三位序号（例如：202604001）
   */
  async generateEmployeeNo(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}${month}`;

    // 查询当前年月已有的最大工号
    const employees = await this.prisma.employee.findMany({
      where: {
        employeeNo: {
          startsWith: yearMonth,
        },
      },
      select: {
        employeeNo: true,
      },
      orderBy: {
        employeeNo: 'desc',
      },
      take: 1,
    });

    let nextSerial = 1;
    if (employees.length > 0 && employees[0].employeeNo) {
      const lastEmployeeNo = employees[0].employeeNo;
      const lastSerial = parseInt(lastEmployeeNo.slice(-3));
      if (!isNaN(lastSerial)) {
        nextSerial = lastSerial + 1;
      }
    }

    const serial = String(nextSerial).padStart(3, '0');
    return `${yearMonth}${serial}`;
  }

  async createEmployee(dto: CreateEmployeeDto) {
    console.log('========== 开始创建员工 ==========');
    console.log('接收到的原始数据:', JSON.stringify(dto, null, 2));

    // 如果没有提供工号，自动生成
    if (!dto.employeeNo) {
      dto.employeeNo = await this.generateEmployeeNo();
    }

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

    // 三个核心字段：始终必填且不能隐藏（employeeNo 可以自动生成，所以不是严格必填）
    const coreFields = ['entryDate', 'orgId'];
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
    // 这些字段直接存储在 Employee 表中（根据 Prisma schema 定义）
    const employeeFields = [
      'employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'orgId', 'entryDate',
      'status', 'birthDate', 'age', 'maritalStatus', 'nativePlace', 'politicalStatus',
      'householdRegister', 'currentAddress', 'photo', 'emergencyContact',
      'emergencyPhone', 'emergencyRelation', 'homeAddress', 'homePhone', 'customFields'
    ];

    // 定义工作信息字段（工作信息页签）
    // 这些字段存储在 WorkInfoHistory 表中（根据 Prisma schema 定义）
    const workInfoFields = [
      'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
      'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'resignationDate', 'resignationReason', 'workYears',
      'costCenter', 'employmentRelation',
      'orgId', 'effectiveDate', 'isCurrent', 'reason'
    ];

    // 分离数���：Employee 表数据、工作信息数据、子表数据
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

    // 工作信息的自定义字段（不在 WorkInfoHistory 表中的工作信息相关字段）
    const workInfoCustomFieldKeys = [
      'probationPeriod', 'jobPost', 'usageStartDate', 'serviceYearsStartDate', 'estimatedProbationEndDate'
    ];
    const workInfoCustomFields: any = {};

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

      // 对于 workInfoFields，即使是空值也要处理（保存为 null）
      // 对于其他字段，跳过空值（undefined、null、空字符串）
      if (!workInfoFields.includes(key)) {
        if (value === undefined || value === null || value === '') {
          console.log(`跳过空值字段: ${key}`);
          return;
        }
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
        console.log(`Employee 字段: ${key} = ${finalValue}`);
      } else if (workInfoFields.includes(key)) {
        // 工作信息字段（即使是空值也保存为 null）
        let finalValue = value;
        // 转换日期字符串为 Date 对象
        if (typeof value === 'string' && (key.includes('Date') || key.includes('Start') || key.includes('End'))) {
          finalValue = new Date(value);
        }
        // 如果是空值，保存为 null
        if (value === undefined || value === null || value === '') {
          finalValue = null;
        }
        workInfoData[key] = finalValue;
        console.log(`WorkInfo 字段: ${key} = ${finalValue}`);
      } else if (workInfoCustomFieldKeys.includes(key)) {
        // 工作信息的自定义字段（保存到 WorkInfoHistory.customFields）
        let finalValue = value;
        // 转换日期字符串为 Date 对象
        if (typeof value === 'string' && (key.includes('Date') || key.includes('Start') || key.includes('End'))) {
          finalValue = new Date(value);
        }
        workInfoCustomFields[key] = finalValue;
        console.log(`WorkInfo Custom 字段: ${key} = ${finalValue}`);
      } else {
        // 其他字段放入 Employee 的 customFields（用于扩展）
        finalCustomFields[key] = value;
        console.log(`Employee Custom 字段: ${key} = ${value}`);
      }
    });

    console.log('处理后的 employeeData:', JSON.stringify(employeeData, null, 2));
    console.log('处理后的 workInfoData:', JSON.stringify(workInfoData, null, 2));
    console.log('处理后的 workInfoCustomFields:', JSON.stringify(workInfoCustomFields, null, 2));
    console.log('处理后的 finalCustomFields:', JSON.stringify(finalCustomFields, null, 2));

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
      // 序列化 workInfoCustomFields
      const customFieldsJson = JSON.stringify(workInfoCustomFields);

      console.log('准备创建 WorkInfoHistory，数据如下:');
      console.log('workInfoData:', JSON.stringify(workInfoData, null, 2));
      console.log('workInfoCustomFields:', JSON.stringify(workInfoCustomFields, null, 2));
      console.log('customFieldsJson:', customFieldsJson);


      // 如果有工作信息字段中的任何一个，就创建工作信息历史
      const hasWorkInfo = Object.keys(workInfoData).length > 0 || Object.keys(workInfoCustomFields).length > 0;
      if (hasWorkInfo) {
        // 新增员工时，固定设置异动类型为"入职"（ENTRY）
        const finalChangeType = workInfoData.changeType || 'ENTRY';

        await this.prisma.workInfoHistory.create({
          data: {
            employeeId: employee.id,
            effectiveDate: workInfoData.effectiveDate || employee.entryDate || new Date(),
            changeType: finalChangeType,
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
            costCenter: workInfoData.costCenter || null,
            employmentRelation: workInfoData.employmentRelation || null,
            orgId: workInfoData.orgId || employee.orgId,
            customFields: customFieldsJson,
            isCurrent: true,
          },
        }).then(created => {
          console.log('WorkInfoHistory 创建成功，ID:', created.id);
          console.log('costCenter:', created.costCenter);
          console.log('employmentRelation:', created.employmentRelation);
          console.log('workLocation:', created.workLocation);
          console.log('workAddress:', created.workAddress);
          return created;
        });
      } else {
        // 即使没有工作信息，也创建一个默认的工作信息历史，异动类型固定为"入职"
        await this.prisma.workInfoHistory.create({
          data: {
            employeeId: employee.id,
            effectiveDate: employee.entryDate || new Date(),
            changeType: 'ENTRY', // 新增员工时固定为入职
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

    // 在更新数据之前，先计算当前的账户路径
    let oldAccountPath = '';
    if (isOrgChanged || isCustomFieldsChanged) {
      try {
        oldAccountPath = await this.accountService.calculateEmployeeAccountPath(id);
        console.log('更新前的账户路径:', oldAccountPath);
      } catch (error: any) {
        console.warn('无法计算更新前的账户路径:', error.message);
      }
    }

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

    // 定义工作信息字段（这些字段变更会影响账户路径，需要创建新账户）
    const workInfoFieldCodes = new Set([
      'orgId',
      'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress'
    ]);

    // 检查是否有任何字段发生变更
    const hasAnyFieldChanges = isOrgChanged || isCustomFieldsChanged || Object.keys(updateData).length > 0;

    // 只有当影响账户路径的字段发生变更时，才重新生成劳动力账户
    let shouldRegenerateAccounts = false;
    let isWorkInfoChanged = false;

    if (isOrgChanged || isCustomFieldsChanged) {
      try {
        // 计算更新后的账户路径（基于更新后的数据）
        const newAccountPath = await this.accountService.calculateEmployeeAccountPath(id);
        console.log('更新后的账户路径:', newAccountPath);

        // 检查是否是工作信息字段变更
        isWorkInfoChanged = isOrgChanged; // 组织变更肯定是工作信息变更

        if (!isWorkInfoChanged && isCustomFieldsChanged && dto.customFields) {
          // 检查 customFields 中的工作信息字段是否变更
          const oldCustomFields = typeof employee.customFields === 'string'
            ? JSON.parse(employee.customFields)
            : employee.customFields || {};
          const newCustomFields = typeof dto.customFields === 'string'
            ? JSON.parse(dto.customFields)
            : dto.customFields || {};

          // 检查是否有工作信息字段变更
          for (const field of workInfoFieldCodes) {
            if (field !== 'orgId' && oldCustomFields[field] !== newCustomFields[field]) {
              isWorkInfoChanged = true;
              break;
            }
          }
        }

        // 只有当路径发生变化时才重新生成账户
        if (oldAccountPath !== newAccountPath) {
          console.log('账户路径发生变化，需要重新生成账户');
          console.log('  旧路径:', oldAccountPath);
          console.log('  新路径:', newAccountPath);
          shouldRegenerateAccounts = true;
        } else {
          console.log('账户路径未发生变化');
        }
      } catch (error: any) {
        // 如果无法计算路径（例如没有配置层级），则不重新生成
        console.warn(`无法计算员工账户路径:`, error.message);
      }
    }

    // 处理账户更新
    if (shouldRegenerateAccounts) {
      // 工作信息变更：重新生成劳动力账户（创建新账户，旧账户失效）
      try {
        console.log('工作信息变更，重新生成劳动力账户');
        await this.accountService.regenerateAccountsForEmployee(id);
      } catch (error: any) {
        // 记录错误但不影响员工更新
        console.error(`员工 ${updatedEmployee.employeeNo} 账户更新失败:`, error.message);
      }
    } else if (hasAnyFieldChanges && !isWorkInfoChanged) {
      // 非工作信息变更：只更新当前账户元数据，不创建新账户
      try {
        console.log('非工作信息变更，更新当前账户元数据');
        await this.accountService.updateCurrentAccount(id);
      } catch (error: any) {
        // 记录错误但不影响员工更新
        console.error(`员工 ${updatedEmployee.employeeNo} 账户元数据更新失败:`, error.message);
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
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { employeeNo: true },
    });

    if (!employee) {
      return [];
    }

    const accountLinks = await this.prisma.employeeLaborAccount.findMany({
      where: {
        employeeNo: employee.employeeNo,
      },
      include: {
        account: true,
      },
      orderBy: [
        { account: { level: 'asc' } },
        { effectiveDate: 'desc' },
      ],
    });

    return accountLinks.map(link => link.account);
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
    // 1. 获取员工信息页签中所有配置了数据源的字段（包括系统字段和自定义字段）
    const tabFields = await this.prisma.employeeInfoTabField.findMany({
      where: {
        dataSourceId: { not: null },
        tab: {
          status: 'ACTIVE',
        },
      },
      include: {
        dataSource: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sort: 'asc' },
            },
          },
        },
        tab: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { tab: { sort: 'asc' } },
        { sort: 'asc' },
      ],
    });

    // 2. 获取所有配置了数据源的自定义字段（包括未配置在页签中的）
    const customFields = await this.prisma.customField.findMany({
      where: {
        status: 'ACTIVE',
        dataSourceId: { not: null },
      },
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

    // 3. 转换页签字段
    const tabFieldConfigs = tabFields
      .filter(field => field.dataSource && field.dataSource.options && field.dataSource.options.length > 0)
      .map(field => ({
        field: field.fieldCode,
        name: field.fieldName,
        tabCode: field.tab.code,
        tabName: field.tab.name,
        isSystem: field.isSystem,
        options: field.dataSource.options.map(opt => ({
          id: opt.id,
          name: opt.label,
          label: opt.label,
          value: opt.value,
          code: opt.value,
        })),
      }))
      .filter(config => config.options.length > 0);

    // 4. 转换自定义字段（只添加没有在页签字段中的）
    const tabFieldCodes = new Set(tabFieldConfigs.map(config => config.field));
    const customFieldConfigs = customFields
      .filter(field => field.dataSource && field.dataSource.options && field.dataSource.options.length > 0)
      .filter(field => !tabFieldCodes.has(field.code)) // 排除已存在于页签中的
      .map(field => ({
        field: field.code,
        name: field.name,
        tabCode: 'custom_field',
        tabName: '自定义字段',
        isSystem: field.isSystem,
        options: field.dataSource.options.map(opt => ({
          id: opt.id,
          name: opt.label,
          label: opt.label,
          value: opt.value,
          code: opt.value,
        })),
      }))
      .filter(config => config.options.length > 0);

    // 5. 合并结果
    const result = [...tabFieldConfigs, ...customFieldConfigs];

    console.log('=== getEmployeeInfoConfigs 返回数据 ===');
    console.log('页签字段数量:', tabFieldConfigs.length);
    console.log('自定义字段数量:', customFields.length);
    console.log('字段总数:', result.length);
    console.log('返回数据:', JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * 获取所有人事信息模版字段（用于人员筛选条件）
   * 只返回基本信息和工作信息页签的字段
   */
  async getAllEmployeeInfoFields() {
    // 定义允许的页签代码
    const allowedTabCodes = ['basic_info', 'work_info'];

    console.log('=== getAllEmployeeInfoFields 开始执行 ===');
    console.log('允许的页签:', allowedTabCodes);

    // 1. 获取所有员工信息页签字段（只获取指定页签）
    const tabFields = await this.prisma.employeeInfoTabField.findMany({
      where: {
        tab: {
          status: 'ACTIVE',
          code: {
            in: allowedTabCodes,
          },
        },
        isHidden: false, // 不返回隐藏字段
      },
      include: {
        dataSource: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sort: 'asc' },
            },
          },
        },
        tab: {
          select: {
            code: true,
            name: true,
          },
        },
        group: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { tab: { sort: 'asc' } },
        { group: { sort: 'asc' } },
        { sort: 'asc' },
      ],
    });

    console.log('=== getAllEmployeeInfoFields - 查询结果 ===');
    console.log('筛选的页签代码:', allowedTabCodes);
    console.log('页签字段总数:', tabFields.length);

    // 打印每个字段的数据源情况
    tabFields.forEach(field => {
      console.log(`字段 [${field.fieldCode}] ${field.fieldName}:`, {
        fieldType: field.fieldType,
        hasDataSource: !!field.dataSource,
        dataSourceId: field.dataSourceId,
        dataSourceCode: field.dataSource?.code,
        optionsCount: field.dataSource?.options?.length || 0,
      });
    });

    // 2. 转换页签字段
    const tabFieldConfigs = tabFields.map(field => {
      const config = {
        field: field.fieldCode,
        name: field.fieldName,
        tabCode: field.tab.code,
        tabName: field.tab.name,
        groupCode: field.group?.code,
        groupName: field.group?.name,
        isSystem: field.isSystem,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        isHidden: field.isHidden,
        hasDataSource: !!field.dataSource,
        dataSource: field.dataSource ? {
          id: field.dataSource.id,
          code: field.dataSource.code,
          name: field.dataSource.name,
          options: field.dataSource.options.map(opt => ({
            id: opt.id,
            label: opt.label,
            value: opt.value,
            code: opt.value,
            sort: opt.sort,
          })),
        } : null,
        sort: field.sort,
      };

      // 调试：打印每个字段配置
      if (config.hasDataSource) {
        console.log(`✅ 字段 [${field.fieldCode}] ${field.fieldName} 有数据源:`, {
          dataSourceCode: config.dataSource.code,
          optionsCount: config.dataSource.options.length,
        });
      } else {
        console.log(`❌ 字段 [${field.fieldCode}] ${field.fieldName} 无数据源`);
      }

      return config;
    });

    // 3. 转换自定义字段（只添加没有在页签中配置的，且类型合适的）
    const tabFieldCodes = new Set(tabFieldConfigs.map(config => config.field));

    // 获取自定义字段，但只返回基本信息和工作信息相关的
    const customFields = await this.prisma.customField.findMany({
      where: {
        status: 'ACTIVE',
        // 只获取合适的字段类型用于筛选
        type: {
          in: ['TEXT', 'NUMBER', 'SELECT_SINGLE', 'SELECT_MULTI', 'LOOKUP'],
        },
      },
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

    console.log('自定义字段总数:', customFields.length);

    // 使用 Map 去重，key 为字段代码
    const fieldMap = new Map<string, any>();

    // 先添加页签字段
    tabFieldConfigs.forEach(config => {
      fieldMap.set(config.field, {
        ...config,
        source: 'tab', // 标记来源
      });
    });

    // 再处理自定义字段，只添加不在页签中的
    customFields.forEach(field => {
      if (!fieldMap.has(field.code)) {
        // 只添加不在页签中的字段
        const config = {
          field: field.code,
          name: field.name,
          tabCode: 'custom_field',
          tabName: '自定义字段',
          groupCode: null,
          groupName: null,
          isSystem: field.isSystem,
          fieldType: this.mapCustomFieldTypeToFieldType(field.type),
          isRequired: field.isRequired || false,
          isHidden: false,
          hasDataSource: !!field.dataSource,
          dataSource: field.dataSource ? {
            id: field.dataSource.id,
            code: field.dataSource.code,
            name: field.dataSource.name,
            options: field.dataSource.options.map(opt => ({
              id: opt.id,
              label: opt.label,
              value: opt.value,
              code: opt.value,
              sort: opt.sort,
            })),
          } : null,
          sort: field.sort,
          source: 'custom', // 标记来源
        };

        fieldMap.set(field.code, config);
      }
    });

    // 转换为数组
    const result = Array.from(fieldMap.values());

    console.log('=== 去重后的字段列表 ===');
    result.forEach(f => {
      console.log(`- [${f.field}] ${f.name} (${f.source}) - 有数据源: ${f.hasDataSource}`);
    });

    console.log('=== getAllEmployeeInfoFields 返回数据 ===');
    console.log('基本信息字段数量:', tabFieldConfigs.filter(f => f.tabCode === 'basic_info').length);
    console.log('工作信息字段数量:', tabFieldConfigs.filter(f => f.tabCode === 'work_info').length);
    console.log('自定义字段数量:', customFields.length);
    console.log('字段总数:', result.length);
    console.log('有数据源的字段:', result.filter(f => f.hasDataSource).length);
    console.log('无数据源的字段:', result.filter(f => !f.hasDataSource).length);

    // 打印所有有数据源的字段
    const fieldsWithDataSource = result.filter(f => f.hasDataSource);
    console.log('=== 有数据源的字段列表 ===');
    fieldsWithDataSource.forEach(f => {
      console.log(`- [${f.field}] ${f.name}: ${f.dataSource?.code} (${f.dataSource?.options.length} 选项)`);
    });

    return result;
  }

  /**
   * 将自定义字段类型映射到字段类型
   */
  private mapCustomFieldTypeToFieldType(customFieldType: string): string {
    const typeMap: Record<string, string> = {
      'TEXT': 'text',
      'NUMBER': 'number',
      'DATE': 'date',
      'SELECT_SINGLE': 'select',
      'SELECT_MULTI': 'select_multi',
      'LOOKUP': 'lookup',
    };
    return typeMap[customFieldType] || 'text';
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
    // 首先获取数据源信息
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!dataSource) {
      throw new NotFoundException('数据源不存在');
    }

    console.log(`[getDataSourceOptions] dataSourceId: ${dataSourceId}, code: ${dataSource.code}`);

    // 优先从 DataSourceOption 表获取数据
    const customOptions = await this.prisma.dataSourceOption.findMany({
      where: {
        dataSourceId,
        isActive: true,
      },
      orderBy: { sort: 'asc' },
    });

    console.log(`[getDataSourceOptions] customOptions count: ${customOptions.length}`);
    if (customOptions.length > 0) {
      console.log(`[getDataSourceOptions] Returning DataSourceOption data:`, customOptions.map(o => o.label));
    }

    // 如果有自定义选项，直接返回
    if (customOptions.length > 0) {
      return customOptions;
    }

    // 如果没有自定义选项，且是内置数据源，从相应的表中获取数据
    if (dataSource.type === 'BUILTIN') {
      if (dataSource.code === 'PRODUCT') {
        // 从产品表获取数据
        const products = await this.prisma.product.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            code: true,
            name: true,
          },
          orderBy: { code: 'asc' },
        });

        return products.map((product) => ({
          id: product.id,
          label: `${product.code} - ${product.name}`,
          value: product.code,
          sort: 0,
          isActive: true,
        }));
      }

      if (dataSource.code === 'PROCESS') {
        // 从工序表获取数据
        const processes = await this.prisma.process.findMany({
          where: {
            status: 'ACTIVE',
            deletedAt: null,
          },
          select: {
            id: true,
            code: true,
            name: true,
          },
          orderBy: { sortOrder: 'asc' },
        });

        return processes.map((process) => ({
          id: process.id,
          label: `${process.code} - ${process.name}`,
          value: process.code,
          sort: 0,
          isActive: true,
        }));
      }
    }

    // 如果都没有数据，返回空数组
    return [];
  }

  async createDataSourceOption(dataSourceId: number, dto: any) {
    const option = await this.prisma.dataSourceOption.create({
      data: {
        dataSourceId,
        label: dto.label,
        value: dto.value,
        sort: dto.sort || 0,
      },
    });

    // 同步到层级明细表
    await this.accountService.syncDataSourceChangesToHierarchyDetails(dataSourceId);

    return option;
  }

  async updateDataSourceOption(id: number, dto: any) {
    const option = await this.prisma.dataSourceOption.update({
      where: { id },
      data: {
        label: dto.label,
        value: dto.value,
        sort: dto.sort,
      },
    });

    // 同步到层级明细表
    await this.accountService.syncDataSourceChangesToHierarchyDetails(option.dataSourceId);

    return option;
  }

  async deleteDataSourceOption(id: number) {
    const option = await this.prisma.dataSourceOption.findUnique({
      where: { id },
    });

    if (!option) {
      throw new NotFoundException('数据源选项不存在');
    }

    await this.prisma.dataSourceOption.update({
      where: { id },
      data: { isActive: false },
    });

    // 同步到层级明细表
    await this.accountService.syncDataSourceChangesToHierarchyDetails(option.dataSourceId);

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
    // 检查是否已存在相同的配置编码和字段配置
    const existing = await this.prisma.searchConditionConfig.findFirst({
      where: {
        configCode: dto.configCode,
        fieldCode: dto.fieldCode,
      },
    });

    if (existing) {
      throw new BadRequestException('该配置的字段已存在');
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

  // ==================== 统一查询条件配置 ====================

  async getUnifiedSearchConditionConfigs(query: any) {
    const { configCode, pageCode } = query;

    const configs = await this.prisma.searchConditionConfig.findMany({
      where: configCode ? { configCode } : undefined,
      orderBy: [{ configCode: 'asc' }, { sortOrder: 'asc' }],
    });

    console.log('=== getUnifiedSearchConditionConfigs ===');
    console.log('数据库原始配置:', JSON.stringify(configs.filter(c => c.fieldCode === 'orgId'), null, 2));

    // 获取所有自定义字段的映射，用于规范化字段类型
    const customFields = await this.prisma.customField.findMany({
      include: {
        dataSource: true,
      },
    });
    const customFieldMap = new Map(customFields.map(cf => [cf.code, cf]));

    // 获取所有员工信息字段，用于规范化字段类型
    const employeeFields = await this.prisma.employeeInfoTabField.findMany({
      include: {
        dataSource: true,
      },
    });
    const employeeFieldMap = new Map(employeeFields.map(ef => [ef.fieldCode, ef]));

    // 规范化配置中的字段类型
    const normalizeConfig = (config: any) => {
      let normalizedFieldType = config.fieldType;
      let normalizedDataSourceCode = config.dataSourceCode;

      console.log(`normalizeConfig [${config.fieldCode}]: 原始 fieldType="${config.fieldType}", dataSourceCode="${config.dataSourceCode}"`);

      // 如果配置的字段类型是text，尝试从实际字段配置中获取正确的类型
      if (config.fieldType === 'text') {
        // 首先检查是否是自定义字段
        if (customFieldMap.has(config.fieldCode)) {
          const customField = customFieldMap.get(config.fieldCode);
          normalizedDataSourceCode = customField.dataSource?.code;
          normalizedFieldType = this.normalizeFieldType(customField.type, normalizedDataSourceCode);
        }
        // 然后检查是否是员工信息字段
        else if (employeeFieldMap.has(config.fieldCode)) {
          const employeeField = employeeFieldMap.get(config.fieldCode);

          // 如果是自定义字段类型，从CustomField表获取详细信息
          if (employeeField.fieldType === 'CUSTOM' && customFieldMap.has(employeeField.fieldCode)) {
            const customField = customFieldMap.get(employeeField.fieldCode);
            normalizedDataSourceCode = customField.dataSource?.code;
            normalizedFieldType = this.normalizeFieldType(customField.type, normalizedDataSourceCode);
          } else {
            normalizedDataSourceCode = employeeField.dataSource?.code;
            normalizedFieldType = this.normalizeFieldType(employeeField.fieldType, normalizedDataSourceCode);
          }
        }
      }

      console.log(`normalizeConfig [${config.fieldCode}]: 规范化后 fieldType="${normalizedFieldType}"`);

      return {
        ...config,
        applicablePages: JSON.parse(config.applicablePages || '[]'),
        fieldType: normalizedFieldType,
        dataSourceCode: normalizedDataSourceCode,
      };
    };

    // 如果指定了pageCode，返回适用于该页面的配置
    if (pageCode) {
      const filtered = configs
        .filter((config) => {
          const applicablePages = JSON.parse(config.applicablePages || '[]');
          return applicablePages.includes(pageCode);
        })
        .map(normalizeConfig);

      console.log('最终返回的配置:', JSON.stringify(filtered.filter(c => c.fieldCode === 'orgId'), null, 2));
      return filtered;
    }

    return configs.map(normalizeConfig);
  }

  async createUnifiedSearchConditionConfig(dto: any) {
    const { applicablePages, ...rest } = dto;

    // 检查是否已存在相同编码的配置（使用findFirst而不是findUnique，因为唯一约束是组合的）
    const existing = await this.prisma.searchConditionConfig.findFirst({
      where: {
        configCode: dto.configCode,
      },
    });

    if (existing) {
      throw new BadRequestException('配置编码已存在');
    }

    return this.prisma.searchConditionConfig.create({
      data: {
        ...rest,
        applicablePages: JSON.stringify(applicablePages || []),
      },
    });
  }

  async updateUnifiedSearchConditionConfig(id: number, dto: any) {
    const config = await this.prisma.searchConditionConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('统一查询条件配置不存在');
    }

    const { applicablePages, ...rest } = dto;

    return this.prisma.searchConditionConfig.update({
      where: { id },
      data: {
        ...rest,
        ...(applicablePages !== undefined && {
          applicablePages: JSON.stringify(applicablePages),
        }),
      },
    });
  }

  async deleteUnifiedSearchConditionConfig(id: number) {
    await this.prisma.searchConditionConfig.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  async batchSaveUnifiedSearchConditionConfigs(dto: any) {
    try {
      const { configs } = dto;

      console.log('=== batchSaveUnifiedSearchConditionConfigs 开始 ===');
      console.log('收到的配置数量:', configs.length);
      console.log('配置详情:', JSON.stringify(configs, null, 2));

      if (!configs || configs.length === 0) {
        throw new Error('配置不能为空');
      }

      // 获取configCode
      const configCode = configs[0]?.configCode;
      if (!configCode) {
        throw new Error('配置编码不能为空');
      }

      console.log('配置编码:', configCode);

      // 删除该配置的所有现有记录
      const existingConfigs = await this.prisma.searchConditionConfig.findMany({
        where: { configCode },
      });

      if (existingConfigs.length > 0) {
        const idsToDelete = existingConfigs.map(c => c.id);
        console.log('要删除的旧配置ID:', idsToDelete);
        await this.prisma.searchConditionConfig.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      console.log('已删除旧配置');

      // 批量创建新配置
      const createdConfigs = await Promise.all(
        configs.map((config: any) => {
          // 只提取需要的字段
          const data: any = {
            configCode: config.configCode,
            configName: config.configName,
            pageCode: config.pageCode,
            pageName: config.pageName,
            fieldCode: config.fieldCode,
            fieldName: config.fieldName,
            fieldType: config.fieldType,
            isEnabled: config.isEnabled ?? true,
            sortOrder: config.sortOrder ?? 0,
            applicablePages: typeof config.applicablePages === 'string'
              ? config.applicablePages
              : JSON.stringify(config.applicablePages || []),
          };

          // 如果有dataSourceCode才添加
          if (config.dataSourceCode) {
            data.dataSourceCode = config.dataSourceCode;
          }

          console.log('创建配置数据:', JSON.stringify(data, null, 2));

          return this.prisma.searchConditionConfig.create({
            data,
          });
        })
      );

      console.log('创建了新配置数量:', createdConfigs.length);

      return {
        message: '批量保存成功',
        count: createdConfigs.length,
        data: createdConfigs,
      };
    } catch (error) {
      console.error('=== batchSaveUnifiedSearchConditionConfigs 错误 ===');
      console.error('错误详情:', error);
      console.error('错误堆栈:', error instanceof Error ? error.stack : 'No stack');
      throw error;
    }
  }

  async getAvailableSearchFields() {
    // 获取基本信息和工作信息页签
    const tabs = await this.prisma.employeeInfoTab.findMany({
      where: {
        status: 'ACTIVE',
        code: {
          in: ['basic_info', 'work_info'],
        },
      },
      include: {
        groups: {
          where: { status: 'ACTIVE' },
          include: {
            fields: {
              include: {
                dataSource: true,
              },
              orderBy: { sort: 'asc' },
            },
          },
          orderBy: { sort: 'asc' },
        },
        fields: {
          where: { groupId: null },
          include: {
            dataSource: true,
          },
          orderBy: { sort: 'asc' },
        },
      },
      orderBy: { sort: 'asc' },
    });

    // 获取所有自定义字段的映射
    const customFields = await this.prisma.customField.findMany({
      where: {
        code: {
          in: [...tabs.flatMap(tab =>
            [...tab.groups.flatMap(g => g.fields.map(f => f.fieldCode)),
             ...tab.fields.map(f => f.fieldCode)]
          )]
        },
      },
      include: {
        dataSource: true,
      },
    });

    const customFieldMap = new Map(customFields.map(cf => [cf.code, cf]));

    const result: any[] = [];

    for (const tab of tabs) {
      const tabFields: any[] = [];

      // 处理分组内的字段
      for (const group of tab.groups) {
        for (const field of group.fields) {
          if (!field.isHidden) {
            let dataSourceCode = field.dataSource?.code;
            let actualFieldType = field.fieldType;

            // 如果是自定义字段，从 CustomField 表获取详细信息
            if (field.fieldType === 'CUSTOM' && customFieldMap.has(field.fieldCode)) {
              const customField = customFieldMap.get(field.fieldCode);
              dataSourceCode = customField.dataSource?.code;
              actualFieldType = customField.type;
            }

            tabFields.push({
              fieldCode: field.fieldCode,
              fieldName: field.fieldName,
              fieldType: this.normalizeFieldType(actualFieldType, dataSourceCode),
              dataSourceCode: dataSourceCode,
              groupName: group.name,
              tabCode: tab.code,
              tabName: tab.name,
            });
          }
        }
      }

      // 处理未分组的字段
      for (const field of tab.fields) {
        if (!field.isHidden) {
          let dataSourceCode = field.dataSource?.code;
          let actualFieldType = field.fieldType;

          // 如果是自定义字段，从 CustomField 表获取详细信息
          if (field.fieldType === 'CUSTOM' && customFieldMap.has(field.fieldCode)) {
            const customField = customFieldMap.get(field.fieldCode);
            dataSourceCode = customField.dataSource?.code;
            actualFieldType = customField.type;
          }

          tabFields.push({
            fieldCode: field.fieldCode,
            fieldName: field.fieldName,
            fieldType: this.normalizeFieldType(actualFieldType, dataSourceCode),
            dataSourceCode: dataSourceCode,
            groupName: null,
            tabCode: tab.code,
            tabName: tab.name,
          });
        }
      }

      result.push({
        tabCode: tab.code,
        tabName: tab.name,
        fields: tabFields,
      });
    }

    return result;
  }

  private normalizeFieldType(fieldType: string, dataSourceCode?: string): 'text' | 'select' | 'date' | 'dateRange' | 'organization' {
    const type = fieldType.toLowerCase().trim();

    // 处理组织类型字段
    if (type === 'org' || type === 'organization') {
      return 'organization';
    }

    // 如果字段关联了数据源，则是下拉选择类型
    if (dataSourceCode) {
      return 'select';
    }

    if (type.includes('select') ||
        type.includes('lookup') ||
        type === 'select_single' ||
        type === 'select_multi') {
      return 'select';
    }

    if (type.includes('date') && type.includes('range')) {
      return 'dateRange';
    }

    if (type.includes('date')) {
      return 'date';
    }

    if (type.includes('organization')) {
      return 'organization';
    }

    return 'text';
  }

  // 系统配置相关方法
  async getSystemConfigs(query: any) {
    const { category } = query;
    const where = category ? { category } : {};

    const configs = await this.prisma.systemConfig.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    // 反向转换：将 level 转换回 levelId
    return Promise.all(
      configs.map(async (config) => {
        if (config.configKey === 'standardHoursHierarchyLevels' && config.configValue) {
          return {
            ...config,
            configValue: await this.convertLevelsToLevelIds(config.configValue),
          };
        }
        return config;
      })
    );
  }

  async getSystemConfigByKey(key: string) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { configKey: key },
    });

    if (!config) {
      return null;
    }

    // 反向转换：将 level 转换回 levelId
    if (config.configKey === 'standardHoursHierarchyLevels' && config.configValue) {
      return {
        ...config,
        configValue: await this.convertLevelsToLevelIds(config.configValue),
      };
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

    // 特殊处理：standardHoursHierarchyLevels 配置需要将层级名称转换为 level 序号
    if (dto.configKey === 'standardHoursHierarchyLevels' && dto.configValue) {
      dto.configValue = await this.convertLevelNamesToNumbers(dto.configValue);
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

    // 特殊处理：standardHoursHierarchyLevels 配置需要将层级名称转换为 level 序号
    if (key === 'standardHoursHierarchyLevels' && dto.configValue) {
      dto.configValue = await this.convertLevelNamesToNumbers(dto.configValue);
    }

    return this.prisma.systemConfig.update({
      where: { configKey: key },
      data: dto,
    });
  }

  /**
   * 将 levelId 转换为 level
   * 支持格式：单个数字 "5"、逗号分隔 "4,5"、层级名称 "工序,产线"
   * @param configValue 配置值
   * @returns 转换后的 level 值
   */
  private async convertLevelIdsToLevels(configValue: string): Promise<string> {
    if (!configValue) {
      return configValue;
    }

    // 层级名称到 level 的映射
    const levelNameMap: Record<string, number> = {
      '工厂': 1,
      '车间': 2,
      '产线': 3,
      '产品': 4,
      '工序': 5,
      '岗位': 6,
      '技能等级': 7,
    };

    const values = configValue.split(',').map(v => v.trim());
    const convertedValues: string[] = [];

    for (const value of values) {
      const num = parseInt(value);

      if (isNaN(num)) {
        // 如果不是数字，检查是否是层级名称
        if (levelNameMap[value]) {
          convertedValues.push(String(levelNameMap[value]));
        } else {
          // 无法识别，保持原样
          convertedValues.push(value);
        }
      } else {
        // 如果���数字，查询 AccountHierarchyConfig 表将ID转换为 level
        const hierarchyLevel = await this.prisma.accountHierarchyConfig.findFirst({
          where: { id: num },
          select: { level: true },
        });

        if (hierarchyLevel) {
          convertedValues.push(String(hierarchyLevel.level));
        } else {
          // 未找到对应的 level，保持原样
          convertedValues.push(value);
        }
      }
    }

    return convertedValues.join(',');
  }

  /**
   * 将层级名称转换为层级序号（用于保存到数据库）
   * 支持格式：单��名称 "工序"、逗号分隔 "车间,工序"
   * @param configValue 配置值（层级名称）
   * @returns 转换后的层级序号
   */
  private async convertLevelNamesToNumbers(configValue: string): Promise<string> {
    if (!configValue) {
      return configValue;
    }

    const values = configValue.split(',').map(v => v.trim());
    const convertedValues: string[] = [];

    for (const value of values) {
      // 查询该 name 对应的 AccountHierarchyConfig 的 level
      const hierarchyLevel = await this.prisma.accountHierarchyConfig.findFirst({
        where: { name: value },
        select: { level: true },
      });

      if (hierarchyLevel) {
        convertedValues.push(String(hierarchyLevel.level));
      } else {
        // 未找到对应的 level，保持原样
        convertedValues.push(value);
      }
    }

    return convertedValues.join(',');
  }

  /**
   * 将 level 转换为层级名称（convertLevelNamesToNumbers 的反向转换）
   * 支持格式：单个数字 "5"、逗号分隔 "3,5"
   * @param configValue 配置值（level序号）
   * @returns 转换后的层级名称
   */
  private async convertLevelsToLevelIds(configValue: string): Promise<string> {
    if (!configValue) {
      return configValue;
    }

    const values = configValue.split(',').map(v => v.trim());
    const convertedValues: string[] = [];

    for (const value of values) {
      const level = parseInt(value);

      if (!isNaN(level)) {
        // 查询该 level 对应的 AccountHierarchyConfig 的 name（层级名称）
        const hierarchyLevel = await this.prisma.accountHierarchyConfig.findFirst({
          where: { level },
          select: { name: true },
        });

        if (hierarchyLevel) {
          convertedValues.push(hierarchyLevel.name);
        } else {
          // 未找到对应的 name，保持原样
          convertedValues.push(value);
        }
      } else {
        // 不是数字，保持原样
        convertedValues.push(value);
      }
    }

    return convertedValues.join(',');
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
   * 直接从 WorkInfoHistory 表查询
   */
  async getWorkInfoVersions(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 查询所有工作信息历史记录，按生效日期倒序排列
    const workInfoHistories = await this.prisma.workInfoHistory.findMany({
      where: { employeeId },
      orderBy: { effectiveDate: 'desc' },
    });

    // 如果没有任何历史记录，返回空数组
    if (workInfoHistories.length === 0) {
      return [];
    }

    // 转换为版本列表格式
    // 排除当前版本（isCurrent=true 的记录）作为历史版本
    const historyVersions = workInfoHistories
      .filter(info => !info.isCurrent)
      .map(info => ({
        id: String(info.id),
        effectiveDate: info.effectiveDate,
        changeType: info.changeType,
        description: this.getChangeTypeLabel(info.changeType),
        createdAt: info.createdAt,
      }));

    return historyVersions;
  }

  /**
   * 获取异动类型的中文标签
   */
  private getChangeTypeLabel(changeType: string | null): string {
    if (!changeType) return '未知';

    const labels: Record<string, string> = {
      'ENTRY': '入职',
      'TRANSFER': '调动',
      'PROMOTION': '升职',
      'DEMOTION': '降职',
      'RESIGNATION': '离职',
      'SALARY_ADJUSTMENT': '调薪',
      'OTHER': '其他',
    };

    return labels[changeType] || changeType;
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

    // 如果是历史版本，从 WorkInfoHistory 表查找
    // version 参数是 WorkInfoHistory 的 ID
    const historyId = +version;

    if (isNaN(historyId)) {
      throw new NotFoundException('版本ID格式不正确');
    }

    const historyWorkInfo = await this.prisma.workInfoHistory.findFirst({
      where: {
        id: historyId,
        employeeId,
      },
      include: {
        org: true,
      },
    });

    if (!historyWorkInfo) {
      throw new NotFoundException('工作信息历史记录不存在');
    }

    // 解析员工的自定义字段（非工作信息页签的）
    const employeeCustomFields = JSON.parse(employee.customFields || '{}');

    // 解析历史工作信息的自定义字段
    const workInfoCustomFields = JSON.parse(historyWorkInfo.customFields || '{}');

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
      // 历史工作信息
      currentWorkInfo: {
        ...historyWorkInfo,
        customFields: workInfoCustomFields, // 解析后的自定义字段
      },
      // 学历列表
      educations,
      // 工作经历列表
      workExperiences,
      // 家庭成员列表
      familyMembers,
    };

    return result;
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
    const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType', 'costCenter', 'employmentRelation'];

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
    const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType', 'costCenter', 'employmentRelation'];

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
   * 创建员工异动记录（异动/离职）
   */
  async createWorkInfoChange(employeeId: number, dto: any) {
    console.log('创建员工异动记录，接收数据:', dto);

    const { changeType, effectiveDate, resignationDate, resignationReason, customFields, ...otherFields } = dto;

    // 验证员工是否存在
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 将当前工作信息记录设为非当前
    await this.prisma.workInfoHistory.updateMany({
      where: { employeeId, isCurrent: true },
      data: { isCurrent: false },
    });

    // 准备自定义字段
    const currentWorkInfo = await this.prisma.workInfoHistory.findFirst({
      where: { employeeId, isCurrent: true },
    });

    const currentCustomFields = currentWorkInfo?.customFields
      ? (typeof currentWorkInfo.customFields === 'string'
          ? JSON.parse(currentWorkInfo.customFields)
          : currentWorkInfo.customFields)
      : {};

    const newCustomFields = {
      ...currentCustomFields,
      ...customFields,
    };

    console.log('合并后的自定义字段:', newCustomFields);

    // 构建创建数据，只包含有值的字段
    const createData: any = {
      employeeId,
      changeType,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      isCurrent: true,
      customFields: JSON.stringify(newCustomFields),
    };

    // 只有离职时才添加这些字段
    if (changeType === 'RESIGNATION') {
      if (resignationDate) {
        createData.endDate = new Date(resignationDate);
        createData.resignationDate = new Date(resignationDate);
      }
      if (resignationReason) {
        createData.resignationReason = resignationReason;
      }
    }

    // 添加其他工作信息字段（只添加有值的）
    const workInfoFields = ['orgId', 'position', 'jobLevel', 'employeeType', 'workLocation',
                             'workAddress', 'hireDate', 'probationStart', 'probationEnd',
                             'probationMonths', 'regularDate', 'costCenter', 'employmentRelation'];

    workInfoFields.forEach(field => {
      if (otherFields[field] !== undefined && otherFields[field] !== null) {
        // 如果是日期字段，转换为 Date 对象
        if (field.endsWith('Date') || field.endsWith('Start') || field.endsWith('End')) {
          if (typeof otherFields[field] === 'string') {
            createData[field] = new Date(otherFields[field]);
          } else {
            createData[field] = otherFields[field];
          }
        } else {
          createData[field] = otherFields[field];
        }
      }
    });

    console.log('准备创建的工作信息数据:', createData);

    // 创建新的工作信息历史记录
    const newWorkInfo = await this.prisma.workInfoHistory.create({
      data: createData,
      include: {
        org: true,
      },
    });

    console.log('创建成功，新记录ID:', newWorkInfo.id);

    // 更新员工表中的相关信息
    const employeeUpdateData: any = {};

    // 如果发生了组织变更，更新员工表的orgId
    if (createData.orgId && createData.orgId !== employee.orgId) {
      employeeUpdateData.orgId = createData.orgId;
      console.log(`组织变更: ${employee.orgId} -> ${createData.orgId}`);
    }

    // 更新员工的customFields（合并工作信息的自定义字段）
    const employeeCustomFields = typeof employee.customFields === 'string'
      ? JSON.parse(employee.customFields)
      : employee.customFields || {};

    const mergedCustomFields = {
      ...employeeCustomFields,
      ...newCustomFields,
    };

    // 只更新工作信息相关的字段
    const workInfoFieldsForUpdate = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType'];
    for (const field of workInfoFieldsForUpdate) {
      if (newCustomFields[field] !== undefined) {
        mergedCustomFields[field] = newCustomFields[field];
      }
    }

    employeeUpdateData.customFields = JSON.stringify(mergedCustomFields);

    // 更新员工表
    if (Object.keys(employeeUpdateData).length > 0) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: employeeUpdateData,
      });
      console.log('员工表已更新:', Object.keys(employeeUpdateData));
    }

    // 如果是离职，根据生效日期判断是否更新员工状态
    if (changeType === 'RESIGNATION' && effectiveDate) {
      const effectiveDateTime = new Date(effectiveDate);
      const now = new Date();

      // 设置为当天开始时间进行比较（忽略时分秒）
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const effectiveDay = new Date(effectiveDateTime.getFullYear(), effectiveDateTime.getMonth(), effectiveDateTime.getDate());

      // 如果生效日期在今天或之前，立即更新员工状态为离职
      if (effectiveDay <= today) {
        await this.prisma.employee.update({
          where: { id: employeeId },
          data: {
            status: 'INACTIVE',
          },
        });
        console.log('员工状态已更新为离职');
      }
      // 如果生效日期在未来，不更新状态（等待定时任务处理）
    }

    // 工作信息变更需要重新生成劳动力账户
    // 使用异动的生效日期作为新账户的生效日期
    if (createData.orgId || Object.keys(newCustomFields).some(key => workInfoFieldsForUpdate.includes(key))) {
      try {
        console.log('工作信息发生变更，触发劳动力账户生成，生效日期:', effectiveDate);
        await this.accountService.regenerateAccountsForEmployeeWithDate(employeeId, new Date(effectiveDate));
      } catch (error: any) {
        console.error('生成劳动力账户失败:', error.message);
        // 不抛出异常，避免影响工作信息变更的保存
      }
    }

    return newWorkInfo;
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
    const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'orgId', 'changeType', 'costCenter', 'employmentRelation'];

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

  // ==================== 工序管理 ====================

  async getProcesses(query: any) {
    const { keyword, status } = query;

    const where: any = { deletedAt: null };
    if (keyword) {
      where.OR = [
        { code: { contains: keyword } },
        { name: { contains: keyword } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const processes = await this.prisma.process.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return processes;
  }

  async getProcess(id: number) {
    const process = await this.prisma.process.findFirst({
      where: { id, deletedAt: null },
    });

    if (!process) {
      throw new NotFoundException('工序不存在');
    }

    return process;
  }

  async createProcess(dto: any) {
    const { code, name, description, sortOrder } = dto;

    const existing = await this.prisma.process.findFirst({
      where: {
        code,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('工序编码已存在');
    }

    return this.prisma.process.create({
      data: {
        code,
        name,
        description,
        sortOrder: sortOrder || 0,
        status: 'ACTIVE',
      },
    });
  }

  async updateProcess(id: number, dto: any) {
    const process = await this.prisma.process.findFirst({
      where: { id, deletedAt: null },
    });

    if (!process) {
      throw new NotFoundException('工序不存在');
    }

    const { name, description, sortOrder, status } = dto;

    return this.prisma.process.update({
      where: { id },
      data: {
        name,
        description,
        sortOrder,
        status,
      },
    });
  }

  async deleteProcess(id: number) {
    const process = await this.prisma.process.findFirst({
      where: { id, deletedAt: null },
    });

    if (!process) {
      throw new NotFoundException('工序不存在');
    }

    // 软删除
    return this.prisma.process.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
