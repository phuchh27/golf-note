import { prisma } from "../../core/database/prisma.client";
import type { Prisma } from "../../../../generated/prisma/client";

const REPORT_INCLUDE = {
  inventoryItems: { orderBy: [{ inventoryGroup: "asc" }, { name: "asc" }] },
  sales: {
    include: { items: { orderBy: { itemName: "asc" } } },
    orderBy: { soldAt: "asc" },
  },
} satisfies Prisma.InventoryReportInclude;
const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function inventoryGroupFor(
  categoryCode: string,
  categoryName = "",
): "BEVERAGE" | "SUPPLIES" {
  return /BEVERAGE|DRINK|WATER|BEER|WINE|ALCOHOL|LIQUOR|SPIRIT|CHAMPAGNE|SAKE|VODKA|WHISK(?:Y|EY)|RUM|GIN/i.test(
    `${categoryCode} ${categoryName}`,
  )
    ? "BEVERAGE"
    : "SUPPLIES";
}

function parseReportDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("REPORT_DATE_INVALID");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("REPORT_DATE_INVALID");
  }
  return date;
}

function zonedWallTimeToUtc(reportDate: Date, minuteOfDay: number): Date {
  const target = Date.UTC(
    reportDate.getUTCFullYear(),
    reportDate.getUTCMonth(),
    reportDate.getUTCDate(),
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
  );
  let guess = target;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .map((part) => [part.type, part.value]),
    );
    const representedAsUtc = Date.UTC(
      Number(parts["year"]),
      Number(parts["month"]) - 1,
      Number(parts["day"]),
      Number(parts["hour"]),
      Number(parts["minute"]),
      Number(parts["second"]),
    );
    const nextGuess = target - (representedAsUtc - guess);
    if (nextGuess === guess) break;
    guess = nextGuess;
  }
  return new Date(guess);
}

export function getShiftWindow(
  reportDate: Date,
  startMinute: number,
  endMinute: number,
) {
  const endOffset = endMinute <= startMinute ? endMinute + 24 * 60 : endMinute;
  const start = zonedWallTimeToUtc(reportDate, startMinute);
  const endDate = new Date(reportDate);
  endDate.setUTCDate(endDate.getUTCDate() + Math.floor(endOffset / (24 * 60)));
  const endsAt = zonedWallTimeToUtc(endDate, endOffset % (24 * 60));
  return { startsAt: start, endsAt };
}

export class InventoryReportService {
  async getSchedules() {
    const schedules = await prisma.shiftSchedule.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return schedules.map((schedule) => ({
      ...schedule,
      timeZone: REPORT_TIME_ZONE,
    }));
  }

  async updateSchedule(
    code: string,
    input: {
      labelVi?: string;
      labelEn?: string;
      startMinute?: number;
      endMinute?: number;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    const existing = await prisma.shiftSchedule.findUnique({ where: { code } });
    if (!existing) throw new Error("SHIFT_SCHEDULE_NOT_FOUND");

    for (const field of ["startMinute", "endMinute", "sortOrder"] as const) {
      const value = input[field];
      if (
        value !== undefined &&
        (!Number.isInteger(value) ||
          (field !== "sortOrder" && (value < 0 || value >= 1440)))
      ) {
        throw new Error("SHIFT_SCHEDULE_VALUE_INVALID");
      }
    }
    const nextStart = input.startMinute ?? existing.startMinute;
    const nextEnd = input.endMinute ?? existing.endMinute;
    if (nextStart === nextEnd) {
      throw new Error("SHIFT_SCHEDULE_WINDOW_INVALID");
    }

    return prisma.shiftSchedule.update({
      where: { code },
      data: {
        ...(input.labelVi === undefined
          ? {}
          : { labelVi: input.labelVi.trim() }),
        ...(input.labelEn === undefined
          ? {}
          : { labelEn: input.labelEn.trim() }),
        ...(input.startMinute === undefined
          ? {}
          : { startMinute: input.startMinute }),
        ...(input.endMinute === undefined
          ? {}
          : { endMinute: input.endMinute }),
        ...(input.sortOrder === undefined
          ? {}
          : { sortOrder: input.sortOrder }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });
  }

  async listByMonth(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("REPORT_MONTH_INVALID");
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11)
      throw new Error("REPORT_MONTH_INVALID");
    const from = new Date(Date.UTC(year, monthIndex, 1));
    const to = new Date(Date.UTC(year, monthIndex + 1, 1));

    const reports = await prisma.inventoryReport.findMany({
      where: { reportDate: { gte: from, lt: to } },
      select: {
        id: true,
        reportDate: true,
        shiftCode: true,
        shiftLabel: true,
        startsAt: true,
        endsAt: true,
        createdBy: true,
        createdAt: true,
        note: true,
        _count: { select: { inventoryItems: true, sales: true } },
        sales: { select: { totalAmount: true } },
        inventoryItems: {
          select: { previousQuantity: true, change: true },
        },
      },
      orderBy: [{ reportDate: "asc" }, { startsAt: "asc" }],
    });
    const userNames = await this.getUserNames(
      reports.map((report) => report.createdBy),
    );

    return reports.map((report) => ({
      ...report,
      creatorName: userNames.get(report.createdBy) ?? report.createdBy,
      salesTotal: report.sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount),
        0,
      ),
      changedItemCount: report.inventoryItems.filter(
        (item) => Number(item.change ?? 0) !== 0,
      ).length,
      inventoryItems: undefined,
      sales: undefined,
    }));
  }

  async getMonthlySummary(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("REPORT_MONTH_INVALID");
    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new Error("REPORT_MONTH_INVALID");
    }

    const firstDay = new Date(Date.UTC(year, monthIndex, 1));
    const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
    const from = zonedWallTimeToUtc(firstDay, 0);
    const to = zonedWallTimeToUtc(nextMonth, 0);

    const [items, sales, futureMovements] = await Promise.all([
      prisma.item.findMany({
        include: {
          category: true,
          stockBalance: true,
          stockLots: { orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }] },
        },
        orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      }),
      prisma.sale.findMany({
        where: { soldAt: { gte: from, lt: to }, status: "COMPLETED" },
        include: { items: { include: { item: true, lot: true } } },
        orderBy: { soldAt: "asc" },
      }),
      prisma.stockMovement.findMany({
        where: { createdAt: { gte: to } },
        select: {
          itemId: true,
          lotId: true,
          type: true,
          quantity: true,
          balanceBefore: true,
          balanceAfter: true,
        },
      }),
    ]);

    const itemPostMonthDelta = new Map<string, number>();
    const lotPostMonthDelta = new Map<string, number>();
    const positiveLotMovements = new Set([
      "PURCHASE",
      "ADJUSTMENT_IN",
      "RETURN_IN",
      "OPENING",
    ]);
    const negativeLotMovements = new Set([
      "SALE",
      "ADJUSTMENT_OUT",
      "DAMAGE_OUT",
      "DISPOSAL_OUT",
      "RETURN_OUT",
    ]);
    for (const movement of futureMovements) {
      itemPostMonthDelta.set(
        movement.itemId,
        (itemPostMonthDelta.get(movement.itemId) ?? 0) +
          Number(movement.balanceAfter) - Number(movement.balanceBefore),
      );
      if (movement.lotId && positiveLotMovements.has(movement.type)) {
        lotPostMonthDelta.set(
          movement.lotId,
          (lotPostMonthDelta.get(movement.lotId) ?? 0) + Number(movement.quantity),
        );
      } else if (movement.lotId && negativeLotMovements.has(movement.type)) {
        lotPostMonthDelta.set(
          movement.lotId,
          (lotPostMonthDelta.get(movement.lotId) ?? 0) - Number(movement.quantity),
        );
      }
    }

    const saleQuantityByItem = new Map<string, number>();
    const saleQuantityByLot = new Map<string, number>();
    const saleRevenueByItem = new Map<string, number>();
    const saleCountByItem = new Map<string, number>();
    for (const sale of sales) {
      for (const line of sale.items) {
        saleQuantityByItem.set(
          line.itemId,
          (saleQuantityByItem.get(line.itemId) ?? 0) + Number(line.quantity),
        );
        if (line.lotId) {
          saleQuantityByLot.set(
            line.lotId,
            (saleQuantityByLot.get(line.lotId) ?? 0) + Number(line.quantity),
          );
        }
        saleRevenueByItem.set(
          line.itemId,
          (saleRevenueByItem.get(line.itemId) ?? 0) + Number(line.totalPrice),
        );
        saleCountByItem.set(line.itemId, (saleCountByItem.get(line.itemId) ?? 0) + 1);
      }
    }

    const sellerNames = await this.getUserNames(
      sales.map((sale) => sale.createdBy ?? ""),
    );
    const itemSummary = items.map((item) => {
      const lots = item.stockLots.map((lot) => ({
        id: lot.id,
        batchCode: lot.batchCode,
        producedAt: lot.producedAt,
        expiresAt: lot.expiresAt,
        quantity: Math.max(
          0,
          Number(lot.quantity) - (lotPostMonthDelta.get(lot.id) ?? 0),
        ),
      })).filter(
        (lot) => lot.quantity > 0 || (saleQuantityByLot.get(lot.id) ?? 0) > 0,
      );
      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        status: item.status,
        unit: item.unit,
        categoryId: item.categoryId,
        categoryCode: item.category.code,
        categoryName: item.category.name,
        quantity: Math.max(
          0,
          Number(item.stockBalance?.quantity ?? 0) -
            (itemPostMonthDelta.get(item.id) ?? 0),
        ),
        lots,
        soldQuantity: saleQuantityByItem.get(item.id) ?? 0,
        soldRevenue: saleRevenueByItem.get(item.id) ?? 0,
        saleLineCount: saleCountByItem.get(item.id) ?? 0,
      };
    }).filter((item) => item.quantity > 0 || item.saleLineCount > 0);

    const categories = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        items: typeof itemSummary;
      }
    >();
    for (const item of itemSummary) {
      const category = categories.get(item.categoryId) ?? {
        id: item.categoryId,
        code: item.categoryCode,
        name: item.categoryName,
        items: [],
      };
      category.items.push(item);
      categories.set(item.categoryId, category);
    }

    const salesDetails = sales.map((sale) => ({
      id: sale.id,
      soldAt: sale.soldAt,
      customerType: sale.customerType,
      roomNumber: sale.roomNumber,
      customerName: sale.customerName,
      sellerName: sellerNames.get(sale.createdBy ?? "") ?? "",
      totalAmount: sale.totalAmount,
      items: sale.items.map((line) => ({
        id: line.id,
        sku: line.item.sku,
        itemName: line.item.name,
        unit: line.item.unit,
        quantity: line.quantity,
        expiresAt: line.lot?.expiresAt ?? null,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
      })),
    }));

    return {
      month,
      startsAt: from,
      endsAt: to,
      categoryCount: categories.size,
      itemCount: itemSummary.length,
      transactionCount: sales.length,
      soldQuantity: [...saleQuantityByItem.values()].reduce((sum, value) => sum + value, 0),
      salesTotal: sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0),
      categories: [...categories.values()],
      sales: salesDetails,
    };
  }

  async getReport(id: string) {
    const report = await prisma.inventoryReport.findUnique({
      where: { id },
      include: REPORT_INCLUDE,
    });
    if (!report) throw new Error("INVENTORY_REPORT_NOT_FOUND");
    const userNames = await this.getUserNames([
      report.createdBy,
      ...report.sales.map((sale) => sale.sellerName ?? ""),
    ]);

    return {
      ...report,
      creatorName: userNames.get(report.createdBy) ?? report.createdBy,
      inventoryItems: report.inventoryItems.map((item) => ({
        ...item,
        // Reclassify legacy snapshots for display without rewriting historical rows.
        inventoryGroup: inventoryGroupFor(item.categoryCode, item.categoryName),
      })),
      sales: report.sales.map((sale) => ({
        ...sale,
        sellerName: sale.sellerName ?? "",
      })),
    };
  }

  async createReport(
    input: { reportDate?: string; shiftCode?: string; note?: string },
    actorId: string,
  ) {
    if (!input.reportDate || !input.shiftCode)
      throw new Error("REPORT_DATE_AND_SHIFT_REQUIRED");
    const reportDate = parseReportDate(input.reportDate);
    const schedule = await prisma.shiftSchedule.findUnique({
      where: { code: input.shiftCode },
    });
    if (!schedule || !schedule.isActive)
      throw new Error("SHIFT_SCHEDULE_NOT_FOUND");
    const { startsAt, endsAt } = getShiftWindow(
      reportDate,
      schedule.startMinute,
      schedule.endMinute,
    );
    if (endsAt <= startsAt) throw new Error("SHIFT_SCHEDULE_WINDOW_INVALID");

    const existing = await prisma.inventoryReport.findUnique({
      where: { reportDate_shiftCode: { reportDate, shiftCode: schedule.code } },
      select: { id: true },
    });
    if (existing) throw new Error("INVENTORY_REPORT_ALREADY_EXISTS");

    const [items, sales, movements, futureMovements, previousReport] =
      await Promise.all([
        prisma.item.findMany({
          where: { createdAt: { lt: endsAt } },
          include: { category: true, stockBalance: true },
          orderBy: { name: "asc" },
        }),
        prisma.sale.findMany({
          where: { soldAt: { gte: startsAt, lt: endsAt }, status: "COMPLETED" },
          include: { items: { include: { item: true } } },
          orderBy: { soldAt: "asc" },
        }),
        prisma.stockMovement.findMany({
          where: { createdAt: { gte: startsAt, lt: endsAt } },
          select: { itemId: true, type: true, quantity: true },
        }),
        prisma.stockMovement.findMany({
          where: { createdAt: { gte: endsAt } },
          select: { itemId: true, balanceBefore: true, balanceAfter: true },
        }),
        prisma.inventoryReport.findFirst({
          where: { endsAt: { lte: startsAt } },
          orderBy: { endsAt: "desc" },
          include: {
            inventoryItems: { select: { itemId: true, quantity: true } },
          },
        }),
      ]);

    const previousQuantities = new Map(
      (previousReport?.inventoryItems ?? []).map((item) => [
        item.itemId,
        Number(item.quantity),
      ]),
    );
    const postShiftDeltas = new Map<string, number>();
    for (const movement of futureMovements) {
      postShiftDeltas.set(
        movement.itemId,
        (postShiftDeltas.get(movement.itemId) ?? 0) +
          Number(movement.balanceAfter) -
          Number(movement.balanceBefore),
      );
    }
    const soldByItem = new Map<string, number>();
    for (const sale of sales) {
      for (const line of sale.items) {
        soldByItem.set(
          line.itemId,
          (soldByItem.get(line.itemId) ?? 0) + Number(line.quantity),
        );
      }
    }
    const movementByItem = new Map<
      string,
      { received: number; adjustedIn: number; adjustedOut: number }
    >();
    for (const movement of movements) {
      const totals = movementByItem.get(movement.itemId) ?? {
        received: 0,
        adjustedIn: 0,
        adjustedOut: 0,
      };
      const quantity = Number(movement.quantity);
      if (movement.type === "PURCHASE") totals.received += quantity;
      if (
        movement.type === "ADJUSTMENT_IN" ||
        movement.type === "RETURN_IN" ||
        movement.type === "OPENING"
      )
        totals.adjustedIn += quantity;
      if (movement.type === "ADJUSTMENT_OUT" || movement.type === "RETURN_OUT")
        totals.adjustedOut += quantity;
      movementByItem.set(movement.itemId, totals);
    }
    const sellerNames = await this.getUserNames(
      sales.map((sale) => sale.createdBy ?? ""),
    );

    try {
      const report = await prisma.$transaction(async (tx) => {
        const created = await tx.inventoryReport.create({
          data: {
            reportDate,
            shiftCode: schedule.code,
            shiftLabel: schedule.labelVi,
            startsAt,
            endsAt,
            createdBy: actorId,
            note: input.note?.trim() || undefined,
          },
        });

        await tx.inventoryReportItem.createMany({
          data: items.map((item) => {
            const previousQuantity = previousQuantities.get(item.id);
            const quantity =
              Number(item.stockBalance?.quantity ?? 0) -
              (postShiftDeltas.get(item.id) ?? 0);
            const inventoryGroup = inventoryGroupFor(
              item.category.code,
              item.category.name,
            );
            const movement = movementByItem.get(item.id) ?? {
              received: 0,
              adjustedIn: 0,
              adjustedOut: 0,
            };
            return {
              reportId: created.id,
              itemId: item.id,
              sku: item.sku,
              name: item.name,
              categoryCode: item.category.code,
              categoryName: item.category.name,
              inventoryGroup,
              unit: item.unit,
              quantity,
              previousQuantity,
              change:
                previousQuantity === undefined
                  ? undefined
                  : quantity - previousQuantity,
              soldQuantity: soldByItem.get(item.id) ?? 0,
              receivedQuantity: movement.received,
              adjustedIn: movement.adjustedIn,
              adjustedOut: movement.adjustedOut,
            };
          }),
        });

        for (const sale of sales) {
          await tx.inventoryReportSale.create({
            data: {
              reportId: created.id,
              saleId: sale.id,
              customerType: sale.customerType,
              roomNumber: sale.roomNumber,
              customerName: sale.customerName,
              sellerName: sellerNames.get(sale.createdBy ?? "") ?? undefined,
              soldAt: sale.soldAt,
              totalAmount: sale.totalAmount,
              items: {
                create: sale.items.map((line) => ({
                  itemId: line.itemId,
                  sku: line.item.sku,
                  itemName: line.item.name,
                  unit: line.item.unit,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  totalPrice: line.totalPrice,
                })),
              },
            },
          });
        }

        return tx.inventoryReport.findUniqueOrThrow({
          where: { id: created.id },
          include: REPORT_INCLUDE,
        });
      });

      const userNames = await this.getUserNames([report.createdBy]);
      return {
        ...report,
        creatorName: userNames.get(report.createdBy) ?? report.createdBy,
      };
    } catch (error: any) {
      if (error?.code === "P2002")
        throw new Error("INVENTORY_REPORT_ALREADY_EXISTS");
      throw error;
    }
  }

  private async getUserNames(ids: string[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map<string, string>();
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, username: true, fullName: true },
    });
    return new Map(
      users.map((user) => [user.id, user.fullName || user.username]),
    );
  }
}
