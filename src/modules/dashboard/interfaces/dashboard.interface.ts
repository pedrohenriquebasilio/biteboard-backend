export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  ordersInProgress: number;
  ordersReady: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface RevenueResponse {
  data: RevenueData[];
}
