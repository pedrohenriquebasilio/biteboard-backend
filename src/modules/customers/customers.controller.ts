import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('phone/:phone')
  findByPhone(@Param('phone') phone: string) {
    return this.service.findByPhone(phone);
  }

  @Get('address/:phone')
  getAddress(@Param('phone') phone: string) {
    return this.service.getAddress(phone);
  }

  @Get('last-order/:phone')
  getLastOrder(@Param('phone') phone: string) {
    return this.service.getLastOrder(phone);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
