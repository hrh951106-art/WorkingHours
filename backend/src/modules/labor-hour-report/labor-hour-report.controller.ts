import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { LaborHourReportService } from './labor-hour-report.service';
import { CreateLaborHourReportRequestDto } from './dto/create-request.dto';
import { ApproveLaborHourReportRequestDto } from './dto/approve-request.dto';

@Controller('labor-hour-report')
export class LaborHourReportController {
  constructor(private readonly laborHourReportService: LaborHourReportService) {}

  /**
   * 创建工时报表申请
   */
  @Post('requests')
  async createRequest(@Body() dto: CreateLaborHourReportRequestDto) {
    return this.laborHourReportService.createRequest(dto);
  }

  /**
   * 查询工时报表申请列表
   */
  @Get('requests')
  async getRequests(
    @Query('status') status?: string,
    @Query('employeeNo') employeeNo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.laborHourReportService.getRequests({
      status,
      employeeNo,
      startDate,
      endDate,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  /**
   * 获取申请详情
   */
  @Get('requests/:id')
  async getRequestDetail(@Param('id', ParseIntPipe) id: number) {
    return this.laborHourReportService.getRequestDetail(id);
  }

  /**
   * 获取申请的员工列表（团队报工）
   */
  @Get('requests/:id/employees')
  async getRequestEmployees(@Param('id', ParseIntPipe) id: number) {
    return this.laborHourReportService.getRequestEmployees(id);
  }

  /**
   * 审批通过
   */
  @Put('requests/:id/approve')
  async approveRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveLaborHourReportRequestDto,
  ) {
    return this.laborHourReportService.approveRequest(id, dto);
  }

  /**
   * 审批拒绝
   */
  @Put('requests/:id/reject')
  async rejectRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveLaborHourReportRequestDto,
  ) {
    return this.laborHourReportService.rejectRequest(id, dto);
  }

  /**
   * 删除申请
   */
  @Delete('requests/:id')
  async deleteRequest(@Param('id', ParseIntPipe) id: number) {
    return this.laborHourReportService.deleteRequest(id);
  }
}
