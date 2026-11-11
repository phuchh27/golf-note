import { prisma } from "../../../core/database/prisma.client";

import type { CreateItemInput, UpdateItemInput } from "./item.types";

export class ItemRepository {
  async findById(id: string) {
    return prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        stockBalance: true,
        stockLots: {
          orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }],
        },
      },
    });
  }

  async findBySku(sku: string) {
    return prisma.item.findUnique({
      where: { sku },
    });
  }

  async findCategory(categoryId: string) {
    return prisma.category.findUnique({
      where: { id: categoryId },
    });
  }

  async findMany(params: {
    search?: string;
    categoryId?: string;
    status?: UpdateItemInput["status"];
    skip: number;
    take: number;
  }) {
    const where = {
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              {
                sku: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
              {
                name: {
                  contains: params.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          category: true,
          stockBalance: true,
          stockLoans: {
            where: { status: "BORROWED" },
            select: { lotId: true, quantity: true },
          },
          stockLots: {
            where: { quantity: { gt: 0 } },
            orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }],
          },
        },
        orderBy: { name: "asc" },
        skip: params.skip,
        take: params.take,
      }),
      prisma.item.count({ where }),
    ]);

    return { items, total };
  }

  async create(input: CreateItemInput) {
    return prisma.item.create({
      data: {
        sku: input.sku,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        unit: input.unit,
        status: input.status,
        costPrice: input.costPrice,
        sellingPrice: input.sellingPrice,
        stockBalance: {
          create: { quantity: 0 },
        },
      },
      include: {
        category: true,
        stockBalance: true,
      },
    });
  }

  async update(id: string, input: UpdateItemInput) {
    return prisma.item.update({
      where: { id },
      data: input,
      include: {
        category: true,
        stockBalance: true,
      },
    });
  }
}
