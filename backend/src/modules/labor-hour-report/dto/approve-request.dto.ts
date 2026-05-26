import { IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class ApproveLaborHourReportRequestDto {
  @IsNotEmpty()
  @IsNumber()
  approverId: number;

  @IsNotEmpty()
  @IsString()
  approverName: string;

  @IsOptional()
  @IsString()
  approvalComment?: string;
}
