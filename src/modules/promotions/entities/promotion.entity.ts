import { Promotion as PrismaPromotion, DiscountType } from '@prisma/client';

export class Promotion implements PrismaPromotion {
  id: string;
  name: string;
  description: string | null;
  discount: number;
  discountType: DiscountType;
  validFrom: Date;
  validUntil: Date;
  active: boolean;
  createdAt: Date;
}
