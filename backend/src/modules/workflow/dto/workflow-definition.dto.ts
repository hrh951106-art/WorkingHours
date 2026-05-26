import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateWorkflowDefinitionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  formConfig?: string;

  @IsString()
  @IsNotEmpty()
  flowConfig: string;

  @IsInt()
  @IsNotEmpty()
  createdById: number;

  @IsString()
  @IsNotEmpty()
  createdByName: string;
}

export class UpdateWorkflowDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  formConfig?: string;

  @IsString()
  @IsOptional()
  flowConfig?: string;

  @IsInt()
  @IsOptional()
  updatedById?: number;

  @IsString()
  @IsOptional()
  updatedByName?: string;
}
