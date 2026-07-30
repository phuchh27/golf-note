import "dotenv/config";
import {
  PrismaClient,
  ItemStatus,
} from "../generated/prisma/client";
import { prisma } from '../src/server/core/database';

async function main() {
  console.log("🌱 Starting inventory seed...");

  // =====================================================
  // CATEGORY
  // =====================================================

  const categories = [
    {
      code: "CHAMPAGNE",
      name: "Champagne",
      description: "Champagne and sparkling wine",
    },
    {
      code: "BEER",
      name: "Beer",
      description: "Beer products",
    },
    {
      code: "SOFT_DRINK",
      name: "Soft Drink",
      description: "Soft drinks",
    },
    {
      code: "WATER",
      name: "Water",
      description: "Bottled water",
    },
    {
      code: "EQUIPMENT",
      name: "Equipment",
      description: "Golf and operational equipment",
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const result = await prisma.category.upsert({
      where: {
        code: category.code,
      },

      update: {
        name: category.name,
        description: category.description,
        isActive: true,
      },

      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        isActive: true,
      },
    });

    categoryMap.set(category.code, result.id);
  }

  // =====================================================
  // ITEMS
  // =====================================================

  const items = [
    {
      sku: "CHAMPAGNE",
      name: "Champagne",
      category: "CHAMPAGNE",
      unit: "bottle",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "SAIGON",
      name: "Saigon",
      category: "BEER",
      unit: "can",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "HUDA",
      name: "Huda",
      category: "BEER",
      unit: "can",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "HEINEKEN",
      name: "Heineken",
      category: "BEER",
      unit: "can",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "GLASSIA",
      name: "Glassia",
      category: "SOFT_DRINK",
      unit: "bottle",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "LAVIE",
      name: "Lavie",
      category: "WATER",
      unit: "bottle",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "GOLF-CLUB",
      name: "Golf Club",
      category: "EQUIPMENT",
      unit: "piece",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "GOLF-BALL",
      name: "Golf Ball",
      category: "EQUIPMENT",
      unit: "piece",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "MENU",
      name: "Menu",
      category: "EQUIPMENT",
      unit: "piece",
      costPrice: 0,
      sellingPrice: 0,
    },

    {
      sku: "POS",
      name: "POS",
      category: "EQUIPMENT",
      unit: "piece",
      costPrice: 0,
      sellingPrice: 0,
    },
  ];

  // =====================================================
  // ITEM + STOCK BALANCE
  // =====================================================

  for (const item of items) {
    const categoryId = categoryMap.get(item.category);

    if (!categoryId) {
      throw new Error(
        `Category "${item.category}" not found`,
      );
    }

    const createdItem = await prisma.item.upsert({
      where: {
        sku: item.sku,
      },

      update: {
        name: item.name,
        categoryId,
        unit: item.unit,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        status: ItemStatus.ACTIVE,
      },

      create: {
        sku: item.sku,
        name: item.name,
        categoryId,
        unit: item.unit,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        status: ItemStatus.ACTIVE,
      },
    });

    // ===================================================
    // STOCK BALANCE
    // ===================================================

    await prisma.stockBalance.upsert({
      where: {
        itemId: createdItem.id,
      },

      update: {},

      create: {
        itemId: createdItem.id,
        quantity: 0,
      },
    });
  }

  console.log("✅ Categories seeded");
  console.log("✅ Items seeded");
  console.log("✅ Stock balances initialized");
  console.log("🌱 Inventory seed completed");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });