import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    item: { findMany: vi.fn() },
    sale: { create: vi.fn() },
    saleItem: { create: vi.fn() },
    stockLot: { update: vi.fn() },
    stockBalance: { update: vi.fn() },
    stockMovement: { create: vi.fn() },
  },
}));

vi.mock("../core/database/prisma.client", () => ({ prisma: prismaMock }));

import { SaleService } from "../modules/sales/sale.service";

describe("SaleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(prismaMock),
    );
  });

  it("rejects sales of inactive items", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "WATER-1",
        status: "INACTIVE",
        sellingPrice: 10,
        stockBalance: { quantity: 5 },
        stockLots: [],
      },
    ]);

    await expect(
      new SaleService().createSale({
        customerType: "EXTERNAL",
        items: [{ itemId: "item-1", quantity: 1 }],
      }),
    ).rejects.toThrow("SALE_ITEM_NOT_ACTIVE:WATER-1");
  });

  it("does not sell quantities held in expired lots", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "WATER-1",
        status: "ACTIVE",
        sellingPrice: 10,
        stockBalance: { quantity: 5 },
        stockLots: [
          {
            id: "expired-lot",
            quantity: 5,
            expiresAt: new Date("2020-01-01T00:00:00.000Z"),
          },
        ],
      },
    ]);

    await expect(
      new SaleService().createSale({
        customerType: "EXTERNAL",
        items: [{ itemId: "item-1", quantity: 1 }],
      }),
    ).rejects.toThrow("INSUFFICIENT_STOCK:WATER-1");
  });

  it("requires selecting an expiry lot when stock has different expiry dates", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "WATER-1",
        status: "ACTIVE",
        sellingPrice: 10,
        stockBalance: { quantity: 5 },
        stockLots: [
          {
            id: "lot-1",
            quantity: 2,
            expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          },
          {
            id: "lot-2",
            quantity: 3,
            expiresAt: new Date("2027-06-01T00:00:00.000Z"),
          },
        ],
      },
    ]);

    await expect(
      new SaleService().createSale({
        customerType: "EXTERNAL",
        items: [{ itemId: "item-1", quantity: 1 }],
      }),
    ).rejects.toThrow("SALE_LOT_REQUIRED:WATER-1");
  });

  it("sells from the expiry lot selected by the user", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "WATER-1",
        status: "ACTIVE",
        sellingPrice: 10,
        stockBalance: { quantity: 5 },
        stockLots: [
          {
            id: "lot-1",
            quantity: 2,
            expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          },
          {
            id: "lot-2",
            quantity: 3,
            expiresAt: new Date("2027-06-01T00:00:00.000Z"),
          },
        ],
      },
    ]);
    prismaMock.sale.create.mockResolvedValue({ id: "sale-1" });
    prismaMock.saleItem.create.mockResolvedValue({ id: "sale-item-1" });

    await new SaleService().createSale({
      customerType: "EXTERNAL",
      items: [{ itemId: "item-1", quantity: 1, lotId: "lot-2" }],
    });

    expect(prismaMock.saleItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemId: "item-1",
          lotId: "lot-2",
          quantity: 1,
        }),
      }),
    );
  });

  it("does not sell quantity reserved by an active loan", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "WATER-1",
        status: "ACTIVE",
        sellingPrice: 10,
        stockBalance: { quantity: 5 },
        stockLots: [
          {
            id: "lot-1",
            quantity: 5,
            expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          },
        ],
        stockLoans: [{ lotId: "lot-1", quantity: 4 }],
      },
    ]);

    await expect(
      new SaleService().createSale({
        customerType: "EXTERNAL",
        items: [{ itemId: "item-1", quantity: 2, lotId: "lot-1" }],
      }),
    ).rejects.toThrow("INSUFFICIENT_STOCK:WATER-1");
    expect(prismaMock.sale.create).not.toHaveBeenCalled();
  });
});
