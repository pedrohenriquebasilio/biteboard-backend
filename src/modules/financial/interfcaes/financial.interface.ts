export interface TopSellingItem {
  itemName: string;
  menuItemId: string | null;
  quantity: number;
  revenue: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  topSellingItems: TopSellingItem[];
}

export interface PeriodRevenue {
  period: string;
  revenue: number;
  orders: number;
  averageTicket: number;
}
