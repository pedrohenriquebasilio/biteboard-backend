import { IsOptional, IsEnum, IsNumberString } from 'class-validator';

export class ConversationQueryDto {
  @IsOptional()
  @IsEnum(['active', 'closed'])
  status?: string;

  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '20';
}
