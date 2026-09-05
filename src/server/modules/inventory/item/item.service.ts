import { ItemRepository } from "./item.repository";

import type {
  CreateItemInput,
  ItemListQuery,
  UpdateItemInput,
} from "./item.types";

const ITEM_STATUSES = new Set(["ACTIVE", "INACTIVE", "DISCONTINUED"]);

export class ItemService {
  private readonly repository = new ItemRepository();

  async getItems(query: ItemListQuery = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const { items, total } = await this.repository.findMany({
      search: query.search?.trim(),
      categoryId: query.categoryId,
      status: query.status,
      skip,
      take: limit,
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getItem(id: string) {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    return item;
  }

  async createItem(input: CreateItemInput) {
    const normalized = this.normalizeInput(input) as CreateItemInput;
    this.validate(normalized);

    const [existingSku, category] = await Promise.all([
      this.repository.findBySku(normalized.sku),
      this.repository.findCategory(normalized.categoryId),
    ]);

    if (existingSku) {
      throw new Error("ITEM_SKU_ALREADY_EXISTS");
    }

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    if (!category.isActive) {
      throw new Error("CATEGORY_INACTIVE");
    }

    return this.repository.create(normalized);
  }

  async updateItem(id: string, input: UpdateItemInput) {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    const normalized = this.normalizeInput(input, true) as UpdateItemInput;
    this.validate(normalized, true);

    if (normalized.sku && normalized.sku !== item.sku) {
      const existingSku = await this.repository.findBySku(normalized.sku);

      if (existingSku && existingSku.id !== id) {
        throw new Error("ITEM_SKU_ALREADY_EXISTS");
      }
    }

    if (normalized.categoryId && normalized.categoryId !== item.categoryId) {
      const category = await this.repository.findCategory(
        normalized.categoryId,
      );

      if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
      }

      if (!category.isActive) {
        throw new Error("CATEGORY_INACTIVE");
      }
    }

    return this.repository.update(id, normalized);
  }

  async deactivateItem(id: string) {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    return this.repository.update(id, { status: "INACTIVE" });
  }

  private normalizeInput(
    input: CreateItemInput | UpdateItemInput,
    partial = false,
  ): CreateItemInput | UpdateItemInput {
    const normalized = { ...input } as CreateItemInput | UpdateItemInput;

    if (normalized.sku !== undefined) {
      normalized.sku = normalized.sku.trim().toUpperCase();
    }

    if (normalized.name !== undefined) {
      normalized.name = normalized.name.trim();
    }

    if (normalized.description !== undefined) {
      normalized.description = normalized.description.trim() || undefined;
    }

    if (normalized.categoryId !== undefined) {
      normalized.categoryId = normalized.categoryId.trim();
    }

    if (normalized.unit !== undefined) {
      normalized.unit = normalized.unit.trim();
    }

    if (normalized.status !== undefined) {
      normalized.status = String(
        normalized.status,
      ).toUpperCase() as CreateItemInput["status"];
    }

    if (!partial && normalized.status === undefined) {
      normalized.status = "ACTIVE";
    }

    return normalized;
  }

  private validate(
    input: CreateItemInput | UpdateItemInput,
    partial = false,
  ): void {
    if (!partial || input.sku !== undefined) {
      if (!input.sku) throw new Error("ITEM_SKU_REQUIRED");
    }

    if (!partial || input.name !== undefined) {
      if (!input.name) throw new Error("ITEM_NAME_REQUIRED");
    }

    if (!partial || input.categoryId !== undefined) {
      if (!input.categoryId) throw new Error("CATEGORY_ID_REQUIRED");
    }

    if (!partial || input.unit !== undefined) {
      if (!input.unit) throw new Error("ITEM_UNIT_REQUIRED");
    }

    if (!partial || input.costPrice !== undefined) {
      this.validatePrice(input.costPrice, "ITEM_COST_PRICE_INVALID");
    }

    if (!partial || input.sellingPrice !== undefined) {
      this.validatePrice(input.sellingPrice, "ITEM_SELLING_PRICE_INVALID");
    }

    if (input.status !== undefined && !ITEM_STATUSES.has(input.status)) {
      throw new Error("ITEM_STATUS_INVALID");
    }
  }

  private validatePrice(value: number | string | undefined, error: string) {
    if (
      value === undefined ||
      value === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      throw new Error(error);
    }
  }
}
