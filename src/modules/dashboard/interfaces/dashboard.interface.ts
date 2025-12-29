export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  activeOrders: number;
  activeConversations: number;
  ordersInProgress: number;
  ordersReady: number;
}

export interface DashboardMetrics {
  completionRate: number;
  averageTicket: number;
  ordersInProgress: number;
  orderSLA: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface RevenueResponse {
  data: RevenueData[];
}
