import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats() {
    const stats = await this.dashboardService.getStats();
    return { data: stats };
  }

  @Get('metrics')
  async getMetrics() {
    const metrics = await this.dashboardService.getMetrics();
    return { data: metrics };
  }

  @Get('revenue')
  async getRevenue(@Query() query: RevenueQueryDto) {
    return this.dashboardService.getRevenue(query);
  }

  @Get('top-items')
  getTopSellingItems(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.getTopSellingItems(limitNumber);
  }

  @Get('peak-hours')
  getPeakHours() {
    return this.dashboardService.getPeakHours();
  }

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }
}
