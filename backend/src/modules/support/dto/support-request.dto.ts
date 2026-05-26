import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, IsEnum, IsDateString } from 'class-validator';

export enum SupportMode {
  FULL_DAY = 'FULL_DAY',
  TIME_BASED = 'TIME_BASED',
}

export class CreateSupportRequestDto {
  @IsEnum(SupportMode)
  @IsNotEmpty()
  supportMode: SupportMode;

  @IsInt()
  @IsNotEmpty()
  supportEmployeeId: number;

  @IsString()
  @IsNotEmpty()
  supportEmployeeName: string;

  @IsString()
  @IsNotEmpty()
  supportEmployeeNo: string;

  @IsInt()
  @IsNotEmpty()
  supportAccountId: number;

  @IsString()
  @IsNotEmpty()
  supportAccountName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  calculatedHours: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;
}

export class UpdateSupportRequestDto {
  @IsEnum(SupportMode)
  @IsOptional()
  supportMode?: SupportMode;

  @IsInt()
  @IsOptional()
  supportEmployeeId?: number;

  @IsString()
  @IsOptional()
  supportEmployeeName?: string;

  @IsString()
  @IsOptional()
  supportEmployeeNo?: string;

  @IsInt()
  @IsOptional()
  supportAccountId?: number;

  @IsString()
  @IsOptional()
  supportAccountName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  calculatedHours?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
