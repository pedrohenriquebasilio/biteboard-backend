import { IsOptional, IsNumberString, IsDateString } from 'class-validator';

export class MessagesQueryDto {
  @IsOptional()
  @IsNumberString()
  limit?: string = '50';

  @IsOptional()
  @IsDateString()
  before?: string;

  @IsOptional()
  @IsDateString()
  after?: string;
}
