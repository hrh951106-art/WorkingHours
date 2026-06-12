import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  extractLevelFromAccountName,
  extractMultipleLevelsFromAccountName,
  matchLineShiftsByLevel,
  extractWH1001LevelFromLineShift,
  extractWH1001LevelsFromLineShifts,
  shouldParticipateInAllocation,
  filterParticipatingLineShifts,
  matchAllocationScope,
  getAccountNameHierarchy,
} from '../../common/utils/allocation-scope.utils';

/**
 * 分摊范围服务
 * 用于处理分摊范围的层级提取、开线计划表匹配等功能
 */
@Injectable()
export class AllocationScopeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 从账户名称中提取指定层级的值
   *
   * @param accountName 账户名称
   * @param level 层级（1-7）
   * @returns 该层级的值
   */
  extractLevelFromAccountName(accountName: string, level: number): string | null {
    return extractLevelFromAccountName(accountName, level);
  }

  /**
   * 批量从账户名称中提取多个层级的值
   *
   * @param accountName 账户名称
   * @param levels 要提取的层级数组
   * @returns 包含各层级值的对象
   */
  extractMultipleLevelsFromAccountName(
    accountName: string,
    levels: number[],
  ): Record<number, string | null> {
    return extractMultipleLevelsFromAccountName(accountName, levels);
  }

  /**
   * 获取账户名称的完整层级信息
   *
   * @param accountName 账户名称
   * @returns 包含所有层级信息的对象
   */
  getAccountNameHierarchy(accountName: string): {
    full: string;
    levels: Record<number, string | null>;
    levelCount: number;
  } {
    return getAccountNameHierarchy(accountName);
  }

  /**
   * 在开线计划表中匹配指定层级的数据
   *
   * @param level 层级（1-7）
   * @param levelValue 该层级的值
   * @param queryOptions 查询选项（可选）
   * @returns 匹配的开线计划记录数组
   */
  async matchLineShiftsByLevel(
    level: number,
    levelValue: string,
    queryOptions?: {
      scheduleDate?: Date;
      shiftId?: number;
      status?: string;
    },
  ): Promise<any[]> {
    const where: any = {
      status: queryOptions?.status || 'ACTIVE',
      deletedAt: null,
    };

    if (queryOptions?.scheduleDate) {
      where.scheduleDate = queryOptions.scheduleDate;
    }

    if (queryOptions?.shiftId) {
      where.shiftId = queryOptions.shiftId;
    }

    // 查询所有符合条件的开线计划记录
    const lineShifts = await this.prisma.lineShift.findMany({
      where: where as any,
      include: {
        shift: true,
      },
    } as any);

    // 使用工具函数进行匹配
    return matchLineShiftsByLevel(lineShifts, level, levelValue);
  }

  /**
   * 从开线计划记录中解析 WH1001 配置的层级值
   *
   * @param lineShiftId 开线计划记录 ID
   * @param targetLevel 目标层级（可选）
   * @returns 层级值
   */
  async extractWH1001LevelFromLineShift(
    lineShiftId: number,
    targetLevel?: number,
  ): Promise<string | null> {
    const lineShift = await this.prisma.lineShift.findUnique({
      where: { id: lineShiftId },
    });

    if (!lineShift) {
      return null;
    }

    return extractWH1001LevelFromLineShift(lineShift, targetLevel);
  }

  /**
   * 批量从开线计划记录中解析 WH1001 配置的层级值
   *
   * @param lineShiftIds 开线计划记录 ID 数组
   * @param targetLevel 目标层级（可选）
   * @returns 包含各开线计划层级值的数组
   */
  async extractWH1001LevelsFromLineShifts(
    lineShiftIds: number[],
    targetLevel?: number,
  ): Promise<(string | null)[]> {
    const lineShifts = await this.prisma.lineShift.findMany({
      where: {
        id: { in: lineShiftIds },
      },
    });

    return extractWH1001LevelsFromLineShifts(lineShifts, targetLevel);
  }

  /**
   * 检查开线计划记录是否应该参与分摊
   *
   * @param lineShiftId 开线计划记录 ID
   * @returns 是否应该参与分摊
   */
  async shouldParticipateInAllocation(lineShiftId: number): Promise<boolean> {
    const lineShift = await this.prisma.lineShift.findUnique({
      where: { id: lineShiftId },
    });

    return shouldParticipateInAllocation(lineShift);
  }

  /**
   * 过滤出应该参与分摊的开线计划记录
   *
   * @param lineShiftIds 开线计划记录 ID 数组
   * @returns 应该参与分摊的记录数组
   */
  async filterParticipatingLineShifts(lineShiftIds: number[]): Promise<any[]> {
    const lineShifts = await this.prisma.lineShift.findMany({
      where: {
        id: { in: lineShiftIds },
        deletedAt: null,
      },
    });

    return filterParticipatingLineShifts(lineShifts);
  }

  /**
   * 完整的分摊范围匹配流程
   *
   * 步骤：
   * 1. 从源账户名称中提取指定层级的值
   * 2. 在开线计划表中匹配该层级的数据
   * 3. 从匹配的记录中解析 WH1001 配置的层级
   * 4. 过滤出应该参与分摊的记录
   *
   * @param sourceAccountName 源账户名称（待分摊工时）
   * @param allocationScopeLevel 分摊范围层级（1-7）
   * @param queryOptions 查询选项（可选）
   * @param wh1001TargetLevel WH1001 目标层级（可选）
   * @returns 匹配的、应该参与分摊的开线计划记录数组
   */
  async matchAllocationScope(
    sourceAccountName: string,
    allocationScopeLevel: number,
    queryOptions?: {
      scheduleDate?: Date;
      shiftId?: number;
      status?: string;
    },
    wh1001TargetLevel?: number,
  ): Promise<any[]> {
    // 查询所有符合条件的开线计划记录
    const where: any = {
      status: queryOptions?.status || 'ACTIVE',
      deletedAt: null,
    };

    if (queryOptions?.scheduleDate) {
      where.scheduleDate = queryOptions.scheduleDate;
    }

    if (queryOptions?.shiftId) {
      where.shiftId = queryOptions.shiftId;
    }

    const lineShifts = await this.prisma.lineShift.findMany({
      where: where as any,
      include: {
        shift: true,
      },
    } as any);

    // 使用工具函数进行匹配
    const matched = matchAllocationScope(
      sourceAccountName,
      allocationScopeLevel,
      lineShifts,
      wh1001TargetLevel,
    );

    return matched;
  }

  /**
   * 根据分摊范围配置获取匹配的开线计划记录
   *
   * @param allocationScopeId 分摊范围配置 ID（来自 AccountHierarchyConfig）
   * @param sourceAccountName 源账户名称
   * @param queryOptions 查询选项（可选）
   * @returns 匹配的、应该参与分摊的开线计划记录数组
   */
  async matchByAllocationScopeConfig(
    allocationScopeId: number,
    sourceAccountName: string,
    queryOptions?: {
      scheduleDate?: Date;
      shiftId?: number;
      status?: string;
    },
  ): Promise<any[]> {
    // 获取分摊范围配置
    const scopeConfig = await this.prisma.accountHierarchyConfig.findUnique({
      where: { id: allocationScopeId },
    });

    if (!scopeConfig) {
      throw new Error(`分摊范围配置 ID ${allocationScopeId} 不存在`);
    }

    // 使用配置的层级进行匹配
    return this.matchAllocationScope(sourceAccountName, scopeConfig.level, queryOptions);
  }

  /**
   * 获取账户层级配置列表
   *
   * @returns 账户层级配置列表
   */
  async getHierarchyLevels() {
    return this.prisma.accountHierarchyConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }],
    });
  }

  /**
   * 根据层级获取对应的组织类型
   *
   * WH1001 配置中的组织类型映射：
   * - level 1 (工厂): ORG_TYPE = FACTORY
   * - level 2 (车间): ORG_TYPE = WORKSHOP
   * - level 3 (线体): ORG_TYPE = LINE
   * - level 4 (工序): ORG_TYPE = PROCESS
   * - level 5 (产品): ORG_TYPE = PRODUCT
   * - level 6 (其他): ORG_TYPE = OTHER
   * - level 7 (其他): ORG_TYPE = OTHER
   *
   * @param level 层级（1-7）
   * @returns 组织类型
   */
  async getOrgTypeByLevel(level: number): Promise<string | null> {
    const hierarchyConfig = await this.prisma.accountHierarchyConfig.findFirst({
      where: {
        level,
        status: 'ACTIVE',
      },
    });

    if (!hierarchyConfig || hierarchyConfig.mappingType !== 'ORG_TYPE') {
      return null;
    }

    return hierarchyConfig.mappingValue;
  }
}
