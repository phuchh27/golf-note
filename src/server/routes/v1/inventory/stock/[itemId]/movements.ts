import { createError, defineEventHandler, getQuery } from "h3";

import { StockService } from "../../../../../modules/inventory/stock/stock.service";

const service = new StockService();

export default defineEventHandler(async (event) => {
  try {
    const itemId = event.context.params?.itemId;
    const query = getQuery(event);

    if (!itemId) {
      throw new Error("ITEM_ID_REQUIRED");
    }

    return {
      success: true,
      data: await service.getMovements(itemId, {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
      }),
    };
  } catch (error) {
    throw createError({
      statusCode: 404,
      statusMessage: error instanceof Error ? error.message : "Item not found",
    });
  }
});
