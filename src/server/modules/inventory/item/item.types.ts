import type { ItemStatus } from "../../../../../generated/prisma/client";

export interface CreateItemInput {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  unit: string;
  status?: ItemStatus;
  costPrice: number | string;
  sellingPrice: number | string;
}

export interface UpdateItemInput {
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  unit?: string;
  status?: ItemStatus;
  costPrice?: number | string;
  sellingPrice?: number | string;
}

export interface ItemListQuery {
  search?: string;
  categoryId?: string;
  status?: ItemStatus;
  page?: number;
  limit?: number;
}
