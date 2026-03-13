import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';

@Injectable()
export class AttendanceCodeService {
  constructor(private prisma: PrismaService) {}

  async getAttendanceCodes() {
    return this.prisma.attendanceCode.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  async getAttendanceCode(id: number) {
    const code = await this.prisma.attendanceCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new NotFoundException('出勤代码不存在');
    }

    return code;
  }

  async createAttendanceCode(dto: any) {
    const { accountLevels, ...rest } = dto;

    // 验证参数
    if (rest.includeOutside && rest.onlyOutside) {
      throw new BadRequestException('包含班外时数和仅计算班外时数不能同时开启');
    }

    // 处理accountLevels：如果是字符串则直接使用，如果是数组则序列化
    let accountLevelsStr = '[]';
    if (accountLevels) {
      if (typeof accountLevels === 'string') {
        accountLevelsStr = accountLevels;
      } else {
        accountLevelsStr = JSON.stringify(accountLevels);
      }
    }

    return this.prisma.attendanceCode.create({
      data: {
        ...rest,
        code: rest.code || StringUtils.generateCode('AC'),
        accountLevels: accountLevelsStr,
      },
    });
  }

  async updateAttendanceCode(id: number, dto: any) {
    const existing = await this.prisma.attendanceCode.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('出勤代码不存在');
    }

    const { accountLevels, ...rest } = dto;

    // 验证参数
    if (rest.includeOutside && rest.onlyOutside) {
      throw new BadRequestException('包含班外时数和仅计算班外时数不能同时开启');
    }

    // 处理accountLevels：如果是字符串则直接使用，如果是数组则序列化
    let accountLevelsData = undefined;
    if (accountLevels !== undefined) {
      if (typeof accountLevels === 'string') {
        accountLevelsData = accountLevels;
      } else {
        accountLevelsData = JSON.stringify(accountLevels);
      }
    }

    return this.prisma.attendanceCode.update({
      where: { id },
      data: {
        ...rest,
        ...(accountLevelsData !== undefined && { accountLevels: accountLevelsData }),
      },
    });
  }

  async deleteAttendanceCode(id: number) {
    await this.prisma.attendanceCode.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: '删除成功' };
  }

  /**
   * 根据摆卡结果计算工时并保存到数据库
   */
  async calculateFromPunchPair(punchPairId: number) {
    // 获取摆卡结果
    const punchPair = await this.prisma.punchPair.findUnique({
      where: { id: punchPairId },
      include: {
        inPunch: {
          include: {
            device: true,
          },
        },
        outPunch: {
          include: {
            device: true,
          },
        },
        account: true,
      },
    });

    if (!punchPair) {
      throw new NotFoundException('摆卡结果不存在');
    }

    // 获取班次信息
    const shift = await this.prisma.shift.findUnique({
      where: { id: punchPair.shiftId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('班次不存在');
    }

    // 获取有效的出勤代码（按优先级排序），只获取允许计算工时的代码
    const attendanceCodes = await this.prisma.attendanceCode.findMany({
      where: {
        status: 'ACTIVE',
        calculateHours: true, // 只获取允许计算工时的出勤代码
      },
      orderBy: { priority: 'asc' },
    });

    if (attendanceCodes.length === 0) {
      throw new BadRequestException('未找到有效的出勤代码');
    }

    // 计算每个出勤代码的工时并保存
    const results = [];
    for (const code of attendanceCodes) {
      const hours = await this.calculateHoursForCode(punchPair, shift, code);

      // 只保存有工时的结果（actualHours > 0）
      if (hours.actualHours > 0) {
        // 获取账户信息
        let accountId = null;
        let accountName = null;
        if (punchPair.accountId) {
          accountId = punchPair.accountId;
          const account = await this.prisma.laborAccount.findUnique({
            where: { id: punchPair.accountId },
            select: { namePath: true },
          });
          accountName = account?.namePath || null;
        }

        // 检查是否已存在相同的计算结果（使用打卡时间来区分不同的摆卡）
        const existing = await this.prisma.calcResult.findFirst({
          where: {
            employeeNo: punchPair.employeeNo,
            calcDate: punchPair.pairDate,
            shiftId: punchPair.shiftId,
            attendanceCodeId: code.id,
            accountId: accountId,
            punchInTime: hours.adjustedInTime || punchPair.inPunchTime,
            punchOutTime: hours.adjustedOutTime || punchPair.outPunchTime,
          },
        });

        if (existing) {
          // 已存在，更新
          await this.prisma.calcResult.update({
            where: { id: existing.id },
            data: {
              actualHours: hours.actualHours,
              standardHours: hours.standardHours,
            },
          });
          results.push({
            id: existing.id,
            attendanceCodeId: code.id,
            attendanceCodeName: code.name,
            accountId: accountId,
            accountName: accountName,
            ...hours,
          });
        } else {
          // 不存在，创建新的
          const result = await this.prisma.calcResult.create({
            data: {
              employeeNo: punchPair.employeeNo,
              calcDate: punchPair.pairDate,
              shiftId: punchPair.shiftId,
              shiftName: punchPair.shiftName,
              attendanceCodeId: code.id,
              punchInTime: hours.adjustedInTime || punchPair.inPunchTime,
              punchOutTime: hours.adjustedOutTime || punchPair.outPunchTime,
              standardHours: hours.standardHours,
              actualHours: hours.actualHours,
              overtimeHours: 0,
              leaveHours: 0,
              absenceHours: 0,
              accountId: accountId,
              accountName: accountName,
              status: 'COMPLETED',
            },
          });

          results.push({
            id: result.id,
            attendanceCodeId: code.id,
            attendanceCodeName: code.name,
            accountId: accountId,
            accountName: accountName,
            ...hours,
          });
        }
      }
    }

    return results;
  }

  /**
   * 为特定的出勤代码计算工时
   */
  private async calculateHoursForCode(punchPair: any, shift: any, code: any) {
    const inTime = punchPair.inPunchTime ? new Date(punchPair.inPunchTime) : null;
    const outTime = punchPair.outPunchTime ? new Date(punchPair.outPunchTime) : null;

    if (!inTime || !outTime) {
      // 单卡摆卡，不计算工时
      return {
        actualHours: 0,
        standardHours: 0,
      };
    }

    // 解析账户层级
    const accountLevels = JSON.parse(code.accountLevels || '[]');

    // 检查账户是否匹配
    if (accountLevels.length > 0 && punchPair.accountId) {
      const account = await this.prisma.laborAccount.findUnique({
        where: { id: punchPair.accountId },
        select: {
          id: true,
          level: true,
          path: true,
          hierarchyValues: true,
          namePath: true,
        },
      });

      if (account && !this.isAccountMatch(account, accountLevels)) {
        // 账户不匹配，不计算工时
        console.log(`账户不匹配: punchPairId=${punchPair.id}, accountId=${account.id}, accountName=${account.namePath}, code=${code.name}, accountLevels=${accountLevels.join(',')}`);
        return {
          actualHours: 0,
          standardHours: 0,
        };
      }
    }

    // 计算班次时间（传入排班日期作为基准）
    const shiftTime = this.calculateShiftTime(shift, punchPair.pairDate);

    // 计算工时
    let actualHours = 0;
    let standardHours = 0;

    // 修正后的时间（用于显示）
    let adjustedInTime = inTime;
    let adjustedOutTime = outTime;

    if (code.onlyOutside) {
      // 仅计算班外时数，需要修正时间为班外时间段
      actualHours = this.calculateOutsideHours(inTime, outTime, shiftTime.start, shiftTime.end);

      // 修正显示时间为班外时间段
      // 判断有哪些班外时间段
      const hasBeforeShift = inTime < shiftTime.start;
      const hasAfterShift = outTime > shiftTime.end;

      if (hasBeforeShift && hasAfterShift) {
        // 同时有班前和班后时间
        // 计算班前工时和班后工时
        const beforeHours = (shiftTime.start.getTime() - inTime.getTime()) / (1000 * 60 * 60);
        const afterHours = (outTime.getTime() - shiftTime.end.getTime()) / (1000 * 60 * 60);

        if (beforeHours >= afterHours) {
          // 优先显示班前时间
          adjustedInTime = inTime;
          adjustedOutTime = shiftTime.start;
        } else {
          // 优先显示班后时间
          adjustedInTime = shiftTime.end;
          adjustedOutTime = outTime;
        }
      } else if (hasBeforeShift) {
        // 只有班前时间：打卡开始 ~ 班次开始
        adjustedInTime = inTime;
        adjustedOutTime = shiftTime.start;
      } else if (hasAfterShift) {
        // 只有班后时间：班次结束 ~ 打卡结束
        adjustedInTime = shiftTime.end;
        adjustedOutTime = outTime;
      } else {
        // 没有班外时间，不应该计算到这里（actualHours应该是0）
        adjustedInTime = inTime;
        adjustedOutTime = outTime;
      }
    } else if (code.includeOutside) {
      // 包含班外时数，直接计算打卡时间差，不修正时间
      actualHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
      // adjustedInTime 和 adjustedOutTime 保持原始打卡时间
    } else {
      // 不包含班外时数，取与班次时间的交集，并修正时间
      actualHours = this.calculateIntersectionHours(
        inTime,
        outTime,
        shiftTime.start,
        shiftTime.end
      );

      // 修正显示时间：
      // 如果打卡开始时间在班次开始前，开始时间应该取班次开始
      if (inTime < shiftTime.start) {
        adjustedInTime = shiftTime.start;
      }
      // 如果打卡结束时间在班次结束后，结束时间应该取班次结束
      if (outTime > shiftTime.end) {
        adjustedOutTime = shiftTime.end;
      }
      // 如果打卡时间完全在班次内，保持原始时间
    }

    // 扣用餐时间
    if (code.deductMeal && shift.breakHours > 0) {
      // 如果实际工时大于班次标准工时，扣除用餐时间
      if (actualHours > shift.standardHours) {
        actualHours -= shift.breakHours;
      }
    }

    // 保留2位小数
    actualHours = Math.round(actualHours * 100) / 100;
    standardHours = shift.standardHours;

    // 转换单位
    if (code.unit === 'MINUTES') {
      actualHours = Math.round(actualHours * 60);
      standardHours = Math.round(standardHours * 60);
    }

    return {
      actualHours,
      standardHours,
      adjustedInTime,
      adjustedOutTime,
    };
  }

  /**
   * 计算班次时间（开始和结束时间）
   */
  private calculateShiftTime(shift: any, baseDate?: Date) {
    if (!shift.segments || shift.segments.length === 0) {
      return { start: null, end: null };
    }

    const firstSegment = shift.segments[0];
    const lastSegment = shift.segments[shift.segments.length - 1];

    // 使用传入的基准日期，如果没有则使用当前日期
    const today = baseDate ? new Date(baseDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    const [startHours, startMinutes] = firstSegment.startTime.split(':').map(Number);
    start.setHours(startHours, startMinutes, 0, 0);

    const end = new Date(today);
    const [endHours, endMinutes] = lastSegment.endTime.split(':').map(Number);
    end.setHours(endHours, endMinutes, 0, 0);

    return { start, end };
  }

  /**
   * 计算班外时数
   */
  private calculateOutsideHours(inTime: Date, outTime: Date, shiftStart: Date, shiftEnd: Date) {
    let outsideHours = 0;

    // 班前时间
    if (inTime < shiftStart) {
      const endBeforeShift = outTime < shiftStart ? outTime : shiftStart;
      outsideHours += (endBeforeShift.getTime() - inTime.getTime()) / (1000 * 60 * 60);
    }

    // 班后时间
    if (outTime > shiftEnd) {
      const startAfterShift = inTime > shiftEnd ? inTime : shiftEnd;
      outsideHours += (outTime.getTime() - startAfterShift.getTime()) / (1000 * 60 * 60);
    }

    return outsideHours;
  }

  /**
   * 计算与班次时间的交集
   */
  private calculateIntersectionHours(inTime: Date, outTime: Date, shiftStart: Date, shiftEnd: Date) {
    // 取时间范围的交集
    const effectiveStart = inTime > shiftStart ? inTime : shiftStart;
    const effectiveEnd = outTime < shiftEnd ? outTime : shiftEnd;

    if (effectiveStart >= effectiveEnd) {
      // 没有交集
      return 0;
    }

    return (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
  }

  /**
   * 检查账户是否匹配
   * accountLevels 存储的是层级配置的 sort 值，需要转换为 level 值进行比较
   * sort 值与 level 的对应关系：sort + 1 = level
   * 例如：sort=0(工厂) → level=1, sort=1(车间) → level=2
   *
   * 匹配规则：
   * 1. 配置了哪些层级，这些层级都必须有值
   * 2. 账户的组织层级应该等于配置中的最大组织层级
   *    - 工厂工时[0,6]：只匹配组织层级=1的账户（只到工厂）
   *    - 车间工时[0,1,6]：只匹配组织层级=2的账户（只到车间）
   *    - 线体工时[0,1,2,6]：只匹配组织层级=3的账户（只到线体）
   */
  private isAccountMatch(account: any, accountLevels: any[]): boolean {
    // 解析 hierarchyValues，这是一个 JSON 数组，包含所有层级的配置
    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

    // 找出账户的组织层级（连续的ORG_TYPE层级）
    let accountOrgLevel = 0;
    for (const hv of hierarchyValues) {
      if (hv.mappingType === 'ORG_TYPE' && hv.selectedValue) {
        accountOrgLevel = hv.level;
      } else if (hv.mappingType === 'ORG_TYPE' && !hv.selectedValue) {
        // 遇到组织层级但没有值，停止
        break;
      }
    }

    // 找出配置中的组织层级（连续的level<=3的层级）
    const configOrgLevels = accountLevels.map(s => s + 1).filter(l => l <= 3);
    const maxConfigOrgLevel = configOrgLevels.length > 0 ? Math.max(...configOrgLevels) : 0;

    // 检查配置的每个层级是否都有值
    for (const sortValue of accountLevels) {
      const level = sortValue + 1; // sort 转换为 level（从1开始）

      // 在 hierarchyValues 数组中找到对应的层级配置
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

      // 如果找不到层级配置，或者 selectedValue 为空，则不匹配
      if (!levelConfig || !levelConfig.selectedValue) {
        return false;
      }
    }

    // 检查账户的组织层级是否等于配置的最大组织层级
    if (maxConfigOrgLevel > 0 && accountOrgLevel !== maxConfigOrgLevel) {
      console.log(`账户不匹配: accountId=${account.id}, accountOrgLevel=${accountOrgLevel}, maxConfigOrgLevel=${maxConfigOrgLevel}`);
      return false;
    }

    return true;
  }
}
