-- Support receipts without a printed voucher number while keeping an internal receipt row.
ALTER TABLE "StockReceipt" ALTER COLUMN "receiptNumber" DROP NOT NULL;

-- Preserve production dates on each expiry lot.
ALTER TABLE "StockLot" ADD COLUMN "producedAt" TIMESTAMP(3);

-- Classify stock write-offs and loan lifecycle movements explicitly.
ALTER TYPE "StockMovementType" ADD VALUE 'DAMAGE_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'DISPOSAL_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'LOAN_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'LOAN_RETURN';

CREATE TYPE "StockLoanStatus" AS ENUM ('BORROWED', 'RETURNED');

CREATE TABLE "StockLoan" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "borrower" TEXT NOT NULL,
    "note" TEXT,
    "status" "StockLoanStatus" NOT NULL DEFAULT 'BORROWED',
    "borrowedBy" TEXT,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "returnNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLoan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockLoan_itemId_status_idx" ON "StockLoan"("itemId", "status");
CREATE INDEX "StockLoan_lotId_idx" ON "StockLoan"("lotId");
CREATE INDEX "StockLoan_borrowedAt_idx" ON "StockLoan"("borrowedAt");
CREATE INDEX "StockLoan_borrowedBy_idx" ON "StockLoan"("borrowedBy");

ALTER TABLE "StockLoan" ADD CONSTRAINT "StockLoan_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockLoan" ADD CONSTRAINT "StockLoan_lotId_fkey"
    FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
