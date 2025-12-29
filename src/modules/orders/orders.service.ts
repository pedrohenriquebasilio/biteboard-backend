import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { OrderStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { customerName, customerPhone, items } = createOrderDto;

    // Validar que todos os itens têm menuItemId ou menuItemName
    if (!items || items.length === 0) {
      throw new BadRequestException('Pedido deve ter pelo menos um item');
    }

    // Validar que cada item tem ID ou nome
    for (const item of items) {
      if (!item.menuItemId && !item.menuItemName) {
        throw new BadRequestException(
          'Cada item deve ter menuItemId ou menuItemName',
        );
      }
    }

    // Buscar todos os itens do menu por ID e por nome
    const menuItemIds = items
      .filter((item) => item.menuItemId)
      .map((item) => item.menuItemId!);

    const menuItemNames = items
      .filter((item) => item.menuItemName && !item.menuItemId)
      .map((item) => item.menuItemName!);

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        OR: [{ id: { in: menuItemIds } }, { name: { in: menuItemNames } }],
      },
    });

    if (menuItems.length !== items.length) {
      throw new BadRequestException(
        'Um ou mais itens do menu não foram encontrados',
      );
    }

    // Criar mapa de preços por ID e por nome
    const priceMapById = new Map(menuItems.map((item) => [item.id, item]));
    const priceMapByName = new Map(menuItems.map((item) => [item.name, item]));

    // Preparar items com preço calculado
    const itemsWithPrice = items.map((item) => {
      const menuItem =
        (item.menuItemId && priceMapById.get(item.menuItemId)) ||
        (item.menuItemName && priceMapByName.get(item.menuItemName));

      if (!menuItem) {
        throw new BadRequestException(
          `Item não encontrado: ${item.menuItemId || item.menuItemName}`,
        );
      }

      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.priceCurrent,
        notes: null,
      };
    });

    const total = this.calculateTotal(itemsWithPrice);

    const order = await this.prisma.order.create({
      data: {
        customerName,
        customerPhone,
        total,
        status: OrderStatus.NEW,
        items: {
          create: itemsWithPrice,
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
    this.realtimeGateway.emitNewOrder(order);

    return order;
  }

  async findAll(filters?: OrderFilterDto) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.customerPhone) {
      where.customerPhone = { contains: filters.customerPhone };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders;
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido #${id} não encontrado`);
    }

    return order;
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto) {
    const currentOrder = await this.findOne(id);
    const oldStatus = currentOrder.status;

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderStatusDto.status,
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
    this.realtimeGateway.emitOrderUpdated(order);
    this.realtimeGateway.emitOrderStatusChanged(id, oldStatus, order.status);

    return order;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Primeiro deletar todos os itens do pedido
    await this.prisma.orderItem.deleteMany({
      where: {
        orderId: id,
      },
    });

    // Depois deletar o pedido
    await this.prisma.order.delete({
      where: { id },
    });

    return { message: `Pedido #${id} removido com sucesso` };
  }

  private calculateTotal(
    items: Array<{ quantity: number; price: number }>,
  ): number {
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }

  async getOrderStats(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [total, byStatus] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalOrders: total._count,
      totalRevenue: total._sum.total || 0,
      byStatus: byStatus.map((item) => ({
        status: item.status,
        count: item._count,
      })),
    };
  }
}
