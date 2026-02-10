import { IsString, IsNotEmpty, Matches, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  phone: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPromotions: boolean = false;
}
