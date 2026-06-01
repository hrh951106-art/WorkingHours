/**
 * 修复文件：account.service.ts
 *
 * 修复内容：
 * 1. regenerateAccountsForEmployee方法：基于effectiveDate匹配决定创建或更新账户
 * 2. 修复层级值为NULL的问题
 *
 * 使用方法：将此方法替换account.service.ts中的regenerateAccountsForEmployee方法
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@nestjs/prisma';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  /**
   * 重新生成员工主劳动力账户（修复版）
   *
   * 逻辑：
   * 1. 新增WorkInfoHistory（新effectiveDate）→ 创建新账户
   * 2. 更新WorkInfoHistory（同一条记录）→ ���新现有账户
   * 3. 基本信息变更 → 更新当前ACTIVE账户
   */
  async regenerateAccountsForEmployee(employeeId: number) {
    try {
      console.log('🔄 开始重新生成员工账户（修复版）, employeeId:', employeeId);

      // 1. 获取最新的WorkInfoHistory（当前任职记录）
      const latestWorkInfo = await this.prisma.workInfoHistory.findFirst({
        where: {
          employeeId,
          isCurrent: true,
        },
        select: {
          id: true,
          effectiveDate: true,
          position: true,
          jobLevel: true,
          updatedAt: true,
        },
      });

      if (!latestWorkInfo) {
        console.log('⚠️ 未找到WorkInfoHistory记录，无法生成账户');
        return {
          message: '未找到WorkInfoHistory记录',
          changed: false,
        };
      }

      console.log(`📋 最新WorkInfoHistory: effectiveDate=${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}, position=${latestWorkInfo.position}, jobLevel=${latestWorkInfo.jobLevel}`);

      // 2. 计算新的层级值
      const newHierarchyData = await this.calculateCompleteHierarchy(employeeId);
      console.log(`📋 计算得到的新路径: ${newHierarchyData.path}`);

      // 3. 查找匹配effectiveDate的现有账户
      const existingAccount = await this.prisma.laborAccount.findFirst({
        where: {
          employeeId,
          type: 'MAIN',
          effectiveDate: latestWorkInfo.effectiveDate,
        },
      });

      if (existingAccount) {
        // 场景2：更新现有账户（对应同一条任职记录）
        console.log(`✅ 找到匹配的账户 ${existingAccount.id}，将更新账户层级值`);

        return await this.prisma.$transaction(async (tx) => {
          // 更新账户的层级信息
          const updatedAccount = await tx.laborAccount.update({
            where: { id: existingAccount.id },
            data: {
              path: newHierarchyData.path,
              namePath: newHierarchyData.namePath,
              hierarchyValues: JSON.stringify(newHierarchyData.hierarchyValues),
              updatedAt: new Date(),
            },
          });

          console.log(`✅ 账户 ${existingAccount.id} 已更新`);

          return {
            message: '账户已更新',
            changed: true,
            action: 'updated',
            accountId: updatedAccount.id,
            path: updatedAccount.path,
          };
        });
      } else {
        // 场景1：新增任职记录，创建新账户
        console.log(`ℹ️ 未找到匹配effectiveDate的账户，将创建新账户`);

        // 检查是否有ACTIVE账户需要停用
        const activeAccounts = await this.prisma.laborAccount.findMany({
          where: {
            employeeId,
            type: 'MAIN',
            status: 'ACTIVE',
          },
        });

        if (activeAccounts.length > 0) {
          console.log(`⚠️ 发现 ${activeAccounts.length} 个ACTIVE账户，将停用`);

          await this.prisma.$transaction(async (tx) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // 停用现有ACTIVE账户
            for (const account of activeAccounts) {
              await tx.laborAccount.update({
                where: { id: account.id },
                data: {
                  status: 'INACTIVE',
                  expiryDate: yesterday,
                },
              });
              console.log(`  停用账户 ${account.id}`);
            }
          });
        }

        // 创建新账户
        return await this.generateAccountsForEmployee(employeeId);
      }
    } catch (error) {
      console.error('❌ 重新生成员工账户失败:', error);
      throw error;
    }
  }

  /**
   * 计算完整的层级信息（包括path、namePath、hierarchyValues）
   * 修复层级值为NULL的问题
   */
  private async calculateCompleteHierarchy(employeeId: number): Promise<{
    path: string;
    namePath: string;
    hierarchyValues: any[];
  }> {
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

    // 查询员工当前的工作信息
    const workInfoHistory = await this.prisma.workInfoHistory.findFirst({
      where: {
        employeeId,
        isCurrent: true,
      },
    });

    // 合并工作信息到customFields（关键修复）
    if (workInfoHistory) {
      // 合并customFields
      if (workInfoHistory.customFields) {
        const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
          ? JSON.parse(workInfoHistory.customFields)
          : workInfoHistory.customFields || {};
        Object.assign(customFields, workInfoCustomFields);
      }

      // 特别处理WorkInfoHistory的独立字段
      const workInfoFields = {
        position: workInfoHistory.position,
        jobLevel: workInfoHistory.jobLevel,
        employeeType: workInfoHistory.employeeType,
        workLocation: workInfoHistory.workLocation,
        workAddress: workInfoHistory.workAddress,
        costCenter: workInfoHistory.costCenter,
        employmentRelation: workInfoHistory.employmentRelation,
      };

      // 将WorkInfoHistory字段合并到customFields
      for (const [fieldCode, fieldValue] of Object.entries(workInfoFields)) {
        if (fieldValue && !customFields[fieldCode]) {
          customFields[fieldCode] = fieldValue;
          console.log(`  合并字段: ${fieldCode} = ${fieldValue}`);
        }
      }
    }

    console.log('合并后的customFields:', customFields);

    // 构建层级信息
    const pathParts: string[] = [];
    const namePathParts: string[] = [];
    const hierarchyValues: any[] = [];

    for (const config of hierarchyConfigs) {
      let accountCode: string;
      let accountName: string;

      const cleanMappingType = config.mappingType.replace(/\s+/g, '');

      switch (cleanMappingType) {
        case 'ORG':
          if (config.mappingValue) {
            accountCode = await this.findOrgByType(this.prisma, employee.orgId, config.mappingValue);
            const org = await this.findOrgObjectByType(this.prisma, employee.orgId, config.mappingValue);
            accountName = org?.name || accountCode;
          } else if (config.level === 1) {
            const topLevelOrg = await this.getTopLevelOrg(this.prisma, employee.orgId);
            accountCode = topLevelOrg?.code || topLevelOrg?.name || '-';
            accountName = topLevelOrg?.name || '-';
          } else {
            accountCode = employee.org?.code || employee.org?.name || '-';
            accountName = employee.org?.name || '-';
          }
          break;

        case 'ORG_TYPE':
          if (config.mappingValue) {
            accountCode = await this.findOrgByType(this.prisma, employee.orgId, config.mappingValue);
            const org = await this.findOrgObjectByType(this.prisma, employee.orgId, config.mappingValue);
            accountName = org?.name || accountCode;
          } else {
            accountCode = '-';
            accountName = '-';
          }
          break;

        case 'FIELD':
        case 'FIELD_A01':
        case 'FIELD_A02':
        case 'FIELD_A03':
        case 'FIELD_B01':
        case 'FIELD_B02':
        case 'FIELD_B03':
          // 处理FIELD_开头的映射类型
          const fieldCode = config.mappingType.replace('FIELD_', '');
          const customFieldValue = customFields[fieldCode];

          console.log(`处理Level ${config.level}: mappingType=${config.mappingType}, fieldCode=${fieldCode}, value=${customFieldValue}`);

          if (!customFieldValue) {
            accountCode = '-';
            accountName = '-';
          } else {
            accountCode = customFieldValue;
            accountName = await this.getFieldLabel(this.prisma, fieldCode, customFieldValue);
          }
          break;

        default:
          if (config.mappingType?.startsWith('FIELD_')) {
            const fieldCode = config.mappingType.replace('FIELD_', '');
            const customFieldValue = customFields[fieldCode];
            if (!customFieldValue) {
              accountCode = '-';
              accountName = '-';
            } else {
              accountCode = customFieldValue;
              accountName = await this.getFieldLabel(this.prisma, fieldCode, customFieldValue);
            }
          } else {
            throw new Error(`不支持的映射类型: ${config.mappingType}`);
          }
      }

      pathParts.push(accountCode);
      namePathParts.push(accountName);

      // 构建层级值
      const levelValue = {
        level: config.level,
        name: config.name,
        selectedValue: accountCode !== '-' ? {
          code: accountCode,
          name: accountName,
          value: accountCode,
        } : null,
        selectedValueLabel: accountName !== '-' ? accountName : null,
      };
      hierarchyValues.push(levelValue);
    }

    return {
      path: pathParts.join('/'),
      namePath: namePathParts.join('/'),
      hierarchyValues,
    };
  }

  // 以下方法需要从原文件中保留
  private async getHierarchyLevels() {
    return this.prisma.accountHierarchyConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }],
    });
  }

  private async findOrgByType(prismaOrTx: any, orgId: number, orgType: string): Promise<string> {
    // 实现从原文件中复制
    return 'TODO';
  }

  private async findOrgObjectByType(prismaOrTx: any, orgId: number, orgType: string): Promise<any> {
    // 实现从原文件中复制
    return null;
  }

  private async getTopLevelOrg(prismaOrTx: any, orgId: number): Promise<any> {
    // 实现从原文件中复制
    return null;
  }

  private async getFieldLabel(prismaOrTx: any, fieldCode: string, fieldValue: string): Promise<string> {
    // 实现从原文件中复制
    return fieldValue;
  }

  async generateAccountsForEmployee(employeeId: number) {
    // 从原文件中保留
    return {};
  }
}
