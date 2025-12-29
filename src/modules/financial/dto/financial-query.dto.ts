import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum FinancialPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class FinancialQueryDto {
  @IsEnum(FinancialPeriod)
  @IsOptional()
  period?: FinancialPeriod = FinancialPeriod.DAILY;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
