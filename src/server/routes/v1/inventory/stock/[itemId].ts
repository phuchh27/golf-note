import { createError, defineEventHandler } from "h3";

import { StockService } from "../../../../modules/inventory/stock/stock.service";

const service = new StockService();

export default defineEventHandler(async (event) => {
  try {
    const itemId = event.context.params?.itemId;

    if (!itemId) {
      throw new Error("ITEM_ID_REQUIRED");
    }

    return { success: true, data: await service.getItemStock(itemId) };
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: error instanceof Error ? error.message : "Item not found",
    });
  }
});
