import type { Context } from "hono";

import { CategoryService } from "./category.service";

const service = new CategoryService();

export class CategoryController {
  static async list(c: Context) {
    const query = c.req.query();

    const result = await service.getCategories({
      search: query["search"],
      isActive:
        query["isActive"] !== undefined
          ? query["isActive"] === "true"
          : undefined,
      page: Number(query["page"]) || 1,
      limit: Number(query["limit"]) || 20,
    });

    return c.json({
      success: true,
      data: result,
    });
  }

  static async getById(c: Context) {
    const id = c.req.param("id");

    if (!id) {
      return c.json(
        {
          success: false,
          message: "Category ID is required",
        },
        400,
      );
    }
    const category = await service.getCategory(id);

    return c.json({
      success: true,
      data: category,
    });
  }

  static async create(c: Context) {
    const body = await c.req.json();

    const category = await service.createCategory(body);

    return c.json(
      {
        success: true,
        data: category,
      },
      201,
    );
  }

  static async update(c: Context) {
    const id = c.req.param("id");

    const body = await c.req.json();

    if (!id) {
      return c.json(
        {
          success: false,
          message: "Category ID is required",
        },
        400,
      );
    }

    const category = await service.updateCategory(id, body);

    return c.json({
      success: true,
      data: category,
    });
  }

  static async deactivate(c: Context) {
    const id = c.req.param("id");

    if (!id) {
      return c.json(
        {
          success: false,
          message: "Category ID is required",
        },
        400,
      );
    }

    const category = await service.deactivateCategory(id);

    return c.json({
      success: true,
      data: category,
    });
  }
}
