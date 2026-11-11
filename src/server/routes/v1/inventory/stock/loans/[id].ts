import { createError, defineEventHandler, getMethod, readBody } from "h3";

import { StockService } from "../../../../../modules/inventory/stock/stock.service";
import { requireInventoryAdmin } from "../../require-inventory-manager";

const service = new StockService();

export default defineEventHandler(async (event) => {
  const user = await requireInventoryAdmin(event);
  if (getMethod(event) !== "PATCH") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  }

  try {
    const id = event.context.params?.id;
    if (!id)
      throw createError({ statusCode: 400, statusMessage: "Loan ID required" });
    const body = await readBody<{ note?: string }>(event);
    return {
      success: true,
      data: await service.returnLoan(id, user.id, body?.note),
    };
  } catch (error) {
    throw createError({
      statusCode:
        error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 400,
      statusMessage:
        error instanceof Error ? error.message : "Unable to return stock loan",
    });
  }
});
