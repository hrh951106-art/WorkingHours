import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkflowInstanceService } from './workflow-instance.service';
import {
  CreateWorkflowInstanceDto,
  SubmitApprovalDto,
  GetInstancesDto,
  ForceApprovalDto,
} from './dto/workflow-instance.dto';

@Controller('workflow/instances')
@UseGuards(JwtAuthGuard)
export class WorkflowInstanceController {
  constructor(private readonly workflowInstanceService: WorkflowInstanceService) {}

  /**
   * 获取工作流实例列表
   */
  @Get()
  async findAll(@Query() query: GetInstancesDto) {
    return this.workflowInstanceService.getInstances(query);
  }

  /**
   * 获取工作流实例详情
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workflowInstanceService.getInstance(id);
  }

  /**
   * 启动工作流实例
   */
  @Post()
  async create(@Body() dto: CreateWorkflowInstanceDto, @Req() req: any) {
    return this.workflowInstanceService.createInstance(dto);
  }

  /**
   * 提交审批
   */
  @Post('approval')
  async submitApproval(@Body() dto: SubmitApprovalDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId || 1;
    const userName = req.user?.name || req.user?.username || '系统';
    return this.workflowInstanceService.submitApproval(dto, userId, userName);
  }

  /**
   * 管理员强制跳过节点（用于处理无审批人的情况）
   */
  @Post(':instanceId/force-skip/:nodeId')
  async forceSkipNode(
    @Param('instanceId', ParseIntPipe) instanceId: number,
    @Param('nodeId', ParseIntPipe) nodeId: number,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId || 1;
    const adminName = req.user?.name || req.user?.username || '系统管理员';
    return this.workflowInstanceService.forceSkipNode(instanceId, nodeId, adminId, adminName);
  }

  /**
   * 管理员强制审批
   */
  @Post('force-approval')
  async forceApproval(@Body() dto: ForceApprovalDto, @Req() req: any) {
    const adminId = req.user?.id || req.user?.userId || 1;
    const adminName = req.user?.name || req.user?.username || '系统管理员';
    return this.workflowInstanceService.forceApproval(dto, adminId, adminName);
  }
}
