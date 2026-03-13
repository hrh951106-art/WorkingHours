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
    const { level, name, mappingType, mappingValue, sort = 0, status = 'ACTIVE' } = dto;

    return this.prisma.accountHierarchyConfig.create({
      data: {
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
      // 先删除所有现有配置
      await tx.accountHierarchyConfig.deleteMany({});

      // 批量创建新配置
      const createPromises = levels.map((level, index) =>
        tx.accountHierarchyConfig.create({
          data: {
            name: level.name,
            mappingType: level.mappingType,
            mappingValue: level.mappingValue,
            level: index + 1, // 自动生成序号
            sort: level.sort || 0,
            status: level.status || 'ACTIVE',
          },
        })
      );

      return Promise.all(createPromises);
    });
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
        include: {
          employee: true,
        },
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

    // 构建账户路径：如果前端传入了 path，直接使用；否则根据 code 和 parent 构建
    let accountPath = path;
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

    // 生成7层账户路径
    const path = `${employee.org.code}-${employee.employeeNo}`;

    return this.prisma.laborAccount.create({
      data: {
        code: StringUtils.generateCode('ACC'),
        name: `${employee.name}_主账户`,
        type: 'MAIN',
        level: 7,
        path,
        employeeId,
        effectiveDate: new Date(),
        status: 'ACTIVE',
      },
    });
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

    // 构建账户路径
    const pathParts: string[] = [];
    let parentAccountId: number | null = null;

    // 使用事务确保数据一致性
    const accounts = await this.prisma.$transaction(async (tx) => {
      const createdAccounts: any[] = [];

      for (const config of hierarchyConfigs) {
        let accountCode: string;
        let accountName: string;

        // 根据映射类型获取账户编码和名称
        switch (config.mappingType) {
          case 'ORG':
            // 组织类型：使用员工所属组织
            if (config.level === 1) {
              // 第1层通常使用组织的顶级组织
              const topLevelOrg = await this.getTopLevelOrg(tx, employee.orgId);
              accountCode = topLevelOrg?.name || '-';
              accountName = topLevelOrg?.name || '-';
            } else {
              // 其他层级可能需要根据配置取组织层级
              accountCode = employee.org.name;
              accountName = employee.org.name;
            }
            break;

          case 'ORG_TYPE':
            // 组织类型映射：根据员工组织树向上查找匹配的组织类型
            if (config.mappingValue) {
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              accountName = accountCode; // 名称和代码相同，都是组织名称
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
              accountCode = await this.getFieldLabel(tx, config.mappingValue, fieldValue);
              accountName = accountCode;
            }
            break;

          case 'CONSTANT':
            // 常量类型：直接使用配置的映射值
            accountCode = config.mappingValue || `LEVEL${config.level}`;
            accountName = config.name;
            break;

          default:
            // 支持前端的 CUSTOM_* 前缀自定义字段映射
            if (config.mappingType?.startsWith('CUSTOM_')) {
              const fieldCode = config.mappingType.replace('CUSTOM_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = await this.getFieldLabel(tx, fieldCode, customFieldValue);
                accountName = accountCode;
              }
            } else {
              throw new Error(`不支持的映射类型: ${config.mappingType}`);
            }
        }

        // 构建完整路径
        pathParts.push(accountCode);
        const fullPath = pathParts.join('/');

        // 生成唯一的账户编码（添加层级后缀和时间戳确保唯一性）
        const timestampSuffix = Date.now().toString().slice(-6);
        const uniqueCode = accountCode === '-'
          ? `-${employeeId}_L${config.level}_${timestampSuffix}`
          : `${accountCode}_L${config.level}_${timestampSuffix}`;

        // 创建账户
        // 首次生成账户时，生效日期为员工入职日期
        const account = await tx.laborAccount.create({
          data: {
            code: uniqueCode,
            name: accountName || config.name,
            type: config.level === hierarchyConfigs.length ? 'MAIN' : 'MAIN',
            level: config.level,
            path: fullPath,
            parentId: parentAccountId,
            employeeId: config.level === hierarchyConfigs.length ? employeeId : null,
            effectiveDate: employee.entryDate, // 使用员工入职日期作为生效日期
            status: 'ACTIVE',
          },
        });

        createdAccounts.push(account);
        parentAccountId = account.id;
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
        return currentOrg.name; // 返回组织名称，而不是代码
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
        employee: true,
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

    const pathParts: string[] = [];

    for (const config of hierarchyConfigs) {
      let accountCode: string;

      // 根据映射类型获取账户编码
      switch (config.mappingType) {
        case 'ORG':
          if (config.level === 1) {
            const topLevelOrg = await this.getTopLevelOrg(this.prisma, employee.orgId);
            accountCode = topLevelOrg?.name || '-';
          } else {
            accountCode = employee.org.name;
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
            accountCode = await this.getFieldLabel(this.prisma, config.mappingValue, fieldValue);
          }
          break;

        case 'CONSTANT':
          accountCode = config.mappingValue || `LEVEL${config.level}`;
          break;

        default:
          if (config.mappingType?.startsWith('CUSTOM_')) {
            const fieldCode = config.mappingType.replace('CUSTOM_', '');
            const customFieldValue = customFields[fieldCode];
            if (!customFieldValue) {
              accountCode = '-';
            } else {
              accountCode = await this.getFieldLabel(this.prisma, fieldCode, customFieldValue);
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
      const pathParts: string[] = [];
      let parentAccountId: number | null = null;
      const createdAccounts: any[] = [];

      // 新账户的生效日期为今天
      const newAccountEffectiveDate = new Date();
      newAccountEffectiveDate.setHours(0, 0, 0, 0);

      for (const config of hierarchyConfigs) {
        let accountCode: string;
        let accountName: string;

        // 根据映射类型获取账户编码和名称
        switch (config.mappingType) {
          case 'ORG':
            // 组织类型：使用员工所属组织
            if (config.level === 1) {
              // 第1层通常使用组织的顶级组织
              const topLevelOrg = await this.getTopLevelOrg(tx, employee.orgId);
              accountCode = topLevelOrg?.name || '-';
              accountName = topLevelOrg?.name || '-';
            } else {
              // 其他层级可能需要根据配置取组织层级
              accountCode = employee.org.name;
              accountName = employee.org.name;
            }
            break;

          case 'ORG_TYPE':
            // 组织类型映射：根据员工组织树向上查找匹配的组织类型
            if (config.mappingValue) {
              accountCode = await this.findOrgByType(tx, employee.orgId, config.mappingValue);
              accountName = accountCode; // 名称和代码相同，都是组织名称
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
              accountCode = await this.getFieldLabel(tx, config.mappingValue, fieldValue);
              accountName = accountCode;
            }
            break;

          case 'CONSTANT':
            // 常量类型：直接使用配置的映射值
            accountCode = config.mappingValue || `LEVEL${config.level}`;
            accountName = config.name;
            break;

          default:
            // 支持前端的 CUSTOM_* 前缀自定义字段映射
            if (config.mappingType?.startsWith('CUSTOM_')) {
              const fieldCode = config.mappingType.replace('CUSTOM_', '');
              const customFieldValue = customFields[fieldCode];
              if (!customFieldValue) {
                // 如果字段不存在，使用 '-'
                accountCode = '-';
                accountName = '-';
              } else {
                accountCode = await this.getFieldLabel(tx, fieldCode, customFieldValue);
                accountName = accountCode;
              }
            } else {
              throw new Error(`不支持的映射类型: ${config.mappingType}`);
            }
        }

        // 构建完整路径
        pathParts.push(accountCode);
        const fullPath = pathParts.join('/');

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
            effectiveDate: newAccountEffectiveDate, // 使用今天的0点作为生效日期
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
}
