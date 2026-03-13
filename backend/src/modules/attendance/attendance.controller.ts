import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AttendanceService } from './attendance.service';

@ApiTags('Attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('personal')
  @RequirePermissions('attendance:personal:view')
  @ApiOperation({ summary: '个人考勤视图' })
  async getPersonalView(@Query() query: any) {
    return this.attendanceService.getPersonalView(query);
  }

  @Get('department')
  @RequirePermissions('attendance:department:view')
  @ApiOperation({ summary: '部门考勤视图' })
  async getDepartmentView(@Query() query: any) {
    return this.attendanceService.getDepartmentView(query);
  }

  @Get('account')
  @RequirePermissions('attendance:account:view')
  @ApiOperation({ summary: '账户工时视图' })
  async getAccountView(@Query() query: any) {
    return this.attendanceService.getAccountView(query);
  }

  @Get('reports/daily')
  @RequirePermissions('attendance:report:view')
  @ApiOperation({ summary: '日报' })
  async getDailyReport(@Query() query: any) {
    return this.attendanceService.getDailyReport(query);
  }

  @Get('reports/weekly')
  @RequirePermissions('attendance:report:view')
  @ApiOperation({ summary: '周报' })
  async getWeeklyReport(@Query() query: any) {
    return this.attendanceService.getWeeklyReport(query);
  }

  @Get('reports/monthly')
  @RequirePermissions('attendance:report:view')
  @ApiOperation({ summary: '月报' })
  async getMonthlyReport(@Query() query: any) {
    return this.attendanceService.getMonthlyReport(query);
  }

  @Get('exceptions')
  @RequirePermissions('attendance:exception:view')
  @ApiOperation({ summary: '异常列表' })
  async getExceptions(@Query() query: any) {
    return this.attendanceService.getExceptions(query);
  }

  @Put('exceptions/:id/handle')
  @RequirePermissions('attendance:exception:handle')
  @ApiOperation({ summary: '处理异常' })
  async handleException(@Param('id') id: string, @Body() dto: any) {
    return this.attendanceService.handleException(+id, dto);
  }
}
