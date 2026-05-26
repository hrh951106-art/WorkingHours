import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AttendanceDashboardService } from './attendance-dashboard.service';
import { QueryAttendanceDashboardDto } from './dto/query-attendance-dashboard.dto';

@ApiTags('Attendance Dashboard - 考勤看板')
@Controller('attendance-dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceDashboardController {
  constructor(
    private readonly attendanceDashboardService: AttendanceDashboardService,
  ) {}

  /**
   * 获取打卡数据
   * GET /attendance-dashboard/punch-data
   */
  @Get('punch-data')
  @ApiOperation({ summary: '获取打卡数据' })
  async getPunchData(@Query() query: QueryAttendanceDashboardDto) {
    const data = await this.attendanceDashboardService.getPunchData(query);
    return {
      success: true,
      message: '操作成功',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取出勤结果数据
   * GET /attendance-dashboard/work-hour-results
   */
  @Get('work-hour-results')
  @ApiOperation({ summary: '获取出勤结果数据' })
  async getWorkHourResults(@Query() query: QueryAttendanceDashboardDto) {
    const data = await this.attendanceDashboardService.getWorkHourResults(query);
    return {
      success: true,
      message: '操作成功',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取排班数据
   * GET /attendance-dashboard/schedules
   */
  @Get('schedules')
  @ApiOperation({ summary: '获取排班数据' })
  async getSchedules(@Query() query: QueryAttendanceDashboardDto) {
    const data = await this.attendanceDashboardService.getSchedules(query);
    return {
      success: true,
      message: '操作成功',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取汇总数据（按出勤代码和账户汇总）
   * GET /attendance-dashboard/summary
   */
  @Get('summary')
  @ApiOperation({ summary: '获取汇总数据' })
  async getSummary(@Query() query: QueryAttendanceDashboardDto) {
    const data = await this.attendanceDashboardService.getSummary(query);
    return {
      success: true,
      message: '操作成功',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取所���数据（一次性返回，减少请求次数）
   * GET /attendance-dashboard/all
   */
  @Get('all')
  @ApiOperation({ summary: '获取所有数据（推荐使用）' })
  async getAllData(@Query() query: QueryAttendanceDashboardDto) {
    const data = await this.attendanceDashboardService.getAllData(query);
    return {
      success: true,
      message: '操作成功',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取工时明细数据（按账户和出勤代码分组的明细）
   * GET /attendance-dashboard/work-hour-details
   */
  @Get('work-hour-details')
  @ApiOperation({ summary: '获取工时明细数据' })
  async getWorkHourDetails(@Query() query: QueryAttendanceDashboardDto & { accountName: string; attendanceCodeName: string }) {
    const data = await this.attendanceDashboardService.getWorkHourDetails(query);
    return {
      success: true,
      message: '操作成功',
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
