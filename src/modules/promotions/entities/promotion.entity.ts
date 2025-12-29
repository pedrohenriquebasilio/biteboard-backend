import { Promotion as PrismaPromotion } from '@prisma/client';

export class Promotion implements PrismaPromotion {
  id: string;
  menuItemId: string;
  priceCurrent: number;
  validFrom: Date;
  validUntil: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
