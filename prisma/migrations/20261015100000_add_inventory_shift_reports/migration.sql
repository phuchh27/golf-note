-- Snapshot-based end-of-shift inventory and sales reports.
CREATE TYPE "InventoryGroup" AS ENUM ('BEVERAGE', 'SUPPLIES');

CREATE TABLE "ShiftSchedule" (
    "code" TEXT NOT NULL,
    "labelVi" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("code")
);
CREATE INDEX "ShiftSchedule_isActive_sortOrder_idx" ON "ShiftSchedule"("isActive", "sortOrder");

INSERT INTO "ShiftSchedule" ("code", "labelVi", "labelEn", "startMinute", "endMinute", "sortOrder", "updatedAt")
VALUES
  ('MORNING', 'Ca sáng', 'Morning shift', 360, 840, 1, CURRENT_TIMESTAMP),
  ('EVENING', 'Ca tối', 'Evening shift', 840, 1320, 2, CURRENT_TIMESTAMP);

CREATE TABLE "InventoryReport" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "shiftCode" TEXT NOT NULL,
    "shiftLabel" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    CONSTRAINT "InventoryReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryReport_reportDate_shiftCode_key" ON "InventoryReport"("reportDate", "shiftCode");
CREATE INDEX "InventoryReport_reportDate_idx" ON "InventoryReport"("reportDate");
CREATE INDEX "InventoryReport_createdBy_createdAt_idx" ON "InventoryReport"("createdBy", "createdAt");

CREATE TABLE "InventoryReportItem" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "inventoryGroup" "InventoryGroup" NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "previousQuantity" DECIMAL(12,3),
    "change" DECIMAL(12,3),
    "soldQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "receivedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "adjustedIn" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "adjustedOut" DECIMAL(12,3) NOT NULL DEFAULT 0,
    CONSTRAINT "InventoryReportItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryReportItem_reportId_itemId_key" ON "InventoryReportItem"("reportId", "itemId");
CREATE INDEX "InventoryReportItem_reportId_inventoryGroup_idx" ON "InventoryReportItem"("reportId", "inventoryGroup");

CREATE TABLE "InventoryReportSale" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "customerType" "SaleCustomerType" NOT NULL,
    "roomNumber" TEXT,
    "customerName" TEXT,
    "sellerName" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "InventoryReportSale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryReportSale_reportId_saleId_key" ON "InventoryReportSale"("reportId", "saleId");
CREATE INDEX "InventoryReportSale_reportId_soldAt_idx" ON "InventoryReportSale"("reportId", "soldAt");

CREATE TABLE "InventoryReportSaleItem" (
    "id" TEXT NOT NULL,
    "reportSaleId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "InventoryReportSaleItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryReportSaleItem_reportSaleId_idx" ON "InventoryReportSaleItem"("reportSaleId");
CREATE INDEX "InventoryReportSaleItem_itemId_idx" ON "InventoryReportSaleItem"("itemId");

ALTER TABLE "InventoryReportItem" ADD CONSTRAINT "InventoryReportItem_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "InventoryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryReportSale" ADD CONSTRAINT "InventoryReportSale_reportId_fkey"
FOREIGN KEY ("reportId") REFERENCES "InventoryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryReportSaleItem" ADD CONSTRAINT "InventoryReportSaleItem_reportSaleId_fkey"
FOREIGN KEY ("reportSaleId") REFERENCES "InventoryReportSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
