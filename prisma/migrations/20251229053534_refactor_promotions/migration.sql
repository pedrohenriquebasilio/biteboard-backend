/*
  Warnings:

  - You are about to drop the column `price` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `discountType` on the `Promotion` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Promotion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[menuItemId]` on the table `Promotion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `priceCurrent` to the `MenuItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceReal` to the `MenuItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `menuItemId` to the `Promotion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCurrent` to the `Promotion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Promotion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "lastOrder" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MenuItem" DROP COLUMN "price",
ADD COLUMN     "priceCurrent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "priceReal" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Promotion" DROP COLUMN "description",
DROP COLUMN "discount",
DROP COLUMN "discountType",
DROP COLUMN "name",
ADD COLUMN     "menuItemId" TEXT NOT NULL,
ADD COLUMN     "priceCurrent" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "DiscountType";

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_menuItemId_key" ON "Promotion"("menuItemId");

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
