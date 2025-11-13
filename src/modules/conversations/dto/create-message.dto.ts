import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(['text', 'image', 'audio', 'document'])
  @IsOptional()
  messageType?: string = 'text';
}
