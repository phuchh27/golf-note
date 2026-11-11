import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { IconComponent } from "../../core/ui/icon/icon.component";
import { ToastService } from "../../core/ui/toast.service";
import { LanguageService } from "../../core/i18n/language.service";

interface SaleItemOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sellingPrice: number | string;
  stockBalance?: { quantity: number | string } | null;
  stockLoans?: Array<{ lotId?: string | null; quantity: number | string }>;
  stockLots?: Array<{
    id: string;
    quantity: number | string;
    expiresAt?: string | null;
    receivedAt: string;
    batchCode?: string | null;
  }>;
}

interface CartLine {
  item: SaleItemOption;
  quantity: number;
  lotId?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  statusMessage?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: "./sale.page.html",
})
export default class SalePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly languageService = inject(LanguageService);

  readonly items = signal<SaleItemOption[]>([]);
  readonly cart = signal<CartLine[]>([]);
  readonly search = signal("");
  readonly customerType = signal<"ROOM" | "EXTERNAL">("ROOM");
  readonly roomNumber = signal("");
  readonly customerName = signal("");
  readonly note = signal("");
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ items: SaleItemOption[] }>>(
          "/api/v1/inventory/items?status=ACTIVE&limit=100",
          { withCredentials: true },
        ),
      );
      this.items.set(response.data.items);
    } catch {
      this.toast.error("Không thể tải danh sách vật phẩm.");
    } finally {
      this.isLoading.set(false);
    }
  }

  filteredItems(): SaleItemOption[] {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();

    return this.items().filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term),
    );
  }

  stockQuantity(item: SaleItemOption): number {
    const today = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    const lots = item.stockLots ?? [];
    const trackedQuantity = lots.reduce(
      (total, lot) => total + Number(lot.quantity),
      0,
    );
    const borrowedUntracked = (item.stockLoans ?? [])
      .filter((loan) => !loan.lotId)
      .reduce((total, loan) => total + Number(loan.quantity), 0);
    const untrackedAvailable = Math.max(
      0,
      Number(item.stockBalance?.quantity ?? 0) -
        trackedQuantity -
        borrowedUntracked,
    );
    const lotAvailable = lots.reduce((total, lot) => {
      if (lot.expiresAt && new Date(lot.expiresAt) < today) return total;
      return total + this.availableLotQuantity(item, lot);
    }, 0);
    return lotAvailable + untrackedAvailable;
  }

  availableLotQuantity(
    item: SaleItemOption,
    lot: NonNullable<SaleItemOption["stockLots"]>[number],
  ): number {
    const borrowed = (item.stockLoans ?? [])
      .filter((loan) => loan.lotId === lot.id)
      .reduce((total, loan) => total + Number(loan.quantity), 0);
    return Math.max(0, Number(lot.quantity) - borrowed);
  }

  sellableLots(item: SaleItemOption) {
    const today = new Date(
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    );
    return (item.stockLots ?? []).filter(
      (lot) =>
        this.availableLotQuantity(item, lot) > 0 &&
        (!lot.expiresAt || new Date(lot.expiresAt) >= today),
    );
  }

  needsExpiryChoice(item: SaleItemOption): boolean {
    const expiryKinds = new Set(
      this.sellableLots(item).map((lot) =>
        lot.expiresAt
          ? new Date(lot.expiresAt).toISOString().slice(0, 10)
          : "NO_EXPIRY",
      ),
    );
    return expiryKinds.size > 1;
  }

  lineAvailability(line: CartLine): number {
    if (!line.lotId) return this.stockQuantity(line.item);
    const lot = this.sellableLots(line.item).find(
      (entry) => entry.id === line.lotId,
    );
    return lot ? this.availableLotQuantity(line.item, lot) : 0;
  }

  selectExpiryLot(itemId: string, lotId: string): void {
    const line = this.cart().find((entry) => entry.item.id === itemId);
    if (!line) return;
    const selected = this.sellableLots(line.item).find(
      (lot) => lot.id === lotId,
    );
    const maxQuantity = selected
      ? this.availableLotQuantity(line.item, selected)
      : this.stockQuantity(line.item);
    this.cart.update((lines) =>
      lines.map((entry) =>
        entry.item.id === itemId
          ? {
              ...entry,
              lotId: lotId || undefined,
              quantity: Math.max(1, Math.min(entry.quantity, maxQuantity)),
            }
          : entry,
      ),
    );
  }

  price(value: number | string): number {
    return Number(value);
  }

  cartQuantity(itemId: string): number {
    return this.cart().find((line) => line.item.id === itemId)?.quantity ?? 0;
  }

  addItem(item: SaleItemOption): void {
    const existing = this.cart().find((line) => line.item.id === item.id);
    const available = existing
      ? this.lineAvailability(existing)
      : this.stockQuantity(item);
    if (available <= (existing?.quantity ?? 0)) {
      this.toast.warning("Số lượng bán vượt quá tồn kho.");
      return;
    }

    if (existing) {
      this.setQuantity(item.id, existing.quantity + 1);
      return;
    }

    this.cart.update((lines) => [...lines, { item, quantity: 1 }]);
  }

  setQuantity(itemId: string, quantity: number): void {
    const line = this.cart().find((entry) => entry.item.id === itemId);
    if (!line) return;

    const nextQuantity = Math.max(
      1,
      Math.min(quantity, this.lineAvailability(line)),
    );
    this.cart.update((lines) =>
      lines.map((entry) =>
        entry.item.id === itemId ? { ...entry, quantity: nextQuantity } : entry,
      ),
    );
  }

  removeItem(itemId: string): void {
    this.cart.update((lines) =>
      lines.filter((entry) => entry.item.id !== itemId),
    );
  }

  lineTotal(line: CartLine): number {
    return Number(line.item.sellingPrice) * line.quantity;
  }

  cartTotal(): number {
    return this.cart().reduce((total, line) => total + this.lineTotal(line), 0);
  }

  chooseCustomerType(type: "ROOM" | "EXTERNAL"): void {
    this.customerType.set(type);
    if (type === "ROOM") this.customerName.set("");
    if (type === "EXTERNAL") this.roomNumber.set("");
  }

  async submitSale(): Promise<void> {
    if (this.cart().length === 0) {
      this.toast.warning("Hãy chọn ít nhất một vật phẩm.");
      return;
    }

    if (
      this.cart().some(
        (line) => this.needsExpiryChoice(line.item) && !line.lotId,
      )
    ) {
      this.toast.warning(
        "Vui lòng chọn hạn sử dụng cho từng vật phẩm có nhiều lô.",
      );
      return;
    }

    if (this.customerType() === "ROOM" && !this.roomNumber().trim()) {
      this.toast.warning("Vui lòng nhập số phòng.");
      return;
    }

    this.isSubmitting.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          "/api/v1/sales",
          {
            customerType: this.customerType(),
            roomNumber: this.roomNumber().trim() || undefined,
            customerName: this.customerName().trim() || undefined,
            note: this.note().trim() || undefined,
            items: this.cart().map((line) => ({
              itemId: line.item.id,
              quantity: line.quantity,
              lotId: line.lotId,
            })),
          },
          { withCredentials: true },
        ),
      );

      this.toast.success("Đã ghi nhận giao dịch bán.");
      this.cart.set([]);
      this.roomNumber.set("");
      this.customerName.set("");
      this.note.set("");
      await this.loadItems();
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tạo giao dịch bán.",
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
