import {
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  OrderStatus,
} from '@prisma/client';

export class Order implements PrismaOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class OrderItem implements PrismaOrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  name: string;
  quantity: number;
  price: number;
  notes: string | null;
}
