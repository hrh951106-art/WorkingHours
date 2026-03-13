import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { StringUtils } from '../../common/utils';
import { CalculateEngine } from './calculate.engine';
import { AttendanceCodeService } from './attendance-code.service';

@Injectable()
export class CalculateService {
  constructor(
    private prisma: PrismaService,
    private calculateEngine: CalculateEngine,
    private attendanceCodeService: AttendanceCodeService,
    private dataScopeService: DataScopeService,
  ) {}

  async getPunchRules() {
    return this.prisma.punchRule.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'asc' },
    });
  }

  async createPunchRule(dto: any) {
    const { configs, conditions, ...data } = dto;
    return this.prisma.punchRule.create({
      data: {
        ...data,
        code: dto.code || StringUtils.generateCode('PR'),
        configs: JSON.stringify(configs || []),
        conditions: conditions || '{}',
      },
    });
  }

  async updatePunchRule(id: number, dto: any) {
    const { configs, conditions, ...data } = dto;
    return this.prisma.punchRule.update({
      where: { id },
      data: {
        ...data,
        configs: JSON.stringify(configs || []),
        conditions: conditions || '{}',
      },
    });
  }

  async deletePunchRule(id: number) {
    return this.prisma.punchRule.delete({
      where: { id },
    });
  }

  async getCalcRules() {
    return this.prisma.calcRule.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'asc' },
    });
  }

  async createCalcRule(dto: any) {
    return this.prisma.calcRule.create({
      data: {
        ...dto,
        code: dto.code || StringUtils.generateCode('CR'),
      },
    });
  }

  async updateCalcRule(id: number, dto: any) {
    return this.prisma.calcRule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCalcRule(id: number) {
    return this.prisma.calcRule.delete({
      where: { id },
    });
  }

  async calculate(dto: any) {
    const { calcDate, employeeNo } = dto;

    // 转换为 Date 对象
    const date = new Date(calcDate);

    // 如果没有提供 employeeNo，则计算当天所有有排班的员工
    if (!employeeNo) {
      return this.batchCalculate({
        startDate: calcDate,
        endDate: calcDate,
      });
    }

    // 使用计算引擎进行计算
    const calcResult = await this.calculateEngine.calculateDaily(
      employeeNo,
      date,
    );

    // 检查是否已有计算结果，如有则更新，无则创建
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const existing = await this.prisma.calcResult.findFirst({
      where: {
        employeeNo,
        calcDate: dayStart,
      },
    });

    if (existing) {
      return this.prisma.calcResult.update({
        where: { id: existing.id },
        data: {
          ...calcResult,
          calcDate: dayStart,
          status: 'PENDING',
        },
      });
    }

    return this.prisma.calcResult.create({
      data: {
        ...calcResult,
        calcDate: dayStart,
      },
    });
  }

  async batchCalculate(dto: any) {
    const { startDate, endDate, employeeNos } = dto;

    console.log('开始批量计算:', { startDate, endDate, employeeNos });

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('查询时间范围:', { start: start.toISOString(), end: end.toISOString() });

    // 构建删除条件
    const deleteWhere: any = {
      calcDate: {
        gte: start,
        lte: end,
      },
      // 排除间接设备工时记录（这些是分摊产生的，不能删除）
      accountName: {
        not: {
          endsWith: '间接设备',
        },
      },
    };

    // 如果指定了员工，只删除这些员工的结果
    if (employeeNos && employeeNos.length > 0) {
      deleteWhere.employeeNo = { in: employeeNos };
    }

    // 先删除日期范围内的所有已有计算结果
    // 注意：只删除直接计算的工时记录，保留间接设备记录（分摊产生的）
    const deleteResult = await this.prisma.calcResult.deleteMany({
      where: deleteWhere,
    });

    console.log(`已删除 ${deleteResult.count} 条旧的计算结果（不含间接设备记录）`);

    // 构建摆卡结果查询条件
    const punchPairWhere: any = {
      pairDate: {
        gte: start,
        lte: end,
      },
    };

    // 如果指定了员工，只查询这些员工的摆卡结果
    if (employeeNos && employeeNos.length > 0) {
      punchPairWhere.employeeNo = { in: employeeNos };
    }

    // 获取日期范围内的所有摆卡结果
    const punchPairs = await this.prisma.punchPair.findMany({
      where: punchPairWhere,
      include: {
        employee: true,
      },
    });

    console.log(`找到 ${punchPairs.length} 条摆卡结果`);

    if (punchPairs.length === 0) {
      return {
        message: '没有找到需要计算的摆卡数据',
        deletedCount: deleteResult.count,
        successCount: 0,
        failCount: 0,
        totalCount: 0,
      };
    }

    // 使用 attendanceCodeService 的 calculateFromPunchPair 方法计算每个摆卡结果
    let successCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    for (const punchPair of punchPairs) {
      try {
        console.log(`正在计算摆卡 ${punchPair.id}, 员工 ${punchPair.employeeNo}, 日期 ${punchPair.pairDate.toISOString()}`);
        const results = await this.attendanceCodeService.calculateFromPunchPair(punchPair.id);
        successCount++;
        console.log(`摆卡 ${punchPair.id} 计算成功，生成 ${results.length} 条工时记录`);
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '未知错误';
        console.error(
          `计算失败: 摆卡ID ${punchPair.id}, 员工 ${punchPair.employeeNo}, 日期 ${new Date(punchPair.pairDate).toISOString().split('T')[0]}`,
          errorMsg,
        );
        failCount++;
        errors.push({
          punchPairId: punchPair.id,
          employeeNo: punchPair.employeeNo,
          date: punchPair.pairDate,
          error: errorMsg,
        });
      }
    }

    console.log(`批量计算完成: 成功 ${successCount}, 失败 ${failCount}`);

    return {
      message: failCount > 0 ? '批量计算完成，部分失败' : '批量计算完成',
      deletedCount: deleteResult.count,
      successCount,
      failCount,
      totalCount: punchPairs.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async getResults(query: any, user?: any) {
    const { page = 1, pageSize = 10, employeeNo, calcDate, startDate, endDate, includeAllocation = false } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (employeeNo) where.employeeNo = employeeNo;

    // 应用数据权限过滤
    if (user && user.username !== 'admin') {
      const dataScopeFilter = await this.dataScopeService.getResultFilter(user, user.orgId);
      Object.assign(where, dataScopeFilter);
    }

    // 支持单日期或日期范围查询
    if (calcDate) {
      where.calcDate = new Date(calcDate);
    } else if (startDate && endDate) {
      // 设置开始时间为当天的 00:00:00，结束时间为当天的 23:59:59
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      where.calcDate = {
        gte: startDateTime,
        lte: endDateTime,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.calcResult.findMany({
        where,
        skip,
        take: +pageSize,
        include: {
          attendanceCode: true,
          employee: {
            include: {
              org: true,
            },
          },
        },
        orderBy: { calcDate: 'desc' },
      }),
      this.prisma.calcResult.count({ where }),
    ]);

    // 如果需要包含分摊信息，查询AllocationResult表
    let itemsWithAllocation = items;
    if (includeAllocation === 'true' || includeAllocation === true) {
      // 获取所有calcResultIds
      const calcResultIds = items.map(item => item.id).filter(id => id != null);

      if (calcResultIds.length > 0) {
        // 查询相关的分摊结果
        const allocationResults = await this.prisma.allocationResult.findMany({
          where: {
            calcResultId: {
              in: calcResultIds,
            },
            deletedAt: null,
          },
          include: {
            config: {
              select: {
                configName: true,
              },
            },
          },
        });

        // 创建映射：calcResultId -> allocationResults[]
        const allocationMap = new Map<number, any[]>();
        allocationResults.forEach(ar => {
          if (!allocationMap.has(ar.calcResultId)) {
            allocationMap.set(ar.calcResultId, []);
          }
          allocationMap.get(ar.calcResultId)!.push(ar);
        });

        // 为每个工时结果添加分摊信息
        itemsWithAllocation = items.map(item => {
          const allocations = allocationMap.get(item.id) || [];
          return {
            ...item,
            // 标记是否为分摊源数据（有分摊记录）
            isAllocationSource: allocations.length > 0,
            // 添加分摊记录数组
            allocationResults: allocations,
            // 添加分摊总工时
            totalAllocatedHours: allocations.reduce((sum, ar) => sum + (ar.allocatedHours || 0), 0),
          };
        });
      }
    }

    return {
      items: itemsWithAllocation,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getResult(id: number) {
    return this.prisma.calcResult.findUnique({
      where: { id },
    });
  }

  async correctResult(id: number, dto: any) {
    return this.prisma.calcResult.update({
      where: { id },
      data: {
        ...dto,
        status: 'CORRECTED',
      },
    });
  }
}
