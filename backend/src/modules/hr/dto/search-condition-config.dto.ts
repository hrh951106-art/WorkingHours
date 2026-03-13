import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateSearchConditionConfigDto {
  @ApiProperty({ description: '页面编码' })
  @IsString()
  pageCode: string;

  @ApiProperty({ description: '页面名称' })
  @IsString()
  pageName: string;

  @ApiProperty({ description: '字段编码' })
  @IsString()
  fieldCode: string;

  @ApiProperty({ description: '字段名称' })
  @IsString()
  fieldName: string;

  @ApiProperty({ description: '字段类型' })
  @IsString()
  fieldType: 'text' | 'select' | 'date' | 'dateRange' | 'organization';

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({ description: '排序' })
  @IsNumber()
  sortOrder: number;

  @ApiProperty({ description: '数据源编码', required: false })
  @IsOptional()
  @IsString()
  dataSourceCode?: string;
}

export class UpdateSearchConditionConfigDto {
  @ApiProperty({ description: '页面编码', required: false })
  @IsOptional()
  @IsString()
  pageCode?: string;

  @ApiProperty({ description: '页面名称', required: false })
  @IsOptional()
  @IsString()
  pageName?: string;

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

  @ApiProperty({ description: '是否启用', required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ description: '排序', required: false })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ description: '数据源编码', required: false })
  @IsOptional()
  @IsString()
  dataSourceCode?: string;
}

export class BatchSaveSearchConditionConfigDto {
  @ApiProperty({ description: '页面编码' })
  @IsString()
  pageCode: string;

  @ApiProperty({ description: '配置列表', type: [CreateSearchConditionConfigDto] })
  @IsArray()
  configs: CreateSearchConditionConfigDto[];
}

export class SearchConditionConfigQueryDto {
  @ApiProperty({ description: '页面编码', required: false })
  @IsOptional()
  @IsString()
  pageCode?: string;
}
