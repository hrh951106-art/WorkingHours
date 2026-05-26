import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 考勤看板查询 DTO
 */
export class QueryAttendanceDashboardDto {
  @ApiProperty({ description: '员工工号', required: true })
  @IsNotEmpty()
  @IsString()
  employeeNo: string;

  @ApiProperty({ description: '开始日期 (YYYY-MM-DD)', required: true, example: '2026-05-01' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: '结束日期 (YYYY-MM-DD)', required: true, example: '2026-05-31' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

/**
 * 打卡数据项
 */
export class PunchDataItem {
  date: string;
  punchDate: Date;
  ruleId: number;
  ruleType: string;
  ruleName?: string;
  workStartPunchTime?: Date;
  workEndPunchTime?: Date;
  workStartPunches?: any[];
  workEndPunches?: any[];
  shiftId?: number;
  shiftName?: string;
  accountId?: number;
  isContinuousShift: boolean;
}

/**
 * 排班数据项
 */
export class ScheduleDataItem {
  date: string;
  scheduleDate: Date;
  shiftId: number;
  shiftName: string;
  adjustedStart?: Date;
  adjustedEnd?: Date;
  status: string;
}

/**
 * 工时结果数据项（可以是每日明细或汇总数据）
 */
export class WorkHourResultItem {
  date?: string;
  accountId?: number;
  accountName: string;
  definitionAttendanceCodeId?: number;
  definitionAttendanceCodeStr?: string;
  attendanceCodeName: string;
  workHours?: number;
  totalHours?: number;
}

/**
 * 按出勤代码汇总
 */
export class SummaryByAttendanceCode {
  attendanceCodeId?: number;
  attendanceCodeStr?: string;
  totalHours: number;
  days: number;
}

/**
 * 按账户汇总
 */
export class SummaryByAccount {
  accountId?: number;
  accountName?: string;
  totalHours: number;
  days: number;
}

/**
 * 考勤看板汇总数据
 */
export class AttendanceDashboardSummary {
  employeeNo: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalWorkHours: number;
  byAttendanceCode: SummaryByAttendanceCode[];
  byAccount: SummaryByAccount[];
}

/**
 * 考勤看板所有数据
 */
export class AttendanceDashboardAllData {
  punchData: PunchDataItem[];
  workHourResults: WorkHourResultItem[];
  schedules: ScheduleDataItem[];
  summary: AttendanceDashboardSummary;
}
