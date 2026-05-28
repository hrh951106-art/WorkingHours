import { IsString, IsInt, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum InstanceStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export class CreateWorkflowInstanceDto {
  @IsInt()
  workflowId: number;

  @IsString()
  title: string;

  @IsString()
  category: string;

  @IsInt()
  initiatorId: number;

  @IsString()
  initiatorName: string;

  @IsInt()
  initiatorOrgId: number;

  @IsString()
  initiatorOrgName: string;

  @IsOptional()
  @IsString()
  businessKey?: string;

  @IsOptional()
  data?: string;
}

export class SubmitApprovalDto {
  @IsInt()
  instanceId: number;

  @IsEnum(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ForceApprovalDto {
  @IsInt()
  instanceId: number;

  @IsInt()
  nodeId: number;

  @IsEnum(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @IsString()
  comment: string;
}

export class GetInstancesDto {
  @IsOptional()
  status?: string;

  @IsOptional()
  category?: string;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  keyword?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}
