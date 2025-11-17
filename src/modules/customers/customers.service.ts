import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCustomerDto) {
    return this.prisma.customer.create({ data });
  }

  async findAll() {
    return this.prisma.customer.findMany();
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
    });

    if (!customer) {
      return [];
    }

    return [customer];
  }

  async getAddress(phone: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer com telefone ${phone} não encontrado`,
      );
    }

    return {
      phone: customer.phone,
      endereco: customer.endereco || null,
    };
  }

  async getLastOrder(phone: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer com telefone ${phone} não encontrado`,
      );
    }

    // Buscar o último pedido do cliente
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        customerPhone: phone,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
      },
    });

    return {
      phone: customer.phone,
      customerName: customer.name,
      lastOrder: lastOrder || null,
    };
  }
}
