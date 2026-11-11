import { prisma } from "../../core/database/prisma.client";

import type { CreateSaleInput, SaleListQuery } from "./sale.types";

export class SaleService {
  async getSales(query: SaleListQuery = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
      throw new Error("SALE_DATE_FROM_INVALID");
    }

    if (dateTo && Number.isNaN(dateTo.getTime())) {
      throw new Error("SALE_DATE_TO_INVALID");
    }

    if (dateTo) dateTo.setHours(23, 59, 59, 999);

    const where = {
      ...(query.customerType ? { customerType: query.customerType } : {}),
      ...(query.roomNumber
        ? { roomNumber: { contains: query.roomNumber.trim() } }
        : {}),
      ...(dateFrom || dateTo
        ? {
            soldAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [items, total, aggregate] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: {
            include: { item: true, lot: true },
          },
        },
        orderBy: { soldAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
      prisma.sale.aggregate({ where, _sum: { totalAmount: true } }),
    ]);

    return {
      items,
      summary: {
        totalSales: total,
        totalAmount: aggregate._sum.totalAmount ?? 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createSale(input: CreateSaleInput) {
    this.validateHeader(input);

    const requestedItems = this.normalizeItems(input.items);
    const itemIds = requestedItems.map((item) => item.itemId);

    return prisma.$transaction(async (tx) => {
      const items = await tx.item.findMany({
        where: { id: { in: itemIds } },
        include: {
          stockBalance: true,
          stockLoans: {
            where: { status: "BORROWED" },
            select: { lotId: true, quantity: true },
          },
          stockLots: {
            where: { quantity: { gt: 0 } },
            orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }],
          },
        },
      });

      if (items.length !== itemIds.length) {
        throw new Error("SALE_ITEM_NOT_FOUND");
      }

      const itemMap = new Map(items.map((item) => [item.id, item]));
      const allocations: Array<{
        itemId: string;
        lotId?: string;
        quantity: number;
        unitPrice: number;
      }> = [];
      let totalAmount = 0;
      const today = new Date(
        `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
      );

      const borrowedFromLot = (item: (typeof items)[number], lotId: string) =>
        (item.stockLoans ?? [])
          .filter((loan) => loan.lotId === lotId)
          .reduce((total, loan) => total + Number(loan.quantity), 0);

      const availableLotQuantity = (
        item: (typeof items)[number],
        lot: (typeof item.stockLots)[number],
      ) => Math.max(0, Number(lot.quantity) - borrowedFromLot(item, lot.id));

      const availableQuantity = (item: (typeof items)[number]) => {
        const trackedQuantity = item.stockLots.reduce(
          (total, lot) => total + Number(lot.quantity),
          0,
        );
        const borrowedUntracked = (item.stockLoans ?? [])
          .filter((loan) => !loan.lotId)
          .reduce((total, loan) => total + Number(loan.quantity), 0);
        const untrackedAvailable = Math.max(
          0,
          Number(item.stockBalance?.quantity ?? 0) -
            trackedQuantity -
            borrowedUntracked,
        );
        const lotAvailable = item.stockLots.reduce((total, lot) => {
          if (lot.expiresAt && lot.expiresAt < today) return total;
          return total + availableLotQuantity(item, lot);
        }, 0);
        return lotAvailable + untrackedAvailable;
      };

      const requestedByItem = new Map<string, number>();
      for (const requested of requestedItems) {
        requestedByItem.set(
          requested.itemId,
          (requestedByItem.get(requested.itemId) ?? 0) + requested.quantity,
        );
      }

      for (const [itemId, quantity] of requestedByItem) {
        const item = itemMap.get(itemId)!;
        if (availableQuantity(item) < quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.sku}`);
        }
      }

      for (const requested of requestedItems) {
        const item = itemMap.get(requested.itemId)!;
        const available = Number(item.stockBalance?.quantity ?? 0);

        if (item.status !== "ACTIVE") {
          throw new Error(`SALE_ITEM_NOT_ACTIVE:${item.sku}`);
        }

        const unitPrice = Number(item.sellingPrice);
        totalAmount += requested.quantity * unitPrice;

        if (requested.lotId) {
          const selectedLot = item.stockLots.find(
            (lot) => lot.id === requested.lotId,
          );
          if (!selectedLot) throw new Error(`SALE_LOT_NOT_FOUND:${item.sku}`);
          if (selectedLot.expiresAt && selectedLot.expiresAt < today) {
            throw new Error(`SALE_LOT_EXPIRED:${item.sku}`);
          }
          if (availableLotQuantity(item, selectedLot) < requested.quantity) {
            throw new Error(`INSUFFICIENT_LOT_STOCK:${item.sku}`);
          }
          allocations.push({
            itemId: item.id,
            lotId: selectedLot.id,
            quantity: requested.quantity,
            unitPrice,
          });
          continue;
        }

        let remaining = requested.quantity;

        const lots = [...item.stockLots]
          .filter(
            (lot) =>
              (!lot.expiresAt || lot.expiresAt >= today) &&
              availableLotQuantity(item, lot) > 0,
          )
          .sort((left, right) => {
            if (!left.expiresAt && !right.expiresAt) return 0;
            if (!left.expiresAt) return 1;
            if (!right.expiresAt) return -1;
            return left.expiresAt.getTime() - right.expiresAt.getTime();
          });

        const expiryKinds = new Set(
          lots.map((lot) =>
            lot.expiresAt
              ? lot.expiresAt.toISOString().slice(0, 10)
              : "NO_EXPIRY",
          ),
        );
        if (expiryKinds.size > 1) {
          throw new Error(`SALE_LOT_REQUIRED:${item.sku}`);
        }

        for (const lot of lots) {
          if (remaining <= 0) break;

          const quantity = Math.min(remaining, availableLotQuantity(item, lot));
          allocations.push({
            itemId: item.id,
            lotId: lot.id,
            quantity,
            unitPrice,
          });
          remaining -= quantity;
        }

        const trackedQuantity = item.stockLots.reduce(
          (total, lot) => total + Number(lot.quantity),
          0,
        );
        const borrowedUntracked = (item.stockLoans ?? [])
          .filter((loan) => !loan.lotId)
          .reduce((total, loan) => total + Number(loan.quantity), 0);
        const untrackedQuantity = Math.max(
          0,
          available - trackedQuantity - borrowedUntracked,
        );

        if (remaining > untrackedQuantity) {
          throw new Error(`INSUFFICIENT_STOCK:${item.sku}`);
        }

        if (remaining > 0) {
          allocations.push({
            itemId: item.id,
            quantity: remaining,
            unitPrice,
          });
        }
      }

      const sale = await tx.sale.create({
        data: {
          customerType: input.customerType,
          roomNumber: input.roomNumber?.trim() || undefined,
          customerName: input.customerName?.trim() || undefined,
          note: input.note?.trim() || undefined,
          totalAmount,
          soldAt: input.soldAt ? new Date(input.soldAt) : new Date(),
          createdBy: input.createdBy,
        },
      });

      const createdItems = [];
      const balanceByItem = new Map(
        items.map((item) => [
          item.id,
          Number(item.stockBalance?.quantity ?? 0),
        ]),
      );

      for (const allocation of allocations) {
        const balanceBefore = balanceByItem.get(allocation.itemId)!;
        const balanceAfter = balanceBefore - allocation.quantity;
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            itemId: allocation.itemId,
            lotId: allocation.lotId,
            quantity: allocation.quantity,
            unitPrice: allocation.unitPrice,
            totalPrice: allocation.quantity * allocation.unitPrice,
          },
        });

        if (allocation.lotId) {
          await tx.stockLot.update({
            where: { id: allocation.lotId },
            data: { quantity: { decrement: allocation.quantity } },
          });
        }

        await tx.stockBalance.update({
          where: { itemId: allocation.itemId },
          data: { quantity: balanceAfter },
        });

        const movement = await tx.stockMovement.create({
          data: {
            itemId: allocation.itemId,
            lotId: allocation.lotId,
            saleItemId: saleItem.id,
            type: "SALE",
            quantity: allocation.quantity,
            balanceBefore,
            balanceAfter,
            unitCost: allocation.unitPrice,
            note: input.note?.trim() || `Sale ${sale.id}`,
            createdBy: input.createdBy,
          },
        });

        balanceByItem.set(allocation.itemId, balanceAfter);
        createdItems.push({ saleItem, movement });
      }

      return {
        sale: {
          ...sale,
          items: createdItems.map(({ saleItem }) => saleItem),
        },
        movements: createdItems.map(({ movement }) => movement),
      };
    });
  }

  private validateHeader(input: CreateSaleInput): void {
    if (input.customerType !== "ROOM" && input.customerType !== "EXTERNAL") {
      throw new Error("SALE_CUSTOMER_TYPE_INVALID");
    }

    if (input.customerType === "ROOM" && !input.roomNumber?.trim()) {
      throw new Error("SALE_ROOM_NUMBER_REQUIRED");
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("SALE_ITEMS_REQUIRED");
    }
  }

  private normalizeItems(items: CreateSaleInput["items"]) {
    const normalized = new Map<
      string,
      { itemId: string; lotId?: string; quantity: number }
    >();

    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.itemId || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("SALE_ITEM_INVALID");
      }
      const lotId = item.lotId?.trim() || undefined;
      const key = `${item.itemId}:${lotId ?? "AUTO"}`;
      const previous = normalized.get(key);
      normalized.set(key, {
        itemId: item.itemId,
        lotId,
        quantity: (previous?.quantity ?? 0) + quantity,
      });
    }

    return [...normalized.values()];
  }
}
