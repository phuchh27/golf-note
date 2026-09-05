import { createError, defineEventHandler, readBody } from "h3";

import { StockService } from "../../../../modules/inventory/stock/stock.service";
import { requireInventoryManager } from "../require-inventory-manager";

const service = new StockService();

export default defineEventHandler(async (event) => {
  await requireInventoryManager(event);

  try {
    const result = await service.adjustStock(await readBody(event));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage:
        error instanceof Error ? error.message : "Unable to adjust stock",
    });
  }
});
