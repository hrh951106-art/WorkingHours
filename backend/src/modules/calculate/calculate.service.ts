import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';
import { StringUtils } from '../../common/utils';
import { CalculateEngine } from './calculate.engine';
import { AttendanceCodeService } from './attendance-code.service';
import { WorkHourPushService } from './work-hour-push.service';

@Injectable()
export class CalculateService {
  constructor(
    private prisma: PrismaService,
    private calculateEngine: CalculateEngine,
    private attendanceCodeService: AttendanceCodeService,
    private dataScopeService: DataScopeService,
    private workHourPushService: WorkHourPushService, // ✅ 新增
  ) {}

  async getPunchRules() {
    const rules = await this.prisma.punchRule.findMany({
      where: { status: 'ACTIVE' },
      include: {
        deviceGroupIntervals: true,
      },
      orderBy: { priority: 'asc' },
    });

    // 解析 JSON 配置字段
    return rules.map(rule => ({
      ...rule,
      configs: JSON.parse(rule.configs || '[]'),
      scheduledConfig: rule.scheduledConfig ? JSON.parse(rule.scheduledConfig) : null,
      unscheduledConfig: rule.unscheduledConfig ? JSON.parse(rule.unscheduledConfig) : null,
    }));
  }

  /**
   * 获取员工在指定日期的考勤规则组
   * @param employeeId 员工ID
   * @param targetDate 目标日期
   * @returns 员工的考勤规则组，包含绑定的打卡规则和出勤代码
   */
  async getEmployeeRuleGroup(employeeNo: string, targetDate: Date) {
    // 查询员工在指定日期有效的考勤规则组
    const employeeRuleGroup = await this.prisma.employeeAttendanceRuleGroup.findFirst({
      where: {
        employeeNo,
        effectiveDate: {
          lte: targetDate,
        },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: targetDate } },
        ],
      },
      include: {
        ruleGroup: {
          include: {
            details: true,
          },
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    if (!employeeRuleGroup || !employeeRuleGroup.ruleGroup) {
      return null;
    }

    // 解析出勤代码ID列表
    const detail = employeeRuleGroup.ruleGroup?.details?.[0];
    if (!detail) {
      return {
        ruleGroupId: employeeRuleGroup.ruleGroupId,
        ruleGroupName: employeeRuleGroup.ruleGroupName,
        attendancePunchRule: null,
        leanPunchRule: null,
        attendanceCodeIds: [],
      };
    }

    // 解析 attendanceCodeIds JSON 字符串
    let attendanceCodeIds: number[] = [];
    try {
      const parsed = JSON.parse(detail.attendanceCodeIds || '[]');
      attendanceCodeIds = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('解析 attendanceCodeIds 失败:', e);
      attendanceCodeIds = [];
    }

    // 查询打卡规则（如果配置了）
    let attendancePunchRule = null;
    let leanPunchRule = null;
    if (detail.attendancePunchRuleId) {
      attendancePunchRule = await this.prisma.punchRule.findUnique({
        where: { id: detail.attendancePunchRuleId },
      });
    }
    if (detail.leanPunchRuleId) {
      leanPunchRule = await this.prisma.punchRule.findUnique({
        where: { id: detail.leanPunchRuleId },
      });
    }

    return {
      ruleGroupId: employeeRuleGroup.ruleGroupId,
      ruleGroupName: employeeRuleGroup.ruleGroupName,
      attendancePunchRule,
      leanPunchRule,
      attendanceCodeIds,
    };
  }

  /**
   * 批量获取多个员工的考勤规则组
   * @param employeeIds 员工ID列表
   * @param targetDate 目标日期
   * @returns Map<employeeId, ruleGroup>
   */
  async getBatchEmployeeRuleGroups(employeeIds: string[], targetDate: Date): Promise<Map<string, any>> {
    const ruleGroupMap = new Map<string, any>();

    // 查询所有员工的考勤规则组
    const employeeRuleGroups = await this.prisma.employeeAttendanceRuleGroup.findMany({
      where: {
        employeeNo: { in: employeeIds },
        effectiveDate: { lte: targetDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: targetDate } },
        ],
      },
      include: {
        ruleGroup: {
          include: {
            details: true,
          },
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    // 为每个员工构建规则组映射（只取最新的一个）
    const processedEmployeeIds = new Set<string>();
    for (const erg of employeeRuleGroups) {
      if (processedEmployeeIds.has(erg.employeeNo)) {
        continue;
      }

      processedEmployeeIds.add(erg.employeeNo);

      const detail = erg.ruleGroup?.details?.[0];
      let attendanceCodeIds: number[] = [];
      try {
        const parsed = JSON.parse(detail?.attendanceCodeIds || '[]');
        attendanceCodeIds = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        attendanceCodeIds = [];
      }

      // 查询打卡规则（如果配置了）
      let attendancePunchRule = null;
      let leanPunchRule = null;
      if (detail?.attendancePunchRuleId) {
        attendancePunchRule = await this.prisma.punchRule.findUnique({
          where: { id: detail.attendancePunchRuleId },
        });
      }
      if (detail?.leanPunchRuleId) {
        leanPunchRule = await this.prisma.punchRule.findUnique({
          where: { id: detail.leanPunchRuleId },
        });
      }

      ruleGroupMap.set(erg.employeeNo, {
        ruleGroupId: erg.ruleGroupId,
        ruleGroupName: erg.ruleGroupName,
        attendancePunchRule,
        leanPunchRule,
        attendanceCodeIds,
      });
    }

    return ruleGroupMap;
  }

  async generatePunchRuleCode() {
    // 获取所有现有的打卡规则编码
    const existingRules = await this.prisma.punchRule.findMany({
      select: { code: true },
    });
    const existingCodes = existingRules.map(r => r.code);
    return {
      code: StringUtils.generateSequentialCode('PR', existingCodes),
    };
  }

  async createPunchRule(dto: any) {
    const { configs, conditions, deviceGroupIntervals, scheduledConfig, unscheduledConfig, ...data } = dto;

    // 验证设备组间隔配置
    if (deviceGroupIntervals && deviceGroupIntervals.length > 0) {
      const deviceGroupIds = deviceGroupIntervals.map((item: any) => item.deviceGroupId);
      const uniqueIds = new Set(deviceGroupIds);
      if (uniqueIds.size !== deviceGroupIds.length) {
        throw new Error('同一打卡规则中，一个设备组不能配置多个刷卡间隔');
      }
    }

    try {
      // 如果没有提供code，自动生成序号编码
      let code = dto.code;
      if (!code) {
        // 获取所有现有的打卡规则编码
        const existingRules = await this.prisma.punchRule.findMany({
          select: { code: true },
        });
        const existingCodes = existingRules.map(r => r.code);
        code = StringUtils.generateSequentialCode('PR', existingCodes);
      }

      // 创建打卡规则
      const punchRule = await this.prisma.punchRule.create({
        data: {
          ...data,
          code: code,
          configs: JSON.stringify(configs || []),
          conditions: conditions || '{}',
          // 保存三种类型的配置
          scheduledConfig: scheduledConfig ? JSON.stringify(scheduledConfig) : null,
          unscheduledConfig: unscheduledConfig ? JSON.stringify(unscheduledConfig) : null,
        },
      });

      // 创建设备组间隔配置关联记录
      if (deviceGroupIntervals && deviceGroupIntervals.length > 0) {
        for (const interval of deviceGroupIntervals) {
          // 获取设备组信息
          const deviceGroup = await this.prisma.deviceGroup.findUnique({
            where: { id: interval.deviceGroupId },
          });

          if (!deviceGroup) {
            throw new Error(`设备组ID ${interval.deviceGroupId} 不存在`);
          }

          await this.prisma.punchRuleDeviceGroupInterval.create({
            data: {
              ruleId: punchRule.id,
              deviceGroupId: interval.deviceGroupId,
              deviceGroupCode: deviceGroup.code,
              deviceGroupName: deviceGroup.name,
              beforeShiftMins: interval.beforeShiftMins || 0,
              afterShiftMins: interval.afterShiftMins || 0,
              status: 'ACTIVE',
            },
          });
        }
      }

      // 返回包含设备组间隔配置的完整数据
      return this.getPunchRuleById(punchRule.id);
    } catch (error: any) {
      // 处理 Prisma 唯一约束错误
      if (error.code === 'P2002') {
        // 检查是哪个字段的唯一约束冲突
        const target = error.meta?.target;
        if (target && target.includes('code')) {
          throw new ConflictException(`规则编码 "${dto.code}" 已存在，请使用其他编码`);
        }
        throw new ConflictException('数据冲突，请检查输入');
      }
      throw error;
    }
  }

  async updatePunchRule(id: number, dto: any) {
    const { configs, conditions, deviceGroupIntervals, scheduledConfig, unscheduledConfig, ...data } = dto;

    // 验证设备组间隔配置
    if (deviceGroupIntervals && deviceGroupIntervals.length > 0) {
      const deviceGroupIds = deviceGroupIntervals.map((item: any) => item.deviceGroupId);
      const uniqueIds = new Set(deviceGroupIds);
      if (uniqueIds.size !== deviceGroupIds.length) {
        throw new Error('同一打卡规则中，一个设备组不能配置多个刷卡间隔');
      }
    }

    // 更新打卡规则基本信息
    await this.prisma.punchRule.update({
      where: { id },
      data: {
        ...data,
        configs: configs !== undefined ? JSON.stringify(configs) : undefined,
        conditions: conditions !== undefined ? conditions : undefined,
        // 更新三种类型的配置
        scheduledConfig: scheduledConfig !== undefined ? (scheduledConfig ? JSON.stringify(scheduledConfig) : null) : undefined,
        unscheduledConfig: unscheduledConfig !== undefined ? (unscheduledConfig ? JSON.stringify(unscheduledConfig) : null) : undefined,
      },
    });

    // 处理设备组间隔配置
    if (deviceGroupIntervals !== undefined) {
      // 先删除原有的设备组间隔配置
      await this.prisma.punchRuleDeviceGroupInterval.deleteMany({
        where: { ruleId: id },
      });

      // 创建新的设备组间隔配置
      for (const interval of deviceGroupIntervals) {
        // 获取设备组信息
        const deviceGroup = await this.prisma.deviceGroup.findUnique({
          where: { id: interval.deviceGroupId },
        });

        if (!deviceGroup) {
          throw new Error(`设备组ID ${interval.deviceGroupId} 不存在`);
        }

        await this.prisma.punchRuleDeviceGroupInterval.create({
          data: {
            ruleId: id,
            deviceGroupId: interval.deviceGroupId,
            deviceGroupCode: deviceGroup.code,
            deviceGroupName: deviceGroup.name,
            beforeShiftMins: interval.beforeShiftMins || 0,
            afterShiftMins: interval.afterShiftMins || 0,
            status: 'ACTIVE',
          },
        });
      }
    }

    // 返回包含设备组间隔配置的完整数据
    return this.getPunchRuleById(id);
  }

  async deletePunchRule(id: number) {
    return this.prisma.punchRule.delete({
      where: { id },
    });
  }

  async getPunchRuleById(id: number) {
    const rule = await this.prisma.punchRule.findUnique({
      where: { id },
      include: {
        deviceGroupIntervals: true,
      },
    });

    if (!rule) return null;

    // 解析 JSON 配置字段
    return {
      ...rule,
      configs: JSON.parse(rule.configs || '[]'),
      scheduledConfig: rule.scheduledConfig ? JSON.parse(rule.scheduledConfig) : null,
      unscheduledConfig: rule.unscheduledConfig ? JSON.parse(rule.unscheduledConfig) : null,
    };
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

    let result;

    if (existing) {
      result = await this.prisma.calcResult.update({
        where: { id: existing.id },
        data: {
          ...calcResult,
          calcDate: dayStart,
          status: 'PENDING',
        },
      });
    } else {
      result = await this.prisma.calcResult.create({
        data: {
          ...calcResult,
          calcDate: dayStart,
        },
      });
    }

    // ✅ 自动同步到工时模块
    try {
      console.log('[CalculateService] 准备同步到工时模块, result.id=', result.id);
      await this.workHourPushService.pushWorkHourResults([result.id]);
      console.log('[CalculateService] 同步到工时模块完成');
    } catch (error) {
      console.error('同步到工时模块失败:', error);
      // 不影响主流程，记录错误即可
    }

    return result;
  }

  async batchCalculate(dto: any) {
    const { startDate, endDate, employeeNos } = dto;

    console.log('开始批量计算:', { startDate, endDate, employeeNos });

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('查询时间范围:', { start: start.toISOString(), end: end.toISOString() });

    // ✅ 修改：不要在计算前删除所有旧数据
    // 原因：需要保留其他类型的工时数据（如考勤工时 vs 精益工时）
    // 删除逻辑改为在保存每条结果时通过 upsert 处理
    console.log('跳过计算前的批量删除，改为逐条 upsert 处理');

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
        deletedCount: 0,  // ✅ 不再批量删除
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

    // ✅ 自动推送到工时模块
    // 获取本次批量计算生成的所有 CalcResult ID
    if (successCount > 0) {
      try {
        console.log('[CalculateService] 准备批量推送工时结果到 WorkHourResult');

        // 查询本次计算范围内的所有 CalcResult
        const newCalcResults = await this.prisma.calcResult.findMany({
          where: {
            calcDate: {
              gte: start,
              lte: end,
            },
            ...(employeeNos && employeeNos.length > 0 ? { employeeNo: { in: employeeNos } } : {}),
          },
          select: { id: true },
        });

        const calcResultIds = newCalcResults.map(r => r.id);
        console.log(`[CalculateService] 找到 ${calcResultIds.length} 条计算结果，准备推送...`);

        // 批量推送
        const pushResult = await this.workHourPushService.pushWorkHourResults(calcResultIds);

        console.log(`[CalculateService] 批量推送完成: 成功 ${pushResult.success}, 失败 ${pushResult.failed}, 删除旧数据 ${pushResult.deleted}`);
      } catch (error) {
        console.error('[CalculateService] 批量推送工时结果失败:', error);
        // 不影响主流程，记录错误即可
      }
    }

    return {
      message: failCount > 0 ? '批量计算完成，部分失败' : '批量计算完成',
      deletedCount: 0,  // ✅ 不再批量删除
      successCount,
      failCount,
      totalCount: punchPairs.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async pushWorkHours(calcResultIds: number[]) {
    console.log(`[CalculateService] 手动推送工时结果, 数量: ${calcResultIds.length}`);
    return this.workHourPushService.pushWorkHourResults(calcResultIds);
  }

  async getResults(query: any, user?: any) {
    const { page = 1, pageSize = 10, employeeNo, calcDate, startDate, endDate, includeAllocation = false } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    // ✅ 精益工时结果：排除考勤工时类型（ATTENDANCE_HOURS）
    where.calculationAttendanceCode = {
      type: { not: 'ATTENDANCE_HOURS' },
    };

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
          calculationAttendanceCode: true, // ✅ 使用新的计算出勤代码关系
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
