import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkHourReceiverService {
  private readonly logger = new Logger(WorkHourReceiverService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 接收并存储工时结果（从计算管理模块推送）
   */
  async receiveWorkHourResults(data: {
    employeeNo: string;
    employeeId?: number;
    calcDate: Date;
    shiftId?: number;
    shiftName?: string;
    attendanceCodeId?: number; // ✅ 使用ID
    attendanceCode?: string; // ✅ 冗余字段
    calcAttendanceCode: string;
    workHours: number;
    sourceType: string;
    sourceId: number;
    accountId?: number;
    accountName?: string;
  }[]) {
    this.logger.log(`接收工时结果数据，数量: ${data.length}`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of data) {
      try {
        // 如果提供了attendanceCode，需要查询ID
        let attendanceCodeId = item.attendanceCodeId;
        if (!attendanceCodeId && item.attendanceCode) {
          const codeRecord = await this.prisma.attendanceCode.findUnique({
            where: { code: item.attendanceCode },
          });
          attendanceCodeId = codeRecord?.id;
        }

        // 验证出勤代码是否存在
        if (attendanceCodeId) {
          const attendanceCode = await this.prisma.attendanceCode.findUnique({
            where: { id: attendanceCodeId },
          });

          if (!attendanceCode) {
            results.failed++;
            results.errors.push(`出勤代码ID ${attendanceCodeId} 不存在`);
            continue;
          }
        }

        // 创建或更新工时结果
        await this.prisma.workHourResult.upsert({
          where: {
            // 使用复合唯一标识
            id: item.sourceId, // 临时使用sourceId，实际应该用业务唯一键
          },
          create: {
            employeeNo: item.employeeNo,
            employeeId: item.employeeId,
            workDate: item.calcDate, // ✅ 添加必填的workDate字段
            calcDate: item.calcDate,
            shiftId: item.shiftId,
            shiftName: item.shiftName,
            definitionAttendanceCodeId: attendanceCodeId, // ✅ 使用新字段
            definitionAttendanceCodeStr: item.attendanceCode, // ✅ 使用新字段
            calcAttendanceCode: item.calcAttendanceCode,
            workHours: item.workHours,
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            accountId: item.accountId,
            accountName: item.accountName,
            status: 'DRAFT',
          },
          update: {
            workHours: item.workHours,
            definitionAttendanceCodeId: attendanceCodeId,
            definitionAttendanceCodeStr: item.attendanceCode,
            updatedAt: new Date(),
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `处理 ${item.employeeNo} ${item.calcDate} 失败: ${error.message}`,
        );
        this.logger.error(
          `处理工时结果失败: ${item.employeeNo} ${item.calcDate}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `工时结果接收完成 - 成功: ${results.success}, 失败: ${results.failed}`,
    );

    return results;
  }

  /**
   * 确认工时结果（从草稿状态变为确认状态）
   */
  async confirmWorkHourResult(id: number) {
    return this.prisma.workHourResult.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  /**
   * 批量确认工时结果
   */
  async confirmWorkHourResults(ids: number[]) {
    return this.prisma.workHourResult.updateMany({
      where: { id: { in: ids } },
      data: { status: 'CONFIRMED' },
    });
  }

  /**
   * 从精益摆卡结果（PunchPair）计算精益工时结果
   * 根据考勤规则中包含的出勤代码（精益工时类型）并且劳动力账户层级匹配
   */
  async getLeanWorkHourResultsFromPunchPair(query: {
    employeeNo?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }) {
    const {
      employeeNo,
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
    } = query;

    // 确保 page 和 pageSize 是整数
    const pageNum = typeof page === 'string' ? parseInt(page) : (page || 1);
    const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize) : (pageSize || 10);

    const skip = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    const where: any = {
      status: 'ACTIVE',
    };

    if (employeeNo) {
      where.employeeNo = employeeNo;
    }

    if (startDate && endDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      where.pairDate = {
        gte: start,
        lte: end,
      };
    }

    // 查询 PunchPair 数据
    const [punchPairs, total] = await Promise.all([
      this.prisma.punchPair.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          employee: {
            include: {
              org: true,
            },
          },
        },
        orderBy: { pairDate: 'desc' },
      }),
      this.prisma.punchPair.count({ where }),
    ]);

    // 查询所有有效的定义出勤代码
    const definitionAttendanceCodes = await this.prisma.definitionAttendanceCode.findMany({
      where: {
        status: 'ACTIVE',
        type: 'LEAN_HOURS', // 只获取精益工时类型
        calculateHours: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        category: true,
        color: true,
        calcAttendanceCode: true,
        calculationAttendanceCode: true,
        definitionAttendanceCode: true,
      },
    });

    // 为每个 PunchPair 匹配出勤代码
    const results = punchPairs
      .map((pair: any) => {
        // 解析账户路径，判断属于哪个出勤代码
        // 账户格式: "大华工厂/W1总装车间/W1总装L2产线//焊接"
        const accountPath = pair.accountName || '';
        const pathParts = accountPath.split('/').filter(p => p.trim());

        // 根据 category 匹配出勤代码
        let matchedCode = null;

        if (pathParts.length >= 3) {
          // 路径格式: 工厂/车间/产线/工序 或 工厂/车间/产线//
          const workshop = pathParts[1]; // W1总装车间
          const line = pathParts[2]; // W1总装L2产线

          // 判断 category
          if (pathParts.length >= 4 && pathParts[3]) {
            // 有工序，属于工序工时 (A02)
            matchedCode = definitionAttendanceCodes.find(c => c.code === 'A02');
          } else if (line.includes('产线')) {
            // 有产线，属于线体工时 (A01)
            matchedCode = definitionAttendanceCodes.find(c => c.code === 'A01');
          } else if (workshop.includes('车间')) {
            // 只有车间，属于车间工时 (A03)
            matchedCode = definitionAttendanceCodes.find(c => c.code === 'A03');
          }
        }

        // 如果没有匹配到，使用默认的出勤代码
        if (!matchedCode) {
          matchedCode = definitionAttendanceCodes.find(c => c.code === 'A01');
        }

        if (!matchedCode) {
          return null;
        }

        return {
          id: pair.id,
          employeeNo: pair.employeeNo,
          employeeId: pair.employee?.id,
          employee: pair.employee,
          calcDate: pair.pairDate,
          workDate: pair.pairDate,
          shiftId: pair.shiftId,
          shiftName: pair.shiftName,
          definitionAttendanceCodeId: matchedCode.id,
          definitionAttendanceCode: matchedCode,
          definitionAttendanceCodeStr: matchedCode.name,
          calcAttendanceCode: matchedCode.calcAttendanceCode || matchedCode.code,
          workHours: pair.workHours || 0,
          startTime: pair.inPunchTime,
          endTime: pair.outPunchTime,
          sourceType: 'LEAN_PAIRING',
          sourceId: pair.id,
          accountId: pair.accountId,
          accountName: pair.accountName,
          accountPath: pair.accountPath,
          status: 'CONFIRMED',
          createdAt: pair.createdAt,
          updatedAt: pair.updatedAt,
        };
      })
      .filter(Boolean);

    return {
      items: results,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    };
  }

  /**
   * 查询工时结果（从WorkHourResult表查询）
   */
  async getWorkHourResults(query: {
    employeeNo?: string;
    startDate?: Date;
    endDate?: Date;
    attendanceCode?: string;
    attendanceCodeId?: number;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      employeeNo,
      startDate,
      endDate,
      attendanceCode,
      attendanceCodeId,
      status,
      page = 1,
      pageSize = 10,
    } = query;

    // 确保 page 和 pageSize 是整数
    const pageNum = typeof page === 'string' ? parseInt(page) : (page || 1);
    const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize) : (pageSize || 10);

    const skip = (pageNum - 1) * pageSizeNum;

    const where: any = {};

    if (employeeNo) {
      where.employeeNo = employeeNo;
    }

    if (startDate && endDate) {
      // 确保日期是 Date 对象
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);

      // 设置时间为当天的 00:00:00 和 23:59:59
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      where.workDate = {
        gte: start,
        lte: end,
      };
    }

    // 按出勤代码ID或代码查询
    if (attendanceCodeId) {
      where.definitionAttendanceCodeId = attendanceCodeId;
    } else if (attendanceCode) {
      // 支持通过定义出勤代码代码查询
      where.definitionAttendanceCode = {
        code: attendanceCode,
      };
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.workHourResult.findMany({
        where,
        skip,
        take: pageSizeNum,
        include: {
          definitionAttendanceCode: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              color: true,
              calcAttendanceCode: true,
              showInDetailPage: true,
            },
          },
        },
        orderBy: { workDate: 'desc' },
      }),
      this.prisma.workHourResult.count({ where }),
    ]);

    // 查询员工信息（通过employeeNo查询）
    const employeeNos = [...new Set(items.map(item => item.employeeNo).filter(Boolean))];
    const employeesMap = new Map<string, any>();
    if (employeeNos.length > 0) {
      const employees = await this.prisma.employee.findMany({
        where: { employeeNo: { in: employeeNos } },
        include: { org: true },
      });
      employees.forEach(emp => {
        employeesMap.set(emp.employeeNo, emp);
      });
    }

    // 转换数据格式以兼容前端
    const transformedItems = items
      .filter((item: any) => {
        // 过滤掉 showInDetailPage 为 false 的出勤代码
        const showInDetailPage = item.definitionAttendanceCode?.showInDetailPage;
        // 如果有定义出勤代码且 showInDetailPage 为 false，则过滤掉
        if (item.definitionAttendanceCode && showInDetailPage === false) {
          return false;
        }
        // 如果没有关联到定义出勤代码，也显示（兼容旧数据）
        return true;
      })
      .map((item: any) => {
        const definitionCode = item.definitionAttendanceCode;
        // 从employeesMap获取员工信息（通过employeeNo）
        const employee = item.employeeNo ? employeesMap.get(item.employeeNo) : null;

        return {
          id: item.id,
          employeeNo: item.employeeNo,
          employeeId: item.employeeId,
          employee: employee,
          calcDate: item.calcDate || item.workDate,
          workDate: item.workDate,
          shiftId: item.shiftId,
          shiftName: item.shiftName,
          definitionAttendanceCodeId: item.definitionAttendanceCodeId,
          definitionAttendanceCode: definitionCode,
          definitionAttendanceCodeStr: definitionCode?.name || item.definitionAttendanceCodeStr || '',
          calcAttendanceCode: item.calcAttendanceCode || definitionCode?.calcAttendanceCode || '',
          workHours: item.workHours,
          amount: item.amount,
          startTime: item.startTime,
          endTime: item.endTime,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          source: item.source,
          sourceBatchId: item.sourceBatchId,
          accountId: item.accountId,
          accountName: item.accountName,
          accountPath: item.accountPath,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

    return {
      items: transformedItems,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil(total / pageSizeNum),
    };
  }
}
