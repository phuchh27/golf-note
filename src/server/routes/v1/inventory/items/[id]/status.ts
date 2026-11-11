import { createError, defineEventHandler, getMethod, readBody } from "h3";

import { ItemService } from "../../../../../modules/inventory/item/item.service";
import { requireInventoryAdmin } from "../../require-inventory-manager";

const service = new ItemService();

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== "PATCH") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  }
  await requireInventoryAdmin(event);

  try {
    const id = event.context.params?.id;
    if (!id)
      throw createError({ statusCode: 400, statusMessage: "ITEM_ID_REQUIRED" });
    const body = await readBody<{ status?: string }>(event);
    return {
      success: true,
      data: await service.updateItem(id, { status: body.status as never }),
    };
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error)
      throw error;
    const message =
      error instanceof Error ? error.message : "Unable to update item status";
    throw createError({
      statusCode: message === "ITEM_NOT_FOUND" ? 404 : 400,
      statusMessage: message,
    });
  }
});
