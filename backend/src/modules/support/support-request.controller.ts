import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupportRequestService } from './support-request.service';
import { CreateSupportRequestDto, UpdateSupportRequestDto } from './dto/support-request.dto';

@ApiTags('Support')
@Controller('support/requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportRequestController {
  constructor(private readonly supportRequestService: SupportRequestService) {}

  @Get('my-requests')
  @ApiOperation({ summary: '获取我的支援申请列表' })
  findMyRequests(@Query() query: any, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId || 1;
    return this.supportRequestService.findMyRequests(query, userId);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: '获取待我审批的支援申请列表' })
  findPendingApprovals(@Query() query: any) {
    return this.supportRequestService.findPendingApprovals(query);
  }

  @Get()
  @ApiOperation({ summary: '获取支援申请列表' })
  findAll(@Query() query: any) {
    return this.supportRequestService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取支援申请详情' })
  findOne(@Param('id') id: string) {
    return this.supportRequestService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: '创建支援申请' })
  create(@Body() createDto: CreateSupportRequestDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId || 1;
    const userName = req.user?.name || req.user?.username || '系统';
    return this.supportRequestService.create(createDto, userId, userName);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新支援申请' })
  update(@Param('id') id: string, @Body() updateDto: UpdateSupportRequestDto) {
    return this.supportRequestService.update(+id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除支援申请' })
  remove(@Param('id') id: string) {
    return this.supportRequestService.remove(+id);
  }
}
