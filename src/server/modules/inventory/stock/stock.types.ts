export interface ReceiveStockInput {
  itemId: string;
  quantity: number | string;
  batchCode?: string;
  receivedAt?: string | Date;
  expiresAt?: string | Date;
  unitCost?: number | string;
  note?: string;
  createdBy?: string;
}

export type StockAdjustmentDirection = "IN" | "OUT";

export interface AdjustStockInput {
  itemId: string;
  quantity: number | string;
  direction: StockAdjustmentDirection;
  lotId?: string;
  unitCost?: number | string;
  note?: string;
  createdBy?: string;
}

export interface StockListQuery {
  itemId?: string;
  page?: number;
  limit?: number;
}
