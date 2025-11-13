import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialQueryDto, FinancialPeriod } from './dto/financial-query.dto';
import { FinancialSummary, PeriodRevenue } from './interfcaes/financial.interface';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async getSummary(query: FinancialQueryDto): Promise<FinancialSummary> {
    const { startDate, endDate } = query;

    const start = startDate
      ? new Date(startDate)
      : this.getDefaultStartDate(query.period);
    const end = endDate ? new Date(endDate) : new Date();

    // Total de receita e pedidos
    const ordersData = await this.prisma.order.aggregate({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        total: true,
      },
      _count: true,
    });

    const totalRevenue = ordersData._sum.total || 0;
    const totalOrders = ordersData._count;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top itens vendidos
    const topSellingItems = await this.getTopSellingItems(start, end);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageTicket: Math.round(averageTicket * 100) / 100,
      topSellingItems,
    };
  }

  async getByPeriod(query: FinancialQueryDto): Promise<PeriodRevenue[]> {
    const { period, startDate, endDate } = query;

    const start = startDate
      ? new Date(startDate)
      : this.getDefaultStartDate(period);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Agrupar por período
    const periodMap = new Map<string, { revenue: number; orders: number }>();

    orders.forEach((order) => {
      const key = this.getPeriodKey(new Date(order.createdAt), period);
      const current = periodMap.get(key) || { revenue: 0, orders: 0 };

      periodMap.set(key, {
        revenue: current.revenue + order.total,
        orders: current.orders + 1,
      });
    });

    // Converter para array
    const result = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
        averageTicket:
          data.orders > 0
            ? Math.round((data.revenue / data.orders) * 100) / 100
            : 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return result;
  }

  private async getTopSellingItems(start: Date, end: Date, limit: number = 10) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['name', 'menuItemId'],
      where: {
        order: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      },
      _sum: {
        quantity: true,
        price: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    return items.map((item) => ({
      itemName: item.name,
      menuItemId: item.menuItemId,
      quantity: item._sum.quantity || 0,
      revenue: Math.round((item._sum.price || 0) * 100) / 100,
    }));
  }

  private getDefaultStartDate(period: FinancialPeriod): Date {
    const now = new Date();
    const start = new Date(now);

    switch (period) {
      case FinancialPeriod.DAILY:
        start.setDate(start.getDate() - 30); // Últimos 30 dias
        break;
      case FinancialPeriod.WEEKLY:
        start.setDate(start.getDate() - 90); // Últimos 90 dias
        break;
      case FinancialPeriod.MONTHLY:
        start.setMonth(start.getMonth() - 12); // Últimos 12 meses
        break;
    }

    return start;
  }

  private getPeriodKey(date: Date, period: FinancialPeriod): string {
    switch (period) {
      case FinancialPeriod.DAILY:
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      case FinancialPeriod.WEEKLY:
        const firstDayOfWeek = new Date(date);
        firstDayOfWeek.setDate(date.getDate() - date.getDay());
        return `Semana de ${firstDayOfWeek.toISOString().split('T')[0]}`;
      case FinancialPeriod.MONTHLY:
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  async getTodaySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ordersData = await this.prisma.order.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        total: true,
      },
      _count: true,
    });

    const totalRevenue = ordersData._sum.total || 0;
    const totalOrders = ordersData._count;

    return {
      date: today.toISOString().split('T')[0],
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      averageTicket:
        totalOrders > 0
          ? Math.round((totalRevenue / totalOrders) * 100) / 100
          : 0,
    };
  }

  async getMonthlyComparison() {
    const now = new Date();

    // Mês atual
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Mês anterior
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    const [currentMonth, lastMonth] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const currentRevenue = currentMonth._sum.total || 0;
    const lastRevenue = lastMonth._sum.total || 0;
    const growthPercentage =
      lastRevenue > 0
        ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
        : 0;

    return {
      currentMonth: {
        revenue: Math.round(currentRevenue * 100) / 100,
        orders: currentMonth._count,
      },
      lastMonth: {
        revenue: Math.round(lastRevenue * 100) / 100,
        orders: lastMonth._count,
      },
      growth: {
        percentage: Math.round(growthPercentage * 100) / 100,
        absolute: Math.round((currentRevenue - lastRevenue) * 100) / 100,
      },
    };
  }
}
