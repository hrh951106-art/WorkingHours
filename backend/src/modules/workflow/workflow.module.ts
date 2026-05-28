import { Module } from '@nestjs/common';
import { ParticipantConfigController } from './participant-config.controller';
import { ParticipantConfigService } from './participant-config.service';
import { WorkflowDefinitionController } from './workflow-definition.controller';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowInstanceController } from './workflow-instance.controller';
import { WorkflowInstanceService } from './workflow-instance.service';
import { AmountModule } from '../amount/amount.module';

@Module({
  imports: [AmountModule],
  controllers: [
    ParticipantConfigController,
    WorkflowDefinitionController,
    WorkflowInstanceController,
  ],
  providers: [
    ParticipantConfigService,
    WorkflowDefinitionService,
    WorkflowInstanceService,
  ],
  exports: [
    ParticipantConfigService,
    WorkflowDefinitionService,
    WorkflowInstanceService,
  ],
})
export class WorkflowModule {}
