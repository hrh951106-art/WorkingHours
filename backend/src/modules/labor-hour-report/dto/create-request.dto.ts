import { IsString, IsNumber, IsDateString, IsOptional, IsNotEmpty, IsEnum, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReportMode {
  PERSONAL = 'personal',
  TEAM = 'team',
}

export class ReportEmployeeDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsNotEmpty()
  @IsString()
  employeeNo: string;

  @IsNotEmpty()
  @IsString()
  employeeName: string;
}

export class CreateLaborHourReportRequestDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsDateString()
  reportDate: string;

  @IsNotEmpty()
  @IsEnum(ReportMode)
  reportMode: ReportMode;

  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsString()
  employeeNo?: string;

  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportEmployeeDto)
  employees?: ReportEmployeeDto[];

  @IsNotEmpty()
  @IsString()
  hourType: string;

  @IsNotEmpty()
  @IsString()
  hourTypeName: string;

  @IsOptional()
  startTime?: string; // 格式: HH:mm，可选

  @IsOptional()
  endTime?: string; // 格式: HH:mm，可选

  @IsNotEmpty()
  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  accountId: number;

  @IsNotEmpty()
  @IsString()
  accountCode: string;

  @IsNotEmpty()
  @IsString()
  accountPath: string;

  @IsNotEmpty()
  @IsString()
  accountName: string;

  @IsNotEmpty()
  @IsNumber()
  requesterId: number;

  @IsNotEmpty()
  @IsString()
  requesterName: string;
}
