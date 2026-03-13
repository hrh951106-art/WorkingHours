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

    // 创建员工
    const employee = await this.prisma.employee.create({
      data: dto,
      include: {
        org: true,
      },
    });

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

        console.log(`员工 ${employee.employeeNo} 用户创建成功，默认密码: ${defaultPassword}`);
      }
    } catch (error: any) {
      // 如果用户创建失败，记录错误但不影响员工创建
      console.error(`员工 ${employee.employeeNo} 用户创建失败:`, error.message);
    }

    return employee;
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto) {
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

    // 更新员工信息
    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: dto,
      include: {
        org: true,
      },
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
          console.log(`员工 ${updatedEmployee.employeeNo} 账户路径发生变化: ${oldPath} -> ${newPath}`);
        } else {
          console.log(`员工 ${updatedEmployee.employeeNo} 账户路径未变化，不需要重新生成账户`);
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
        console.log(`员工 ${employee.employeeNo} 对应的用户已禁用`);
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
}
