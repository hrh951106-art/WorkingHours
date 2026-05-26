import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateUnifiedSearchConditionConfigDto {
  @ApiProperty({ description: '配置编码' })
  @IsString()
  configCode: string;

  @ApiProperty({ description: '配置名称' })
  @IsString()
  configName: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '字段编码' })
  @IsString()
  fieldCode: string;

  @ApiProperty({ description: '字段名称' })
  @IsString()
  fieldName: string;

  @ApiProperty({ description: '字段类型' })
  @IsString()
  fieldType: 'text' | 'select' | 'date' | 'dateRange' | 'organization';

  @ApiProperty({ description: '数据源编码', required: false })
  @IsOptional()
  @IsString()
  dataSourceCode?: string;

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({ description: '排序' })
  @IsNumber()
  sortOrder: number;

  @ApiProperty({ description: '可应用的页面列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  applicablePages: string[];
}

export class UpdateUnifiedSearchConditionConfigDto {
  @ApiProperty({ description: '配置编码', required: false })
  @IsOptional()
  @IsString()
  configCode?: string;

  @ApiProperty({ description: '配置名称', required: false })
  @IsOptional()
  @IsString()
  configName?: string;

  @ApiProperty({ description: '描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '字段编码', required: false })
  @IsOptional()
  @IsString()
  fieldCode?: string;

  @ApiProperty({ description: '字段名称', required: false })
  @IsOptional()
  @IsString()
  fieldName?: string;

  @ApiProperty({ description: '字段类型', required: false })
  @IsOptional()
  @IsString()
  fieldType?: 'text' | 'select' | 'date' | 'dateRange' | 'organization';

  @ApiProperty({ description: '数据源编码', required: false })
  @IsOptional()
  @IsString()
  dataSourceCode?: string;

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ description: '排序', required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ description: '可应用的页面列表', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePages?: string[];
}

export class BatchSaveUnifiedSearchConditionConfigDto {
  @ApiProperty({ description: '配置列表', type: [CreateUnifiedSearchConditionConfigDto] })
  @IsArray()
  configs: CreateUnifiedSearchConditionConfigDto[];
}

export class UnifiedSearchConditionConfigQueryDto {
  @ApiProperty({ description: '配置编码', required: false })
  @IsOptional()
  @IsString()
  configCode?: string;

  @ApiProperty({ description: '页面编码', required: false })
  @IsOptional()
  @IsString()
  pageCode?: string;
}
