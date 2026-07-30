import { prisma } from "../../../core/database/prisma.client";

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.types";

export class CategoryRepository {
  async findById(id: string) {
    return prisma.category.findUnique({
      where: {
        id,
      },
    });
  }

  async findByCode(code: string) {
    return prisma.category.findUnique({
      where: {
        code,
      },
    });
  }

  async findMany(params: {
    search?: string;
    isActive?: boolean;
    skip: number;
    take: number;
  }) {
    const where = {
      ...(params.isActive !== undefined
        ? {
            isActive: params.isActive,
          }
        : {}),

      ...(params.search
        ? {
            OR: [
              {
                name: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
              {
                code: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: {
          name: "asc",
        },
        skip: params.skip,
        take: params.take,
      }),

      prisma.category.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }

  async create(input: CreateCategoryInput) {
    return prisma.category.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });
  }

  async update(id: string, input: UpdateCategoryInput) {
    return prisma.category.update({
      where: {
        id,
      },
      data: input,
    });
  }

  async delete(id: string) {
    return prisma.category.delete({
      where: {
        id,
      },
    });
  }
}