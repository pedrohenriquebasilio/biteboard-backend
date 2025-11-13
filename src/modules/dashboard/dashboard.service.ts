import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RevenueQueryDto, RevenuePeriod } from './dto/revenue-query.dto';
import {
  DashboardStats,
  RevenueResponse,
} from './interfaces/dashboard.interface';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const todayRevenueData = await this.prisma.order.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        total: true,
      },
    });

    const activeOrders = await this.prisma.order.count({
      where: {
        status: {
          not: OrderStatus.DELIVERED,
        },
      },
    });

    const ordersInProgress = await this.prisma.order.count({
      where: {
        status: OrderStatus.PREPARING,
      },
    });

    const ordersReady = await this.prisma.order.count({
      where: {
        status: OrderStatus.READY,
      },
    });

    return {
      todayOrders,
      todayRevenue: todayRevenueData._sum.total || 0,
      activeOrders,
      ordersInProgress,
      ordersReady,
    };
  }

  async getRevenue(query: RevenueQueryDto): Promise<RevenueResponse> {
    const { period, startDate, endDate } = query;

    const end = endDate ? new Date(endDate) : new Date();
    let start: Date;

    if (startDate) {
      start = new Date(startDate);
    } else {
      start = new Date(end);
      switch (period) {
        case RevenuePeriod.DAILY:
          start.setDate(start.getDate() - 30);
          break;
        case RevenuePeriod.WEEKLY:
          start.setDate(start.getDate() - 90);
          break;
        case RevenuePeriod.MONTHLY:
          start.setMonth(start.getMonth() - 12);
          break;
      }
    }

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

    const revenueMap = new Map<string, number>();

    orders.forEach((order) => {
      let key: string;
      const date = new Date(order.createdAt);

      switch (period) {
        case RevenuePeriod.DAILY:
          key = date.toISOString().split('T')[0];
          break;
        case RevenuePeriod.WEEKLY:
          { const firstDayOfWeek = new Date(date);
          firstDayOfWeek.setDate(date.getDate() - date.getDay());
          key = firstDayOfWeek.toISOString().split('T')[0];
          break; }
        case RevenuePeriod.MONTHLY:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
      }

      const current = revenueMap.get(key) || 0;
      revenueMap.set(key, current + order.total);
    });

    const data = Array.from(revenueMap.entries())
      .map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { data };
  }

  async getTopSellingItems(limit: number = 10) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['name', 'menuItemId'],
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    return items.map((item) => ({
      name: item.name,
      menuItemId: item.menuItemId,
      totalQuantity: item._sum.quantity || 0,
      timesOrdered: item._count.id,
    }));
  }

  async getPeakHours() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    const hourlyCount = new Map<number, number>();

    orders.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
    });

    const peakHours = Array.from(hourlyCount.entries())
      .map(([hour, count]) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        orderCount: count,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    return peakHours;
  }

  async getSummary() {
    const stats = await this.getStats();
    const topItems = await this.getTopSellingItems(5);
    const peakHours = await this.getPeakHours();

    return {
      stats,
      topItems,
      peakHours: peakHours.slice(0, 5),
    };
  }
}
