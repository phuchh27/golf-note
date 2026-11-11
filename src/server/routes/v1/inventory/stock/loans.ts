import { createError, defineEventHandler, getMethod, readBody } from "h3";

import { StockService } from "../../../../modules/inventory/stock/stock.service";
import { requireInventoryAdmin } from "../require-inventory-manager";

const service = new StockService();

export default defineEventHandler(async (event) => {
  const user = await requireInventoryAdmin(event);

  try {
    if (getMethod(event) === "GET") {
      return { success: true, data: await service.getOpenLoans() };
    }
    if (getMethod(event) === "POST") {
      return {
        success: true,
        data: await service.borrowStock(await readBody(event), user.id),
      };
    }
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error) {
    throw createError({
      statusCode:
        error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 400,
      statusMessage:
        error instanceof Error ? error.message : "Unable to process stock loan",
    });
  }
});
