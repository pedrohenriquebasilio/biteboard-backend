import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuItemDto } from './create-menu.dto';


export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {}
