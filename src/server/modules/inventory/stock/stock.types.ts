export interface ReceiveStockItemInput {
  itemId: string;
  quantity: number | string;
  receivedAt?: string | Date;
  producedAt?: string | Date;
  expiresAt?: string | Date;
  batchCode?: string;
  unitCost?: number | string;
  note?: string;
  createdBy?: string;
}

export interface ReceiveStockInput extends ReceiveStockItemInput {
  hasReceipt?: boolean;
  receiptNumber?: string;
  supplierName?: string;
  batchCode?: string;
  items?: ReceiveStockItemInput[];
}

export type StockAdjustmentDirection = "IN" | "OUT";

export interface AdjustStockInput {
  itemId: string;
  quantity: number | string;
  direction: StockAdjustmentDirection;
  lotId?: string;
  reasonType?: "OTHER" | "DAMAGE" | "DISPOSAL";
  unitCost?: number | string;
  note?: string;
  createdBy?: string;
}

export interface BorrowStockInput {
  itemId: string;
  lotId?: string;
  quantity: number | string;
  borrower: string;
  note?: string;
}

export interface StockListQuery {
  receiptNumber?: string;
  itemId?: string;
  batchCode?: string;
  lotId?: string;
  page?: number;
  limit?: number;
}
