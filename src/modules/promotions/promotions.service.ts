import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { TogglePromotionDto } from './dto/toggle-promotion.dto';
import { PromotionFilterDto } from './dto/promotion-filter.dto';
import { Promotion } from '@prisma/client';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPromotionDto: CreatePromotionDto) {
    const { validFrom, validUntil, discount, discountType } =
      createPromotionDto;

    // Validar datas
    const from = new Date(validFrom);
    const until = new Date(validUntil);

    if (from >= until) {
      throw new BadRequestException(
        'Data de início deve ser anterior à data de término',
      );
    }

    // Validar desconto percentual
    if (discountType === 'PERCENTAGE' && (discount < 0 || discount > 100)) {
      throw new BadRequestException(
        'Desconto percentual deve estar entre 0 e 100',
      );
    }

    // Validar desconto fixo
    if (discountType === 'FIXED' && discount < 0) {
      throw new BadRequestException('Desconto fixo não pode ser negativo');
    }

    const promotion = await this.prisma.promotion.create({
      data: {
        ...createPromotionDto,
        validFrom: from,
        validUntil: until,
      },
    });

    return promotion;
  }

  async findAll(filters?: PromotionFilterDto) {
    const where: any = {};

    if (filters?.active !== undefined) {
      where.active = filters.active;
    }

    if (filters?.discountType) {
      where.discountType = filters.discountType;
    }

    if (filters?.validNow) {
      const now = new Date();
      where.validFrom = { lte: now };
      where.validUntil = { gte: now };
    }

    const promotions = await this.prisma.promotion.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return promotions;
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException(`Promoção #${id} não encontrada`);
    }

    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto) {
    await this.findOne(id);

    // Validar datas se fornecidas
    if (updatePromotionDto.validFrom || updatePromotionDto.validUntil) {
      const existing = await this.findOne(id);
      const from = updatePromotionDto.validFrom
        ? new Date(updatePromotionDto.validFrom)
        : existing.validFrom;
      const until = updatePromotionDto.validUntil
        ? new Date(updatePromotionDto.validUntil)
        : existing.validUntil;

      if (from >= until) {
        throw new BadRequestException(
          'Data de início deve ser anterior à data de término',
        );
      }
    }

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...updatePromotionDto,
        validFrom: updatePromotionDto.validFrom
          ? new Date(updatePromotionDto.validFrom)
          : undefined,
        validUntil: updatePromotionDto.validUntil
          ? new Date(updatePromotionDto.validUntil)
          : undefined,
      },
    });

    return promotion;
  }

  async toggleActive(id: string, togglePromotionDto: TogglePromotionDto) {
    await this.findOne(id);

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data: {
        active: togglePromotionDto.active,
      },
    });

    return promotion;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.promotion.delete({
      where: { id },
    });

    return { message: `Promoção #${id} removida com sucesso` };
  }

  // Métodos auxiliares

  async getActivePromotions() {
    const now = new Date();

    return this.prisma.promotion.findMany({
      where: {
        active: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      orderBy: {
        discount: 'desc',
      },
    });
  }

  async calculateDiscount(
    originalPrice: number,
    promotionId: string,
  ): Promise<number> {
    const promotion = await this.findOne(promotionId);

    if (!promotion.active) {
      throw new BadRequestException('Promoção não está ativa');
    }

    const now = new Date();
    if (now < promotion.validFrom || now > promotion.validUntil) {
      throw new BadRequestException('Promoção não está válida no momento');
    }

    let discount = 0;

    if (promotion.discountType === 'PERCENTAGE') {
      discount = originalPrice * (promotion.discount / 100);
    } else {
      discount = promotion.discount;
    }

    // Garantir que o desconto não seja maior que o preço
    return Math.min(discount, originalPrice);
  }

  async applyBestPromotion(originalPrice: number): Promise<{
    finalPrice: number;
    promotion: Promotion | null;
    discount: number;
  }> {
    const activePromotions = await this.getActivePromotions();

    if (activePromotions.length === 0) {
      return {
        finalPrice: originalPrice,
        promotion: null,
        discount: 0,
      };
    }

    let bestDiscount = 0;
    let bestPromotion: Promotion | null = null;

    for (const promo of activePromotions) {
      let discount = 0;

      if (promo.discountType === 'PERCENTAGE') {
        discount = originalPrice * (promo.discount / 100);
      } else {
        discount = promo.discount;
      }

      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestPromotion = promo;
      }
    }

    const finalDiscount = Math.min(bestDiscount, originalPrice);

    return {
      finalPrice: originalPrice - finalDiscount,
      promotion: bestPromotion,
      discount: finalDiscount,
    };
  }
}
