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
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BiReportService } from './bi-report.service';
import { DataModelService } from './data-model.service';
import { BiReportConfigService } from './bi-report-config.service';

@Controller('bi-report')
@UseGuards(JwtAuthGuard)
export class BiReportController {
  constructor(
    private readonly biReportService: BiReportService,
    private readonly dataModelService: DataModelService,
    private readonly reportConfigService: BiReportConfigService,
  ) {}

  // ==================== 数据源管理 ====================

  /**
   * 获取所有数据库表
   */
  @Get('datasource/tables')
  async getDatabaseTables() {
    return this.biReportService.getDatabaseTables();
  }

  /**
   * 获取表结构
   */
  @Get('datasource/tables/:tableName/structure')
  async getTableStructure(@Param('tableName') tableName: string) {
    return this.biReportService.getTableStructure(tableName);
  }

  /**
   * 预览表数据
   */
  @Get('datasource/tables/:tableName/preview')
  async previewTableData(
    @Param('tableName') tableName: string,
    @Query('limit') limit?: number,
  ) {
    return this.biReportService.previewTableData(tableName, limit);
  }

  /**
   * 搜索表
   */
  @Get('datasource/tables/search')
  async searchTables(@Query('keyword') keyword: string) {
    return this.biReportService.searchTables(keyword);
  }

  /**
   * 执行自定义SQL
   */
  @Post('datasource/execute-sql')
  async executeSql(@Body() data: { sql: string; params?: any[] }) {
    return this.biReportService.executeSql(data.sql, data.params || []);
  }

  /**
   * 获取表的关联关系
   */
  @Get('datasource/tables/:tableName/relations')
  async getTableRelations(@Param('tableName') tableName: string) {
    return this.biReportService.getTableRelations(tableName);
  }

  // ==================== 数据模型管理 ====================

  /**
   * 创建数据模型
   */
  @Post('models')
  async createModel(@Body() data: any, @Request() req) {
    return this.dataModelService.createModel({
      ...data,
      userId: req.user.userId || req.user.id,
    });
  }

  /**
   * 批量生成内置数据模型
   */
  @Post('models/generate-builtin')
  async generateBuiltinModels() {
    return this.dataModelService.generateBuiltinModels();
  }

  /**
   * 重新生成模型字段
   */
  @Post('models/:id/regenerate-fields')
  async regenerateModelFields(@Param('id') id: string) {
    return this.dataModelService.regenerateModelFields(parseInt(id));
  }

  /**
   * 创建复合模型
   */
  @Post('models/composite')
  async createCompositeModel(@Body() data: any) {
    return this.dataModelService.createCompositeModel(data);
  }

  /**
   * 预览数据处理流程
   */
  @Post('models/preview-data')
  async previewDataProcess(@Body() data: { nodes: any[]; connections: any[] }) {
    return this.dataModelService.previewDataProcess(data.nodes, data.connections);
  }

  /**
   * 获取数据模型列表
   */
  @Get('models')
  async getModelList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.dataModelService.getModelList({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      keyword,
      status,
    });
  }

  /**
   * 获取数据模型详情
   */
  @Get('models/:id')
  async getModelDetail(@Param('id') id: string) {
    return this.dataModelService.getModelDetail(parseInt(id));
  }

  /**
   * 更新数据模型
   */
  @Put('models/:id')
  async updateModel(@Param('id') id: string, @Body() data: any) {
    return this.dataModelService.updateModel(parseInt(id), data);
  }

  /**
   * 删除数据模型
   */
  @Delete('models/:id')
  async deleteModel(@Param('id') id: string) {
    return this.dataModelService.deleteModel(parseInt(id));
  }

  /**
   * 添加模型字段
   */
  @Post('models/:modelId/fields')
  async addField(@Param('modelId') modelId: string, @Body() data: any) {
    return this.dataModelService.addField(parseInt(modelId), data);
  }

  /**
   * 批量添加模型字段
   */
  @Post('models/:modelId/fields/batch')
  async addFieldsBatch(@Param('modelId') modelId: string, @Body() data: { fields: any[] }) {
    return this.dataModelService.addFieldsBatch(parseInt(modelId), data.fields);
  }

  /**
   * 更新模型字段
   */
  @Put('models/:modelId/fields/:fieldId')
  async updateField(
    @Param('modelId') modelId: string,
    @Param('fieldId') fieldId: string,
    @Body() data: any,
  ) {
    return this.dataModelService.updateField(parseInt(fieldId), data);
  }

  /**
   * 删除模型字段
   */
  @Delete('models/:modelId/fields/:fieldId')
  async deleteField(@Param('fieldId') fieldId: string) {
    return this.dataModelService.deleteField(parseInt(fieldId));
  }

  /**
   * 添加模型关联关系
   */
  @Post('models/:modelId/relations')
  async addRelation(@Param('modelId') modelId: string, @Body() data: any) {
    return this.dataModelService.addRelation(parseInt(modelId), data);
  }

  /**
   * 删除关联关系
   */
  @Delete('models/:modelId/relations/:relationId')
  async deleteRelation(@Param('relationId') relationId: string) {
    return this.dataModelService.deleteRelation(parseInt(relationId));
  }

  /**
   * 执行模型查询
   */
  @Post('models/:modelId/query')
  async executeModelQuery(@Param('modelId') modelId: string, @Body() config: any) {
    return this.dataModelService.executeModelQuery(parseInt(modelId), config);
  }

  // ==================== 报表配置管理 ====================

  /**
   * 创建报表
   */
  @Post('reports')
  async createReport(@Body() data: any, @Request() req) {
    return this.reportConfigService.createReport({
      ...data,
      userId: req.user.userId || req.user.id,
    });
  }

  /**
   * 获取报表列表
   */
  @Get('reports')
  async getReportList(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.reportConfigService.getReportList({
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      keyword,
      type,
      category,
      status,
    });
  }

  /**
   * 获取报表详情
   */
  @Get('reports/:id')
  async getReportDetail(@Param('id') id: string) {
    return this.reportConfigService.getReportDetail(parseInt(id));
  }

  /**
   * 更新报表
   */
  @Put('reports/:id')
  async updateReport(@Param('id') id: string, @Body() data: any) {
    return this.reportConfigService.updateReport(parseInt(id), data);
  }

  /**
   * 删除报表
   */
  @Delete('reports/:id')
  async deleteReport(@Param('id') id: string) {
    return this.reportConfigService.deleteReport(parseInt(id));
  }

  /**
   * 复制报表
   */
  @Post('reports/:id/duplicate')
  async duplicateReport(@Param('id') id: string, @Request() req) {
    return this.reportConfigService.duplicateReport(
      parseInt(id),
      req.user.userId || req.user.id,
    );
  }

  /**
   * 发布报表
   */
  @Post('reports/:id/publish')
  async publishReport(@Param('id') id: string) {
    return this.reportConfigService.publishReport(parseInt(id));
  }

  /**
   * 归档报表
   */
  @Post('reports/:id/archive')
  async archiveReport(@Param('id') id: string) {
    return this.reportConfigService.archiveReport(parseInt(id));
  }

  /**
   * 查询报表数据
   */
  @Post('reports/:id/query')
  async queryReportData(@Param('id') id: string, @Body() params?: any) {
    return this.reportConfigService.queryReportData(parseInt(id), params);
  }

  /**
   * 获取报表统计信息
   */
  @Get('reports/:id/statistics')
  async getReportStatistics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportConfigService.getReportStatistics(parseInt(id), {
      startDate,
      endDate,
    });
  }

  // ==================== 报表组件管理 ====================

  /**
   * 添加报表组件
   */
  @Post('reports/:reportId/widgets')
  async addWidget(@Param('reportId') reportId: string, @Body() data: any) {
    return this.reportConfigService.addWidget(parseInt(reportId), data);
  }

  /**
   * 更新报表组件
   */
  @Put('widgets/:widgetId')
  async updateWidget(@Param('widgetId') widgetId: string, @Body() data: any) {
    return this.reportConfigService.updateWidget(parseInt(widgetId), data);
  }

  /**
   * 删除报表组件
   */
  @Delete('widgets/:widgetId')
  async deleteWidget(@Param('widgetId') widgetId: string) {
    return this.reportConfigService.deleteWidget(parseInt(widgetId));
  }

  // ==================== 报表参数管理 ====================

  /**
   * 添加报表参数
   */
  @Post('reports/:reportId/parameters')
  async addReportParameter(@Param('reportId') reportId: string, @Body() data: any) {
    return this.reportConfigService.addReportParameter(parseInt(reportId), data);
  }

  /**
   * 获取报表参数列表
   */
  @Get('reports/:reportId/parameters')
  async getReportParameters(@Param('reportId') reportId: string) {
    return this.reportConfigService.getReportParameters(parseInt(reportId));
  }

  /**
   * 更新报表参数
   */
  @Put('parameters/:parameterId')
  async updateReportParameter(@Param('parameterId') parameterId: string, @Body() data: any) {
    return this.reportConfigService.updateReportParameter(parseInt(parameterId), data);
  }

  /**
   * 删除报表参数
   */
  @Delete('parameters/:parameterId')
  async deleteReportParameter(@Param('parameterId') parameterId: string) {
    return this.reportConfigService.deleteReportParameter(parseInt(parameterId));
  }

  // ==================== 统计分析 ====================

  /**
   * 获取热门报表排行
   */
  @Get('statistics/popular')
  async getPopularReports(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // TODO: Implement getPopularReports in service
    return {
      message: 'Popular reports statistics not yet implemented',
      limit: limit ? parseInt(limit) : 10,
      startDate,
      endDate,
    };
  }
}
