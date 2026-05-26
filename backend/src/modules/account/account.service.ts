import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  async getHierarchyLevels() {
    return this.prisma.accountHierarchyConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }],
    });
  }

  async createHierarchyLevel(dto: any) {
    const { code, level, name, mappingType, mappingValue, sort = 0, status = 'ACTIVE' } = dto;

    return this.prisma.accountHierarchyConfig.create({
      data: {
        code: code || `HIER_${Date.now()}`,
        level,
        name,
        mappingType,
        mappingValue,
        sort,
        status,
      },
    });
  }

  async updateHierarchyLevel(id: number, dto: any) {
    const existing = await this.prisma.accountHierarchyConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('层级配置不存在');
    }

    return this.prisma.accountHierarchyConfig.update({
      where: { id },
      data: dto,
    });
  }

  async deleteHierarchyLevel(id: number) {
    return this.prisma.accountHierarchyConfig.delete({
      where: { id },
    });
  }

  async deleteAllHierarchyLevels() {
    return this.prisma.accountHierarchyConfig.deleteMany({});
  }

  async batchSaveHierarchyLevels(levels: any[]) {
    // 限制最多15个层级
    if (levels.length > 15) {
      throw new Error('最多支持15个层级，当前配置了 ' + levels.length + ' 个层级');
    }

    // 验证层级名称不能重复
    const names = levels.map(l => l.name);
    const uniqueNames = new Set(names);
    if (names.length !== uniqueNames.size) {
      throw new Error('层级名称不能重复');
    }

    // 验证一个组织类型只允许被映射一次
    const orgTypeMappings = levels.filter(l => l.mappingType === 'ORG_TYPE' && l.mappingValue);
    const orgTypeValues = orgTypeMappings.map(l => l.mappingValue);
    const uniqueOrgTypes = new Set(orgTypeValues);
    if (orgTypeValues.length !== uniqueOrgTypes.size) {
      throw new Error('一个组织类型只允许被映射一次，请检查是否有重复的组织类型映射');
    }

    // 使用事务确保数据一致性
    return this.prisma.$transaction(async (tx) => {
      // 先删除所有现有配置（包括关联的层级明细）
      await tx.accountHierarchyLevelDetail.deleteMany({});
      await tx.accountHierarchyConfig.deleteMany({});

      // 生成唯一的codes（在循环外预先查询一次）
      const { StringUtils } = require('../../common/utils');
      const generatedCodes: string[] = [];

      // 批量创建新配置并同步层级明细
      const createdConfigs = await Promise.all(
        levels.map(async (level, index) => {
          // 生成唯一的code
          const code = StringUtils.generateSequentialCode('AHC', generatedCodes);
          generatedCodes.push(code);

          const config = await tx.accountHierarchyConfig.create({
            data: {
              code,
              name: level.name,
              mappingType: level.mappingType,
              mappingValue: level.mappingValue,
              dataSourceId: level.dataSourceId,
              level: index + 1, // 自动生成序号
              sort: level.sort || 0,
              status: level.status || 'ACTIVE',
            },
          });

          // 同步层级明细
          await this.syncHierarchyLevelDetails(tx, config);

          return config;
        })
      );

      return createdConfigs;
    });
  }

  /**
   * 同步层级配置的数据源到层级明细表
   * @param tx Prisma事务对象
   * @param config 层级配置
   */
  private async syncHierarchyLevelDetails(tx: any, config: any) {
    const { id, mappingType, mappingValue, dataSourceId } = config;

    // 先删除该层级的所有旧明细
    await tx.accountHierarchyLevelDetail.deleteMany({
      where: { configId: id },
    });

    // 根据映射类型获取数据
    const details = await this.fetchHierarchyLevelDetails(tx, mappingType, mappingValue, dataSourceId, id);

    // 批量创建新的层级明细
    if (details && details.length > 0) {
      await tx.accountHierarchyLevelDetail.createMany({
        data: details,
      });
    }
  }

  /**
   * 根据映射类型获取层级明细数据
   * @param tx Prisma事务对象
   * @param mappingType 映射类型
   * @param mappingValue 映射值（组织类型代码或自定义字段代码）
   * @param dataSourceId 数据源ID（用于自定义字段）
   * @param hierarchyConfigId 层级配置ID
   * @returns 层级明细数据数组
   */
  private async fetchHierarchyLevelDetails(
    tx: any,
    mappingType: string,
    mappingValue: string | null,
    dataSourceId: number | null,
    hierarchyConfigId: number
  ): Promise<any[]> {
    // 组织类型映射：从组织表获取数据
    // 兼容 ORG_TYPE 和 ORG 两种格式
    if ((mappingType === 'ORG_TYPE' || mappingType === 'ORG') && mappingValue) {
      const organizations = await tx.organization.findMany({
        where: {
          type: mappingValue,
          status: 'ACTIVE',
        },
        orderBy: [{ code: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      return organizations.map((org: any, index: number) => ({
        configId: hierarchyConfigId,
        level: index + 1,
        levelCode: org.code,
        levelName: org.name,
        status: 'ACTIVE',
      }));
    }

    // 自定义字段映射：从数据源选项获取数据
    // 兼容 CUSTOM_* 和 FIELD_* 两种格式
    let fieldCode: string | null = null;

    if (mappingType?.startsWith('CUSTOM_')) {
      fieldCode = mappingType.replace('CUSTOM_', '');
    } else if (mappingType?.startsWith('FIELD_')) {
      fieldCode = mappingType.replace('FIELD_', '');
    }

    if (fieldCode) {
      // 如果映射类型是 CUSTOM_* 或 FIELD_*，需要从对应的自定义字段获取数据源
      // 首先从 CustomField 表中查找该字段关联的数据源
      const customField = await tx.customField.findFirst({
        where: {
          OR: [
            { code: fieldCode },
            { code: mappingType?.replace('FIELD_', '').replace(' ', '') }, // 处理 FIELD_ A02 这种带空格的格式
          ],
        },
        select: {
          id: true,
          code: true,
          dataSourceId: true,
        },
      });

      if (!customField) {
        console.warn(`未找到自定义字段: ${fieldCode} 或 ${mappingType}`);
        return [];
      }

      if (!customField.dataSourceId) {
        console.warn(`自定义字段 ${customField.code} 没有关联数据源`);
        return [];
      }

      const dataSource = await tx.dataSource.findUnique({
        where: { id: customField.dataSourceId },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sort: 'asc' },
          },
        },
      });

      if (!dataSource || !dataSource.options) {
        console.warn(`数据源 ${customField.dataSourceId} 没有选项数据`);
        return [];
      }

      return dataSource.options.map((option: any, index: number) => ({
        configId: hierarchyConfigId,
        level: index + 1,
        levelCode: option.value,
        levelName: option.label,
        status: 'ACTIVE',
      }));
    }

    // 数据源直接映射：使用 dataSourceId
    if (dataSourceId) {
      const dataSource = await tx.dataSource.findUnique({
        where: { id: dataSourceId },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sort: 'asc' },
          },
        },
      });

      if (!dataSource || !dataSource.options) {
        return [];
      }

      return dataSource.options.map((option: any, index: number) => ({
        configId: hierarchyConfigId,
        level: index + 1,
        levelCode: option.value,
        levelName: option.label,
        status: 'ACTIVE',
      }));
    }

    console.warn(`未处理的映射类型: ${mappingType}, mappingValue: ${mappingValue}, dataSourceId: ${dataSourceId}`);
    return [];
  }

  /**
   * 当数据源选项变更时，同步更新相关的层级明细
   * @param dataSourceId 数据源ID
   */
  async syncDataSourceChangesToHierarchyDetails(dataSourceId: number) {
    // 1. 查找所有直接使用该数据源的层级配置
    const directConfigs = await this.prisma.accountHierarchyConfig.findMany({
      where: { dataSourceId },
    });

    // 2. 查找所有使用该数据源的自定义字段
    const customFields = await this.prisma.customField.findMany({
      where: { dataSourceId },
      select: { id: true, code: true },
    });

    // 3. 查找使用这些自定义字段的层级配置
    const indirectConfigs: any[] = [];
    for (const field of customFields) {
      // 匹配 FIELD_fieldCode 或 CUSTOM_fieldCode 格式
      const configs = await this.prisma.accountHierarchyConfig.findMany({
        where: {
          OR: [
            { mappingType: 'FIELD_' + field.code },
            { mappingType: 'CUSTOM_' + field.code },
            // 处理带空格的情况
            { mappingType: 'FIELD_ ' + field.code },
            { mappingType: { contains: field.code.trim() } },
          ],
        },
      });
      indirectConfigs.push(...configs);
    }

    // 合并所有需要同步的配置，去重
    const allConfigs = [...directConfigs];
    const configIds = new Set(directConfigs.map(c => c.id));

    for (const config of indirectConfigs) {
      if (!configIds.has(config.id)) {
        allConfigs.push(config);
        configIds.add(config.id);
      }
    }

    if (allConfigs.length === 0) {
      return;
    }

    console.log(`数据源 ${dataSourceId} 变更，同步 ${allConfigs.length} 个层级配置的明细`);

    // 对每个配置同步层级明细
    await Promise.all(
      allConfigs.map((config) => this.syncHierarchyLevelDetails(this.prisma, config))
    );
  }

  /**
   * 手动刷新指定层级的明细数据
   * @param levelId 层级配置ID
   */
  async refreshHierarchyLevelDetails(levelId: number) {
    const config = await this.prisma.accountHierarchyConfig.findUnique({
      where: { id: levelId },
    });

    if (!config) {
      throw new NotFoundException('层级配置不存在');
    }

    // 同步层级明细
    await this.syncHierarchyLevelDetails(this.prisma, config);

    // 返回更新后的层级配置及明细
    return this.prisma.accountHierarchyConfig.findUnique({
      where: { id: levelId },
      include: {
        details: {
          where: { status: 'ACTIVE' },
          orderBy: { level: 'asc' },
        },
      },
    });
  }

  /**
   * 手动刷新所有层级的明细数据
   */
  async refreshAllHierarchyLevelDetails() {
    const configs = await this.prisma.accountHierarchyConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }],
    });

    await Promise.all(
      configs.map((config) => this.syncHierarchyLevelDetails(this.prisma, config))
    );

    // 返回所有更新后的层级配置及明细
    return this.prisma.accountHierarchyConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }],
      include: {
        details: {
          where: { status: 'ACTIVE' },
          orderBy: { level: 'asc' },
        },
      },
    });
  }

  /**
   * 获取层级配置及其明细
   */
  async getHierarchyLevelsWithDetails() {
    const configs = await this.prisma.accountHierarchyConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }],
      include: {
        details: {
          where: { status: 'ACTIVE' },
          orderBy: { level: 'asc' },
        },
      },
    });

    return configs;
  }

  async getAccounts(query: any) {
    const {
      page = 1,
      pageSize = 10,
      type,
      employeeId,
      usageType,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (type) where.type = type;
    if (employeeId) where.employeeId = +employeeId;
    if (usageType) where.usageType = usageType; // 添加用途类型过滤

    // 构建排序对象
    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.laborAccount.findMany({
        where,
        skip,
        take: +pageSize,
        include: {}, // employee: true - removed, not a valid relation
        orderBy,
      }),
      this.prisma.laborAccount.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async createAccount(dto: any) {
    const { code, name, type, level, parentId, employeeId, effectiveDate, path, namePath, hierarchyValues, usageType } = dto;

    // 构建账户路径：优先级 hierarchyValues > path > 默认逻辑
    let accountPath = path;

    // 如果有 hierarchyValues，根据它生成完整的 path（包含所有层级，未选择的用空字符串占位）
    if (hierarchyValues && hierarchyValues !== '{}') {
      try {
        const levels = typeof hierarchyValues === 'string'
          ? JSON.parse(hierarchyValues)
          : hierarchyValues;

        if (Array.isArray(levels)) {
          // 按层级序号排序
          const sortedLevels = levels.sort((a: any, b: any) => a.level - b.level);

          // 提取每层的 code，未选择的层级用空字符串占位
          const codes = sortedLevels.map((level: any) => {
            const selected = level.selectedValue;
            return selected?.code || '';
          });

          // 用 / 连接，未选择的层级会形成 // 占位符
          accountPath = codes.join('/');
        }
      } catch (error) {
        console.error('解析 hierarchyValues 失败:', error);
      }
    }

    // 如果没有 hierarchyValues 且没有 path，使用默认逻辑
    if (!accountPath) {
      accountPath = code;
      if (parentId) {
        const parent = await this.prisma.laborAccount.findUnique({
          where: { id: parentId },
        });
        if (parent) {
          accountPath = `${parent.path}/${code}`;
        }
      }
    }

    return this.prisma.laborAccount.create({
      data: {
        code,
        name,
        type,
        level,
        path: accountPath,
        namePath: namePath || name, // 使用前端传入的 namePath，如果没有则使用 name
        hierarchyValues, // 保存完整的层级选择信息
        usageType: usageType || 'SHIFT', // 添加用途类型，默认为SHIFT
        parentId,
        employeeId,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        status: 'ACTIVE',
      },
    });
  }

  async getAccountTree() {
    const accounts = await this.prisma.laborAccount.findMany({
      where: { status: 'ACTIVE', type: 'MAIN' },
      orderBy: [{ level: 'asc' }, { code: 'asc' }],
    });

    const buildTree = (parentId: number | null = null) => {
      return accounts
        .filter((acc) => acc.parentId === parentId)
        .map((acc) => ({
          ...acc,
          children: buildTree(acc.id),
        }));
    };

    return buildTree();
  }

  async generateMainAccount(dto: any) {
    const { employeeId } = dto;
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { org: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 获取所有激活的层级配置
    const hierarchyConfigs = await this.getHierarchyLevels();

    if (hierarchyConfigs.length === 0) {
      throw new Error('请先配置劳动力账户层级');
    }

    // 解析员工自定义字段
    const customFields = typeof employee.customFields === 'string'
      ? JSON.parse(employee.customFields)
      : employee.customFields || {};

    // 查询员工当前的工作信息，获取employeeType和jobPost等字段
    const workInfoHistory = await this.prisma.workInfoHistory.findFirst({
      where: {
        employeeId: employeeId,
        isCurrent: true,
      },
    });

    // 合并工作信息的customFields到customFields对象中
    if (workInfoHistory) {
      const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};

      // 合并customFields，WorkInfoHistory的字段优先级更高
      Object.assign(customFields, workInfoCustomFields);

      // 特别处理employeeType字段（WorkInfoHistory表有独立的employeeType字段）
      if (workInfoHistory.employeeType && !customFields.employeeType) {
        customFields.employeeType = workInfoHistory.employeeType;
      }
    }

    // 构建hierarchyValues
    const hierarchyValues = [];
    const pathParts: string[] = []; // 用于存储code，构建path字段
    const namePathParts: string[] = []; // 用于存储name，构建namePath字段

    for (const config of hierarchyConfigs) {
      let selectedValue = null;
      let accountCode = '-';
      let accountName = '-';

      // 根据映射类型获取账户编码和名称
      const cleanMappingType = config.mappingType ? config.mappingType.replace(/\s+/g, '') : '';

      switch (cleanMappingType) {
        case 'ORG':
          // 组织类型：根据mappingValue查找指定类型的组织
          if (config.mappingValue) {
            accountCode = await this.findOrgByType(this.prisma, employee.orgId, config.mappingValue);
            // 查询组织详细信息
            const org = await this.findOrgObjectByType(this.prisma, employee.orgId, config.mappingValue);
            if (org) {
              accountName = org.name;
              selectedValue = {
                id: org.id,
                name: org.name,
                code: org.code,
                type: org.type,
              };
            }
          } else if (config.level === 1) {
            // 第1层使用顶级组织
            const topLevelOrg = await this.getTopLevelOrg(this.prisma, employee.orgId);
            accountCode = topLevelOrg?.code || '-';
            accountName = topLevelOrg?.name || '-';
            selectedValue = topLevelOrg ? {
              id: topLevelOrg.id,
              name: topLevelOrg.name,
              code: topLevelOrg.code,
              type: topLevelOrg.type,
            } : null;
          }
          break;

        case 'ORG_TYPE':
          // 组织类型映射：根据员工组织树向上查找匹配的组织类型
          if (config.mappingValue) {
            accountCode = await this.findOrgByType(this.prisma, employee.orgId, config.mappingValue);
            const org = await this.findOrgObjectByType(this.prisma, employee.orgId, config.mappingValue);
            if (org) {
              accountName = org.name;
              selectedValue = {
                id: org.id,
                name: org.name,
                code: org.code,
                type: org.type,
              };
            }
          } else {
            accountCode = '-';
            accountName = '-';
            selectedValue = null;
          }
          break;

        case 'FIELD':
          // 字段类型：从员工自定义字段获取
          const fieldValue = customFields[config.mappingValue || ''];
          if (fieldValue) {
            accountCode = await this.getFieldLabel(this.prisma, config.mappingValue, fieldValue);
            accountName = accountCode;
            selectedValue = {
              name: accountName,
              code: accountCode,
              value: fieldValue,
            };
          } else {
            accountCode = '-';
            accountName = '-';
            selectedValue = null;
          }
          break;

        default:
          // 支持前端的 FIELD_* 前缀自定义字段映射（如 FIELD_employeeType）
          if (config.mappingType?.startsWith('FIELD_')) {
            const fieldCode = config.mappingType.replace('FIELD_', '');
            const customFieldValue = customFields[fieldCode];
            if (customFieldValue) {
              // accountCode使用原始value（code），accountName使用label（显示名称）
              accountCode = customFieldValue; // 使用原始值作为code（如FULL_TIME, FINANCE）
              accountName = await this.getFieldLabel(this.prisma, fieldCode, customFieldValue); // 使用label作为name（如全职, 财务岗）
              selectedValue = {
                name: accountName,
                code: accountCode,
                value: customFieldValue,
              };
            } else {
              accountCode = '-';
              accountName = '-';
              selectedValue = null;
            }
          } else if (config.mappingType?.startsWith('CUSTOM_')) {
            // 支持前端的 CUSTOM_* 前缀自定义字段映射
            const fieldCode = config.mappingType.replace('CUSTOM_', '');
            const customFieldValue = customFields[fieldCode];
            if (customFieldValue) {
              accountCode = await this.getFieldLabel(this.prisma, fieldCode, customFieldValue);
              accountName = accountCode;
              selectedValue = {
                name: accountName,
                code: accountCode,
                value: customFieldValue,
              };
            } else {
              accountCode = '-';
              accountName = '-';
              selectedValue = null;
            }
          } else {
            // 常量类型
            accountCode = config.mappingValue || `LEVEL${config.level}`;
            accountName = config.name || accountCode;
            selectedValue = {
              name: accountName,
              code: accountCode,
              value: accountCode,
            };
          }
      }

      pathParts.push(accountCode);
      namePathParts.push(accountName);

      // 构建hierarchyValues项
      hierarchyValues.push({
        levelId: config.id,
        level: config.level,
        name: config.name,
        mappingType: config.mappingType,
        mappingValue: config.mappingValue,
        selectedValue: selectedValue,
      });
    }

    // 生成账户路径
    const path = pathParts.join('/'); // path存储code
    const namePath = namePathParts.join('/'); // namePath存储name

    return this.prisma.laborAccount.create({
      data: {
        code: StringUtils.generateCode('ACC'),
        name: `${employee.name}_主账户`,
        type: 'MAIN',
        level: 7,
        path, // ✅ 存储code路径
        namePath, // ✅ 存储name路径
        hierarchyValues: JSON.stringify(hierarchyValues), // ✅ 保存完整的层级选择信息
        employeeId,
        effectiveDate: new Date(),
        status: 'ACTIVE',
      },
    });
  }

  /**
   * 根据组织类型查找组织对象（包含完整信息）
   */
  private async findOrgObjectByType(prismaOrTx: any, orgId: number, orgType: string): Promise<any> {
    const currentOrg = await prismaOrTx.organization.findUnique({
      where: { id: orgId },
    });

    if (!currentOrg) {
      return null;
    }

    // 如果当前组织类型匹配，直接返回
    if (currentOrg.type === orgType) {
      return currentOrg;
    }

    // 否则向上查找父组织
    if (currentOrg.parentId) {
      return this.findOrgObjectByType(prismaOrTx, currentOrg.parentId, orgType);
    }

    return null;
  }

  /**
   * 根据员工信息和层级配置自动生成劳动力账户
   */
  async generateAccountsForEmployee(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { org: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 获取所有激活的层级配置
    const hierarchyConfigs = await this.getHierarchyLevels();

    if (hierarchyConfigs.length === 0) {
      throw new Error('请先配置劳动力账户层级');
    }

    // 解析员工自定义字段
    const customFields = typeof employee.customFields === 'string'
      ? JSON.parse(employee.customFields)
      : employee.customFields || {};

    // 查询员工当前的工作信息，获取employeeType和jobPost等字段
    const workInfoHistory = await this.prisma.workInfoHistory.findFirst({
      where: {
        employeeId: employeeId,
        isCurrent: true,
      },
    });

    // 合并工作信息的customFields到customFields对象中
    if (workInfoHistory) {
      const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};

      // 合并customFields，WorkInfoHistory的字段优先级更高
      Object.assign(customFields, workInfoCustomFields);

      // 特别处理employeeType字段（WorkInfoHistory表有独立的employeeType字段）
      if (workInfoHistory.employeeType && !customFields.employeeType) {
        customFields.employeeType = workInfoHistory.employeeType;
      }
    }

    // 构建账户路径
    const pathParts: string[] = []; // 用于存储code
    const namePathParts: string[] = []; // 用于存储name
    const hierarchyValues: any[] = []; // 用于存储完整的层级值信息
    let parentAccountId: number | null = null;

    // 使用事务确保数据一致性
    const accounts = await this.prisma.$transaction(async (tx) => {
      const createdAccounts: any[] = [];

      for (const config of hierarchyConfigs) {
        let accountCode: string;
        let accountName: string;

        // 根据映射类型获取账户编码和名称
        // 清理 mappingType 中的空格，避免因空格导致匹配失败
        const cleanMappingType = config.mappingType.replace(/\s+/g, '');
        switch (cleanMappingType) {
          case 'ORG':
            // 组织类型：根据mappingValue查找指定类型的组织
            if (config.mappingValue) {
              // 使用mappingValue指定的组织类型查找组织
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              const org = await this.findOrgObjectByType(tx, employee.orgId, config.mappingValue);
              accountName = org?.name || accountCode;
            } else if (config.level === 1) {
              // 如果没有指定mappingValue，第1层使用顶级组织
              const topLevelOrg = await this.getTopLevelOrg(tx, employee.orgId);
              accountCode = topLevelOrg?.code || topLevelOrg?.name || '-';
              accountName = topLevelOrg?.name || '-';
            } else {
              // 其他层级直接使用员工所属组织
              accountCode = employee.org?.code || employee.org?.name || '-';
              accountName = employee.org?.name || '-';
            }
            break;

          case 'ORG_TYPE':
            // 组织类型映射：根据员工组织树向上查找匹配的组织类型
            if (config.mappingValue) {
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              const org = await this.findOrgObjectByType(tx, employee.orgId, config.mappingValue);
              accountName = org?.name || accountCode;
            } else {
              accountCode = '-';
              accountName = '-';
            }
            break;

          case 'FIELD':
            // 字段类型：从员工自定义字段获取
            const fieldValue = customFields[config.mappingValue || ''];
            if (!fieldValue) {
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = fieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, config.mappingValue, fieldValue); // 使用label作为name
            }
            break;

          case 'FIELD_A01':
          case 'FIELD_A02':
          case 'FIELD_A03':
          case 'FIELD_B01':
          case 'FIELD_B02':
          case 'FIELD_B03':
            // 字段类型（FIELD_*格式）：从员工自定义字段获取
            // 提取字段代码（去掉 FIELD_ 前缀）
            const fieldCode = config.mappingType.replace('FIELD_', '');
            const customFieldValue = customFields[fieldCode];
            if (!customFieldValue) {
              // 如果字段不存在，使用 '-'
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = customFieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
            }
            break;

          case 'CONSTANT':
            // 常量类型：直接使用配置的映射值
            accountCode = config.mappingValue || `LEVEL${config.level}`;
            accountName = config.name;
            break;

          default:
            // 支持前端的 FIELD_* 前缀自定义字段映射（如 FIELD_employeeType）
            if (config.mappingType?.startsWith('FIELD_')) {
              const fieldCode = config.mappingType.replace('FIELD_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else if (config.mappingType?.startsWith('CUSTOM_')) {
              // 支持前端的 CUSTOM_* 前缀自定义字段映射
              const fieldCode = config.mappingType.replace('CUSTOM_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else {
              throw new Error(`不支持的映射类型: ${config.mappingType}`);
            }
        }

        // 构建完整路径
        pathParts.push(accountCode);
        namePathParts.push(accountName);

        // 构建层级值信息（用于hierarchyValues字段）
        const levelValue = {
          level: config.level,
          selectedValue: accountCode !== '-' ? {
            code: accountCode,
            name: accountName,
            value: accountCode,
          } : null,
          selectedValueLabel: accountName !== '-' ? accountName : null,
        };
        hierarchyValues.push(levelValue);

        const fullPath = pathParts.join('/');
        const fullNamePath = namePathParts.join('/');

        // 生成唯一的账户编码（添加层级后缀和时间戳确保唯一性）
        const timestampSuffix = Date.now().toString().slice(-6);
        const uniqueCode = accountCode === '-'
          ? `-${employeeId}_L${config.level}_${timestampSuffix}`
          : `${accountCode}_L${config.level}_${timestampSuffix}`;

        // 创建账户
        // 首次生成账户时，生效日期为员工入职日期
        // 如果员工入职日期为空，则使用当前日期
        const effectiveDate = employee.entryDate ? new Date(employee.entryDate) : new Date();

        // 只有最后一层（主账户）才保存hierarchyValues
        const isMainAccount = config.level === hierarchyConfigs.length;
        const account = await tx.laborAccount.create({
          data: {
            code: uniqueCode,
            name: accountName || config.name,
            type: isMainAccount ? 'MAIN' : 'MAIN',
            level: config.level,
            path: fullPath, // ✅ 存储code路径
            namePath: fullNamePath, // ✅ 存储name路径
            hierarchyValues: isMainAccount ? JSON.stringify(hierarchyValues) : '{}', // ✅ 主账户保存完整值，中间层账户保存空对象
            parentId: parentAccountId,
            employeeId: isMainAccount ? employeeId : null,
            effectiveDate, // 使用员工入职日期作为生效日期
            status: 'ACTIVE',
          },
        });

        createdAccounts.push(account);
        parentAccountId = account.id;

        // 如果是主账户，创建员工与账户的关联记录
        if (isMainAccount) {
          await tx.employeeLaborAccount.create({
            data: {
              employeeNo: employee.employeeNo,
              employeeId: employeeId,
              accountId: account.id,
              effectiveDate,
              isPrimary: true,
              status: 'ACTIVE',
            },
          });
        }
      }

      return createdAccounts;
    });

    return accounts;
  }

  /**
   * 根据员工信息和层级配置自动生成劳动力账户（使用指定的生效日期）
   */
  async generateAccountsForEmployeeWithDate(employeeId: number, effectiveDate: Date) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { org: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 获取所有激活的层级配置
    const hierarchyConfigs = await this.getHierarchyLevels();

    if (hierarchyConfigs.length === 0) {
      throw new Error('请先配置劳动力账户层级');
    }

    // 解析员工自定义字段
    const customFields = typeof employee.customFields === 'string'
      ? JSON.parse(employee.customFields)
      : employee.customFields || {};

    // 查询员工当前的工作信息，获取employeeType和jobPost等字段
    const workInfoHistory = await this.prisma.workInfoHistory.findFirst({
      where: {
        employeeId: employeeId,
        isCurrent: true,
      },
    });

    // 合并工作信息的customFields到customFields对象中
    if (workInfoHistory) {
      const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};

      // 合并customFields，WorkInfoHistory的字段优先级更高
      Object.assign(customFields, workInfoCustomFields);

      // 特别处理employeeType字段（WorkInfoHistory表有独立的employeeType字段）
      if (workInfoHistory.employeeType && !customFields.employeeType) {
        customFields.employeeType = workInfoHistory.employeeType;
      }
    }

    // 构建账户路径
    const pathParts: string[] = []; // 用于存储code
    const namePathParts: string[] = []; // 用于存储name
    const hierarchyValues: any[] = []; // 用于存储完整的层级值信息
    let parentAccountId: number | null = null;

    // 使用事务确保数据一致性
    const accounts = await this.prisma.$transaction(async (tx) => {
      const createdAccounts: any[] = [];

      for (const config of hierarchyConfigs) {
        let accountCode: string;
        let accountName: string;

        // 根据映射类型获取账户编码和名称
        // 清理 mappingType 中的空格，避免因空格导致匹配失败
        const cleanMappingType = config.mappingType.replace(/\s+/g, '');
        switch (cleanMappingType) {
          case 'ORG':
            // 组织类型：使用员工所属组织
            if (config.level === 1) {
              // 第1层通常��用组织的顶级组织
              const topLevelOrg = await this.getTopLevelOrg(tx, employee.orgId);
              accountCode = topLevelOrg?.name || '-';
              accountName = topLevelOrg?.name || '-';
            } else {
              // 其他层级可能需要根据配置取组织层级
              accountCode = employee.org?.name || '-';
              accountName = employee.org?.name || '-';
            }
            break;

          case 'ORG_TYPE':
            // 组织类型映射：根据员工组织树向上查找匹配的组织类型
            if (config.mappingValue) {
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              const org = await this.findOrgObjectByType(tx, employee.orgId, config.mappingValue);
              accountName = org?.name || accountCode;
            } else {
              accountCode = '-';
              accountName = '-';
            }
            break;

          case 'FIELD':
            // 字段类型：从员工自定义字段获取
            const fieldValue = customFields[config.mappingValue || ''];
            if (!fieldValue) {
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = fieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, config.mappingValue, fieldValue); // 使用label作为name
            }
            break;

          case 'FIELD_A01':
          case 'FIELD_A02':
          case 'FIELD_A03':
          case 'FIELD_B01':
          case 'FIELD_B02':
          case 'FIELD_B03':
            // 字段类型（FIELD_*格式）：从员工自定义字段获取
            // 提取字段代码（去掉 FIELD_ 前缀）
            const fieldCode = config.mappingType.replace('FIELD_', '');
            const customFieldValue = customFields[fieldCode];
            if (!customFieldValue) {
              // 如果字段不存在，使用 '-'
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = customFieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
            }
            break;

          case 'CONSTANT':
            // 常量类型：直接使用配置的映射值
            accountCode = config.mappingValue || `LEVEL${config.level}`;
            accountName = config.name;
            break;

          default:
            // 支持前端的 FIELD_* 前缀自定义字段映射（如 FIELD_employeeType）
            if (config.mappingType?.startsWith('FIELD_')) {
              const fieldCode = config.mappingType.replace('FIELD_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else if (config.mappingType?.startsWith('CUSTOM_')) {
              // 支持前端的 CUSTOM_* 前缀自定义字段映射
              const fieldCode = config.mappingType.replace('CUSTOM_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else {
              throw new Error(`不支持的映射类型: ${config.mappingType}`);
            }
        }

        // 构建完整路径
        pathParts.push(accountCode);
        namePathParts.push(accountName);

        // 构建层级值信息（用于hierarchyValues字段）
        const levelValue = {
          level: config.level,
          selectedValue: accountCode !== '-' ? {
            code: accountCode,
            name: accountName,
            value: accountCode,
          } : null,
          selectedValueLabel: accountName !== '-' ? accountName : null,
        };
        hierarchyValues.push(levelValue);

        const fullPath = pathParts.join('/');
        const fullNamePath = namePathParts.join('/');

        // 生成唯一的账户编码（添加层级后缀和时间戳确保唯一性）
        const timestampSuffix = Date.now().toString().slice(-6);
        const uniqueCode = accountCode === '-'
          ? `-${employeeId}_L${config.level}_${timestampSuffix}`
          : `${accountCode}_L${config.level}_${timestampSuffix}`;

        // 创建账户，使用指定的生效日期
        const accountEffectiveDate = new Date(effectiveDate);
        accountEffectiveDate.setHours(0, 0, 0, 0);

        // 只有最后一层（主账户）才保存hierarchyValues
        const isMainAccount = config.level === hierarchyConfigs.length;
        const account = await tx.laborAccount.create({
          data: {
            code: uniqueCode,
            name: accountName || config.name,
            type: isMainAccount ? 'MAIN' : 'MAIN',
            level: config.level,
            path: fullPath, // ✅ 存储code��径
            namePath: fullNamePath, // ✅ 存储name路径
            hierarchyValues: isMainAccount ? JSON.stringify(hierarchyValues) : '{}', // ✅ 主账户保存完整值，中间层账户保存空对象
            parentId: parentAccountId,
            employeeId: isMainAccount ? employeeId : null,
            effectiveDate: accountEffectiveDate, // 使用指定的生效日期
            status: 'ACTIVE',
          },
        });

        createdAccounts.push(account);
        parentAccountId = account.id;

        // 如果是主账户，创建员工与账户的关联记录
        if (isMainAccount) {
          await tx.employeeLaborAccount.create({
            data: {
              employeeNo: employee.employeeNo,
              employeeId: employeeId,
              accountId: account.id,
              effectiveDate: accountEffectiveDate,
              isPrimary: true,
              status: 'ACTIVE',
            },
          });
        }
      }

      return createdAccounts;
    });

    return accounts;
  }

  /**
   * 获取顶级组织
   */
  private async getTopLevelOrg(tx: any, orgId: number): Promise<any> {
    let org = await tx.organization.findUnique({
      where: { id: orgId },
    });

    while (org && org.parentId) {
      org = await tx.organization.findUnique({
        where: { id: org.parentId },
      });
    }

    return org;
  }

  /**
   * 获取字段的标签
   */
  private async getFieldLabel(tx: any, fieldCode: string, value: string): Promise<string> {
    // 查找自定义字段配置
    const customField = await tx.customField.findUnique({
      where: { code: fieldCode },
      include: {
        dataSource: {
          include: {
            options: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!customField || !customField.dataSource) {
      return value;
    }

    // 从数据源选项中查找对应的标签
    const option = customField.dataSource.options.find((opt: any) => opt.value === value);
    return option?.label || value;
  }

  /**
   * 根据组织类型查找员工组织树中匹配的组织
   * @param tx Prisma事务对象
   * @param orgId 员工当前组织ID
   * @param orgType 要匹配的组织类型
   * @returns 匹配的组织名称，未找到返回 '-'
   */
  private async findOrgByType(tx: any, orgId: number, orgType: string): Promise<string> {
    let currentOrg = await tx.organization.findUnique({
      where: { id: orgId },
    });

    // 向上遍历组织树，查找匹配的组织类型
    while (currentOrg) {
      if (currentOrg.type === orgType) {
        return currentOrg.code; // 返回组织代码
      }
      // 继续向上查找
      if (currentOrg.parentId) {
        currentOrg = await tx.organization.findUnique({
          where: { id: currentOrg.parentId },
        });
      } else {
        break;
      }
    }

    return '-'; // 未找到匹配的组织
  }

  async createSubAccount(dto: any) {
    return this.prisma.laborAccount.create({
      data: {
        ...dto,
        code: StringUtils.generateCode('SUB'),
        type: 'SUB',
      },
    });
  }

  async getAccount(id: number) {
    return this.prisma.laborAccount.findUnique({
      where: { id },
      include: {
        // employee: true, - removed, not a valid relation
        parent: true,
      },
    });
  }

  /**
   * 计算员工的账户路径（不生成账户，只计算路径）
   * 用于判断是否需要重新生成账户
   */
  async calculateEmployeeAccountPath(employeeId: number): Promise<string> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { org: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 获取所有激活的层级配置
    const hierarchyConfigs = await this.getHierarchyLevels();

    if (hierarchyConfigs.length === 0) {
      return '';
    }

    // 解析员工自定义字段
    const customFields = typeof employee.customFields === 'string'
      ? JSON.parse(employee.customFields)
      : employee.customFields || {};

    // 查询员工当前的工作信息，获取employeeType和jobPost等字段
    const workInfoHistory = await this.prisma.workInfoHistory.findFirst({
      where: {
        employeeId: employeeId,
        isCurrent: true,
      },
    });

    // 合并工作信息的customFields到customFields对象中
    if (workInfoHistory) {
      const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};

      // 合并customFields，WorkInfoHistory的字段优先级更高
      Object.assign(customFields, workInfoCustomFields);

      // 特别处理employeeType字段（WorkInfoHistory表有独立的employeeType字段）
      if (workInfoHistory.employeeType && !customFields.employeeType) {
        customFields.employeeType = workInfoHistory.employeeType;
      }
    }

    const pathParts: string[] = [];

    for (const config of hierarchyConfigs) {
      let accountCode: string;

      // 根据映射类型获取账户编码
      // 清理 mappingType 中的空格，避免因空格导致匹配失败
      const cleanMappingType = config.mappingType.replace(/\s+/g, '');
      switch (cleanMappingType) {
        case 'ORG':
          // 组织类型：根据mappingValue查找指定类型的组织
          if (config.mappingValue) {
            // 使用mappingValue指定的组织类型查找组织
            accountCode = await this.findOrgByType(this.prisma, employee.orgId, config.mappingValue);
          } else if (config.level === 1) {
            // 如果没有指定mappingValue，第1层使用顶级组织
            const topLevelOrg = await this.getTopLevelOrg(this.prisma, employee.orgId);
            accountCode = topLevelOrg?.code || topLevelOrg?.name || '-';
          } else {
            // 其他层级直接使用员工所属组织
            accountCode = employee.org?.code || employee.org?.name || '-';
          }
          break;

        case 'ORG_TYPE':
          if (config.mappingValue) {
            accountCode = await this.findOrgByType(this.prisma, employee.orgId, config.mappingValue);
          } else {
            accountCode = '-';
          }
          break;

        case 'FIELD':
          const fieldValue = customFields[config.mappingValue || ''];
          if (!fieldValue) {
            accountCode = '-';
          } else {
            accountCode = fieldValue; // 使用原始值作为code
          }
          break;

        case 'FIELD_A01':
        case 'FIELD_A02':
        case 'FIELD_A03':
        case 'FIELD_B01':
        case 'FIELD_B02':
        case 'FIELD_B03':
          // 字段类型（FIELD_*格式）：从员工自定义字段获取
          // 提取字段代码（去掉 FIELD_ 前缀）
          const fieldCode = config.mappingType.replace('FIELD_', '');
          const customFieldValue = customFields[fieldCode];
          if (!customFieldValue) {
            // 如果字段不存在，使用 '-'
            accountCode = '-';
          } else {
            accountCode = customFieldValue; // 使用原始值作为code
          }
          break;

        case 'CONSTANT':
          accountCode = config.mappingValue || `LEVEL${config.level}`;
          break;

        default:
          // 支持前端的 FIELD_* 前缀自定义字段映射（如 FIELD_employeeType）
          if (config.mappingType?.startsWith('FIELD_')) {
            const fieldCode = config.mappingType.replace('FIELD_', '');
            const fieldCustomValue = customFields[fieldCode];
            if (!fieldCustomValue) {
              // 如果字段不存在，使用 '-'
              accountCode = '-';
            } else {
              accountCode = fieldCustomValue; // 使用原始值作为code
            }
          } else if (config.mappingType?.startsWith('CUSTOM_')) {
            const fieldCode = config.mappingType.replace('CUSTOM_', '');
            const customFieldValue = customFields[fieldCode];
            if (!customFieldValue) {
              accountCode = '-';
            } else {
              accountCode = customFieldValue; // 使用原始值作为code
            }
          } else {
            accountCode = '-';
          }
      }

      pathParts.push(accountCode);
    }

    return pathParts.join('/');
  }

  /**
   * 重新生成员工的劳动力账户
   * 用于员工调岗或手动重新生成账户的场景
   * 只有当账户路径发生变化时才会生成新账户
   */
  async regenerateAccountsForEmployee(employeeId: number) {
    try {
      console.log('🔄 开始重新生成员工账户, employeeId:', employeeId);

      // 1. 计算当前应该有的账户路径
      const currentPath = await this.calculateEmployeeAccountPath(employeeId);
      console.log('🔄 计算得到的账户路径:', currentPath);

      // 2. 获取员工当前的主账户（最新的ACTIVE账户）
      const existingMainAccount = await this.prisma.laborAccount.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
      },
      orderBy: {
        effectiveDate: 'desc',
      },
      include: {
        parent: true,
      },
    });

    // 3. 如果不存在现有账户，直接创建新账户
    if (!existingMainAccount) {
      return this.generateAccountsForEmployee(employeeId);
    }

    // 4. 获取现有账户的路径
    const existingPath = existingMainAccount.path;

    // 5. 比较路径是否一致
    if (currentPath === existingPath) {
      // 路径没有变化，不需要重新生成
      return {
        message: '账户路径未发生变化，无需重新生成',
        changed: false,
        currentPath,
      };
    }

    // 6. 路径发生变化，需要重新生成账户
    // 使用事务确保数据一致性
    return this.prisma.$transaction(async (tx) => {
      // 找到员工的所有主账户（最后一层，employeeId匹配的账户）
      const allMainAccounts = await tx.laborAccount.findMany({
        where: {
          employeeId,
          status: 'ACTIVE',
        },
      });

      const timestamp = Date.now();
      const accountIdsToDeactivate: number[] = [];

      // 收集所有需要停用的账户ID
      for (const mainAccount of allMainAccounts) {
        accountIdsToDeactivate.push(mainAccount.id);
        let currentAccount = mainAccount;

        // 递归向上查找父账户
        while (currentAccount.parentId) {
          const parentAccount = await tx.laborAccount.findUnique({
            where: { id: currentAccount.parentId },
          });

          if (parentAccount && parentAccount.status === 'ACTIVE') {
            accountIdsToDeactivate.push(parentAccount.id);
            currentAccount = parentAccount;
          } else {
            break;
          }
        }
      }

      // 去重
      const uniqueAccountIds = Array.from(new Set(accountIdsToDeactivate));

      // 停用所有相关账户
      // 失效日期设为昨天，新账户的生效日期为今天
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      for (const accountId of uniqueAccountIds) {
        await tx.laborAccount.update({
          where: { id: accountId },
          data: {
            code: `old_${accountId}_${timestamp}`,
            status: 'INACTIVE',
            expiryDate: yesterday, // 失效日期为昨天
          },
        });
      }

      // 生成新的账户
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: { org: true },
      });

      if (!employee) {
        throw new NotFoundException('员工不存在');
      }

      // 获取所有激活的层级配置
      const hierarchyConfigs = await this.getHierarchyLevels();

      if (hierarchyConfigs.length === 0) {
        throw new Error('请先配置劳动力账户层级');
      }

      // 解析员工自定义字段
      const customFields = typeof employee.customFields === 'string'
        ? JSON.parse(employee.customFields)
        : employee.customFields || {};

      // 构建账户路径
      const pathParts: string[] = []; // 用于存储code
      const namePathParts: string[] = []; // 用于存储name
      const hierarchyValues: any[] = []; // 用于存储层级值
      let parentAccountId: number | null = null;
      const createdAccounts: any[] = [];

      // 新账户的生效日期为今天
      const newAccountEffectiveDate = new Date();
      newAccountEffectiveDate.setHours(0, 0, 0, 0);

      for (const config of hierarchyConfigs) {
        let accountCode: string;
        let accountName: string;
        let selectedValue: any = null;

        // 根据映射类型获取账户编码和名称
        // 清理 mappingType 中的空格，避免因空格导致匹配失败
        const cleanMappingType = config.mappingType.replace(/\s+/g, '');
        switch (cleanMappingType) {
          case 'ORG':
            // 组织类型：根据mappingValue查找指定类型的组织
            if (config.mappingValue) {
              // 使用mappingValue指定的组织类型查找组织
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              const org = await this.findOrgObjectByType(tx, employee.orgId, config.mappingValue);
              accountName = org?.name || accountCode;
            } else if (config.level === 1) {
              // 如果没有指定mappingValue，第1层使用顶级组织
              const topLevelOrg = await this.getTopLevelOrg(tx, employee.orgId);
              accountCode = topLevelOrg?.code || topLevelOrg?.name || '-';
              accountName = topLevelOrg?.name || '-';
            } else {
              // 其他层级直接使用员工所属组织
              accountCode = employee.org?.code || employee.org?.name || '-';
              accountName = employee.org?.name || '-';
            }
            break;

          case 'ORG_TYPE':
            // 组织类型映射：根据员工组织树向上查找匹配的组织类型
            if (config.mappingValue) {
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              const org = await this.findOrgObjectByType(tx, employee.orgId, config.mappingValue);
              accountName = org?.name || accountCode;
            } else {
              accountCode = '-';
              accountName = '-';
            }
            break;

          case 'FIELD':
            // 字段类型：从员工自定义字段获取
            const fieldValue = customFields[config.mappingValue || ''];
            if (!fieldValue) {
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = fieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, config.mappingValue, fieldValue); // 使用label作为name
            }
            break;

          case 'FIELD_A01':
          case 'FIELD_A02':
          case 'FIELD_A03':
          case 'FIELD_B01':
          case 'FIELD_B02':
          case 'FIELD_B03':
            // 字段类型（FIELD_*格式）：从员工自定义字段获取
            // 提取字段代码（去掉 FIELD_ 前缀）
            const fieldCode = config.mappingType.replace('FIELD_', '');
            const customFieldValue = customFields[fieldCode];
            if (!customFieldValue) {
              // 如果字段不存在，使用 '-'
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = customFieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
            }
            break;

          case 'CONSTANT':
            // 常量类型：直接使用配置的映射值
            accountCode = config.mappingValue || `LEVEL${config.level}`;
            accountName = config.name;
            break;

          default:
            // 支持前端的 FIELD_* 前缀自定义字段映射（如 FIELD_employeeType）
            if (config.mappingType?.startsWith('FIELD_')) {
              const fieldCode = config.mappingType.replace('FIELD_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else if (config.mappingType?.startsWith('CUSTOM_')) {
              // 支持前端的 CUSTOM_* 前缀自定义字段映射
              const fieldCode = config.mappingType.replace('CUSTOM_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else {
              throw new Error(`不支持的映射类型: ${config.mappingType}`);
            }
        }

        // 构建完整路径
        pathParts.push(accountCode);
        namePathParts.push(accountName);
        const fullPath = pathParts.join('/');

        // 构建hierarchyValues项
        hierarchyValues.push({
          level: config.level,
          name: config.name,
          mappingType: config.mappingType,
          mappingValue: config.mappingValue,
          selectedValue: selectedValue,
          selectedValueLabel: accountName,
        });        const fullNamePath = namePathParts.join('/');

        // 生成唯一的账户编码（添加层级后缀和时间戳确保唯一性）
        // 使用时间戳后6位确保每次生成的编码都不同
        const timestampSuffix = Date.now().toString().slice(-6);
        const uniqueCode = accountCode === '-'
          ? `-${employeeId}_L${config.level}_${timestampSuffix}`
          : `${accountCode}_L${config.level}_${timestampSuffix}`;

        // 创建账户（重新生成时总是创建新账户）
        const isMainAccount = config.level === hierarchyConfigs.length;
        const account = await tx.laborAccount.create({
          data: {
            code: uniqueCode,
            name: accountName || config.name,
            type: 'MAIN',
            level: config.level,
            path: fullPath,
            namePath: fullNamePath, // ✅ 添加名称路径
            hierarchyValues: isMainAccount ? JSON.stringify(hierarchyValues) : '{}', // ✅ 添加层级值
            parentId: parentAccountId,
            employeeId: isMainAccount ? employeeId : null,
            effectiveDate: newAccountEffectiveDate, // 使用今天的0点作为生效日���
            status: 'ACTIVE',
          },
        });

        createdAccounts.push(account);
        parentAccountId = account.id;

        // 如果是主账户，创建员工与账户的关联记录
        if (isMainAccount) {
          await tx.employeeLaborAccount.create({
            data: {
              employeeNo: employee.employeeNo,
              employeeId: employeeId,
              accountId: account.id,
              effectiveDate: newAccountEffectiveDate,
              isPrimary: true,
              status: 'ACTIVE',
            },
          });
        }
      }

      return {
        message: '账户重新生成成功',
        changed: true,
        oldPath: existingPath,
        newPath: currentPath,
        accounts: createdAccounts,
      };
    });
    } catch (error) {
      console.error('❌ 重新生成员工账户失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
      throw error;
    }
  }

  /**
   * 重新生成员工的劳动力账户（使用指定的生效日期）
   * 用于员工异动场景，使用异动的生效日期作为新账户的生效日期
   */
  async regenerateAccountsForEmployeeWithDate(employeeId: number, effectiveDate: Date) {
    // 1. 计算当前应该有的账户路径
    const currentPath = await this.calculateEmployeeAccountPath(employeeId);

    // 2. 获取员工当前的主账户（最新的ACTIVE账户）
    const existingMainAccount = await this.prisma.laborAccount.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
      },
      orderBy: {
        effectiveDate: 'desc',
      },
      include: {
        parent: true,
      },
    });

    // 3. 如果不存在现有账户，直接创建新账户
    if (!existingMainAccount) {
      return this.generateAccountsForEmployeeWithDate(employeeId, effectiveDate);
    }

    // 4. 获取现有账户的路径
    const existingPath = existingMainAccount.path;

    // 5. 比较路径是否一致
    if (currentPath === existingPath) {
      // 路径没有变化，不需要重新生成
      return {
        message: '账户路径未发生变化，无需重新生成',
        changed: false,
        currentPath,
      };
    }

    // 6. 路径发生变化，需要重新生成账户
    // 使用事务确保数据一致性
    return this.prisma.$transaction(async (tx) => {
      // 找到员工的所有主账户（最后一层，employeeId匹配的账户）
      const allMainAccounts = await tx.laborAccount.findMany({
        where: {
          employeeId,
          status: 'ACTIVE',
        },
      });

      const timestamp = Date.now();
      const accountIdsToDeactivate: number[] = [];

      // 收集所有需要停用的账户ID
      for (const mainAccount of allMainAccounts) {
        accountIdsToDeactivate.push(mainAccount.id);
        let currentAccount = mainAccount;

        // 递归向上查找父账户
        while (currentAccount.parentId) {
          const parentAccount = await tx.laborAccount.findUnique({
            where: { id: currentAccount.parentId },
          });

          if (parentAccount && parentAccount.status === 'ACTIVE') {
            accountIdsToDeactivate.push(parentAccount.id);
            currentAccount = parentAccount;
          } else {
            break;
          }
        }
      }

      // 去重
      const uniqueAccountIds = Array.from(new Set(accountIdsToDeactivate));

      // 停用所有相关账户
      // 失效日期设为生效日期的前一天
      const effectiveDay = new Date(effectiveDate);
      effectiveDay.setHours(0, 0, 0, 0);
      const expiryDate = new Date(effectiveDay);
      expiryDate.setDate(expiryDate.getDate() - 1);

      for (const accountId of uniqueAccountIds) {
        await tx.laborAccount.update({
          where: { id: accountId },
          data: {
            code: `old_${accountId}_${timestamp}`,
            status: 'INACTIVE',
            expiryDate: expiryDate, // 失效日期为生效日期的前一天
          },
        });
      }

      // 生成新的账户
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: { org: true },
      });

      if (!employee) {
        throw new NotFoundException('员工不存在');
      }

      // 获取所有激活的层级配置
      const hierarchyConfigs = await this.getHierarchyLevels();

      if (hierarchyConfigs.length === 0) {
        throw new Error('请先配置劳动力账户层级');
      }

      // 解析员工自定义字段
      const customFields = typeof employee.customFields === 'string'
        ? JSON.parse(employee.customFields)
        : employee.customFields || {};

      // 构建账户路径
      const pathParts: string[] = []; // 用于存储code
      const namePathParts: string[] = []; // 用于存储name
      let parentAccountId: number | null = null;
      const createdAccounts: any[] = [];

      // 新账户的生效日期使用指定的生效日期
      const newAccountEffectiveDate = new Date(effectiveDate);
      newAccountEffectiveDate.setHours(0, 0, 0, 0);

      for (const config of hierarchyConfigs) {
        let accountCode: string;
        let accountName: string;

        // 根据映射类型获取账户编码和名称
        // 清理 mappingType 中的空格，避免因空格导致匹配失败
        const cleanMappingType = config.mappingType.replace(/\s+/g, '');
        switch (cleanMappingType) {
          case 'ORG':
            // 组织类型：根据mappingValue查找指定类型的组织
            if (config.mappingValue) {
              // 使用mappingValue指定的组织类型查找组织
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              const org = await this.findOrgObjectByType(tx, employee.orgId, config.mappingValue);
              accountName = org?.name || accountCode;
            } else if (config.level === 1) {
              // 如果没有指定mappingValue，第1层使用顶级组织
              const topLevelOrg = await this.getTopLevelOrg(tx, employee.orgId);
              accountCode = topLevelOrg?.code || topLevelOrg?.name || '-';
              accountName = topLevelOrg?.name || '-';
            } else {
              // 其他层级直接使用员工所属组织
              accountCode = employee.org?.code || employee.org?.name || '-';
              accountName = employee.org?.name || '-';
            }
            break;

          case 'ORG_TYPE':
            // 组织类型映射：根据员工组织树向上查找匹配的组织类型
            if (config.mappingValue) {
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              const org = await this.findOrgObjectByType(tx, employee.orgId, config.mappingValue);
              accountName = org?.name || accountCode;
            } else {
              accountCode = '-';
              accountName = '-';
            }
            break;

          case 'FIELD':
            // 字段类型：从员工自定义字段获取
            const fieldValue = customFields[config.mappingValue || ''];
            if (!fieldValue) {
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = fieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, config.mappingValue, fieldValue); // 使用label作为name
            }
            break;

          case 'FIELD_A01':
          case 'FIELD_A02':
          case 'FIELD_A03':
          case 'FIELD_B01':
          case 'FIELD_B02':
          case 'FIELD_B03':
            // 字段类型（FIELD_*格式）：从员工自定义字段获取
            // 提取字段代码（去掉 FIELD_ 前缀）
            const fieldCode = config.mappingType.replace('FIELD_', '');
            const customFieldValue = customFields[fieldCode];
            if (!customFieldValue) {
              // 如果字段不存在，使用 '-'
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = customFieldValue; // 使用原始值作为code
              accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
            }
            break;

          case 'CONSTANT':
            // 常量类型：直接使用配置的映射值
            accountCode = config.mappingValue || `LEVEL${config.level}`;
            accountName = config.name;
            break;

          default:
            // 支持前端的 FIELD_* 前缀自定义字段映射（如 FIELD_employeeType）
            if (config.mappingType?.startsWith('FIELD_')) {
              const fieldCode = config.mappingType.replace('FIELD_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else if (config.mappingType?.startsWith('CUSTOM_')) {
              // 支持前端的 CUSTOM_* 前缀自定义字段映射
              const fieldCode = config.mappingType.replace('CUSTOM_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = customFieldValue; // 使用原始值作为code
                accountName = await this.getFieldLabel(tx, fieldCode, customFieldValue); // 使用label作为name
              }
            } else {
              throw new Error(`不支持的映射类型: ${config.mappingType}`);
            }
        }

        // 构建完整路径
        pathParts.push(accountCode);
        namePathParts.push(accountName);
        const fullPath = pathParts.join('/');
        const fullNamePath = namePathParts.join('/');

        // 生成唯一的账户编码（添加层级后缀和时间戳确保唯一性）
        // 使用时间戳后6位确保每次生成的编码都不同
        const timestampSuffix = Date.now().toString().slice(-6);
        const uniqueCode = accountCode === '-'
          ? `-${employeeId}_L${config.level}_${timestampSuffix}`
          : `${accountCode}_L${config.level}_${timestampSuffix}`;

        // 创建账户（重新生成时总是创建新账户）
        const account = await tx.laborAccount.create({
          data: {
            code: uniqueCode,
            name: accountName || config.name,
            type: config.level === hierarchyConfigs.length ? 'MAIN' : 'MAIN',
            level: config.level,
            path: fullPath,
            parentId: parentAccountId,
            employeeId: config.level === hierarchyConfigs.length ? employeeId : null,
            effectiveDate: newAccountEffectiveDate, // 使用指定的生效日期
            status: 'ACTIVE',
          },
        });

        createdAccounts.push(account);
        parentAccountId = account.id;
      }

      return {
        message: '账户重新生成成功',
        changed: true,
        oldPath: existingPath,
        newPath: currentPath,
        accounts: createdAccounts,
      };
    });
  }

  /**
   * 更新员工当前的主账户（不创建新账户）
   * 用于非工作信息变更的场景，只更新账户元数据，不影响账户路径和生效日期
   */
  async updateCurrentAccount(employeeId: number) {
    // 获取员工当前的主账户（最新的ACTIVE账户）
    const currentMainAccount = await this.prisma.laborAccount.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE',
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    // 如果不存在账户，不执行任何操作
    if (!currentMainAccount) {
      return {
        message: '当前没有需要更新的账户',
        updated: false,
      };
    }

    // 更新账户的 updatedAt 时间戳（记录账户已被更新）
    const updatedAccount = await this.prisma.laborAccount.update({
      where: { id: currentMainAccount.id },
      data: {
        updatedAt: new Date(),
      },
    });

    return {
      message: '账户元数据已更新',
      updated: true,
      account: updatedAccount,
    };
  }
}
