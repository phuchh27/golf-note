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
    stockMovement: {
      create: vi.fn(),
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
});
