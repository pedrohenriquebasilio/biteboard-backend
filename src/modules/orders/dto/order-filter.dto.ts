import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderFilterDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  customerPhone?: string;
}