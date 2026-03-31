import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { HrService } from './hr.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './dto/employee.dto';

@ApiTags('HR')
@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class HrController {
  constructor(private hrService: HrService) {}

  // ==================== 组织管理 ====================
  @Get('organizations')
  @RequirePermissions('hr:org:view')
  @ApiOperation({ summary: '获取组织列表' })
  async getOrganizations() {
    return this.hrService.getOrganizations();
  }

  @Get('organizations/tree')
  @RequirePermissions('hr:org:view')
  @ApiOperation({ summary: '获取组织树' })
  async getOrganizationTree() {
    return this.hrService.getOrganizationTree();
  }

  @Post('organizations')
  @RequirePermissions('hr:org:edit')
  @ApiOperation({ summary: '创建组织' })
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.hrService.createOrganization(dto);
  }

  @Put('organizations/:id')
  @RequirePermissions('hr:org:edit')
  @ApiOperation({ summary: '更新组织' })
  async updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.hrService.updateOrganization(+id, dto);
  }

  @Delete('organizations/:id')
  @RequirePermissions('hr:org:edit')
  @ApiOperation({ summary: '删除组织' })
  async deleteOrganization(@Param('id') id: string) {
    return this.hrService.deleteOrganization(+id);
  }

  // ==================== 人员管理 ====================
  @Get('employees')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取人员列表' })
  async getEmployees(@Query() query: EmployeeQueryDto, @Req() req: any) {
    return this.hrService.getEmployees(query, req.user);
  }

  @Get('employees/:id')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取人员详情' })
  async getEmployee(@Param('id') id: string) {
    return this.hrService.getEmployee(+id);
  }

  @Get('employees/:id/change-logs')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取人员变更时间轴' })
  async getEmployeeChangeLogs(@Param('id') id: string) {
    return this.hrService.getEmployeeChangeLogs(+id);
  }

  @Get('employees/:id/work-info-versions')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取工作信息版本列表' })
  async getWorkInfoVersions(@Param('id') id: string) {
    return this.hrService.getWorkInfoVersions(+id);
  }

  @Get('employees/:id/work-info/:version')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取指定版本的工作信息' })
  async getWorkInfoByVersion(@Param('id') id: string, @Param('version') version: string) {
    return this.hrService.getWorkInfoByVersion(+id, version);
  }

  @Put('employees/:id/work-info/current')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '更新当前工作信息' })
  async updateCurrentWorkInfo(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateCurrentWorkInfo(+id, dto);
  }

  @Post('employees/:id/work-info-versions')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '创建工作信息新版本' })
  async createWorkInfoVersion(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.createWorkInfoVersion(+id, dto);
  }

  @Put('employees/:id/work-info/:historyId')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '更新指定的工作信息历史记录' })
  async updateWorkInfoHistory(@Param('id') id: string, @Param('historyId') historyId: string, @Body() dto: any) {
    return this.hrService.updateWorkInfoHistory(+historyId, dto);
  }

  @Post('employees')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '创建人员' })
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    return this.hrService.createEmployee(dto);
  }

  @Put('employees/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '更新人员' })
  async updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.hrService.updateEmployee(+id, dto);
  }

  @Delete('employees/:id')
  @RequirePermissions('hr:emp:delete')
  @ApiOperation({ summary: '删除人员（逻辑删除）' })
  async deleteEmployee(@Param('id') id: string) {
    return this.hrService.deleteEmployee(+id);
  }

  @Get('employees/:id/accounts')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取人员的劳动力账户' })
  async getEmployeeAccounts(@Param('id') id: string) {
    return this.hrService.getEmployeeAccounts(+id);
  }

  @Post('employees/:id/accounts/regenerate')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '重新生成人员的劳动力账户' })
  async regenerateEmployeeAccounts(@Param('id') id: string) {
    return this.hrService.regenerateEmployeeAccounts(+id);
  }

  // ==================== 自定义字段 ====================
  @Get('custom-fields')
  @ApiOperation({ summary: '获取自定义字段列表' })
  async getCustomFields() {
    return this.hrService.getCustomFields();
  }

  @Get('employee-info-configs')
  @ApiOperation({ summary: '获取人事信息字段配置（用于账户层级）' })
  async getEmployeeInfoConfigs() {
    return this.hrService.getEmployeeInfoConfigs();
  }

  @Post('custom-fields')
  @RequirePermissions('hr:field:edit')
  @ApiOperation({ summary: '创建自定义字段' })
  async createCustomField(@Body() dto: any) {
    return this.hrService.createCustomField(dto);
  }

  @Put('custom-fields/:id')
  @RequirePermissions('hr:field:edit')
  @ApiOperation({ summary: '更新自定义字段' })
  async updateCustomField(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateCustomField(+id, dto);
  }

  @Delete('custom-fields/:id')
  @RequirePermissions('hr:field:delete')
  @ApiOperation({ summary: '删除自定义字段' })
  async deleteCustomField(@Param('id') id: string) {
    return this.hrService.deleteCustomField(+id);
  }

  // ==================== 组织类型配置 ====================
  @Get('org-types')
  @ApiOperation({ summary: '获取组织类型列表' })
  async getOrgTypes() {
    return this.hrService.getOrgTypes();
  }

  @Post('org-types')
  @RequirePermissions('hr:orgtype:edit')
  @ApiOperation({ summary: '创建组织类型' })
  async createOrgType(@Body() dto: any) {
    return this.hrService.createOrgType(dto);
  }

  @Put('org-types/:id')
  @RequirePermissions('hr:orgtype:edit')
  @ApiOperation({ summary: '更新组织类型' })
  async updateOrgType(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateOrgType(+id, dto);
  }

  @Delete('org-types/:id')
  @RequirePermissions('hr:orgtype:delete')
  @ApiOperation({ summary: '删除组织类型' })
  async deleteOrgType(@Param('id') id: string) {
    return this.hrService.deleteOrgType(+id);
  }

  // ==================== 数据源配置 ====================
  @Get('data-sources')
  @ApiOperation({ summary: '获取数据源列表' })
  async getDataSources() {
    return this.hrService.getDataSources();
  }

  @Post('data-sources')
  @RequirePermissions('hr:datasource:edit')
  @ApiOperation({ summary: '创建数据源' })
  async createDataSource(@Body() dto: any) {
    return this.hrService.createDataSource(dto);
  }

  @Put('data-sources/:id')
  @RequirePermissions('hr:datasource:edit')
  @ApiOperation({ summary: '更新数据源' })
  async updateDataSource(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateDataSource(+id, dto);
  }

  @Delete('data-sources/:id')
  @RequirePermissions('hr:datasource:delete')
  @ApiOperation({ summary: '删除数据源' })
  async deleteDataSource(@Param('id') id: string) {
    return this.hrService.deleteDataSource(+id);
  }

  // ==================== 数据源选项管理 ====================

  @Get('data-sources/:id/options')
  @RequirePermissions('hr:datasource:view')
  @ApiOperation({ summary: '获取数据源选项列表' })
  async getDataSourceOptions(@Param('id') id: string) {
    return this.hrService.getDataSourceOptions(+id);
  }

  @Post('data-sources/:id/options')
  @RequirePermissions('hr:datasource:edit')
  @ApiOperation({ summary: '创建数据源选项' })
  async createDataSourceOption(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.createDataSourceOption(+id, dto);
  }

  @Put('data-sources/:dataSourceId/options/:id')
  @RequirePermissions('hr:datasource:edit')
  @ApiOperation({ summary: '更新数据源选项' })
  async updateDataSourceOption(
    @Param('dataSourceId') dataSourceId: string,
    @Param('id') id: string,
    @Body() dto: any
  ) {
    return this.hrService.updateDataSourceOption(+id, dto);
  }

  @Delete('data-sources/:dataSourceId/options/:id')
  @RequirePermissions('hr:datasource:delete')
  @ApiOperation({ summary: '删除数据源选项' })
  async deleteDataSourceOption(
    @Param('dataSourceId') dataSourceId: string,
    @Param('id') id: string
  ) {
    return this.hrService.deleteDataSourceOption(+id);
  }

  // ==================== 查询条件配置 ====================
  @Get('search-condition-configs')
  @ApiOperation({ summary: '获取查询条件配置列表' })
  async getSearchConditionConfigs(@Query() query: any) {
    return this.hrService.getSearchConditionConfigs(query);
  }

  @Post('search-condition-configs')
  @RequirePermissions('hr:searchconfig:edit')
  @ApiOperation({ summary: '创建查询条件配置' })
  async createSearchConditionConfig(@Body() dto: any) {
    return this.hrService.createSearchConditionConfig(dto);
  }

  @Put('search-condition-configs/:id')
  @RequirePermissions('hr:searchconfig:edit')
  @ApiOperation({ summary: '更新查询条件配置' })
  async updateSearchConditionConfig(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateSearchConditionConfig(+id, dto);
  }

  @Delete('search-condition-configs/:id')
  @RequirePermissions('hr:searchconfig:delete')
  @ApiOperation({ summary: '删除查询条件配置' })
  async deleteSearchConditionConfig(@Param('id') id: string) {
    return this.hrService.deleteSearchConditionConfig(+id);
  }

  @Post('search-condition-configs/batch')
  @RequirePermissions('hr:searchconfig:edit')
  @ApiOperation({ summary: '批量保存查询条件配置' })
  async batchSaveSearchConditionConfigs(@Body() dto: any) {
    return this.hrService.batchSaveSearchConditionConfigs(dto);
  }

  // ==================== 系统配置 ====================
  @Get('system-configs')
  @ApiOperation({ summary: '获取系统配置列表' })
  async getSystemConfigs(@Query() query: any) {
    return this.hrService.getSystemConfigs(query);
  }

  @Get('system-configs/:key')
  @ApiOperation({ summary: '获取单个系统配置' })
  async getSystemConfigByKey(@Param('key') key: string) {
    return this.hrService.getSystemConfigByKey(key);
  }

  @Post('system-configs')
  @RequirePermissions('hr:systemconfig:edit')
  @ApiOperation({ summary: '创建系统配置' })
  async createSystemConfig(@Body() dto: any) {
    return this.hrService.createSystemConfig(dto);
  }

  @Put('system-configs/:key')
  @RequirePermissions('hr:systemconfig:edit')
  @ApiOperation({ summary: '更新系统配置' })
  async updateSystemConfig(@Param('key') key: string, @Body() dto: any) {
    return this.hrService.updateSystemConfig(key, dto);
  }

  @Delete('system-configs/:key')
  @RequirePermissions('hr:systemconfig:delete')
  @ApiOperation({ summary: '删除系统配置' })
  async deleteSystemConfig(@Param('key') key: string) {
    return this.hrService.deleteSystemConfig(key);
  }

  @Get('organizations/by-hierarchy-level/:hierarchyLevelId')
  @ApiOperation({ summary: '根据层级ID获取组织列表' })
  async getOrganizationsByHierarchyLevel(@Param('hierarchyLevelId') hierarchyLevelId: string) {
    return this.hrService.getOrganizationsByHierarchyLevel(hierarchyLevelId);
  }

  // ==================== 工作信息历史 ====================
  @Get('employees/:id/work-info-history')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取工作信息历史列表' })
  async getWorkInfoHistoryList(@Param('id') id: string) {
    return this.hrService.getWorkInfoHistoryList(+id);
  }

  @Post('employees/:id/work-info-history')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '创建工作信息历史记录' })
  async createWorkInfoHistory(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.createWorkInfoHistory(+id, dto);
  }

  @Put('work-info-history/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '更新工作信息历史记录' })
  async updateWorkInfoHistoryById(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateWorkInfoHistory(+id, dto);
  }

  @Delete('work-info-history/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '删除工作信息历史记录' })
  async deleteWorkInfoHistory(@Param('id') id: string) {
    return this.hrService.deleteWorkInfoHistory(+id);
  }

  // ==================== 学历信息 ====================
  @Get('employees/:id/educations')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取员工学历列表' })
  async getEmployeeEducations(@Param('id') id: string) {
    return this.hrService.getEmployeeEducations(+id);
  }

  @Post('employees/:id/educations')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '创建学历信息' })
  async createEmployeeEducation(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.createEmployeeEducation(+id, dto);
  }

  @Put('educations/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '更新学历信息' })
  async updateEmployeeEducation(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateEmployeeEducation(+id, dto);
  }

  @Delete('educations/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '删除学历信息' })
  async deleteEmployeeEducation(@Param('id') id: string) {
    return this.hrService.deleteEmployeeEducation(+id);
  }

  // ==================== 工作经历 ====================
  @Get('employees/:id/work-experiences')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取员工工作经历列表' })
  async getEmployeeWorkExperiences(@Param('id') id: string) {
    return this.hrService.getEmployeeWorkExperiences(+id);
  }

  @Post('employees/:id/work-experiences')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '创建工作经历' })
  async createEmployeeWorkExperience(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.createEmployeeWorkExperience(+id, dto);
  }

  @Put('work-experiences/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '更新工作经历' })
  async updateEmployeeWorkExperience(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateEmployeeWorkExperience(+id, dto);
  }

  @Delete('work-experiences/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '删除工作经历' })
  async deleteEmployeeWorkExperience(@Param('id') id: string) {
    return this.hrService.deleteEmployeeWorkExperience(+id);
  }

  // ==================== 家庭成员 ====================
  @Get('employees/:id/family-members')
  @RequirePermissions('hr:emp:view')
  @ApiOperation({ summary: '获取员工家庭成员列表' })
  async getEmployeeFamilyMembers(@Param('id') id: string) {
    return this.hrService.getEmployeeFamilyMembers(+id);
  }

  @Post('employees/:id/family-members')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '创建家庭成员' })
  async createEmployeeFamilyMember(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.createEmployeeFamilyMember(+id, dto);
  }

  @Put('family-members/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '更新家庭成员' })
  async updateEmployeeFamilyMember(@Param('id') id: string, @Body() dto: any) {
    return this.hrService.updateEmployeeFamilyMember(+id, dto);
  }

  @Delete('family-members/:id')
  @RequirePermissions('hr:emp:edit')
  @ApiOperation({ summary: '删除家庭成员' })
  async deleteEmployeeFamilyMember(@Param('id') id: string) {
    return this.hrService.deleteEmployeeFamilyMember(+id);
  }
}
