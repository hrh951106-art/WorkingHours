import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PunchService } from './punch.service';
import { PairingService } from './pairing.service';
import { AttendancePunchService } from './attendance-punch.service';
import { AttendancePunchTriggerService } from './attendance-punch-trigger.service';
import { PrismaService } from '../../database/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Punch')
@Controller('punch')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PunchController {
  constructor(
    private punchService: PunchService,
    private pairingService: PairingService,
    private attendancePunchService: AttendancePunchService,
    private attendancePunchTriggerService: AttendancePunchTriggerService, // ✅ 新增
    private prisma: PrismaService,
  ) {}

  @Get('devices')
  @RequirePermissions('punch:device:view')
  @ApiOperation({ summary: '获取设备列表' })
  async getDevices() {
    return this.punchService.getDevices();
  }

  @Post('devices')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '创建设备' })
  async createDevice(@Body() dto: any) {
    return this.punchService.createDevice(dto);
  }

  @Put('devices/:id')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '更新设备' })
  async updateDevice(@Param('id') id: string, @Body() dto: any) {
    return this.punchService.updateDevice(+id, dto);
  }

  @Delete('devices/:id')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '删除设备' })
  async deleteDevice(@Param('id') id: string) {
    return this.punchService.deleteDevice(+id);
  }

  @Post('devices/:id/bind-accounts')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '绑定子劳动力账户' })
  async bindAccounts(@Param('id') id: string, @Body() dto: { bindings: any[] }) {
    return this.punchService.bindAccounts(+id, dto.bindings);
  }

  @Get('records')
  @RequirePermissions('punch:record:view')
  @ApiOperation({ summary: '获取打卡记录' })
  async getRecords(@Query() query: any, @Req() req: any) {
    return this.punchService.getRecords(query, req.user);
  }

  @Post('records')
  @RequirePermissions('punch:record:create')
  @ApiOperation({ summary: '手动补录' })
  async createRecord(@Body() dto: any) {
    return this.punchService.createRecord(dto);
  }

  @Put('records/:id')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '更新打卡记录' })
  async updateRecord(@Param('id') id: string, @Body() dto: any) {
    return this.punchService.updateRecord(+id, dto);
  }

  @Delete('records/:id')
  @RequirePermissions('punch:record:delete')
  @ApiOperation({ summary: '删除打卡记录' })
  async deleteRecord(@Param('id') id: string) {
    return this.punchService.deleteRecord(+id);
  }

  @Post('records/import')
  @RequirePermissions('punch:record:create')
  @ApiOperation({ summary: '批量导入打卡记录' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importRecords(@UploadedFile() file: Express.Multer.File) {
    return this.punchService.importRecords(file);
  }

  @Get('records/exceptions')
  @RequirePermissions('punch:exception:view')
  @ApiOperation({ summary: '获取异常记录' })
  async getExceptions(@Query() query: any) {
    return this.punchService.getExceptions(query);
  }

  // 设备组管理
  @Get('device-groups')
  @RequirePermissions('punch:device:view')
  @ApiOperation({ summary: '获取设备组列表' })
  async getDeviceGroups() {
    return this.punchService.getDeviceGroups();
  }

  @Get('device-groups/:id')
  @RequirePermissions('punch:device:view')
  @ApiOperation({ summary: '获取设备组详情' })
  async getDeviceGroup(@Param('id') id: string) {
    return this.punchService.getDeviceGroupById(+id);
  }

  @Post('device-groups')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '创建设备组' })
  async createDeviceGroup(@Body() dto: any) {
    return this.punchService.createDeviceGroup(dto);
  }

  @Put('device-groups/:id')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '更新设备组' })
  async updateDeviceGroup(@Param('id') id: string, @Body() dto: any) {
    return this.punchService.updateDeviceGroup(+id, dto);
  }

  @Delete('device-groups/:id')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '删除设备组' })
  async deleteDeviceGroup(@Param('id') id: string) {
    return this.punchService.deleteDeviceGroup(+id);
  }

  @Post('device-groups/:id/add-devices')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '添加设备到设备组' })
  async addDevicesToGroup(@Param('id') id: string, @Body() dto: { deviceIds: number[] }) {
    return this.punchService.addDevicesToGroup(+id, dto.deviceIds);
  }

  @Post('device-groups/remove-devices')
  @RequirePermissions('punch:device:edit')
  @ApiOperation({ summary: '从设备组移除设备' })
  async removeDevicesFromGroup(@Body() dto: { deviceIds: number[] }) {
    return this.punchService.removeDevicesFromGroup(dto.deviceIds);
  }

  // 摆卡管理
  @Post('pairing/single')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '单人摆卡' })
  async pairPunches(@Body() dto: { employeeNo: string; pairDate: string; ruleId?: number }) {
    return this.pairingService.pairPunches(dto.employeeNo, new Date(dto.pairDate), dto.ruleId);
  }

  @Post('pairing/batch')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '批量摆卡' })
  async batchPairPunches(@Body() dto: { pairDate: string; employeeNos?: string[] }) {
    return this.pairingService.batchPairPunches(new Date(dto.pairDate), dto.employeeNos);
  }

  @Get('pairing/results')
  @RequirePermissions('punch:record:view')
  @ApiOperation({ summary: '获取摆卡结果' })
  async getPunchPairs(@Query() query: any) {
    return this.pairingService.getPunchPairs(query);
  }

  @Delete('pairing/results/:id')
  @RequirePermissions('punch:record:delete')
  @ApiOperation({ summary: '删除摆卡记录' })
  async deletePunchPair(@Param('id') id: string) {
    return this.pairingService.deletePunchPair(+id);
  }

  // @Delete('pairing/results/delete-by-date')
  // @RequirePermissions('punch:record:delete')
  // @ApiOperation({ summary: '按日期删除摆卡记录' })
  // async deletePunchPairsByDate(@Query() query: any) {
  //   return this.pairingService.deletePunchPairsByDate(query);
  // }

  @Put('pairs/:id')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '修改摆卡记录时间' })
  async updatePunchPair(@Param('id') id: string, @Body() dto: { inPunchTime?: string; outPunchTime?: string }) {
    return this.pairingService.updatePunchPair(+id, dto);
  }

  @Post('pairs/supplement')
  @RequirePermissions('punch:record:create')
  @ApiOperation({ summary: '补卡' })
  async supplementPunchPair(@Body() dto: any) {
    return this.pairingService.supplementPunchPair(dto);
  }

  @Post('pairing/trigger/:recordId')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '手动触发摆卡（用于新打卡记录）' })
  async triggerPairing(@Param('recordId') recordId: string) {
    return this.pairingService.handleNewPunchRecord(+recordId);
  }

  // 考勤打卡收卡
  @Post('attendance-punch/collect')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '考勤打卡收卡' })
  async collectAttendancePunch(@Body() dto: { employeeNos?: string[]; punchDate: string }) {
    // ✅ 解析日期为本地时间（服务器时区），避免使用UTC时区导致日期错误
    // 例如："2026-05-09" 应该解析为本地时间 2026-05-09T00:00:00，而不是 UTC 时间 2026-05-09T00:00:00Z
    const punchDate = new Date(dto.punchDate + 'T00:00:00');

    // 如果没有指定员工，获取所有有排班或打卡规则的员工
    let employeeNos = dto.employeeNos;
    if (!employeeNos || employeeNos.length === 0) {
      // TODO: 获取所有需要进行考勤���卡收卡的员工
      employeeNos = [];
    }

    return this.attendancePunchService.collectAttendancePunch(employeeNos, punchDate);
  }

  @Post('attendance-punch/collect-batch')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '批量考勤打卡收卡（日期范围）' })
  async collectAttendancePunchBatch(@Body() dto: {
    employeeNos?: string[];
    startDate: string;
    endDate: string;
  }) {
    // ✅ 解析日期为本地时间（服务器时区），避免使用UTC时区导致日期范围错误
    // 例如："2026-05-12" 应该解析为本地时间 2026-05-12T00:00:00，而不是 UTC 时间 2026-05-12T00:00:00Z
    const startDate = new Date(dto.startDate + 'T00:00:00');
    const endDate = new Date(dto.endDate + 'T23:59:59');

    // 如果没有指定员工，获取所有在日期范围内有排班的员工
    let employeeNos = dto.employeeNos;
    if (!employeeNos || employeeNos.length === 0) {
      const schedules = await this.prisma.schedule.findMany({
        where: {
          status: 'ACTIVE',
          scheduleDate: {
            gte: startDate,
            lte: endDate,
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

      employeeNos = schedules.map((s) => s.employee.employeeNo);
    }

    return this.attendancePunchService.collectAttendancePunchBatch(
      employeeNos,
      startDate,
      endDate,
    );
  }

  @Get('attendance-punch/results')
  @RequirePermissions('punch:record:view')
  @ApiOperation({ summary: '获取考勤打卡收卡结果' })
  async getAttendancePunchResults(@Query() query: any) {
    return this.attendancePunchService.getAttendancePunchResults(query);
  }

  @Get('attendance-punch/results/:id')
  @RequirePermissions('punch:record:view')
  @ApiOperation({ summary: '获取考勤打卡收卡结果详情' })
  async getAttendancePunchDetail(@Param('id') id: string) {
    return this.attendancePunchService.getAttendancePunchDetail(+id);
  }

  // ==================== 考勤打卡自动触发相关接口 ====================

  @Post('attendance-punch/trigger-for-employee')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '为单个员工触发考勤打卡收卡和工时计算' })
  async triggerForEmployee(@Body() dto: {
    employeeNo: string;
    calcDate: string; // YYYY-MM-DD
  }) {
    return this.attendancePunchTriggerService.triggerForEmployee(
      dto.employeeNo,
      new Date(dto.calcDate),
    );
  }

  @Post('attendance-punch/trigger-schedule-change')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '触发排班变更事件' })
  async triggerScheduleChange(@Body() dto: {
    employeeNos: string[];
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    triggerSource: string;
  }) {
    return this.attendancePunchTriggerService.triggerScheduleChange({
      employeeNos: dto.employeeNos,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      triggerSource: dto.triggerSource,
    });
  }

  @Post('attendance-punch/trigger-punch-change')
  @RequirePermissions('punch:record:edit')
  @ApiOperation({ summary: '触发打卡数据变更事件' })
  async triggerPunchChange(@Body() dto: {
    employeeNos: string[];
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    triggerSource: string;
  }) {
    return this.attendancePunchTriggerService.triggerPunchChange({
      employeeNos: dto.employeeNos,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      triggerSource: dto.triggerSource,
    });
  }
}
