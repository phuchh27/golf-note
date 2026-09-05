import { HttpClient } from "@angular/common/http";
import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { DOCUMENT } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { ToastService } from "../../core/ui/toast.service";
import { IconComponent } from "../../core/ui/icon/icon.component";
import { AuthService } from "../../core/auth/auth.service";

interface Category {
  id: string;
  code: string;
  name: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  status: string;
  costPrice: number | string;
  sellingPrice: number | string;
  category: Category;
  stockBalance?: { quantity: number | string } | null;
  stockLots?: StockLot[];
}

interface StockLot {
  id: string;
  batchCode?: string | null;
  quantity: number | string;
  receivedAt: string;
  expiresAt?: string | null;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  createdAt: string;
  note?: string | null;
  lot?: StockLot | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusMessage?: string;
}

interface PaginatedItems {
  items: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PaginatedMovements {
  items: StockMovement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: "./inventory.page.html",
})
export default class InventoryPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);

  readonly items = signal<InventoryItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal("");
  readonly selectedItem = signal<InventoryItem | null>(null);
  readonly activePanel = signal<
    "create" | "edit" | "receive" | "adjust" | "detail" | null
  >(null);
  readonly search = signal("");
  readonly categoryId = signal("");
  readonly status = signal("ACTIVE");
  readonly totalItems = signal(0);
  readonly canManageInventory = computed(() =>
    this.authService.hasAnyRole(["MANAGER", "ADMIN", "SUPER_ADMIN"]),
  );
  readonly movements = signal<StockMovement[]>([]);
  readonly isDetailLoading = signal(false);

  readonly receiveForm = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    batchCode: [""],
    receivedAt: [this.today(), Validators.required],
    expiresAt: [""],
    unitCost: [0, [Validators.min(0)]],
    note: [""],
  });

  readonly adjustForm = this.fb.group({
    direction: ["OUT", Validators.required],
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    lotId: [""],
    note: ["", [Validators.required, Validators.minLength(3)]],
  });

  readonly createForm = this.fb.group({
    sku: ["", [Validators.required, Validators.minLength(2)]],
    name: ["", [Validators.required, Validators.minLength(2)]],
    categoryId: ["", Validators.required],
    unit: ["", Validators.required],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
    description: [""],
  });

  constructor() {
    effect(() => {
      this.document.body.style.overflow = this.activePanel() ? "hidden" : "";
    });
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadItems(), this.loadCategories()]);
  }

  async loadItems(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set("");

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      if (this.search().trim()) params.set("search", this.search().trim());
      if (this.categoryId()) params.set("categoryId", this.categoryId());
      if (this.status()) params.set("status", this.status());

      const response = await firstValueFrom(
        this.http.get<ApiResponse<PaginatedItems>>(
          `/api/v1/inventory/items?${params.toString()}`,
          { withCredentials: true },
        ),
      );

      this.items.set(response.data.items);
      this.totalItems.set(response.data.pagination.total);
    } catch (error: any) {
      const message =
        error?.error?.statusMessage ?? "Không thể tải dữ liệu tồn kho.";
      this.errorMessage.set(message);
      this.toast.error(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCategories(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ items: Category[] }>>(
          "/api/v1/inventory/categories?isActive=true&limit=100",
          { withCredentials: true },
        ),
      );
      this.categories.set(response.data.items);
    } catch {
      this.toast.error("Không thể tải danh sách nhóm vật phẩm.");
    }
  }

  onSearch(value: string): void {
    this.search.set(value);
    void this.loadItems();
  }

  onCategoryChange(value: string): void {
    this.categoryId.set(value);
    void this.loadItems();
  }

  onStatusChange(value: string): void {
    this.status.set(value);
    void this.loadItems();
  }

  openCreate(): void {
    this.createForm.reset({
      sku: "",
      name: "",
      categoryId: this.categories()[0]?.id ?? "",
      unit: "",
      costPrice: 0,
      sellingPrice: 0,
      description: "",
    });
    this.activePanel.set("create");
  }

  openEdit(item: InventoryItem): void {
    this.createForm.reset({
      sku: item.sku,
      name: item.name,
      categoryId: item.category.id,
      unit: item.unit,
      costPrice: Number(item.costPrice),
      sellingPrice: Number(item.sellingPrice),
      description: "",
    });
    this.selectedItem.set(item);
    this.activePanel.set("edit");
  }

  openReceive(item: InventoryItem): void {
    this.selectedItem.set(item);
    this.activePanel.set("receive");
    this.receiveForm.reset({
      quantity: 1,
      batchCode: "",
      receivedAt: this.today(),
      expiresAt: "",
      unitCost: Number(item.costPrice) || 0,
      note: "",
    });
  }

  async openDetail(item: InventoryItem): Promise<void> {
    this.selectedItem.set(item);
    this.movements.set([]);
    this.activePanel.set("detail");
    this.isDetailLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PaginatedMovements>>(
          `/api/v1/inventory/stock/${item.id}/movements?limit=100`,
          { withCredentials: true },
        ),
      );
      this.movements.set(response.data.items);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải lịch sử tồn kho.",
      );
    } finally {
      this.isDetailLoading.set(false);
    }
  }

  openAdjust(item: InventoryItem): void {
    this.selectedItem.set(item);
    this.activePanel.set("adjust");
    this.adjustForm.reset({
      direction: "OUT",
      quantity: 1,
      lotId: item.stockLots?.[0]?.id ?? "",
      note: "",
    });
  }

  closePanel(): void {
    this.activePanel.set(null);
    this.selectedItem.set(null);
  }

  async saveItem(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const formValue = this.createForm.getRawValue();

      const payload = {
        ...formValue,
        sku: formValue.sku?.trim().toUpperCase(),
        name: formValue.name?.trim(),
        unit: formValue.unit?.trim(),
        description: formValue.description?.trim() || undefined,
      };

      if (this.activePanel() === "edit" && this.selectedItem()) {
        await firstValueFrom(
          this.http.patch(
            `/api/v1/inventory/items/${this.selectedItem()!.id}`,
            payload,
            { withCredentials: true },
          ),
        );
      } else {
        await firstValueFrom(
          this.http.post("/api/v1/inventory/items", payload, {
            withCredentials: true,
          }),
        );
      }

      this.toast.success(
        this.activePanel() === "edit"
          ? "Đã cập nhật vật phẩm."
          : "Đã thêm vật phẩm mới.",
      );
      this.closePanel();
      await this.loadItems();
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể thêm vật phẩm.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  async receiveStock(): Promise<void> {
    const item = this.selectedItem();
    if (!item || this.receiveForm.invalid) {
      this.receiveForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          "/api/v1/inventory/stock/receive",
          { itemId: item.id, ...this.receiveForm.getRawValue() },
          { withCredentials: true },
        ),
      );
      this.toast.success(`Đã nhập kho ${item.name}.`);
      this.closePanel();
      await this.loadItems();
    } catch (error: any) {
      this.toast.error(error?.error?.statusMessage ?? "Không thể nhập kho.");
    } finally {
      this.isSaving.set(false);
    }
  }

  async adjustStock(): Promise<void> {
    const item = this.selectedItem();
    if (!item || this.adjustForm.invalid) {
      this.adjustForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const formValue = this.adjustForm.getRawValue();

      await firstValueFrom(
        this.http.post(
          "/api/v1/inventory/stock/adjust",
          {
            itemId: item.id,
            ...formValue,
            lotId: formValue.lotId?.trim() || undefined,
          },
          { withCredentials: true },
        ),
      );
      this.toast.success(`Đã cập nhật tồn kho ${item.name}.`);
      this.closePanel();
      await this.loadItems();
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể điều chỉnh tồn kho.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  stockQuantity(item: InventoryItem): number {
    return Number(item.stockBalance?.quantity ?? 0);
  }

  nearestExpiry(item: InventoryItem): string | null {
    return (
      item.stockLots?.find((lot) => Number(lot.quantity) > 0)?.expiresAt ?? null
    );
  }

  isExpiringSoon(item: InventoryItem): boolean {
    const expiry = this.nearestExpiry(item);
    if (!expiry) return false;

    const days =
      (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  }

  isExpired(item: InventoryItem): boolean {
    const expiry = this.nearestExpiry(item);
    return Boolean(expiry && new Date(expiry).getTime() < Date.now());
  }

  movementLabel(type: string): string {
    const labels: Record<string, string> = {
      PURCHASE: "Nhập kho",
      SALE: "Bán hàng",
      ADJUSTMENT_IN: "Điều chỉnh tăng",
      ADJUSTMENT_OUT: "Điều chỉnh giảm",
      RETURN_IN: "Trả hàng vào",
      RETURN_OUT: "Trả hàng ra",
      OPENING: "Tồn đầu kỳ",
    };

    return labels[type] ?? type;
  }

  lowStockCount(): number {
    return this.items().filter((item) => this.stockQuantity(item) <= 5).length;
  }

  expiryCount(): number {
    return this.items().filter(
      (item) => this.isExpired(item) || this.isExpiringSoon(item),
    ).length;
  }

  trackItem(_index: number, item: InventoryItem): string {
    return item.id;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  todayIso(): string {
    return new Date().toISOString();
  }
}
