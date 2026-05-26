import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * 考勤规则组辅助服务
 * 负责获取员工在指定日期的有效考勤规则组配置
 */
@Injectable()
export class AttendanceRuleGroupHelper {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取员工在指定日期的有效考勤规则组
   * @param employeeNo 员工工号
   * @param targetDate 目标日期
   * @returns 考勤规则组详情，如果未找到则返回 null
   */
  async getActiveRuleGroupForDate(employeeNo: string, targetDate: Date) {
    // 规范化目标日期为当天的0点0分0秒
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // 查找员工在指定日期有效的考勤规则组
    const employeeRuleGroup = await this.prisma.employeeAttendanceRuleGroup.findFirst({
      where: {
        employeeNo,
        effectiveDate: {
          lte: normalizedDate,
        },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: normalizedDate } },
        ],
      },
      orderBy: {
        effectiveDate: 'desc', // 取最新的配置
      },
      include: {
        ruleGroup: {
          include: {
            details: true,
          },
        },
      },
    });

    if (!employeeRuleGroup) {
      return null;
    }

    // 如果规则组被删除或停用，返回null
    if (employeeRuleGroup.ruleGroup.deletedAt || employeeRuleGroup.ruleGroup.status !== 'ACTIVE') {
      return null;
    }

    return employeeRuleGroup.ruleGroup;
  }

  /**
   * 批量获取多个员工在指定日期的有效考勤规则组
   * @param employeeNos 员工工号列表
   * @param targetDate 目标日期
   * @returns Map<employeeNo, ruleGroup>
   */
  async getActiveRuleGroupsForDate(employeeNos: string[], targetDate: Date) {
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const employeeRuleGroups = await this.prisma.employeeAttendanceRuleGroup.findMany({
      where: {
        employeeNo: { in: employeeNos },
        effectiveDate: { lte: normalizedDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: normalizedDate } },
        ],
      },
      orderBy: {
        effectiveDate: 'desc',
      },
      include: {
        ruleGroup: {
          include: {
            details: true,
          },
        },
      },
    });

    // 构建返回结果
    const result = new Map<string, any>();

    for (const erg of employeeRuleGroups) {
      // 跳过已删除或停用的规则组
      if (erg.ruleGroup.deletedAt || erg.ruleGroup.status !== 'ACTIVE') {
        continue;
      }

      // 每个员工只保留最新的规则组
      if (!result.has(erg.employeeNo)) {
        result.set(erg.employeeNo, erg.ruleGroup);
      }
    }

    return result;
  }

  /**
   * 获取员工在指定日期范围内的有效考勤规则组变更记录
   * @param employeeNo 员工工号
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 员工考勤规则组列表
   */
  async getEmployeeRuleGroupHistory(
    employeeNo: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.employeeAttendanceRuleGroup.findMany({
      where: {
        employeeNo,
        effectiveDate: {
          lte: endDate,
        },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: startDate } },
        ],
      },
      orderBy: {
        effectiveDate: 'desc',
      },
      include: {
        ruleGroup: {
          include: {
            details: true,
          },
        },
      },
    });
  }

  /**
   * 解析考勤规则组明细中的出勤代码ID列表
   * @param ruleGroup 考勤规则组
   * @returns 出勤代码ID数组
   */
  parseAttendanceCodeIds(ruleGroup: any): number[] {
    if (!ruleGroup.details || ruleGroup.details.length === 0) {
      return [];
    }

    // 从details中解析attendanceCodeIds
    const allCodeIds: number[] = [];
    for (const detail of ruleGroup.details) {
      if (detail.attendanceCodeIds) {
        try {
          const codes = JSON.parse(detail.attendanceCodeIds);
          if (Array.isArray(codes)) {
            allCodeIds.push(...codes);
          }
        } catch (error) {
          console.error(`解析出勤代码失败: ${detail.attendanceCodeIds}`, error);
        }
      }
    }

    // 去重
    return Array.from(new Set(allCodeIds));
  }

  /**
   * 获取考勤规则组中的精益打卡规则ID
   * @param ruleGroup 考勤规则组
   * @returns 精益打卡规则ID，如果未配置则返回 null
   */
  getLeanPunchRuleId(ruleGroup: any): number | null {
    if (!ruleGroup.details || ruleGroup.details.length === 0) {
      return null;
    }

    // 返回第一个明细中的精益打卡规则ID
    return ruleGroup.details[0].leanPunchRuleId || null;
  }

  /**
   * 获取考勤规则组中的打卡规则ID
   * @param ruleGroup 考勤规则组
   * @returns 打卡规则ID，如果未配置则返回 null
   */
  getAttendancePunchRuleId(ruleGroup: any): number | null {
    if (!ruleGroup.details || ruleGroup.details.length === 0) {
      return null;
    }

    // 返回第一个明细中的打卡规则ID
    return ruleGroup.details[0].attendancePunchRuleId || null;
  }
}
