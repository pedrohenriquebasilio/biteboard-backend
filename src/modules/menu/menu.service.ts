import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu.dto';
import { UpdateMenuItemDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        ...data,
        priceCurrent: data.priceReal, // Inicialmente o preço atual é igual ao real
      },
    });
  }

  findAll() {
    return this.prisma.menuItem.findMany();
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  update(id: string, data: UpdateMenuItemDto) {
    return this.prisma.menuItem.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.menuItem.delete({ where: { id } });
  }

  async getCategories() {
    const items = await this.prisma.menuItem.findMany({
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });
    return {
      categories: items.map((item) => item.category).filter(Boolean),
    };
  }
}
