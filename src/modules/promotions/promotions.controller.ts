import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { TogglePromotionDto } from './dto/toggle-promotion.dto';
import { PromotionFilterDto } from './dto/promotion-filter.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  @Get()
  findAll(@Query() filters: PromotionFilterDto) {
    return this.promotionsService.findAll(filters);
  }

  @Get('active')
  getActivePromotions() {
    return this.promotionsService.getActivePromotions();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id); // ← SEM +id
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, updatePromotionDto); // ← SEM +id
  }

  @Patch(':id/toggle')
  toggleActive(
    @Param('id') id: string,
    @Body() togglePromotionDto: TogglePromotionDto,
  ) {
    return this.promotionsService.toggleActive(id, togglePromotionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id); // ← SEM +id
  }

  @Get(':id/calculate')
  calculateDiscount(@Param('id') id: string, @Query('price') price: string) {
    const originalPrice = parseFloat(price);
    if (isNaN(originalPrice)) {
      return { error: 'Preço inválido' };
    }
    return this.promotionsService.calculateDiscount(originalPrice, id);
  }

  @Get('apply/best')
  applyBestPromotion(@Query('price') price: string) {
    const originalPrice = parseFloat(price);
    if (isNaN(originalPrice)) {
      return { error: 'Preço inválido' };
    }
    return this.promotionsService.applyBestPromotion(originalPrice);
  }
}
