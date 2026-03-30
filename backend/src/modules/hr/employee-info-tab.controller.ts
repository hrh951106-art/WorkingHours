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
  @ApiOperation({ summary: '获取所有人事信息页签（用于配置）' })
  async getTabs() {
    return this.employeeInfoTabService.getTabs();
  }

  @Get('for-display')
  @ApiOperation({ summary: '获取人事信息页签（用于展示，只返回有启用分组的页签）' })
  async getTabsForDisplay() {
    return this.employeeInfoTabService.getTabsForDisplay();
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

  // ========== 分组相关 API ==========

  @Get(':id/groups')
  @ApiOperation({ summary: '获取页签的所有分组' })
  async getGroups(@Param('id') id: string) {
    return this.employeeInfoTabService.getGroups(+id);
  }

  @Post(':id/groups')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '创建分组' })
  async createGroup(@Param('id') id: string, @Body() dto: any) {
    return this.employeeInfoTabService.createGroup(+id, dto);
  }

  @Put('groups/:groupId')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '更新分组' })
  async updateGroup(@Param('groupId') groupId: string, @Body() dto: any) {
    return this.employeeInfoTabService.updateGroup(+groupId, dto);
  }

  @Delete('groups/:groupId')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '删除分组' })
  async deleteGroup(@Param('groupId') groupId: string) {
    return this.employeeInfoTabService.deleteGroup(+groupId);
  }

  @Put('groups/:groupId/toggle-collapsed')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '切换分组折叠状态' })
  async toggleGroupCollapsed(@Param('groupId') groupId: string) {
    return this.employeeInfoTabService.toggleGroupCollapsed(+groupId);
  }

  @Put(':id/groups/reorder')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '重新排序分组' })
  async reorderGroups(@Param('id') id: string, @Body() dto: { groups: any[] }) {
    return this.employeeInfoTabService.reorderGroups(+id, dto.groups);
  }

  // ========== 字段相关 API ==========

  @Post(':id/fields')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '添加字段到页签' })
  async addField(@Param('id') id: string, @Body() dto: any) {
    return this.employeeInfoTabService.addFieldToTab(+id, dto);
  }

  // 必须放在 ':tabId/fields/:id' 之前，避免路由冲突
  @Put(':id/fields/reorder')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '重新排序页签字段' })
  async reorderFields(@Param('id') id: string, @Body() dto: { fields: any[] }) {
    return this.employeeInfoTabService.reorderFields(+id, dto.fields);
  }

  @Put(':tabId/fields/:id')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '更新页签字段' })
  async updateField(@Param('tabId') tabId: string, @Param('id') id: string, @Body() dto: any) {
    console.log('[updateField] Called with tabId:', tabId, 'id:', id, 'dto:', dto);
    return this.employeeInfoTabService.updateFieldInTab(+tabId, +id, dto);
  }

  @Delete(':tabId/fields/:id')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '删除页签字段' })
  async removeField(@Param('tabId') tabId: string, @Param('id') id: string) {
    return this.employeeInfoTabService.removeFieldFromTab(+tabId, +id);
  }

  @Put('fields/:fieldId/move-to-group')
  @Roles('ADMIN', 'HR_ADMIN')
  @ApiOperation({ summary: '移动字段到分组' })
  async moveFieldToGroup(
    @Param('fieldId') fieldId: string,
    @Body() dto: { groupId: number | null }
  ) {
    return this.employeeInfoTabService.moveFieldToGroup(+fieldId, dto.groupId);
  }
}
