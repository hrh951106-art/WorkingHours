import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountMergeService } from './account-merge.service';
import { AttendanceCodeService } from '../calculate/attendance-code.service';

@Injectable()
export class PairingService {
  constructor(
    private prisma: PrismaService,
    private accountMergeService: AccountMergeService,
    private attendanceCodeService: AttendanceCodeService,
  ) {}

  /**
   * 为指定日期和员工执行智能摆卡
   * @param employeeNo 员工工号
   * @param pairDate 摆卡日期
   * @param ruleId 打卡规则ID（可选）
   */
  async pairPunches(employeeNo: string, pairDate: Date, ruleId?: number) {
    // 1. 获取员工当天的排班信息
    const dayStart = new Date(pairDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(pairDate);
    dayEnd.setHours(23, 59, 59, 999);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        employee: {
          employeeNo,
        },
        scheduleDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        shift: {
          include: {
            segments: {
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    if (schedules.length === 0) {
      return { message: '当天无排班信息', pairs: [] };
    }

    // 2. 获取打卡规则
    const punchRule = ruleId
      ? await this.prisma.punchRule.findUnique({
          where: { id: ruleId },
        })
      : await this.prisma.punchRule.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { priority: 'asc' },
        });

    if (!punchRule) {
      throw new Error('未找到有效的打卡规则');
    }

    // 3. 获取打卡记录并合并账户
    const punchRecords = await this.getPunchRecordsForPairing(
      employeeNo,
      dayStart,
      dayEnd,
      punchRule,
    );

    if (punchRecords.length === 0) {
      return { message: '无打卡记录', pairs: [] };
    }

    // 4. 批量合并账户
    const mergeResults = await this.accountMergeService.batchMergeAccounts(punchRecords);

    // 更新打卡记录的账户ID，并同步更新内存中的数据
    for (const result of mergeResults) {
      if (result.mergedAccountId) {
        await this.prisma.punchRecord.update({
          where: { id: result.id },
          data: { accountId: result.mergedAccountId },
        });

        // 同步更新内存中的punchRecords数组
        const record = punchRecords.find(r => r.id === result.id);
        if (record) {
          record.accountId = result.mergedAccountId;
        }
      }
    }

    // 5. 为每个班次进行摆卡
    const allPairs = [];

    for (const schedule of schedules) {
      const shift = schedule.shift;

      // 获取该班次时间范围内的打卡记录
      const shiftPunches = await this.getPunchesForShift(
        punchRecords,
        shift,
        schedule.scheduleDate,
        punchRule,
      );

      // 在处理之前，先删除该员工、日期、班次的所有旧摆卡记录（不管 accountId 是什么）
      // 这样可以避免因账户合并导致的重复摆卡记录
      await this.prisma.punchPair.deleteMany({
        where: {
          employeeNo: employeeNo,
          pairDate: schedule.scheduleDate,
          shiftId: schedule.shiftId,
          // 不限制 accountId，删除所有记录
        },
      });

      // 按照账户分组进行摆卡
      const accountGroups = this.groupPunchesByAccount(shiftPunches);

      for (const [accountId, punches] of accountGroups.entries()) {
        // 为每个账户组进行摆卡
        const pairs = await this.createPunchPairsForAccount(
          employeeNo,
          schedule.scheduleDate,
          schedule.shiftId,
          schedule.shift.name,
          punches,
          punchRule,
          accountId,
        );

        allPairs.push(...pairs);
      }
    }

    return {
      message: '摆卡完成',
      pairs: allPairs,
      totalPairs: allPairs.length,
    };
  }

  /**
   * 批量摆卡
   */
  async batchPairPunches(pairDate: Date, employeeNos?: string[]) {
    const dayStart = new Date(pairDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(pairDate);
    dayEnd.setHours(23, 59, 59, 999);

    // 获取需要摆卡的员工列表
    let targetEmployees = employeeNos;
    if (!targetEmployees || targetEmployees.length === 0) {
      // 获取当天有排班的员工
      const schedules = await this.prisma.schedule.findMany({
        where: {
          scheduleDate: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          employee: {
            select: {
              employeeNo: true,
            },
          },
        },
        distinct: ['employeeId'],
      });

      targetEmployees = schedules.map((s) => s.employee.employeeNo);
    }

    const results = [];
    const errors = [];

    for (const employeeNo of targetEmployees) {
      try {
        const result = await this.pairPunches(employeeNo, pairDate);
        results.push({
          employeeNo,
          ...result,
        });
      } catch (error: any) {
        errors.push({
          employeeNo,
          error: error.message,
        });
      }
    }

    return {
      message: '批量摆卡完成',
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors,
    };
  }

  /**
   * 获取用于摆卡的打卡记录
   */
  private async getPunchRecordsForPairing(
    employeeNo: string,
    dayStart: Date,
    dayEnd: Date,
    punchRule: any,
  ) {
    const where: any = {
      employeeNo,
      punchTime: {
        gte: dayStart,
        lte: dayEnd,
      },
    };

    // 解析configs，获取所有配置的设备组ID
    const configs = JSON.parse(punchRule.configs || '[]');
    const deviceGroupIds = configs
      .map((config: any) => config.groupId)
      .filter((id: any) => id != null && id !== undefined && id !== '');

    // 只有当明确配置了有效的设备组ID，并且能找到对应设备时，才进行过滤
    if (deviceGroupIds.length > 0) {
      const devices = await this.prisma.punchDevice
        .findMany({
          where: {
            groupId: { in: deviceGroupIds },
          },
          select: {
            id: true,
          },
        });

      const deviceIds = devices.map((d) => d.id);

      // 只有找到有效设备时才进行过滤
      if (deviceIds.length > 0) {
        where.deviceId = { in: deviceIds };
      }
      // 如果没有找到设备，不过滤，使用所有打卡记录
    }

    return this.prisma.punchRecord.findMany({
      where,
      include: {
        device: true,
        account: true,
      },
      orderBy: { punchTime: 'asc' },
    });
  }

  /**
   * 获取班次时间范围内的打卡记录
   */
  private async getPunchesForShift(
    punchRecords: any[],
    shift: any,
    scheduleDate: Date,
    punchRule: any,
  ) {
    if (!shift.segments || shift.segments.length === 0) {
      return punchRecords;
    }

    // 获取班次的开始和结束时间
    const firstSegment = shift.segments[0];
    const lastSegment = shift.segments[shift.segments.length - 1];

    // 计算班次开始时间
    let shiftStart = new Date(scheduleDate);
    if (firstSegment.startDate === '+0') {
      const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
      shiftStart.setHours(hours, minutes, 0, 0);
    } else {
      shiftStart.setDate(shiftStart.getDate() + 1);
      const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
      shiftStart.setHours(hours, minutes, 0, 0);
    }

    // 计算班次结束时间
    let shiftEnd = new Date(scheduleDate);
    if (lastSegment.endDate === '+0') {
      const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
      shiftEnd.setHours(hours, minutes, 0, 0);
    } else {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
      shiftEnd.setHours(hours, minutes, 0, 0);
    }

    // 应用收卡范围（如果没有配置，默认使用前后各2小时）
    const beforeShiftMins = punchRule.beforeShiftMins ?? 120; // 默认提前2小时
    const afterShiftMins = punchRule.afterShiftMins ?? 120; // 默认延后2小时

    shiftStart = new Date(shiftStart.getTime() - beforeShiftMins * 60 * 1000);
    shiftEnd = new Date(shiftEnd.getTime() + afterShiftMins * 60 * 1000);

    // 筛选在收卡范围内的打卡记录
    return punchRecords.filter((record) => {
      const punchTime = new Date(record.punchTime);
      return punchTime >= shiftStart && punchTime <= shiftEnd;
    });
  }

  /**
   * 按账户分组打卡记录
   */
  private groupPunchesByAccount(punchRecords: any[]): Map<number | null, any[]> {
    const groups = new Map<number | null, any[]>();

    for (const record of punchRecords) {
      const accountId = record.accountId || null;
      if (!groups.has(accountId)) {
        groups.set(accountId, []);
      }
      groups.get(accountId)!.push(record);
    }

    return groups;
  }

  /**
   * 自动识别打卡记录的punchType（未设置的按时间顺序交替识别）
   */
  private autoDeterminePunchType(punchRecords: any[]): any[] {
    const processed = [];
    let currentType = 'IN'; // 从签入开始

    // 按时间排序
    const sorted = [...punchRecords].sort((a, b) =>
      new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime()
    );

    for (const record of sorted) {
      // 如果已经设置了punchType，保持不变
      if (record.punchType && (record.punchType === 'IN' || record.punchType === 'OUT')) {
        processed.push(record);
        // 更新当前类型，使下一个自动识别的类型与当前相反
        currentType = record.punchType === 'IN' ? 'OUT' : 'IN';
      } else {
        // 未设置punchType，根据当前类型自动识别
        processed.push({
          ...record,
          punchType: currentType,
        });
        // 切换类型
        currentType = currentType === 'IN' ? 'OUT' : 'IN';
      }
    }

    return processed;
  }

  /**
   * 为特定账户创建打卡对
   */
  private async createPunchPairsForAccount(
    employeeNo: string,
    pairDate: Date,
    shiftId: number,
    shiftName: string,
    punchRecords: any[],
    punchRule: any,
    accountId: number | null,
  ) {
    const pairs = [];

    // 先处理没有设置punchType的记录，根据时间顺序自动识别
    const processedPunches = this.autoDeterminePunchType(punchRecords);

    // 分离签入和签退记录
    const inPunches = processedPunches.filter((r) => r.punchType === 'IN');
    const outPunches = processedPunches.filter((r) => r.punchType === 'OUT');

    // 按时间排序
    inPunches.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());
    outPunches.sort((a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime());

    // 解析configs，获取第一个配置的摆卡间隔（默认使用第一个）
    const configs = JSON.parse(punchRule.configs || '[]');
    const firstConfig = configs.length > 0 ? configs[0] : null;
    const pairingInterval = firstConfig?.pairingInterval || 0;

    // 获取第一个打卡记录的设备组ID作为sourceGroupId
    const firstPunch = punchRecords[0];
    const sourceGroupId = firstPunch?.device?.groupId || null;

    let outIndex = 0;

    // 配对逻辑
    for (let i = 0; i < inPunches.length; i++) {
      const inPunch = inPunches[i];
      const inTime = new Date(inPunch.punchTime);

      // 查找匹配的签退记录
      let matchedOutPunch = null;

      if (pairingInterval > 0) {
        // 有摆卡间隔：查找在签入时间 + 间隔后的签退
        const earliestOutTime = new Date(inTime.getTime() + pairingInterval * 60 * 1000);

        while (outIndex < outPunches.length) {
          const outPunch = outPunches[outIndex];
          const outTime = new Date(outPunch.punchTime);

          if (outTime >= earliestOutTime) {
            matchedOutPunch = outPunch;
            outIndex++;
            break;
          }

          outIndex++;
        }
      } else {
        // 无摆卡间隔：直接按顺序配对
        if (outIndex < outPunches.length) {
          matchedOutPunch = outPunches[outIndex];
          outIndex++;
        }
      }

      if (matchedOutPunch) {
        // 创建完整配对
        const outTime = new Date(matchedOutPunch.punchTime);
        const workHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);

        const pair = await this.createPunchPair({
          employeeNo,
          pairDate,
          shiftId,
          shiftName,
          inPunchId: inPunch.id,
          outPunchId: matchedOutPunch.id,
          inPunchTime: inTime,
          outPunchTime: outTime,
          workHours: Math.round(workHours * 100) / 100,
          sourceGroupId,
          accountId,
        });

        pairs.push(pair);
      } else {
        // 只有签入卡，创建单卡摆卡
        const pair = await this.createPunchPair({
          employeeNo,
          pairDate,
          shiftId,
          shiftName,
          inPunchId: inPunch.id,
          outPunchId: null, // 单卡
          inPunchTime: inTime,
          outPunchTime: null,
          workHours: 0,
          sourceGroupId,
          accountId,
        });

        pairs.push(pair);
      }
    }

    // 处理剩余的签退卡（只有签退的配对）
    while (outIndex < outPunches.length) {
      const outPunch = outPunches[outIndex];
      const outTime = new Date(outPunch.punchTime);

      const pair = await this.createPunchPair({
        employeeNo,
        pairDate,
        shiftId,
        shiftName,
        inPunchId: null, // 单卡
        outPunchId: outPunch.id,
        inPunchTime: null,
        outPunchTime: outTime,
        workHours: 0,
        sourceGroupId,
        accountId,
      });

      pairs.push(pair);
      outIndex++;
    }

    // 触发工时计算（异步执行，不阻塞摆卡流程）
    for (const pair of pairs) {
      console.log(`触发工时计算 - 摆卡记录ID: ${pair.id}, 员工: ${pair.employeeNo}, 日期: ${pair.pairDate}`);
      this.attendanceCodeService.calculateFromPunchPair(pair.id)
        .then((results) => {
          console.log(`工时计算成功 - 摆卡记录ID: ${pair.id}, 生成 ${results.length} 条结果`);
        })
        .catch((error) => {
          console.error(`工时计算失败 (摆卡记录 ${pair.id}):`, error);
        });
    }

    return pairs;
  }

  /**
   * 创建摆卡记录
   */
  private async createPunchPair(data: any) {
    return this.prisma.punchPair.create({
      data,
      include: {
        inPunch: {
          include: {
            device: true,
            account: true,
          },
        },
        outPunch: {
          include: {
            device: true,
            account: true,
          },
        },
      },
    });
  }

  /**
   * 创建或更新摆卡记录
   */
  private async createOrUpdatePunchPair(data: any) {
    // 先删除该员工、日期、班次、账户的旧摆卡记录
    await this.prisma.punchPair.deleteMany({
      where: {
        employeeNo: data.employeeNo,
        pairDate: data.pairDate,
        shiftId: data.shiftId,
        accountId: data.accountId,
      },
    });

    // 创建新的摆卡记录
    return this.prisma.punchPair.create({
      data,
      include: {
        inPunch: {
          include: {
            device: true,
            account: true,
          },
        },
        outPunch: {
          include: {
            device: true,
            account: true,
          },
        },
      },
    });
  }

  /**
   * 获取摆卡结果
   */
  async getPunchPairs(query: any) {
    const { page = 1, pageSize = 10, employeeNo, pairDate, shiftId, accountId, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (employeeNo) where.employeeNo = employeeNo;

    // 支持单日期或日期范围查询
    if (pairDate) {
      const date = new Date(pairDate);
      where.pairDate = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lte: new Date(date.setHours(23, 59, 59, 999)),
      };
    } else if (startDate && endDate) {
      where.pairDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (shiftId) where.shiftId = +shiftId;
    if (accountId !== undefined) where.accountId = accountId === 'null' ? null : +accountId;

    const [items, total] = await Promise.all([
      this.prisma.punchPair.findMany({
        where,
        skip,
        take: +pageSize,
        include: {
          employee: true,
          account: true,
          inPunch: {
            include: {
              device: true,
              account: true,
            },
          },
          outPunch: {
            include: {
              device: true,
              account: true,
            },
          },
        },
        orderBy: { pairDate: 'desc' },
      }),
      this.prisma.punchPair.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  /**
   * 删除摆卡记录
   */
  async deletePunchPair(id: number) {
    await this.prisma.punchPair.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 处理新打卡记录，触发自动摆卡
   */
  async handleNewPunchRecord(punchRecordId: number) {
    const record = await this.prisma.punchRecord.findUnique({
      where: { id: punchRecordId },
      include: {
        device: true,
        account: true,
      },
    });

    if (!record) {
      throw new Error('打卡记录不存在');
    }

    // 获取打卡日期
    const punchDate = new Date(record.punchTime);
    punchDate.setHours(0, 0, 0, 0);

    // 重新执行摆卡
    const result = await this.pairPunches(record.employeeNo, punchDate);

    return {
      message: '新打卡记录已处理，摆卡已更新',
      punchRecord: record,
      pairingResult: result,
    };
  }

  /**
   * 修改摆卡记录时间
   */
  async updatePunchPair(id: number, dto: { inPunchTime?: string; outPunchTime?: string }) {
    const punchPair = await this.prisma.punchPair.findUnique({
      where: { id },
      include: {
        inPunch: true,
        outPunch: true,
      },
    });

    if (!punchPair) {
      throw new Error('摆卡记录不存在');
    }

    const updateData: any = {};
    let needRecalculate = false;

    // 更新签入时间
    if (dto.inPunchTime && punchPair.inPunch) {
      await this.prisma.punchRecord.update({
        where: { id: punchPair.inPunchId! },
        data: { punchTime: new Date(dto.inPunchTime) },
      });
      updateData.inPunchTime = new Date(dto.inPunchTime);
      needRecalculate = true;
    }

    // 更新签出时间
    if (dto.outPunchTime && punchPair.outPunch) {
      await this.prisma.punchRecord.update({
        where: { id: punchPair.outPunchId! },
        data: { punchTime: new Date(dto.outPunchTime) },
      });
      updateData.outPunchTime = new Date(dto.outPunchTime);
      needRecalculate = true;
    }

    // 重新计算工时
    if (needRecalculate && updateData.inPunchTime && updateData.outPunchTime) {
      const workHours =
        (updateData.outPunchTime.getTime() - updateData.inPunchTime.getTime()) / (1000 * 60 * 60);
      updateData.workHours = Math.round(workHours * 100) / 100;
    }

    // 更新摆卡记录
    await this.prisma.punchPair.update({
      where: { id },
      data: updateData,
    });

    // 重新触发工时计算
    if (needRecalculate) {
      this.attendanceCodeService.calculateFromPunchPair(id).catch((error) => {
        console.error(`工时计算失败 (摆卡记录 ${id}):`, error);
      });
    }

    return {
      message: '修改成功',
      punchPair: await this.prisma.punchPair.findUnique({
        where: { id },
        include: {
          inPunch: { include: { device: true, account: true } },
          outPunch: { include: { device: true, account: true } },
          account: true,
        },
      }),
    };
  }

  /**
   * 补卡
   */
  async supplementPunchPair(dto: {
    employeeNo: string;
    pairDate: string;
    shiftId: number;
    inPunchTime: string;
    outPunchTime?: string;
    reason: string;
    accountId?: number;
  }) {
    const { employeeNo, pairDate, shiftId, inPunchTime, outPunchTime, reason, accountId } = dto;

    // 获取班次信息
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new Error('班次不存在');
    }

    // 创建签入打卡记录
    const inPunch = await this.prisma.punchRecord.create({
      data: {
        employeeNo,
        punchTime: new Date(inPunchTime),
        deviceId: null, // 补卡没有设备ID
        punchType: 'IN',
        source: 'MANUAL_SUPPLEMENT',
        accountId: accountId || null,
      },
    });

    // 如果有签出时间，创建签出记录
    let outPunch = null;
    if (outPunchTime) {
      outPunch = await this.prisma.punchRecord.create({
        data: {
          employeeNo,
          punchTime: new Date(outPunchTime),
          deviceId: null,
          punchType: 'OUT',
          source: 'MANUAL_SUPPLEMENT',
          accountId: accountId || null,
        },
      });
    }

    // 计算工时
    let workHours = 0;
    if (outPunch) {
      workHours =
        (new Date(outPunchTime).getTime() - new Date(inPunchTime).getTime()) / (1000 * 60 * 60);
      workHours = Math.round(workHours * 100) / 100;
    }

    // 创建摆卡记录
    const punchPair = await this.prisma.punchPair.create({
      data: {
        employeeNo,
        pairDate: new Date(pairDate),
        shiftId,
        shiftName: shift.name,
        inPunchId: inPunch.id,
        outPunchId: outPunch?.id,
        inPunchTime: new Date(inPunchTime),
        outPunchTime: outPunchTime ? new Date(outPunchTime) : null,
        workHours,
        accountId: accountId || null,
      },
      include: {
        inPunch: { include: { device: true, account: true } },
        outPunch: { include: { device: true, account: true } },
        account: true,
      },
    });

    // 触发工时计算（与摆卡逻辑保持一致）
    console.log(`触发工时计算 - 补卡摆卡记录ID: ${punchPair.id}, 员工: ${punchPair.employeeNo}, 日期: ${punchPair.pairDate}`);
    this.attendanceCodeService.calculateFromPunchPair(punchPair.id)
      .then((results) => {
        console.log(`工时计算成功 - 补卡摆卡记录ID: ${punchPair.id}, 生成 ${results.length} 条结果`);
      })
      .catch((error) => {
        console.error(`工时计算失败 (补卡摆卡记录 ${punchPair.id}):`, error);
      });

    return {
      message: '补卡成功',
      punchPair,
    };
  }
}
