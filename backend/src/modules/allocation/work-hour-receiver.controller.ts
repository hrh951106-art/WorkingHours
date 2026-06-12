import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkHourReceiverService } from './work-hour-receiver.service';

@Controller('allocation/work-hours')
@UseGuards(JwtAuthGuard)
export class WorkHourReceiverController {
  constructor(private readonly workHourReceiverService: WorkHourReceiverService) {}

  /**
   * 接收工时结果推送（内部API）
   */
  @Post('receive')
  async receiveWorkHours(@Body() data: any[]) {
    return this.workHourReceiverService.receiveWorkHourResults(data);
  }

  /**
   * 查询工时结果列表（从WorkHourResult表查询）
   */
  @Get()
  async getWorkHours(@Query() query: any) {
    return this.workHourReceiverService.getWorkHourResults(query);
  }

  /**
   * 确认工时结果
   */
  @Post(':id/confirm')
  async confirmWorkHour(@Param('id') id: string) {
    return this.workHourReceiverService.confirmWorkHourResult(+id);
  }

  /**
   * 批量确认工时结果
   */
  @Post('batch-confirm')
  async batchConfirmWorkHours(@Body() body: { ids: number[] }) {
    return this.workHourReceiverService.confirmWorkHourResults(body.ids);
  }
}
