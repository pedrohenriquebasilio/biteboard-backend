import { Controller, Get, Query } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialQueryDto } from './dto/financial-query.dto';

@Controller('financial')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get('summary')
  getSummary(@Query() query: FinancialQueryDto) {
    return this.financialService.getSummary(query);
  }

  @Get('by-period')
  getByPeriod(@Query() query: FinancialQueryDto) {
    return this.financialService.getByPeriod(query);
  }

  @Get('today')
  getTodaySummary() {
    return this.financialService.getTodaySummary();
  }

  @Get('monthly-comparison')
  getMonthlyComparison() {
    return this.financialService.getMonthlyComparison();
  }
}
