import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { AmountCalculateService } from '../amount/amount-calculate.service';

@Injectable()
export class WorkHourPushService {
  private readonly logger = new Logger(WorkHourPushService.name);

  constructor(
    private prisma: PrismaService,
    private amountCalculateService: AmountCalculateService,
  ) {}

  /**
   * 推送工时结果到工时模块（全量更新，按类型区分）
   * @param calcResultIds 工时计算结果ID列表
   *
   * 数据流程：
   * 1. 计算模块 -> CalcResult（使用 CalculationAttendanceCode）
   * 2. 通过 DefinitionAttendanceCode.calcAttendanceCode 映射
   * 3. 推送到 WorkHourResult（使用 DefinitionAttendanceCode）
   *
   * 工时类型区分：
   * - LEAN_HOURS（精益工时）-> source = 1
   * - ATTENDANCE_HOURS（考勤工时）-> source = 2
   *
   * 全量更新逻辑（按类型）：
   * 1. 为每次推送生成唯一批次ID
   * 2. 根据本次计算涉及的工时类型，只删除对应类型的旧数据
   *    - 如果只计算考勤工时，只删除 source=2 的数据，不影响精益工时(source=1)
   *    - 如果只计算精益工时，只删除 source=1 的数据，不影响考勤工时(source=2)
   *    - 如果两种都计算，则删除 source in [1,2] 的数据
   * 3. 插入新数据，使用相同批次ID
   *
   * 注意：按类型全量更新，确保不同类型的工时数据互不影响
   */
  async pushWorkHourResults(calcResultIds: number[]) {
    console.log(`[WorkHourPushService] 开始推送工时结果，数量: ${calcResultIds.length}`);
    this.logger.log(`开始推送工时结果，数量: ${calcResultIds.length}`);

    // ✅ 生成唯一批次ID（用于标识本次推送）
    const sourceBatchId = `BATCH-${Date.now()}-${uuidv4().substring(0, 8)}`;
    this.logger.log(`推送批次ID: ${sourceBatchId}`);

    try {
      // 1. 获取工时计算结果（包含计算出勤代码关联）
      const calcResults = await this.prisma.calcResult.findMany({
        where: { id: { in: calcResultIds } },
        include: {
          calculationAttendanceCode: true,
        },
      });

      if (calcResults.length === 0) {
        this.logger.warn('未找到工时计算结果');
        return { success: 0, failed: 0, errors: [], deleted: 0 };
      }

      // 2. 获取定义出勤代码映射关系
      const definitionCodes = await this.prisma.definitionAttendanceCode.findMany({
        where: {
          calcAttendanceCode: { not: null },
          status: 'ACTIVE',
        },
      });

      // 创建映射关系：计算代码 -> 定义代码信息
      const codeMapping = new Map<string, { id: number; code: string; name: string }>();
      definitionCodes.forEach((code) => {
        if (code.calcAttendanceCode) {
          codeMapping.set(code.calcAttendanceCode, {
            id: code.id,
            code: code.code,
            name: code.name,
          });
        }
      });

      this.logger.log(`出勤代码映射关系数量: ${codeMapping.size}`);

      // 3. ✅ 按员工和日期分组，先删除旧数据，再插入新数据
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
        deleted: 0, // ✅ 新增：记录删除的旧数据数量
      };

      // 按员工+日期分组
      const employeeDateGroups = new Map<string, typeof calcResults>();
      calcResults.forEach(result => {
        // ✅ 使用 UTC 日期字符串进行分组（避免时区问题）
        const dateStr = result.calcDate.toISOString().split('T')[0];
        const key = `${result.employeeNo}_${dateStr}`;
        if (!employeeDateGroups.has(key)) {
          employeeDateGroups.set(key, []);
        }
        employeeDateGroups.get(key)!.push(result);
      });

      this.logger.log(`分组数量: ${employeeDateGroups.size}`);

      // 对每个分组进行处理
      for (const [groupKey, groupCalcResults] of employeeDateGroups.entries()) {
        const [employeeNo, dateStr] = groupKey.split('_');

        try {
          // 使用事务处理：删除旧数据 + 插入新数据
          await this.prisma.$transaction(async (tx) => {
            // ✅ 步骤1: 确定本次计算涉及的工时类型，只删除对应类型的数据
            const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
            const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

            // 统计本次计算涉及的类型
            const involvedTypes = new Set<number>();
            groupCalcResults.forEach(result => {
              const calcAttendanceCode = result.calculationAttendanceCode;
              if (calcAttendanceCode) {
                // ATTENDANCE_HOURS -> source=2, LEAN_HOURS -> source=1
                const source = calcAttendanceCode.type === 'ATTENDANCE_HOURS' ? 2 : 1;
                involvedTypes.add(source);
              }
            });

            const involvedTypesText = Array.from(involvedTypes)
              .map(s => s === 1 ? '精益工时(source=1)' : '考勤工时(source=2)')
              .join(', ');

            console.log(`[WorkHourPushService] 员工 ${employeeNo} 日期 ${dateStr} 涉及的工时类型: ${involvedTypesText}`);

            // ✅ 只删除本次涉及的 CalcResult ID 对应的旧数据（避免误删其他 CalcResult 的工时结果）
            const currentCalcResultIds = groupCalcResults.map(r => r.id);
            const deleteResult = await tx.workHourResult.deleteMany({
              where: {
                employeeNo: employeeNo,
                calcDate: {
                  gte: dayStart,
                  lte: dayEnd,
                },
                sourceType: {
                  in: Array.from(involvedTypes).map(s => s === 1 ? 'LEAN' : 'ATTENDANCE'), // ✅ 只删除本次涉及的类型
                },
                sourceId: {
                  in: currentCalcResultIds, // ✅ 只删除本次要推送的 CalcResult ID 对应的旧数据
                },
              },
            });

            console.log(`[WorkHourPushService] 删除结果: count=${deleteResult.count}, 类型: ${involvedTypesText}, CalcResult IDs: [${currentCalcResultIds.join(', ')}]`);

            if (deleteResult.count > 0) {
              this.logger.log(
                `删除员工 ${employeeNo} 日期 ${dateStr} 的旧数据 (${involvedTypesText}): ${deleteResult.count} 条`,
              );
              results.deleted += deleteResult.count;
            }

            // ✅ 步骤2: 插入新数据
            for (const calcResult of groupCalcResults) {
              const calcAttendanceCode = calcResult.calculationAttendanceCode;

              if (!calcAttendanceCode) {
                this.logger.warn(`工时结果 ${calcResult.id} 缺少计算出勤代码，跳过`);
                results.failed++;
                results.errors.push(`工时结果 ${calcResult.id} 缺少计算出勤代码`);
                continue;
              }

              const mappedCodeInfo = codeMapping.get(calcAttendanceCode.code);

              if (!mappedCodeInfo) {
                this.logger.warn(
                  `计算出勤代码 ${calcAttendanceCode.code} 未配置映射关系，跳过`,
                );
                results.failed++;
                results.errors.push(
                  `计算出勤代码 ${calcAttendanceCode.code} 未配置映射关系`,
                );
                continue;
              }

              // ✅ 根据计算出勤代码类型确定 source 值
              // LEAN_HOURS(精益工时) -> source = 1
              // ATTENDANCE_HOURS(考勤工时) -> source = 2
              const workHourSource = calcAttendanceCode.type === 'ATTENDANCE_HOURS' ? 2 : 1;
              const workHourTypeText = calcAttendanceCode.type === 'ATTENDANCE_HOURS' ? '考勤工时' : '精益工时';

              // ✅ 计算金额（如果出勤代码启用了金额计算）
              let amount = 0;
              if (calcAttendanceCode.calculateHours) {
                if (calcAttendanceCode.type === 'LEAN_HOURS') {
                  // 对于精益工时，需要重新计算金额（可能使用不同的规则）
                  // 尝试解析accountHours，支持多账户计算
                  let accountHours = [];
                  try {
                    accountHours = JSON.parse(calcResult.accountHours || '[]');
                  } catch (e) {
                    accountHours = [];
                  }

                  if (accountHours.length > 0) {
                    // 使用多账户金额计算
                    amount = await this.amountCalculateService.calculateAmountForAccountByNo({
                      employeeNo: calcResult.employeeNo,
                      attendanceCode: calcAttendanceCode.code,
                      accountHours,
                      calcDate: calcResult.calcDate,
                    });
                  } else {
                    // 没有账户信息，使用总工时计算
                    amount = await this.amountCalculateService.calculateAmountByNo({
                      employeeNo: calcResult.employeeNo,
                      workHours: calcResult.actualHours,
                      attendanceCode: calcAttendanceCode.code,
                      accountPath: calcResult.accountName || '',
                      calcDate: calcResult.calcDate,
                    });
                  }
                } else {
                  // 对于考勤工时，直接使用CalcResult中已计算的金额
                  amount = calcResult.amount || 0;
                }
              }

              // 创建工时结果
              await tx.workHourResult.create({
                data: {
                  employeeNo: calcResult.employeeNo,
                  workDate: calcResult.calcDate,  // ✅ 添加必需的 workDate 字段
                  calcDate: calcResult.calcDate,
                  shiftId: calcResult.shiftId,
                  shiftName: calcResult.shiftName,
                  startTime: calcResult.punchInTime,   // ✅ 新增：开始时间
                  endTime: calcResult.punchOutTime,     // ✅ 新增：结束时间
                  // ✅ 使用新的定义出勤代码关联
                  definitionAttendanceCodeId: mappedCodeInfo.id,
                  definitionAttendanceCodeStr: mappedCodeInfo.code,
                  attendanceCode: calcAttendanceCode.code,
                  attendanceCodeName: calcAttendanceCode.name,
                  workHours: calcResult.actualHours,
                  amount: Math.round(amount * 100) / 100, // ✅ 新增：金额字段
                  sourceType: workHourSource === 1 ? 'LEAN' : 'ATTENDANCE', // ✅ 根据类型设置
                  sourceId: calcResult.id,
                  accountId: calcResult.accountId,
                  accountName: calcResult.accountName,
                  accountPath: calcResult.accountPath, // ✅ 新增：账户路径
                  status: 'CONFIRMED',
                },
              });

              results.success++;
              this.logger.debug(
                `成功推送工时结果: ${calcResult.employeeNo} - ${dateStr} - ${mappedCodeInfo.code} ` +
                `[计算代码: ${calcAttendanceCode.code}, 类型: ${workHourTypeText}, source: ${workHourSource}]`,
              );
            }
          });

          this.logger.log(
            `成功处理员工 ${employeeNo} 日期 ${dateStr} 的工时数据`,
          );
        } catch (error) {
          results.failed += groupCalcResults.length;
          results.errors.push(
            `处理 ${employeeNo} ${dateStr} 失败: ${error.message}`,
          );
          this.logger.error(
            `推送工时结果失败: ${employeeNo} ${dateStr}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `工时结果推送完成 - 成功: ${results.success}, 失败: ${results.failed}, 删除旧数据: ${results.deleted}`,
      );

      return results;
    } catch (error) {
      this.logger.error('推送工时结果失败', error.stack);
      throw error;
    }
  }

  /**
   * 批量推送指定日期范围的工时结果
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param employeeNos 员工工号列表（可选）
   */
  async pushWorkHourResultsByDateRange(
    startDate: Date,
    endDate: Date,
    employeeNos?: string[],
  ) {
    this.logger.log(
      `按日期范围推送工时结果: ${startDate.toISOString()} - ${endDate.toISOString()}`,
    );

    // 查询符合条件的工时计算结果
    const where: any = {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (employeeNos && employeeNos.length > 0) {
      where.employeeNo = { in: employeeNos };
    }

    const calcResults = await this.prisma.calcResult.findMany({
      where,
      select: { id: true },
    });

    const calcResultIds = calcResults.map((r) => r.id);

    return this.pushWorkHourResults(calcResultIds);
  }
}
