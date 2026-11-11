import { createError, defineEventHandler, getMethod, readBody } from "h3";

import { ItemService } from "../../../../modules/inventory/item/item.service";
import { requireInventoryManager } from "../require-inventory-manager";

const service = new ItemService();

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const id = event.context.params?.id;
  if (!id)
    throw createError({ statusCode: 400, statusMessage: "ITEM_ID_REQUIRED" });

  try {
    if (method === "GET") {
      return { success: true, data: await service.getItem(id) };
    }

    if (method === "PATCH") {
      await requireInventoryManager(event);
      const body = await readBody<Record<string, unknown>>(event);
      if (Object.hasOwn(body, "status")) {
        throw createError({
          statusCode: 403,
          statusMessage: "Item status changes require administrator permission",
        });
      }
      return { success: true, data: await service.updateItem(id, body) };
    }

    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error)
      throw error;
    const message =
      error instanceof Error ? error.message : "Unable to load inventory item";
    throw createError({
      statusCode: message === "ITEM_NOT_FOUND" ? 404 : 400,
      statusMessage: message,
    });
  }
});
