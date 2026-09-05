export type SaleCustomerType = "ROOM" | "EXTERNAL";

export interface CreateSaleItemInput {
  itemId: string;
  quantity: number | string;
}

export interface CreateSaleInput {
  customerType: SaleCustomerType;
  roomNumber?: string;
  customerName?: string;
  note?: string;
  soldAt?: string | Date;
  createdBy?: string;
  items: CreateSaleItemInput[];
}

export interface SaleListQuery {
  dateFrom?: string;
  dateTo?: string;
  customerType?: SaleCustomerType;
  roomNumber?: string;
  page?: number;
  limit?: number;
}
