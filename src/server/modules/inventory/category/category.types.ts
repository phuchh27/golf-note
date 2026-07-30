export interface CreateCategoryInput {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateCategoryInput {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CategoryListQuery {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}