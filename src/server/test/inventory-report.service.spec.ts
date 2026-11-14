import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    inventoryReport: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    shiftSchedule: { findUnique: vi.fn() },
    item: { findMany: vi.fn() },
    sale: { findMany: vi.fn() },
    stockMovement: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

vi.mock("../core/database/prisma.client", () => ({ prisma: prismaMock }));

import {
  getShiftWindow,
  inventoryGroupFor,
  InventoryReportService,
} from "../modules/reports/inventory-report.service";

describe("InventoryReportService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects invalid months without querying the database", async () => {
    await expect(
      new InventoryReportService().listByMonth("2026-13"),
    ).rejects.toThrow("REPORT_MONTH_INVALID");
    expect(prismaMock.inventoryReport.findMany).not.toHaveBeenCalled();
  });

  it("requires a valid date and shift before report creation", async () => {
    const service = new InventoryReportService();
    await expect(
      service.createReport(
        { reportDate: "2026-02-30", shiftCode: "MORNING" },
        "user-1",
      ),
    ).rejects.toThrow("REPORT_DATE_INVALID");
    await expect(
      service.createReport({ reportDate: "2026-10-15" }, "user-1"),
    ).rejects.toThrow("REPORT_DATE_AND_SHIFT_REQUIRED");
    expect(prismaMock.shiftSchedule.findUnique).not.toHaveBeenCalled();
  });

  it("converts Vietnam shift wall time to UTC instants", () => {
    const window = getShiftWindow(
      new Date("2026-10-15T00:00:00.000Z"),
      360,
      840,
    );
    expect(window.startsAt.toISOString()).toBe("2026-10-14T23:00:00.000Z");
    expect(window.endsAt.toISOString()).toBe("2026-10-15T07:00:00.000Z");
  });

  it("groups beer, wine, and alcohol with beverages", () => {
    expect(inventoryGroupFor("BEER", "Beer")).toBe("BEVERAGE");
    expect(inventoryGroupFor("CHAMPAGNE", "Champagne")).toBe("BEVERAGE");
    expect(inventoryGroupFor("WINE", "Wine")).toBe("BEVERAGE");
    expect(inventoryGroupFor("EQUIPMENT", "Golf equipment")).toBe("SUPPLIES");
  });

  it("rejects an invalid monthly summary month before querying data", async () => {
    await expect(
      new InventoryReportService().getMonthlySummary("2026-13"),
    ).rejects.toThrow("REPORT_MONTH_INVALID");
    expect(prismaMock.item.findMany).not.toHaveBeenCalled();
  });

  it("groups month-end quantities by category and expiry and includes detailed sales", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "WATER-1",
        name: "Water",
        status: "ACTIVE",
        unit: "bottle",
        categoryId: "cat-1",
        category: { id: "cat-1", code: "WATER", name: "Water" },
        stockBalance: { quantity: 7 },
        stockLots: [
          {
            id: "lot-1",
            batchCode: "LOT-A",
            producedAt: null,
            expiresAt: new Date("2027-06-01T00:00:00.000Z"),
            quantity: 7,
          },
        ],
      },
    ]);
    prismaMock.sale.findMany.mockResolvedValue([
      {
        id: "sale-1",
        soldAt: new Date("2026-10-10T10:00:00.000Z"),
        customerType: "ROOM",
        roomNumber: "12",
        customerName: null,
        createdBy: "user-1",
        totalAmount: 20,
        items: [
          {
            id: "line-1",
            itemId: "item-1",
            item: { sku: "WATER-1", name: "Water", unit: "bottle" },
            lot: { expiresAt: new Date("2027-06-01T00:00:00.000Z") },
            quantity: 2,
            unitPrice: 10,
            totalPrice: 20,
          },
        ],
      },
    ]);
    prismaMock.stockMovement.findMany.mockResolvedValue([
      {
        itemId: "item-1",
        lotId: "lot-1",
        type: "SALE",
        quantity: 1,
        balanceBefore: 8,
        balanceAfter: 7,
      },
    ]);
    prismaMock.user.findMany.mockResolvedValue([
      { id: "user-1", username: "seller", fullName: "Seller One" },
    ]);

    const result = await new InventoryReportService().getMonthlySummary("2026-10");

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe("Water");
    expect(result.categories[0].items[0].quantity).toBe(8);
    expect(result.categories[0].items[0].lots[0].quantity).toBe(8);
    expect(result.categories[0].items[0].soldQuantity).toBe(2);
    expect(result.sales[0].sellerName).toBe("Seller One");
    expect(result.sales[0].items[0].expiresAt).toEqual(
      new Date("2027-06-01T00:00:00.000Z"),
    );
    expect(result.salesTotal).toBe(20);
  });

  it("omits items with no month-end stock and no sales in the month", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-in-stock",
        sku: "WATER-1",
        name: "Water",
        status: "ACTIVE",
        unit: "bottle",
        categoryId: "cat-1",
        category: { id: "cat-1", code: "WATER", name: "Water" },
        stockBalance: { quantity: 3 },
        stockLots: [],
      },
      {
        id: "item-empty",
        sku: "JUICE-1",
        name: "Juice",
        status: "ACTIVE",
        unit: "bottle",
        categoryId: "cat-1",
        category: { id: "cat-1", code: "WATER", name: "Water" },
        stockBalance: { quantity: 0 },
        stockLots: [
          {
            id: "lot-empty",
            batchCode: "EXPIRED",
            producedAt: null,
            expiresAt: new Date("2026-01-01T00:00:00.000Z"),
            quantity: 0,
          },
        ],
      },
    ]);
    prismaMock.sale.findMany.mockResolvedValue([]);
    prismaMock.stockMovement.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);

    const result = await new InventoryReportService().getMonthlySummary("2026-10");

    expect(result.itemCount).toBe(1);
    expect(result.categoryCount).toBe(1);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].items.map((item) => item.id)).toEqual([
      "item-in-stock",
    ]);
  });

  it("keeps an item with no remaining stock when it had sales during the month", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-sold",
        sku: "WATER-1",
        name: "Water",
        status: "ACTIVE",
        unit: "bottle",
        categoryId: "cat-1",
        category: { id: "cat-1", code: "WATER", name: "Water" },
        stockBalance: { quantity: 0 },
        stockLots: [],
      },
    ]);
    prismaMock.sale.findMany.mockResolvedValue([
      {
        id: "sale-1",
        soldAt: new Date("2026-10-10T10:00:00.000Z"),
        customerType: "ROOM",
        roomNumber: "12",
        customerName: null,
        createdBy: "user-1",
        totalAmount: 20,
        items: [
          {
            id: "line-1",
            itemId: "item-sold",
            item: { sku: "WATER-1", name: "Water", unit: "bottle" },
            lot: null,
            quantity: 2,
            unitPrice: 10,
            totalPrice: 20,
          },
        ],
      },
    ]);
    prismaMock.stockMovement.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);

    const result = await new InventoryReportService().getMonthlySummary("2026-10");

    expect(result.itemCount).toBe(1);
    expect(result.categories[0].items[0]).toMatchObject({
      id: "item-sold",
      quantity: 0,
      soldQuantity: 2,
    });
  });

  it("omits zero-stock lots unless the lot had sales during the month", async () => {
    prismaMock.item.findMany.mockResolvedValue([
      {
        id: "item-1",
        sku: "WATER-1",
        name: "Water",
        status: "ACTIVE",
        unit: "bottle",
        categoryId: "cat-1",
        category: { id: "cat-1", code: "WATER", name: "Water" },
        stockBalance: { quantity: 2 },
        stockLots: [
          {
            id: "lot-in-stock",
            batchCode: "IN-STOCK",
            producedAt: null,
            expiresAt: new Date("2027-06-01T00:00:00.000Z"),
            quantity: 2,
          },
          {
            id: "lot-empty",
            batchCode: "EMPTY",
            producedAt: null,
            expiresAt: null,
            quantity: 0,
          },
          {
            id: "lot-sold",
            batchCode: "SOLD-OUT",
            producedAt: null,
            expiresAt: null,
            quantity: 0,
          },
        ],
      },
    ]);
    prismaMock.sale.findMany.mockResolvedValue([
      {
        id: "sale-1",
        soldAt: new Date("2026-10-10T10:00:00.000Z"),
        customerType: "ROOM",
        roomNumber: "12",
        customerName: null,
        createdBy: "user-1",
        totalAmount: 20,
        items: [
          {
            id: "line-1",
            itemId: "item-1",
            lotId: "lot-sold",
            item: { sku: "WATER-1", name: "Water", unit: "bottle" },
            lot: { id: "lot-sold", expiresAt: null },
            quantity: 2,
            unitPrice: 10,
            totalPrice: 20,
          },
        ],
      },
    ]);
    prismaMock.stockMovement.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);

    const result = await new InventoryReportService().getMonthlySummary("2026-10");

    expect(result.categories[0].items[0].lots.map((lot) => lot.id)).toEqual([
      "lot-in-stock",
      "lot-sold",
    ]);
  });
});
