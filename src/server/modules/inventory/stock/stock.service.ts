import { prisma } from "../../../core/database/prisma.client";

import type {
  AdjustStockInput,
  ReceiveStockInput,
  StockListQuery,
} from "./stock.types";

const STOCK_MOVEMENT_TYPES = {
  IN: "ADJUSTMENT_IN",
  OUT: "ADJUSTMENT_OUT",
} as const;

export class StockService {
  async getCurrentStock(query: StockListQuery = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where = query.itemId ? { id: query.itemId } : {};
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          category: true,
          stockBalance: true,
          stockLots: {
            orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }],
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);

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

  async getItemStock(itemId: string) {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        category: true,
        stockBalance: true,
        stockLots: {
          orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }],
        },
      },
    });

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    return item;
  }

  async getMovements(itemId: string, query: StockListQuery = {}) {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true },
    });

    if (!item) {
      throw new Error("ITEM_NOT_FOUND");
    }

    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const where = { itemId };

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { lot: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

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

  async receiveStock(input: ReceiveStockInput) {
    const quantity = this.parsePositiveNumber(input.quantity, "QUANTITY");
    const unitCost = this.parseOptionalNumber(input.unitCost, "UNIT_COST");
    const receivedAt =
      this.parseDate(input.receivedAt, "RECEIVED_AT") ?? new Date();
    const expiresAt = this.parseDate(input.expiresAt, "EXPIRES_AT");

    if (expiresAt && expiresAt <= receivedAt) {
      throw new Error("EXPIRES_AT_MUST_BE_AFTER_RECEIVED_AT");
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: input.itemId },
        select: { id: true, status: true },
      });

      if (!item) {
        throw new Error("ITEM_NOT_FOUND");
      }

      if (item.status !== "ACTIVE") {
        throw new Error("ITEM_NOT_ACTIVE");
      }

      const balance = await tx.stockBalance.upsert({
        where: { itemId: item.id },
        update: {},
        create: { itemId: item.id, quantity: 0 },
      });
      const balanceBefore = Number(balance.quantity);
      const balanceAfter = balanceBefore + quantity;

      const lot = await tx.stockLot.create({
        data: {
          itemId: item.id,
          batchCode: input.batchCode?.trim() || undefined,
          receivedAt,
          expiresAt,
          quantity,
          unitCost,
          note: input.note?.trim() || undefined,
        },
      });

      await tx.stockBalance.update({
        where: { itemId: item.id },
        data: { quantity: balanceAfter },
      });

      const movement = await tx.stockMovement.create({
        data: {
          itemId: item.id,
          lotId: lot.id,
          type: "PURCHASE",
          quantity,
          balanceBefore,
          balanceAfter,
          unitCost,
          note: input.note?.trim() || undefined,
          createdBy: input.createdBy?.trim() || undefined,
        },
      });

      return { lot, movement, balanceBefore, balanceAfter };
    });
  }

  async adjustStock(input: AdjustStockInput) {
    const quantity = this.parsePositiveNumber(input.quantity, "QUANTITY");
    const unitCost = this.parseOptionalNumber(input.unitCost, "UNIT_COST");
    const note = input.note?.trim();

    if (!note) {
      throw new Error("ADJUSTMENT_NOTE_REQUIRED");
    }

    if (input.direction !== "IN" && input.direction !== "OUT") {
      throw new Error("ADJUSTMENT_DIRECTION_INVALID");
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: input.itemId },
        select: { id: true, status: true },
      });

      if (!item) {
        throw new Error("ITEM_NOT_FOUND");
      }

      if (item.status !== "ACTIVE") {
        throw new Error("ITEM_NOT_ACTIVE");
      }

      const balance = await tx.stockBalance.upsert({
        where: { itemId: item.id },
        update: {},
        create: { itemId: item.id, quantity: 0 },
      });
      const balanceBefore = Number(balance.quantity);
      const balanceAfter =
        input.direction === "IN"
          ? balanceBefore + quantity
          : balanceBefore - quantity;

      if (balanceAfter < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const lotId = input.lotId?.trim() || undefined;

      if (lotId) {
        const lot = await tx.stockLot.findFirst({
          where: { id: lotId, itemId: item.id },
        });

        if (!lot) {
          throw new Error("STOCK_LOT_NOT_FOUND");
        }

        const lotQuantity =
          input.direction === "IN"
            ? Number(lot.quantity) + quantity
            : Number(lot.quantity) - quantity;

        if (lotQuantity < 0) {
          throw new Error("INSUFFICIENT_LOT_STOCK");
        }

        await tx.stockLot.update({
          where: { id: lot.id },
          data: { quantity: lotQuantity },
        });
      }

      await tx.stockBalance.update({
        where: { itemId: item.id },
        data: { quantity: balanceAfter },
      });

      const movement = await tx.stockMovement.create({
        data: {
          itemId: item.id,
          lotId,
          type: STOCK_MOVEMENT_TYPES[input.direction],
          quantity,
          balanceBefore,
          balanceAfter,
          unitCost,
          note,
          createdBy: input.createdBy?.trim() || undefined,
        },
      });

      return { movement, balanceBefore, balanceAfter };
    });
  }

  private parsePositiveNumber(value: number | string, field: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${field}_MUST_BE_POSITIVE`);
    }

    return parsed;
  }

  private parseOptionalNumber(
    value: number | string | undefined,
    field: string,
  ) {
    if (value === undefined || value === "") {
      return undefined;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`${field}_INVALID`);
    }

    return parsed;
  }

  private parseDate(value: string | Date | undefined, field: string) {
    if (value === undefined || value === "") {
      return undefined;
    }

    const parsed = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`${field}_INVALID`);
    }

    return parsed;
  }
}
