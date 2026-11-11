import type { Context } from "hono";

import { ItemService } from "./item.service";

const service = new ItemService();

export class ItemController {
  static async list(c: Context) {
    const query = c.req.query();
    const status = query["status"]?.toUpperCase();

    const result = await service.getItems({
      search: query["search"],
      categoryId: query["categoryId"],
      status: status as "ACTIVE" | "INACTIVE" | "DISCONTINUED" | undefined,
      page: Number(query["page"]) || 1,
      limit: Number(query["limit"]) || 20,
    });

    return c.json({ success: true, data: result });
  }

  static async getById(c: Context) {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Item ID is required" }, 400);
    }

    const item = await service.getItem(id);

    return c.json({ success: true, data: item });
  }

  static async create(c: Context) {
    const body = await c.req.json();
    const item = await service.createItem({ ...body, status: "ACTIVE" });

    return c.json({ success: true, data: item }, 201);
  }

  static async update(c: Context) {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Item ID is required" }, 400);
    }

    const body = await c.req.json();
    if (Object.hasOwn(body, "status")) {
      return c.json(
        {
          success: false,
          message: "Item status changes require administrator permission",
        },
        403,
      );
    }

    const item = await service.updateItem(id, body);

    return c.json({ success: true, data: item });
  }

  static async updateStatus(c: Context) {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ success: false, message: "Item ID is required" }, 400);
    }

    const { status } = await c.req.json();
    const item = await service.updateItem(id, { status });
    return c.json({ success: true, data: item });
  }

  static async deactivate(c: Context) {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Item ID is required" }, 400);
    }

    const item = await service.deactivateItem(id);

    return c.json({ success: true, data: item });
  }
}
