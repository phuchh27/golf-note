-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "lotId" TEXT;

-- CreateTable
CREATE TABLE "StockLot" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchCode" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLot_itemId_idx" ON "StockLot"("itemId");

-- CreateIndex
CREATE INDEX "StockLot_receivedAt_idx" ON "StockLot"("receivedAt");

-- CreateIndex
CREATE INDEX "StockLot_expiresAt_idx" ON "StockLot"("expiresAt");

-- CreateIndex
CREATE INDEX "StockLot_batchCode_idx" ON "StockLot"("batchCode");

-- CreateIndex
CREATE INDEX "StockMovement_lotId_idx" ON "StockMovement"("lotId");

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
