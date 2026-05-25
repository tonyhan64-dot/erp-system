/*
  Warnings:

  - You are about to drop the column `warehouseId` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `barcode` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `warehouses` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[productId,branchId]` on the table `inventory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[partNo]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `branchId` to the `inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partNo` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_warehouseId_fkey";

-- DropIndex
DROP INDEX "inventory_productId_warehouseId_key";

-- DropIndex
DROP INDEX "products_sku_key";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "branchId" INTEGER;

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "warehouseId",
ADD COLUMN     "branchId" INTEGER NOT NULL,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "barcode",
DROP COLUMN "costPrice",
DROP COLUMN "salePrice",
DROP COLUMN "sku",
ADD COLUMN     "aPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "bPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "cPrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "cost" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "partNo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "branchId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "branchId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "branchId" INTEGER;

-- DropTable
DROP TABLE "warehouses";

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "manager" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_name_key" ON "branches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_branchId_key" ON "inventory"("productId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "products_partNo_key" ON "products"("partNo");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
