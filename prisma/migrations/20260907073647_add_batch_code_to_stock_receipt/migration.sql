-- AlterTable
ALTER TABLE "StockReceipt" ADD COLUMN     "batchCode" TEXT;

-- CreateIndex
CREATE INDEX "StockReceipt_batchCode_idx" ON "StockReceipt"("batchCode");
