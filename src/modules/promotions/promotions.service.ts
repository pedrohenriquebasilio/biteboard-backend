import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async create(createPromotionDto: CreatePromotionDto) {
    const { menuItemId, priceCurrent, validFrom, validUntil } =
      createPromotionDto;

    // Validar se o item do cardápio existe
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      throw new NotFoundException(
        `Item do cardápio #${menuItemId} não encontrado`,
      );
    }

    // Validar datas
    const from = new Date(validFrom);
    const until = new Date(validUntil);

    if (from >= until) {
      throw new BadRequestException(
        'Data de início deve ser anterior à data de término',
      );
    }

    // Validar se o novo preço é válido
    if (priceCurrent < 0) {
      throw new BadRequestException('O preço não pode ser negativo');
    }

    if (priceCurrent >= menuItem.priceReal) {
      throw new BadRequestException(
        'O preço com desconto deve ser menor que o preço original',
      );
    }

    // Verificar se já existe uma promoção ativa para este item
    const existingPromotion = await this.prisma.promotion.findUnique({
      where: { menuItemId },
    });

    if (existingPromotion && existingPromotion.active) {
      throw new BadRequestException(
        'Já existe uma promoção ativa para este item',
      );
    }

    // Se existe uma promoção inativa, delete antes de criar uma nova
    if (existingPromotion) {
      await this.prisma.promotion.delete({
        where: { id: existingPromotion.id },
      });
    }

    // Criar promoção e atualizar o preço do item
    const promotion = await this.prisma.$transaction(async (tx) => {
      // Atualizar o preço atual do item
      await tx.menuItem.update({
        where: { id: menuItemId },
        data: { priceCurrent },
      });

      // Criar a promoção
      return tx.promotion.create({
        data: {
          menuItemId,
          priceCurrent,
          validFrom: from,
          validUntil: until,
          active: true,
        },
        include: {
          menuItem: true,
        },
      });
    });

    return promotion;
  }

  async findAll() {
    const promotions = await this.prisma.promotion.findMany({
      include: {
        menuItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return promotions;
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        menuItem: true,
      },
    });

    if (!promotion) {
      throw new NotFoundException(`Promoção #${id} não encontrada`);
    }

    return promotion;
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto) {
    const promotion = await this.findOne(id);

    // Se está atualizando o menuItemId, validar se o novo item existe
    if (
      updatePromotionDto.menuItemId &&
      updatePromotionDto.menuItemId !== promotion.menuItemId
    ) {
      const newMenuItem = await this.prisma.menuItem.findUnique({
        where: { id: updatePromotionDto.menuItemId },
      });

      if (!newMenuItem) {
        throw new NotFoundException(
          `Item do cardápio #${updatePromotionDto.menuItemId} não encontrado`,
        );
      }

      // Verificar se já existe outra promoção para este novo item
      const existingPromotion = await this.prisma.promotion.findUnique({
        where: { menuItemId: updatePromotionDto.menuItemId },
      });

      if (existingPromotion && existingPromotion.id !== id) {
        throw new BadRequestException('Já existe uma promoção para este item');
      }
    }

    // Validar datas se fornecidas
    if (updatePromotionDto.validFrom || updatePromotionDto.validUntil) {
      const from = updatePromotionDto.validFrom
        ? new Date(updatePromotionDto.validFrom)
        : promotion.validFrom;
      const until = updatePromotionDto.validUntil
        ? new Date(updatePromotionDto.validUntil)
        : promotion.validUntil;

      if (from >= until) {
        throw new BadRequestException(
          'Data de início deve ser anterior à data de término',
        );
      }
    }

    // Se está atualizando o preço, validar
    if (updatePromotionDto.priceCurrent !== undefined) {
      if (updatePromotionDto.priceCurrent < 0) {
        throw new BadRequestException('O preço não pode ser negativo');
      }

      const priceReal = promotion.menuItem.priceReal;
      if (updatePromotionDto.priceCurrent >= priceReal) {
        throw new BadRequestException(
          'O preço com desconto deve ser menor que o preço original',
        );
      }
    }

    // Atualizar a promoção
    const newPromotion = await this.prisma.$transaction(async (tx) => {
      // Se houver mudança de item, restaurar o preço do item antigo
      if (
        updatePromotionDto.menuItemId &&
        updatePromotionDto.menuItemId !== promotion.menuItemId
      ) {
        await tx.menuItem.update({
          where: { id: promotion.menuItemId },
          data: { priceCurrent: promotion.menuItem.priceReal }, // Restaurar preço real
        });
      }

      // Atualizar o item com o novo preço se necessário
      if (updatePromotionDto.priceCurrent !== undefined) {
        const itemId = updatePromotionDto.menuItemId || promotion.menuItemId;
        await tx.menuItem.update({
          where: { id: itemId },
          data: { priceCurrent: updatePromotionDto.priceCurrent },
        });
      }

      // Atualizar a promoção
      return tx.promotion.update({
        where: { id },
        data: {
          menuItemId: updatePromotionDto.menuItemId,
          priceCurrent: updatePromotionDto.priceCurrent,
          validFrom: updatePromotionDto.validFrom
            ? new Date(updatePromotionDto.validFrom)
            : undefined,
          validUntil: updatePromotionDto.validUntil
            ? new Date(updatePromotionDto.validUntil)
            : undefined,
        },
        include: {
          menuItem: true,
        },
      });
    });

    return newPromotion;
  }

  async remove(id: string) {
    const promotion = await this.findOne(id);

    // Remover a promoção e restaurar o preço original do item
    await this.prisma.$transaction(async (tx) => {
      // Restaurar o preço real do item
      await tx.menuItem.update({
        where: { id: promotion.menuItemId },
        data: { priceCurrent: promotion.menuItem.priceReal },
      });

      // Deletar a promoção
      await tx.promotion.delete({
        where: { id },
      });
    });

    return { message: `Promoção #${id} removida com sucesso` };
  }

  async getActivePromotions() {
    const now = new Date();

    return this.prisma.promotion.findMany({
      where: {
        active: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        menuItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getPromotionByMenuItem(menuItemId: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { menuItemId },
      include: {
        menuItem: true,
      },
    });

    return promotion || null;
  }
}
