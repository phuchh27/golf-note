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
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { ToastService } from "../../core/ui/toast.service";
import { IconComponent } from "../../core/ui/icon/icon.component";
import { AuthService } from "../../core/auth/auth.service";
import { LanguageService } from "../../core/i18n/language.service";

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
  stockLoans?: Array<{ lotId?: string | null; quantity: number | string }>;
}

interface StockLot {
  id: string;
  batchCode?: string | null;
  quantity: number | string;
  receivedAt: string;
  expiresAt?: string | null;
  producedAt?: string | null;
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

interface ReceiptHistoryItem {
  id: string;
  quantity: number | string;
  item: { name: string; sku: string; unit: string };
  lot?: {
    id: string;
    batchCode?: string | null;
    expiresAt?: string | null;
  } | null;
}

interface StockReceiptHistory {
  id: string;
  receiptNumber?: string | null;
  batchCode?: string | null;
  supplierName?: string | null;
  receivedAt: string;
  items: ReceiptHistoryItem[];
}

interface StockLoan {
  id: string;
  itemId: string;
  quantity: number | string;
  borrower: string;
  note?: string | null;
  borrowedAt: string;
  item: { name: string; sku: string; unit: string };
  lot?: { expiresAt?: string | null; batchCode?: string | null } | null;
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
  readonly languageService = inject(LanguageService);

  readonly items = signal<InventoryItem[]>([]);
  readonly receivableItems = signal<InventoryItem[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal("");
  readonly selectedItem = signal<InventoryItem | null>(null);
  readonly activePanel = signal<
    | "create"
    | "edit"
    | "receive"
    | "adjust"
    | "detail"
    | "receipt-history"
    | "loans"
    | "borrow"
    | null
  >(null);
  readonly search = signal("");
  readonly categoryId = signal("");
  readonly status = signal("ACTIVE");
  readonly totalItems = signal(0);
  readonly canManageInventory = computed(() =>
    this.authService.hasAnyRole(["MANAGER", "ADMIN", "SUPER_ADMIN"]),
  );
  readonly canAdminInventory = computed(() =>
    this.authService.hasAnyRole(["ADMIN", "SUPER_ADMIN"]),
  );
  readonly movements = signal<StockMovement[]>([]);
  readonly isDetailLoading = signal(false);
  readonly receiptHistory = signal<StockReceiptHistory[]>([]);
  readonly receiptHistoryNumber = this.fb.control("");
  readonly isReceiptHistoryLoading = signal(false);
  readonly loans = signal<StockLoan[]>([]);

  readonly loanForm = this.fb.group({
    borrower: ["", [Validators.required, Validators.minLength(2)]],
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    lotId: [""],
    note: [""],
  });

  readonly receiveForm = this.fb.group({
    hasReceipt: [false],
    receiptNumber: [""],
    batchCode: [""],
    receivedAt: [this.today(), Validators.required],
    note: [""],
    items: this.fb.array([this.createReceiveLine()]),
  });

  readonly adjustForm = this.fb.group({
    direction: ["OUT", Validators.required],
    reasonType: ["OTHER", Validators.required],
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
    status: ["ACTIVE", Validators.required],
  });

  get receiveLines(): FormArray {
    return this.receiveForm.controls.items;
  }

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
      status: "ACTIVE",
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
      status: item.status,
    });
    this.selectedItem.set(item);
    this.activePanel.set("edit");
  }

  async openReceive(): Promise<void> {
    this.selectedItem.set(null);
    this.activePanel.set("receive");
    this.receiveForm.reset({
      hasReceipt: false,
      receiptNumber: "",
      batchCode: "",
      receivedAt: this.today(),
      note: "",
    });
    this.receiveLines.clear();
    this.receiveLines.push(this.createReceiveLine());
    this.setReceiptMode(false);
    await this.loadReceivableItems();
  }

  async loadReceivableItems(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<PaginatedItems>>(
          "/api/v1/inventory/items?status=ACTIVE&limit=100",
          { withCredentials: true },
        ),
      );
      this.receivableItems.set(response.data.items);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ??
          "Không thể tải danh sách mặt hàng để nhập.",
      );
    }
  }

  private createReceiveLine(itemId = "", unitCost = 0) {
    return this.fb.group({
      itemId: [itemId, Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.001)]],
      batchCode: [""],
      producedAt: [""],
      expiresAt: ["", Validators.required],
      unitCost: [unitCost, [Validators.min(0)]],
    });
  }

  addReceiveLine(): void {
    this.receiveLines.push(this.createReceiveLine());
  }

  removeReceiveLine(index: number): void {
    if (this.receiveLines.length > 1) this.receiveLines.removeAt(index);
  }

  setReceiptMode(hasReceipt: boolean): void {
    this.receiveForm.controls.hasReceipt.setValue(hasReceipt);
    const receiptNumber = this.receiveForm.controls.receiptNumber;
    receiptNumber.setValidators(hasReceipt ? [Validators.required] : []);
    receiptNumber.updateValueAndValidity();
  }

  async openLoans(): Promise<void> {
    this.activePanel.set("loans");
    await this.loadOpenLoans();
  }

  async loadOpenLoans(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<StockLoan[]>>(
          "/api/v1/inventory/stock/loans",
          { withCredentials: true },
        ),
      );
      this.loans.set(response.data);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ??
          "Không thể tải danh sách hàng đang cho mượn.",
      );
    }
  }

  openBorrow(item: InventoryItem): void {
    this.selectedItem.set(item);
    this.loanForm.reset({ borrower: "", quantity: 1, lotId: "", note: "" });
    this.activePanel.set("borrow");
  }

  async borrowStock(): Promise<void> {
    const item = this.selectedItem();
    if (!item || this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          "/api/v1/inventory/stock/loans",
          {
            itemId: item.id,
            ...this.loanForm.getRawValue(),
            lotId: this.loanForm.value.lotId || undefined,
          },
          { withCredentials: true },
        ),
      );
      this.toast.success(`Đã ghi nhận cho mượn ${item.name}.`);
      this.closePanel();
      await Promise.all([this.loadItems(), this.loadOpenLoans()]);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể ghi nhận mượn hàng.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  async returnLoan(loan: StockLoan): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.http.patch(
          `/api/v1/inventory/stock/loans/${loan.id}`,
          {},
          { withCredentials: true },
        ),
      );
      this.toast.success(`Đã ghi nhận trả ${loan.item.name}.`);
      await Promise.all([this.loadItems(), this.loadOpenLoans()]);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể ghi nhận trả hàng.",
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  openReceiptHistory(): void {
    this.receiptHistory.set([]);
    this.receiptHistoryNumber.reset("");
    this.activePanel.set("receipt-history");
    void this.loadReceiptHistory();
  }

  async loadReceiptHistory(): Promise<void> {
    this.isReceiptHistoryLoading.set(true);

    try {
      const receiptNumber = this.receiptHistoryNumber.value?.trim();
      const params = new URLSearchParams({ limit: "100" });
      if (receiptNumber) params.set("receiptNumber", receiptNumber);
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ items: StockReceiptHistory[] }>>(
          `/api/v1/inventory/stock/receipts?${params.toString()}`,
          { withCredentials: true },
        ),
      );
      this.receiptHistory.set(response.data.items);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải lịch sử nhập theo lô.",
      );
    } finally {
      this.isReceiptHistoryLoading.set(false);
    }
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
    const availableLots = (item.stockLots ?? []).filter(
      (lot) => Number(lot.quantity) > 0,
    );
    this.adjustForm.reset({
      direction: "OUT",
      reasonType: "OTHER",
      quantity: 1,
      lotId: availableLots.length === 1 ? availableLots[0].id : "",
      note: "",
    });
    this.adjustForm.controls.lotId.setValidators(
      availableLots.length > 1 ? Validators.required : null,
    );
    this.adjustForm.controls.lotId.updateValueAndValidity();
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
        const { status, ...itemPayload } = payload;
        await firstValueFrom(
          this.http.patch(
            `/api/v1/inventory/items/${this.selectedItem()!.id}`,
            itemPayload,
            { withCredentials: true },
          ),
        );
        if (
          this.canAdminInventory() &&
          status !== this.selectedItem()!.status
        ) {
          await firstValueFrom(
            this.http.patch(
              `/api/v1/inventory/items/${this.selectedItem()!.id}/status`,
              { status },
              { withCredentials: true },
            ),
          );
        }
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
    if (this.receiveForm.invalid) {
      this.receiveForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const formValue = this.receiveForm.getRawValue();
      const { items: _lines, ...receipt } = formValue;
      const items = formValue.items.map((line) => ({
        ...line,
        receivedAt: formValue.receivedAt,
        batchCode:
          line.batchCode?.trim() || formValue.batchCode?.trim() || undefined,
        producedAt: line.producedAt || undefined,
        note: formValue.note?.trim() || undefined,
      }));

      await firstValueFrom(
        this.http.post(
          "/api/v1/inventory/stock/receive",
          {
            ...receipt,
            hasReceipt: formValue.hasReceipt,
            receiptNumber: formValue.receiptNumber?.trim() || undefined,
            batchCode: formValue.batchCode?.trim() || undefined,
            note: formValue.note?.trim() || undefined,
            items,
          },
          { withCredentials: true },
        ),
      );
      this.toast.success(`Đã nhập ${items.length} lô hàng vào kho.`);
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
    if (!item) return;

    this.adjustForm.markAllAsTouched();
    const availableLots = (item.stockLots ?? []).filter(
      (lot) => Number(lot.quantity) > 0,
    );
    if (!this.adjustForm.controls.note.value?.trim()) {
      this.toast.warning("Vui lòng nhập lý do điều chỉnh.");
      return;
    }
    if (this.adjustForm.controls.quantity.invalid) {
      this.toast.warning("Vui lòng nhập số lượng điều chỉnh hợp lệ.");
      return;
    }
    if (availableLots.length > 1 && !this.adjustForm.value.lotId) {
      this.toast.warning("Vui lòng chọn lô có hạn sử dụng cần điều chỉnh.");
      return;
    }
    if (this.adjustForm.invalid) {
      this.adjustForm.markAllAsTouched();
      this.toast.warning("Vui lòng kiểm tra lại thông tin điều chỉnh.");
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
            reasonType: formValue.reasonType,
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

  borrowedFromLot(item: InventoryItem, lotId: string): number {
    return (item.stockLoans ?? [])
      .filter((loan) => loan.lotId === lotId)
      .reduce((total, loan) => total + Number(loan.quantity), 0);
  }

  availableLotStock(item: InventoryItem, lot: StockLot): number {
    return Math.max(
      0,
      Number(lot.quantity) - this.borrowedFromLot(item, lot.id),
    );
  }

  availableStock(item: InventoryItem): number {
    const today = new Date(`${this.today()}T00:00:00.000Z`);
    const lots = item.stockLots ?? [];
    const trackedQuantity = lots.reduce(
      (total, lot) => total + Number(lot.quantity),
      0,
    );
    const untrackedBorrowed = (item.stockLoans ?? [])
      .filter((loan) => !loan.lotId)
      .reduce((total, loan) => total + Number(loan.quantity), 0);
    const untrackedAvailable = Math.max(
      0,
      this.stockQuantity(item) - trackedQuantity - untrackedBorrowed,
    );
    const lotAvailable = lots.reduce((total, lot) => {
      if (lot.expiresAt && new Date(lot.expiresAt) < today) return total;
      return total + this.availableLotStock(item, lot);
    }, 0);
    return lotAvailable + untrackedAvailable;
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
      DAMAGE_OUT: "Ghi nhận hư hỏng",
      DISPOSAL_OUT: "Loại bỏ hàng",
      LOAN_OUT: "Cho mượn",
      LOAN_RETURN: "Nhận trả hàng mượn",
      RETURN_IN: "Trả hàng vào",
      RETURN_OUT: "Trả hàng ra",
      OPENING: "Tồn đầu kỳ",
    };

    return labels[type] ?? type;
  }

  lowStockCount(): number {
    return this.items().filter((item) => this.availableStock(item) <= 5).length;
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
