import { prisma } from "../../../core/database/prisma.client";

import type {
  AdjustStockInput,
  BorrowStockInput,
  ReceiveStockItemInput,
  ReceiveStockInput,
  StockListQuery,
} from "./stock.types";

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

  async getReceiptHistory(query: StockListQuery = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const receiptNumber = query.receiptNumber?.trim();
    const batchCode = query.batchCode?.trim();
    const where = {
      ...(receiptNumber
        ? {
            receiptNumber: {
              contains: receiptNumber,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(batchCode
        ? { batchCode: { contains: batchCode, mode: "insensitive" as const } }
        : {}),
      ...(query.lotId || query.itemId
        ? {
            items: {
              some: {
                ...(query.lotId ? { lotId: query.lotId } : {}),
                ...(query.itemId ? { itemId: query.itemId } : {}),
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.stockReceipt.findMany({
        where,
        include: {
          items: {
            include: { item: true, lot: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { receivedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockReceipt.count({ where }),
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
    const items: ReceiveStockItemInput[] = input.items?.length
      ? input.items
      : [
          {
            itemId: input.itemId,
            quantity: input.quantity,
            receivedAt: input.receivedAt,
            producedAt: input.producedAt,
            expiresAt: input.expiresAt,
            unitCost: input.unitCost,
            note: input.note,
            createdBy: input.createdBy,
          },
        ];

    const receivedAt =
      this.parseDate(input.receivedAt, "RECEIVED_AT") ?? new Date();
    const batchCode = input.batchCode?.trim() || undefined;
    const receiptNumber = input.receiptNumber?.trim() || undefined;
    const hasReceipt = input.hasReceipt ?? Boolean(receiptNumber);

    if (hasReceipt && !receiptNumber) {
      throw new Error("RECEIPT_NUMBER_REQUIRED");
    }

    return prisma.$transaction(async (tx) => {
      const receipt = await tx.stockReceipt.create({
        data: {
          receiptNumber: hasReceipt ? receiptNumber : null,
          batchCode,
          supplierName: input.supplierName?.trim() || undefined,
          receivedAt,
          note: input.note?.trim() || undefined,
          createdBy: input.createdBy?.trim() || undefined,
        },
      });

      const receivedItems = [];

      for (const itemInput of items) {
        const quantity = this.parsePositiveNumber(
          itemInput.quantity,
          "QUANTITY",
        );
        const unitCost = this.parseOptionalNumber(
          itemInput.unitCost,
          "UNIT_COST",
        );
        const itemReceivedAt =
          this.parseDate(itemInput.receivedAt, "RECEIVED_AT") ?? receivedAt;
        const producedAt = this.parseDate(itemInput.producedAt, "PRODUCED_AT");
        const expiresAt = this.parseDate(itemInput.expiresAt, "EXPIRES_AT");

        if (!expiresAt) {
          throw new Error("EXPIRES_AT_REQUIRED");
        }

        if (expiresAt <= itemReceivedAt) {
          throw new Error("EXPIRES_AT_MUST_BE_AFTER_RECEIVED_AT");
        }

        const item = await tx.item.findUnique({
          where: { id: itemInput.itemId },
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
        const note = itemInput.note?.trim() || input.note?.trim();

        const itemBatchCode = itemInput.batchCode?.trim() || batchCode;
        const lot = await tx.stockLot.create({
          data: {
            itemId: item.id,
            batchCode: itemBatchCode,
            receivedAt: itemReceivedAt,
            producedAt,
            expiresAt,
            quantity,
            unitCost,
            note: note || undefined,
          },
        });

        const receiptItem = await tx.stockReceiptItem.create({
          data: {
            receiptId: receipt.id,
            itemId: item.id,
            lotId: lot.id,
            quantity,
            unitCost,
            batchCode: itemBatchCode,
            producedAt,
            expiresAt,
            note: note || undefined,
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
            receiptItemId: receiptItem.id,
            type: "PURCHASE",
            quantity,
            balanceBefore,
            balanceAfter,
            unitCost,
            note: note || undefined,
            createdBy:
              itemInput.createdBy?.trim() ||
              input.createdBy?.trim() ||
              undefined,
          },
        });

        receivedItems.push({
          receiptItem,
          lot,
          movement,
          balanceBefore,
          balanceAfter,
        });
      }

      const firstItem = receivedItems[0];
      return {
        receipt,
        items: receivedItems,
        receiptItem: firstItem?.receiptItem,
        lot: firstItem?.lot,
        movement: firstItem?.movement,
        balanceBefore: firstItem?.balanceBefore,
        balanceAfter: firstItem?.balanceAfter,
      };
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

    const reasonType = input.reasonType ?? "OTHER";
    if (!["OTHER", "DAMAGE", "DISPOSAL"].includes(reasonType)) {
      throw new Error("ADJUSTMENT_REASON_INVALID");
    }
    return prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: input.itemId },
        select: {
          id: true,
          status: true,
          stockLots: {
            where: { quantity: { gt: 0 } },
            select: { id: true, quantity: true },
          },
          stockLoans: {
            where: { status: "BORROWED" },
            select: { lotId: true, quantity: true },
          },
        },
      });

      if (!item) {
        throw new Error("ITEM_NOT_FOUND");
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

      const activeLoans = item.stockLoans ?? [];
      const borrowedTotal = activeLoans.reduce(
        (total, loan) => total + Number(loan.quantity),
        0,
      );
      if (balanceAfter < borrowedTotal) {
        throw new Error("STOCK_RESERVED_BY_LOAN");
      }

      const availableLots = item.stockLots ?? [];
      let lotId = input.lotId?.trim() || undefined;
      if (!lotId && availableLots.length > 1) {
        throw new Error("STOCK_LOT_REQUIRED");
      }
      if (!lotId && availableLots.length === 1) {
        lotId = availableLots[0].id;
      }

      if (lotId) {
        const lot = await tx.stockLot.findFirst({
          where: { id: lotId, itemId: item.id },
        });

        if (!lot) {
          throw new Error("STOCK_LOT_NOT_FOUND");
        }

        const borrowedFromLot = activeLoans
          .filter((loan) => loan.lotId === lot.id)
          .reduce((total, loan) => total + Number(loan.quantity), 0);

        const lotQuantity =
          input.direction === "IN"
            ? Number(lot.quantity) + quantity
            : Number(lot.quantity) - quantity;

        if (lotQuantity < borrowedFromLot) {
          throw new Error(
            borrowedFromLot > 0
              ? "STOCK_RESERVED_BY_LOAN"
              : "INSUFFICIENT_LOT_STOCK",
          );
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
          type:
            input.direction === "IN"
              ? "ADJUSTMENT_IN"
              : reasonType === "DAMAGE"
                ? "DAMAGE_OUT"
                : reasonType === "DISPOSAL"
                  ? "DISPOSAL_OUT"
                  : "ADJUSTMENT_OUT",
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

  async getOpenLoans() {
    return prisma.stockLoan.findMany({
      where: { status: "BORROWED" },
      include: { item: true, lot: true },
      orderBy: { borrowedAt: "desc" },
    });
  }

  async borrowStock(input: BorrowStockInput, actorId: string) {
    const quantity = this.parsePositiveNumber(input.quantity, "QUANTITY");
    const borrower = input.borrower?.trim();
    if (!borrower) throw new Error("BORROWER_REQUIRED");

    return prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({
        where: { id: input.itemId },
        include: {
          stockBalance: true,
          stockLots: { where: { quantity: { gt: 0 } } },
          stockLoans: {
            where: { status: "BORROWED" },
            select: { lotId: true, quantity: true },
          },
        },
      });
      if (!item) throw new Error("ITEM_NOT_FOUND");

      const balanceBefore = Number(item.stockBalance?.quantity ?? 0);
      const activeLoans = item.stockLoans ?? [];
      const borrowedTotal = activeLoans.reduce(
        (total, loan) => total + Number(loan.quantity),
        0,
      );
      const availableBalance = balanceBefore - borrowedTotal;
      if (availableBalance < quantity) throw new Error("INSUFFICIENT_STOCK");

      const lotId = input.lotId?.trim() || undefined;
      let lot: (typeof item.stockLots)[number] | null = null;
      if (lotId) {
        lot =
          item.stockLots.find((candidate) => candidate.id === lotId) ?? null;
        if (!lot) throw new Error("STOCK_LOT_NOT_FOUND");
        const borrowedFromLot = activeLoans
          .filter((loan) => loan.lotId === lot!.id)
          .reduce((total, loan) => total + Number(loan.quantity), 0);
        if (Number(lot.quantity) - borrowedFromLot < quantity) {
          throw new Error("INSUFFICIENT_LOT_STOCK");
        }
      } else {
        const trackedQuantity = item.stockLots.reduce(
          (total, candidate) => total + Number(candidate.quantity),
          0,
        );
        const untrackedBorrowed = activeLoans
          .filter((loan) => !loan.lotId)
          .reduce((total, loan) => total + Number(loan.quantity), 0);
        if (balanceBefore - trackedQuantity - untrackedBorrowed < quantity) {
          throw new Error("STOCK_LOT_REQUIRED");
        }
      }

      const balanceAfter = balanceBefore;

      const loan = await tx.stockLoan.create({
        data: {
          itemId: item.id,
          lotId: lot?.id,
          quantity,
          borrower,
          note: input.note?.trim() || undefined,
          borrowedBy: actorId,
        },
        include: { item: true, lot: true },
      });
      const movement = await tx.stockMovement.create({
        data: {
          itemId: item.id,
          lotId: lot?.id,
          type: "LOAN_OUT",
          quantity,
          balanceBefore,
          balanceAfter,
          note: `Cho ${borrower} mượn${input.note?.trim() ? `: ${input.note.trim()}` : ""}`,
          createdBy: actorId,
        },
      });

      return { loan, movement, balanceBefore, balanceAfter };
    });
  }

  async returnLoan(id: string, actorId: string, returnNote?: string) {
    return prisma.$transaction(async (tx) => {
      const loan = await tx.stockLoan.findUnique({ where: { id } });
      if (!loan) throw new Error("STOCK_LOAN_NOT_FOUND");
      if (loan.status !== "BORROWED")
        throw new Error("STOCK_LOAN_ALREADY_RETURNED");

      const balance = await tx.stockBalance.upsert({
        where: { itemId: loan.itemId },
        update: {},
        create: { itemId: loan.itemId, quantity: 0 },
      });
      const quantity = Number(loan.quantity);
      const balanceBefore = Number(balance.quantity);
      const balanceAfter = balanceBefore;
      const updatedLoan = await tx.stockLoan.update({
        where: { id },
        data: {
          status: "RETURNED",
          returnedAt: new Date(),
          returnNote: returnNote?.trim() || undefined,
        },
        include: { item: true, lot: true },
      });
      const movement = await tx.stockMovement.create({
        data: {
          itemId: loan.itemId,
          lotId: loan.lotId,
          type: "LOAN_RETURN",
          quantity,
          balanceBefore,
          balanceAfter,
          note: `Trả hàng mượn của ${loan.borrower}${returnNote?.trim() ? `: ${returnNote.trim()}` : ""}`,
          createdBy: actorId,
        },
      });

      return { loan: updatedLoan, movement, balanceBefore, balanceAfter };
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
