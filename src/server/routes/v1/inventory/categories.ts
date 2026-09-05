import { fromWebHandler } from "h3";
import { Hono } from "hono";

import { CategoryController } from "../../../modules/inventory/category/category.controller";

const categoriesRouter = new Hono().basePath("/v1/inventory/categories");

categoriesRouter.get("/", CategoryController.list);

categoriesRouter.get("/:id", CategoryController.getById);

categoriesRouter.post("/", CategoryController.create);

categoriesRouter.patch("/:id", CategoryController.update);

categoriesRouter.patch("/:id/deactivate", CategoryController.deactivate);

export default fromWebHandler((request) => categoriesRouter.fetch(request));
