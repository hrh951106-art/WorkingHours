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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowDefinitionService } from './workflow-definition.service';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
} from './dto/workflow-definition.dto';

@ApiTags('Workflow')
@Controller('workflow/definitions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowDefinitionController {
  constructor(private readonly workflowDefinitionService: WorkflowDefinitionService) {}

  @Get()
  @ApiOperation({ summary: '获取工作流定义列表' })
  findAll(@Query() query: any) {
    return this.workflowDefinitionService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工作流定义详情' })
  findOne(@Param('id') id: string) {
    return this.workflowDefinitionService.findOne(+id);
  }

  @Post()
  @ApiOperation({ summary: '创建工作流定义' })
  create(@Body() createDto: CreateWorkflowDefinitionDto) {
    return this.workflowDefinitionService.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新工作流定义' })
  update(@Param('id') id: string, @Body() updateDto: UpdateWorkflowDefinitionDto) {
    return this.workflowDefinitionService.update(+id, updateDto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布工作流定义' })
  publish(@Param('id') id: string) {
    return this.workflowDefinitionService.publish(+id);
  }

  @Post(':id/new-version')
  @ApiOperation({ summary: '创建工作流新版本' })
  createNewVersion(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id || req.user?.userId || 1;
    const userName = req.user?.name || req.user?.username || '系统';
    return this.workflowDefinitionService.createNewVersion(+id, userId, userName);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工作流定义' })
  remove(@Param('id') id: string) {
    return this.workflowDefinitionService.remove(+id);
  }
}
