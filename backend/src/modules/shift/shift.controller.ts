import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ShiftService } from './shift.service';
import { ShiftPropertyDefinitionService } from './shift-property-definition.service';

@ApiTags('Shift')
@Controller('shift')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ShiftController {
  constructor(
    private shiftService: ShiftService,
    private propertyDefinitionService: ShiftPropertyDefinitionService,
  ) {}

  @Get('shifts')
  @RequirePermissions('shift:shift:view')
  @ApiOperation({ summary: '获取班次列表' })
  async getShifts() {
    return this.shiftService.getShifts();
  }

  @Get('shifts/:id')
  @RequirePermissions('shift:shift:view')
  @ApiOperation({ summary: '获取班次详情' })
  async getShift(@Param('id') id: string) {
    return this.shiftService.getShift(+id);
  }

  @Post('shifts')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '创建班次' })
  async createShift(@Body() dto: any) {
    return this.shiftService.createShift(dto);
  }

  @Put('shifts/:id')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '更新班次' })
  async updateShift(@Param('id') id: string, @Body() dto: any) {
    return this.shiftService.updateShift(+id, dto);
  }

  @Delete('shifts/:id')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '删除班次' })
  async deleteShift(@Param('id') id: string) {
    return this.shiftService.deleteShift(+id);
  }

  @Get('schedules')
  @RequirePermissions('shift:schedule:view')
  @ApiOperation({ summary: '获取排班列表' })
  async getSchedules(@Query() query: any, @Req() req: any) {
    return this.shiftService.getSchedules(query, req.user);
  }

  @Get('schedules/calendar')
  @RequirePermissions('shift:schedule:view')
  @ApiOperation({ summary: '获取排班日历' })
  async getScheduleCalendar(@Query() query: any) {
    return this.shiftService.getScheduleCalendar(query);
  }

  @Post('schedules')
  @RequirePermissions('shift:schedule:create')
  @ApiOperation({ summary: '创建排班' })
  async createSchedule(@Body() dto: any) {
    return this.shiftService.createSchedule(dto);
  }

  @Post('schedules/batch')
  @RequirePermissions('shift:schedule:create')
  @ApiOperation({ summary: '批量排班' })
  async batchCreateSchedules(@Body() dto: any) {
    return this.shiftService.batchCreateSchedules(dto);
  }

  @Put('schedules/:id')
  @RequirePermissions('shift:schedule:edit')
  @ApiOperation({ summary: '调整排班' })
  async updateSchedule(@Param('id') id: string, @Body() dto: any) {
    return this.shiftService.updateSchedule(+id, dto);
  }

  @Delete('schedules/:id/cancel')
  @RequirePermissions('shift:schedule:edit')
  @ApiOperation({ summary: '取消排班' })
  async cancelSchedule(@Param('id') id: string, @Body() body: any) {
    return this.shiftService.cancelSchedule(+id, body);
  }

  @Delete('schedules/:id')
  @RequirePermissions('shift:schedule:delete')
  @ApiOperation({ summary: '删除排班' })
  async deleteSchedule(@Param('id') id: string) {
    return this.shiftService.deleteSchedule(+id);
  }

  @Get('transfers')
  @RequirePermissions('shift:transfer:view')
  @ApiOperation({ summary: '获取转移记录' })
  async getTransfers(@Query() query: any) {
    return this.shiftService.getTransfers(query);
  }

  @Post('transfers')
  @RequirePermissions('shift:transfer:create')
  @ApiOperation({ summary: '创建转移' })
  async createTransfer(@Body() dto: any) {
    return this.shiftService.createTransfer(dto);
  }

  // ============ 班次属性管理 ============

  @Get('shifts/:id/properties')
  @RequirePermissions('shift:shift:view')
  @ApiOperation({ summary: '获取班次属性列表' })
  async getShiftProperties(@Param('id') id: string) {
    return this.shiftService.getShiftProperties(+id);
  }

  @Put('shifts/:id/properties')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '批量保存班次属性' })
  async batchSaveShiftProperties(@Param('id') id: string, @Body() dto: any) {
    return this.shiftService.batchSaveShiftProperties(+id, dto.properties);
  }

  @Delete('shifts/:id/properties/:propertyKey')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '删除班次属性' })
  async deleteShiftProperty(
    @Param('id') id: string,
    @Param('propertyKey') propertyKey: string
  ) {
    return this.shiftService.deleteShiftProperty(+id, propertyKey);
  }

  // ============ 班次属性定义管理 ============

  @Get('property-definitions')
  @RequirePermissions('shift:shift:view')
  @ApiOperation({ summary: '获取班次属性定义列表' })
  async getPropertyDefinitions() {
    return this.propertyDefinitionService.findAll();
  }

  @Get('property-definitions/active')
  @RequirePermissions('shift:shift:view')
  @ApiOperation({ summary: '获取启用的班次属性定义' })
  async getActivePropertyDefinitions() {
    return this.propertyDefinitionService.findActive();
  }

  @Get('property-definitions/:id')
  @RequirePermissions('shift:shift:view')
  @ApiOperation({ summary: '获取班次属性定义详情' })
  async getPropertyDefinition(@Param('id') id: string) {
    return this.propertyDefinitionService.findOne(+id);
  }

  @Post('property-definitions')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '创建班次属性定义' })
  async createPropertyDefinition(@Body() dto: any) {
    return this.propertyDefinitionService.create(dto);
  }

  @Put('property-definitions/:id')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '更新班次属性定义' })
  async updatePropertyDefinition(@Param('id') id: string, @Body() dto: any) {
    return this.propertyDefinitionService.update(+id, dto);
  }

  @Delete('property-definitions/:id')
  @RequirePermissions('shift:shift:edit')
  @ApiOperation({ summary: '删除班次属性定义' })
  async deletePropertyDefinition(@Param('id') id: string) {
    return this.propertyDefinitionService.delete(+id);
  }
}
