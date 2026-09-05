import type { Context } from "hono";

import { StockService } from "./stock.service";

const service = new StockService();

export class StockController {
  static async list(c: Context) {
    const query = c.req.query();
    const result = await service.getCurrentStock({
      itemId: query["itemId"],
      page: Number(query["page"]) || 1,
      limit: Number(query["limit"]) || 20,
    });

    return c.json({ success: true, data: result });
  }

  static async getByItem(c: Context) {
    const itemId = c.req.param("itemId");

    if (!itemId) {
      return c.json({ success: false, message: "Item ID is required" }, 400);
    }

    const stock = await service.getItemStock(itemId);

    return c.json({ success: true, data: stock });
  }

  static async movements(c: Context) {
    const itemId = c.req.param("itemId");

    if (!itemId) {
      return c.json({ success: false, message: "Item ID is required" }, 400);
    }

    const query = c.req.query();
    const result = await service.getMovements(itemId, {
      page: Number(query["page"]) || 1,
      limit: Number(query["limit"]) || 20,
    });

    return c.json({ success: true, data: result });
  }

  static async receive(c: Context) {
    const result = await service.receiveStock(await c.req.json());

    return c.json({ success: true, data: result }, 201);
  }

  static async adjust(c: Context) {
    const result = await service.adjustStock(await c.req.json());

    return c.json({ success: true, data: result });
  }
}
