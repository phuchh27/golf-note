import { CategoryRepository } from "./category.repository";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryListQuery,
} from "./category.types";

export class CategoryService {
  private readonly repository = new CategoryRepository();

  async getCategories(query: CategoryListQuery = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(query.limit) || 20, 1),
      100,
    );

    const skip = (page - 1) * limit;

    const { items, total } =
      await this.repository.findMany({
        search: query.search?.trim(),
        isActive: query.isActive,
        skip,
        take: limit,
      });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategory(id: string) {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    return category;
  }

  async createCategory(input: CreateCategoryInput) {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    if (!code) {
      throw new Error("CATEGORY_CODE_REQUIRED");
    }

    if (!name) {
      throw new Error("CATEGORY_NAME_REQUIRED");
    }

    const existing = await this.repository.findByCode(code);

    if (existing) {
      throw new Error("CATEGORY_CODE_ALREADY_EXISTS");
    }

    return this.repository.create({
      code,
      name,
      description: input.description?.trim(),
    });
  }

  async updateCategory(
    id: string,
    input: UpdateCategoryInput,
  ) {
    const category =
      await this.repository.findById(id);

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    if (input.code !== undefined) {
      const code = input.code.trim().toUpperCase();

      const existing =
        await this.repository.findByCode(code);

      if (existing && existing.id !== id) {
        throw new Error(
          "CATEGORY_CODE_ALREADY_EXISTS",
        );
      }

      input.code = code;
    }

    if (input.name !== undefined) {
      input.name = input.name.trim();
    }

    return this.repository.update(id, input);
  }

  async deactivateCategory(id: string) {
    const category =
      await this.repository.findById(id);

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    return this.repository.update(id, {
      isActive: false,
    });
  }
}