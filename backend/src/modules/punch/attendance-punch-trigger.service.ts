import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { AttendancePunchService } from './attendance-punch.service';
import { AttendanceWorkHourService } from '../calculate/attendance-work-hour.service';
import { PairingService } from './pairing.service';

/**
 * 摆卡自动触发服务
 * 监听排班、打卡数据、账户变化，自动触发精益摆卡和考勤摆卡
 */
@Injectable()
export class AttendancePunchTriggerService {
  private readonly logger = new Logger(AttendancePunchTriggerService.name);

  constructor(
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
    private attendancePunchService: AttendancePunchService,
    private attendanceWorkHourService: AttendanceWorkHourService,
    private pairingService: PairingService,
  ) {
    // 订阅排班变更事件
    this.eventEmitter.on('schedule.changed', this.handleScheduleChange.bind(this));
    // 订阅打卡数据变更事件
    this.eventEmitter.on('punch.changed', this.handlePunchChange.bind(this));
    // 订阅打卡记录账户变更事件
    this.eventEmitter.on('punch-account.changed', this.handlePunchAccountChange.bind(this));
    // 订阅设备账户变更事件
    this.eventEmitter.on('device-account.changed', this.handleDeviceAccountChange.bind(this));
  }

  /**
   * 处理排班变更事件
   * 当排班数据发生变化时，自动触发考勤打卡收卡
   */
  private async handleScheduleChange(payload: {
    employeeNos: string[];
    startDate: Date;
    endDate: Date;
    triggerSource: string; // 触发源：'schedule.create', 'schedule.update', 'schedule.delete'
  }) {
    this.logger.log(
      `检测到排班变更，触发源: ${payload.triggerSource}, ` +
        `员工数: ${payload.employeeNos.length}, ` +
        `日期范围: ${payload.startDate.toISOString()} ~ ${payload.endDate.toISOString()}`,
    );

    try {
      // 为每个员工触发精益摆卡和考勤打卡收卡
      for (const employeeNo of payload.employeeNos) {
        await this.triggerPairingAndAttendancePunch(employeeNo, payload.startDate, payload.endDate);
      }

      this.logger.log(`排班变更触发的摆卡完成`);
    } catch (error: any) {
      this.logger.error(`处理排班变更事件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 处理打卡数据变更事件
   * 当原始打卡数据发生变化时，自动触发考勤打卡收卡
   */
  private async handlePunchChange(payload: {
    employeeNos: string[];
    startDate: Date;
    endDate: Date;
    triggerSource: string; // 触发源：'punch.import', 'punch.correct', 'punch.delete'
  }) {
    this.logger.log(
      `检测到打卡数据变更，触发源: ${payload.triggerSource}, ` +
        `员工数: ${payload.employeeNos.length}, ` +
        `日期范围: ${payload.startDate.toISOString()} ~ ${payload.endDate.toISOString()}`,
    );

    try {
      // 为每个员工触发精益摆卡和考勤打卡收卡
      for (const employeeNo of payload.employeeNos) {
        await this.triggerPairingAndAttendancePunch(employeeNo, payload.startDate, payload.endDate);
      }

      this.logger.log(`打卡数据变更触发的摆卡完成`);
    } catch (error: any) {
      this.logger.error(`处理打卡数据变更事件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 同时触发精益摆卡和考勤打卡收卡
   *
   * ✅ 修复：与批量摆卡逻辑一致，先删除当天所有旧摆卡数据，再重新摆卡
   * 避免因排班变化、账户变更等原因导致的重复摆卡记录
   *
   * @param employeeNo 员工编号
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  private async triggerPairingAndAttendancePunch(
    employeeNo: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.logger.debug(`为员工 ${employeeNo} 触发精益摆卡和考勤打卡收卡`);

    // 为每一天触发摆卡
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const calcDate = new Date(currentDate);

      const dayStart = new Date(calcDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(calcDate);
      dayEnd.setHours(23, 59, 59, 999);

      try {
        // ✅ 先删除该员工当天的所有旧摆卡数据（与批量摆卡逻辑一致）
        const deletedCount = await this.prisma.punchPair.deleteMany({
          where: {
            employeeNo: employeeNo,
            pairDate: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        this.logger.debug(
          `删除员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 的旧摆卡数据: ${deletedCount.count} 条`,
        );

        // 1. 触发精益摆卡
        this.logger.debug(
          `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 触发精益摆卡`,
        );
        await this.pairingService.pairPunches(employeeNo, calcDate);

        // 2. 触发考勤打卡收卡
        const punchResult = await this.attendancePunchService.collectEmployeeAttendancePunch(
          employeeNo,
          calcDate,
        );

        if (punchResult) {
          // 收卡成功，触发工时计算
          this.logger.debug(
            `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 的考勤打卡收卡成功，触发工时计算`,
          );

          // 生成批次ID
          const batchId = `AUTO_${employeeNo}_${calcDate.getTime()}`;

          // 触发工时计算
          await this.attendanceWorkHourService.calculateDaily(employeeNo, calcDate, batchId);
        } else {
          this.logger.debug(
            `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 无考勤打卡收卡结果`,
          );
        }
      } catch (error: any) {
        this.logger.error(
          `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 的摆卡失败: ${error.message}`,
        );
      }

      // 移到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  /**
   * 触发考勤打卡收卡
   * @param employeeNo 员工编号
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  private async triggerAttendancePunchCollection(
    employeeNo: string,
    startDate: Date,
    endDate: Date,
  ) {
    this.logger.debug(`为员工 ${employeeNo} 触发考勤打卡收卡`);

    // 为每一天触发收卡
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const calcDate = new Date(currentDate);

      try {
        // 调用考勤打卡收卡服务
        const result = await this.attendancePunchService.collectEmployeeAttendancePunch(
          employeeNo,
          calcDate,
        );

        if (result) {
          // 收卡成功，触发工���计算
          this.logger.debug(
            `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 的考勤打卡收卡成功，触发工时计算`,
          );

          // 生成批次ID
          const batchId = `AUTO_${employeeNo}_${calcDate.getTime()}`;

          // 触发工时计算
          await this.attendanceWorkHourService.calculateDaily(employeeNo, calcDate, batchId);
        } else {
          this.logger.debug(
            `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 无考勤打卡收卡结果`,
          );
        }
      } catch (error: any) {
        this.logger.error(
          `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 的考勤打卡收卡失败: ${error.message}`,
        );
      }

      // 移到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  /**
   * 手动触发排班变更事件
   * 用于在排班数据变更后调用
   */
  async triggerScheduleChange(payload: {
    employeeNos: string[];
    startDate: Date;
    endDate: Date;
    triggerSource: string;
  }) {
    this.eventEmitter.emit('schedule.changed', payload);
  }

  /**
   * 手动触发打卡数据变更事件
   * 用于在打卡数据变更后调用
   */
  async triggerPunchChange(payload: {
    employeeNos: string[];
    startDate: Date;
    endDate: Date;
    triggerSource: string;
  }) {
    this.eventEmitter.emit('punch.changed', payload);
  }

  /**
   * 处理打卡记录账户变更事件
   * 当打卡记录的劳动力账户发生变化时，自动触发精益摆卡和考勤打卡收卡
   */
  private async handlePunchAccountChange(payload: {
    employeeNo: string;
    punchRecordId: number;
    punchDate: Date;
    triggerSource: string;
  }) {
    this.logger.log(
      `检测到打卡记录账户变更，触发源: ${payload.triggerSource}, ` +
        `员工: ${payload.employeeNo}, ` +
        `打卡日期: ${payload.punchDate.toISOString()}`,
    );

    try {
      // 计算日期范围：前一天、当天、后一天
      const startDate = new Date(payload.punchDate);
      startDate.setDate(startDate.getDate() - 1);

      const endDate = new Date(payload.punchDate);
      endDate.setDate(endDate.getDate() + 1);

      // 触发精益摆卡和考勤打卡收卡
      await this.triggerPairingAndAttendancePunch(payload.employeeNo, startDate, endDate);

      this.logger.log(`打卡记录账户变更触发的摆卡完成`);
    } catch (error: any) {
      this.logger.error(`处理打卡记录账户变更事件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 处理设备账户变更事件
   * 当设备绑定的劳动力账户发生变化时，自动触发精益摆卡和考勤打卡收卡
   */
  private async handleDeviceAccountChange(payload: {
    deviceId: number;
    effectiveDate: Date;
    triggerSource: string;
  }) {
    this.logger.log(
      `检测到设备账户变更，触发源: ${payload.triggerSource}, ` +
        `设备ID: ${payload.deviceId}, ` +
        `生效日期: ${payload.effectiveDate.toISOString()}`,
    );

    try {
      // 查找使用该设备的所有打卡记录
      const affectedDates = new Map<string, Set<string>>();

      // 查找生效日期前后三天的打卡记录
      const startDate = new Date(payload.effectiveDate);
      startDate.setDate(startDate.getDate() - 1);

      const endDate = new Date(payload.effectiveDate);
      endDate.setDate(endDate.getDate() + 1);

      const punchRecords = await this.pairingService['prisma'].punchRecord.findMany({
        where: {
          deviceId: payload.deviceId,
          punchTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          employeeNo: true,
          punchTime: true,
        },
      });

      // 按员工和日期分组
      for (const record of punchRecords) {
        const dateKey = record.punchTime.toISOString().split('T')[0];
        if (!affectedDates.has(record.employeeNo)) {
          affectedDates.set(record.employeeNo, new Set());
        }
        affectedDates.get(record.employeeNo)!.add(dateKey);
      }

      this.logger.log(`设备账户变更影响 ${affectedDates.size} 个员工`);

      // 为每个受影响的员工触发摆卡
      for (const [employeeNo, dates] of affectedDates.entries()) {
        const sortedDates = Array.from(dates).sort();
        const rangeStartDate = new Date(sortedDates[0]);
        const rangeEndDate = new Date(sortedDates[sortedDates.length - 1]);

        await this.triggerPairingAndAttendancePunch(employeeNo, rangeStartDate, rangeEndDate);
      }

      this.logger.log(`设备账户变更触发的摆卡完成`);
    } catch (error: any) {
      this.logger.error(`处理设备账户变更事件失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 手动触发打卡记录账户变更事件
   */
  async triggerPunchAccountChange(payload: {
    employeeNo: string;
    punchRecordId: number;
    punchDate: Date;
    triggerSource: string;
  }) {
    this.eventEmitter.emit('punch-account.changed', payload);
  }

  /**
   * 手动触发设备账户变更事件
   */
  async triggerDeviceAccountChange(payload: {
    deviceId: number;
    effectiveDate: Date;
    triggerSource: string;
  }) {
    this.eventEmitter.emit('device-account.changed', payload);
  }

  /**
   * 为单个员工触发指定日期的收卡和计算
   * 这是一个便捷方法，用于手动触发
   */
  async triggerForEmployee(employeeNo: string, calcDate: Date) {
    this.logger.log(
      `为员工 ${employeeNo} 触发 ${calcDate.toISOString().split('T')[0]} 的收卡和计算`,
    );

    try {
      // 1. 触发考勤打卡收卡
      const punchResult = await this.attendancePunchService.collectEmployeeAttendancePunch(
        employeeNo,
        calcDate,
      );

      if (!punchResult) {
        this.logger.warn(`员工 ${employeeNo} 的考勤打卡收卡失败: 无收卡结果`);
        return {
          success: false,
          message: '考勤打卡收卡失败: 无收卡结果',
        };
      }

      // 2. 触发工时计算
      const workHourBatchId = `MANUAL_${employeeNo}_${calcDate.getTime()}`;
      const workHourResult = await this.attendanceWorkHourService.calculateDaily(
        employeeNo,
        calcDate,
        workHourBatchId,
      );

      if (!workHourResult.success) {
        this.logger.warn(`员工 ${employeeNo} 的工时计算失败: ${workHourResult.message}`);
        return {
          success: false,
          message: `工时计算失败: ${workHourResult.message}`,
        };
      }

      this.logger.log(
        `员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 的收卡和计算完成，` +
          `共 ${workHourResult.results.length} 条工时结果`,
      );

      return {
        success: true,
        message: '收卡和计算完成',
        workHourCount: workHourResult.results.length,
      };
    } catch (error: any) {
      this.logger.error(`为员工 ${employeeNo} 触发收卡和计算失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
