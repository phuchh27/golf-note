import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/database/prisma.client", () => ({
  prisma: {
    $transaction: vi.fn(),
    item: {
      findUnique: vi.fn(),
    },
    stockBalance: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    stockLot: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    stockReceipt: {
      create: vi.fn(),
    },
    stockReceiptItem: {
      create: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    stockLoan: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../core/database/prisma.client";
import { StockService } from "../modules/inventory/stock/stock.service";

describe("StockService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) =>
      callback(prisma),
    );
  });

  it("receives stock into a lot and records a purchase movement", async () => {
    vi.mocked(prisma.item.findUnique).mockResolvedValue({
      id: "item-1",
      status: "ACTIVE",
    } as any);
    vi.mocked(prisma.stockBalance.upsert).mockResolvedValue({
      itemId: "item-1",
      quantity: 5,
    } as any);
    vi.mocked(prisma.stockLot.create).mockResolvedValue({
      id: "lot-1",
      itemId: "item-1",
      quantity: 3,
    } as any);
    vi.mocked(prisma.stockReceipt.create).mockResolvedValue({
      id: "receipt-1",
      receiptNumber: "RCV-1",
    } as any);
    vi.mocked(prisma.stockReceiptItem.create).mockResolvedValue({
      id: "receipt-item-1",
    } as any);
    vi.mocked(prisma.stockBalance.update).mockResolvedValue({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValue({
      id: "movement-1",
    } as any);

    const result = await new StockService().receiveStock({
      itemId: "item-1",
      quantity: 3,
      batchCode: "BATCH-1",
      expiresAt: "2026-12-31T00:00:00.000Z",
    });

    expect(result.balanceBefore).toBe(5);
    expect(result.balanceAfter).toBe(8);
    expect(prisma.stockLot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemId: "item-1",
          batchCode: "BATCH-1",
          quantity: 3,
        }),
      }),
    );
    expect(prisma.stockReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ receiptNumber: null }),
      }),
    );
    expect(prisma.stockReceiptItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          receiptId: "receipt-1",
          lotId: "lot-1",
          quantity: 3,
        }),
      }),
    );
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PURCHASE",
          balanceBefore: 5,
          balanceAfter: 8,
        }),
      }),
    );
  });

  it("rejects an adjustment that would make stock negative", async () => {
    vi.mocked(prisma.item.findUnique).mockResolvedValue({
      id: "item-1",
      status: "ACTIVE",
    } as any);
    vi.mocked(prisma.stockBalance.upsert).mockResolvedValue({
      itemId: "item-1",
      quantity: 2,
    } as any);

    await expect(
      new StockService().adjustStock({
        itemId: "item-1",
        quantity: 3,
        direction: "OUT",
        note: "Kiểm kê thiếu",
      }),
    ).rejects.toThrow("INSUFFICIENT_STOCK");

    expect(prisma.stockBalance.update).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).not.toHaveBeenCalled();
  });

  it("receives multiple items under one shared batch code", async () => {
    vi.mocked(prisma.stockReceipt.create).mockResolvedValue({
      id: "receipt-1",
      receiptNumber: "RCV-1",
      batchCode: "abc1231237kasd",
    } as any);
    vi.mocked(prisma.item.findUnique)
      .mockResolvedValueOnce({ id: "glassia", status: "ACTIVE" } as any)
      .mockResolvedValueOnce({ id: "heniken", status: "ACTIVE" } as any);
    vi.mocked(prisma.stockBalance.upsert)
      .mockResolvedValueOnce({ itemId: "glassia", quantity: 0 } as any)
      .mockResolvedValueOnce({ itemId: "heniken", quantity: 1 } as any);
    vi.mocked(prisma.stockLot.create)
      .mockResolvedValueOnce({ id: "lot-glassia" } as any)
      .mockResolvedValueOnce({ id: "lot-heniken" } as any);
    vi.mocked(prisma.stockReceiptItem.create)
      .mockResolvedValueOnce({ id: "receipt-item-glassia" } as any)
      .mockResolvedValueOnce({ id: "receipt-item-heniken" } as any);
    vi.mocked(prisma.stockBalance.update).mockResolvedValue({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValue({} as any);

    const result = await new StockService().receiveStock({
      receiptNumber: "RCV-1",
      batchCode: "abc1231237kasd",
      items: [
        {
          itemId: "glassia",
          quantity: 2,
          expiresAt: "2026-12-31T00:00:00.000Z",
        },
        {
          itemId: "heniken",
          quantity: 2,
          expiresAt: "2026-12-31T00:00:00.000Z",
        },
      ],
    } as any);

    expect(result.items).toHaveLength(2);
    expect(prisma.stockReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ batchCode: "abc1231237kasd" }),
      }),
    );
    expect(prisma.stockLot.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ batchCode: "abc1231237kasd" }),
      }),
    );
    expect(prisma.stockReceiptItem.create).toHaveBeenCalledTimes(2);
  });

  it("omits an empty lot id from an adjustment movement", async () => {
    vi.mocked(prisma.item.findUnique).mockResolvedValue({
      id: "item-1",
      status: "ACTIVE",
    } as any);
    vi.mocked(prisma.stockBalance.upsert).mockResolvedValue({
      itemId: "item-1",
      quantity: 5,
    } as any);
    vi.mocked(prisma.stockBalance.update).mockResolvedValue({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValue({
      id: "movement-1",
    } as any);

    await new StockService().adjustStock({
      itemId: "item-1",
      quantity: 1,
      direction: "OUT",
      lotId: "  ",
      note: "Kiểm kê thực tế",
    });

    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lotId: undefined,
        }),
      }),
    );
  });

  it("requires a paper receipt number only when the receipt mode is enabled", async () => {
    await expect(
      new StockService().receiveStock({
        hasReceipt: true,
        itemId: "item-1",
        quantity: 1,
      }),
    ).rejects.toThrow("RECEIPT_NUMBER_REQUIRED");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("records damaged stock with a dedicated movement type", async () => {
    vi.mocked(prisma.item.findUnique).mockResolvedValue({
      id: "item-1",
      status: "ACTIVE",
    } as any);
    vi.mocked(prisma.stockBalance.upsert).mockResolvedValue({
      itemId: "item-1",
      quantity: 5,
    } as any);
    vi.mocked(prisma.stockBalance.update).mockResolvedValue({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValue({} as any);

    await new StockService().adjustStock({
      itemId: "item-1",
      quantity: 1,
      direction: "OUT",
      reasonType: "DAMAGE",
      note: "Chai bị vỡ",
    });

    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "DAMAGE_OUT", quantity: 1 }),
      }),
    );
  });

  it("requires selecting an expiry lot when adjusting an item with multiple lots", async () => {
    vi.mocked(prisma.item.findUnique).mockResolvedValue({
      id: "item-1",
      status: "ACTIVE",
      stockLots: [
        { id: "lot-1", quantity: 3 },
        { id: "lot-2", quantity: 4 },
      ],
    } as any);
    vi.mocked(prisma.stockBalance.upsert).mockResolvedValue({
      itemId: "item-1",
      quantity: 7,
    } as any);

    await expect(
      new StockService().adjustStock({
        itemId: "item-1",
        quantity: 1,
        direction: "OUT",
        note: "Hư hỏng",
      }),
    ).rejects.toThrow("STOCK_LOT_REQUIRED");
    expect(prisma.stockLot.update).not.toHaveBeenCalled();
    expect(prisma.stockBalance.update).not.toHaveBeenCalled();
  });

  it("reserves borrowed quantity without changing physical stock or lots", async () => {
    vi.mocked(prisma.item.findUnique).mockResolvedValue({
      id: "item-1",
      status: "ACTIVE",
      stockBalance: { quantity: 4 },
      stockLots: [{ id: "lot-1", quantity: 4 }],
      stockLoans: [],
    } as any);
    vi.mocked(prisma.stockBalance.update).mockResolvedValue({} as any);
    vi.mocked(prisma.stockLot.update).mockResolvedValue({} as any);
    vi.mocked(prisma.stockLoan.create).mockResolvedValue({
      id: "loan-1",
      itemId: "item-1",
    } as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValue({} as any);

    await new StockService().borrowStock(
      {
        itemId: "item-1",
        lotId: "lot-1",
        quantity: 2,
        borrower: "Bộ phận kỹ thuật",
      },
      "admin-1",
    );

    expect(prisma.stockBalance.update).not.toHaveBeenCalled();
    expect(prisma.stockLot.update).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          type: "LOAN_OUT",
          balanceBefore: 4,
          balanceAfter: 4,
        }),
      }),
    );

    vi.mocked(prisma.stockLoan.findUnique).mockResolvedValue({
      id: "loan-1",
      itemId: "item-1",
      lotId: "lot-1",
      quantity: 2,
      borrower: "Bộ phận kỹ thuật",
      status: "BORROWED",
    } as any);
    vi.mocked(prisma.stockBalance.upsert).mockResolvedValue({
      itemId: "item-1",
      quantity: 4,
    } as any);
    vi.mocked(prisma.stockLoan.update).mockResolvedValue({
      id: "loan-1",
    } as any);

    await new StockService().returnLoan("loan-1", "admin-1");

    expect(prisma.stockBalance.update).not.toHaveBeenCalled();
    expect(prisma.stockLot.update).not.toHaveBeenCalled();
    expect(prisma.stockMovement.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          type: "LOAN_RETURN",
          balanceBefore: 4,
          balanceAfter: 4,
        }),
      }),
    );
  });
});
