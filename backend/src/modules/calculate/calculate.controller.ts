import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CalculateService } from './calculate.service';
import { AttendanceWorkHourService } from './attendance-work-hour.service';

@ApiTags('Calculate')
@Controller('calculate')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CalculateController {
  constructor(
    private calculateService: CalculateService,
    private attendanceWorkHourService: AttendanceWorkHourService,
  ) {}

  @Get('punch-rules')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取打卡规则' })
  async getPunchRules() {
    return this.calculateService.getPunchRules();
  }

  @Get('punch-rules/new-code')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '生成新的打卡规则编码' })
  async generatePunchRuleCode() {
    return this.calculateService.generatePunchRuleCode();
  }

  @Post('punch-rules')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '创建打卡规则' })
  async createPunchRule(@Body() dto: any) {
    return this.calculateService.createPunchRule(dto);
  }

  @Put('punch-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '更新打卡规则' })
  async updatePunchRule(@Param('id') id: string, @Body() dto: any) {
    return this.calculateService.updatePunchRule(+id, dto);
  }

  @Delete('punch-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '删除打卡规则' })
  async deletePunchRule(@Param('id') id: string) {
    return this.calculateService.deletePunchRule(+id);
  }

  @Get('calc-rules')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取计算规则' })
  async getCalcRules() {
    return this.calculateService.getCalcRules();
  }

  @Post('calc-rules')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '创建计算规则' })
  async createCalcRule(@Body() dto: any) {
    return this.calculateService.createCalcRule(dto);
  }

  @Put('calc-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '更新计算规则' })
  async updateCalcRule(@Param('id') id: string, @Body() dto: any) {
    return this.calculateService.updateCalcRule(+id, dto);
  }

  @Delete('calc-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '删除计算规则' })
  async deleteCalcRule(@Param('id') id: string) {
    return this.calculateService.deleteCalcRule(+id);
  }

  @Post('calculate')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '触发计算' })
  async calculate(@Body() dto: any) {
    return this.calculateService.calculate(dto);
  }

  @Post('calculate/batch')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '批量重算' })
  async batchCalculate(@Body() dto: any) {
    return this.calculateService.batchCalculate(dto);
  }

  @Get('results')
  @RequirePermissions('calculate:result:view')
  @ApiOperation({ summary: '获取计算结果' })
  async getResults(@Query() query: any, @Req() req: any) {
    return this.calculateService.getResults(query, req.user);
  }

  @Get('results/:id')
  @RequirePermissions('calculate:result:view')
  @ApiOperation({ summary: '获取结果详情' })
  async getResult(@Param('id') id: string) {
    return this.calculateService.getResult(+id);
  }

  @Put('results/:id/correct')
  @RequirePermissions('calculate:result:correct')
  @ApiOperation({ summary: '修正结果' })
  async correctResult(@Param('id') id: string, @Body() dto: any) {
    return this.calculateService.correctResult(+id, dto);
  }

  @Post('work-hours/push')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '推送工时结果到工时模块' })
  async pushWorkHours(@Body() dto: { calcResultIds: number[] }) {
    return this.calculateService.pushWorkHours(dto.calcResultIds);
  }

  // ==================== 考勤工时计算相关接口 ====================

  @Post('attendance-work-hours/calculate')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '计算单个员工某日的考勤工时' })
  async calculateAttendanceWorkHour(@Body() dto: {
    employeeNo: string;
    calcDate: string; // YYYY-MM-DD
    batchId?: string;
  }) {
    return this.attendanceWorkHourService.calculateDaily(
      dto.employeeNo,
      new Date(dto.calcDate),
      dto.batchId,
    );
  }

  @Post('attendance-work-hours/calculate-batch')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '批量计算多个员工某日的考勤工时' })
  async calculateAttendanceWorkHoursBatch(@Body() dto: {
    employeeNos: string[];
    calcDate: string; // YYYY-MM-DD
    batchId?: string;
  }) {
    return this.attendanceWorkHourService.calculateBatch(
      dto.employeeNos,
      new Date(dto.calcDate),
      dto.batchId,
    );
  }

  @Post('attendance-work-hours/calculate-by-date-range')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '批量计算考勤工时（日期范围）' })
  async calculateAttendanceWorkHoursByDateRange(@Body() dto: {
    employeeNos?: string[];
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    batchId?: string;
  }) {
    console.log('=== Controller: calculateAttendanceWorkHoursByDateRange ===');
    console.log('接收到的 DTO:', dto);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    console.log('转换后的日期对象:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // 如果没有指定员工，获取所有员工
    let employeeNos = dto.employeeNos;
    if (!employeeNos || employeeNos.length === 0) {
      // TODO: 获取所有需要计算考勤工时的员工
      employeeNos = [];
    }

    return this.attendanceWorkHourService.calculateByDateRange(
      employeeNos,
      startDate,
      endDate,
      dto.batchId,
    );
  }

  @Delete('attendance-work-hours/batch/:batchId')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '删除指定批次的考勤工时结果' })
  async deleteAttendanceWorkHourBatch(@Param('batchId') batchId: string) {
    return this.attendanceWorkHourService.deleteBatchResults(batchId);
  }

  @Get('work-hour-results')
  @RequirePermissions('calculate:result:view')
  @ApiOperation({ summary: '获取考勤工时结果' })
  async getAttendanceWorkHourResults(@Query() query: any, @Req() req: any) {
    return this.attendanceWorkHourService.getWorkHourResults(query, req.user);
  }

  @Post('attendance-work-hours/sync')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '同步考勤工时结果到工时模块' })
  async syncAttendanceWorkHours(@Body() dto: {
    employeeNos?: string[];
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
  }) {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    return this.attendanceWorkHourService.syncToWorkHourResult(
      dto.employeeNos,
      startDate,
      endDate,
    );
  }
}
