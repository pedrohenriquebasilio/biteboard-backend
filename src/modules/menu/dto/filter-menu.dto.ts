import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class FilterMenuDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  available?: boolean;
}
