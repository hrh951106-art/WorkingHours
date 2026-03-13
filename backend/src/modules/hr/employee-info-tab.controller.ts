import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmployeeInfoTabService } from './employee-info-tab.service';

@ApiTags('HR - Employee Info Tabs')
@Controller('hr/employee-info-tabs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployeeInfoTabController {
  constructor(private employeeInfoTabService: EmployeeInfoTabService) {}

  @Get()
  @ApiOperation({ summary: '获取所有人事信息页签' })
  async getTabs() {
    return this.employeeInfoTabService.getTabs();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取页签详情' })
  async getTab(@Param('id') id: string) {
    return this.employeeInfoTabService.getTab(+id);
  }

  @Post()
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '创建页签' })
  async createTab(@Body() dto: any) {
    return this.employeeInfoTabService.createTab(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '更新页签' })
  async updateTab(@Param('id') id: string, @Body() dto: any) {
    return this.employeeInfoTabService.updateTab(+id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '删除页签' })
  async deleteTab(@Param('id') id: string) {
    return this.employeeInfoTabService.deleteTab(+id);
  }

  @Post(':id/fields')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '添加字段到页签' })
  async addField(@Param('id') id: string, @Body() dto: any) {
    return this.employeeInfoTabService.addFieldToTab(+id, dto);
  }

  @Put(':tabId/fields/:id')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '更新页签字段' })
  async updateField(@Param('tabId') tabId: string, @Param('id') id: string, @Body() dto: any) {
    return this.employeeInfoTabService.updateFieldInTab(+tabId, +id, dto);
  }

  @Delete(':tabId/fields/:id')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '删除页签字段' })
  async removeField(@Param('tabId') tabId: string, @Param('id') id: string) {
    return this.employeeInfoTabService.removeFieldFromTab(+tabId, +id);
  }

  @Put(':id/fields/reorder')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '重新排序页签字段' })
  async reorderFields(@Param('id') id: string, @Body() dto: { fields: any[] }) {
    return this.employeeInfoTabService.reorderFields(+id, dto.fields);
  }
}
