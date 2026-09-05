import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { IconComponent } from "../../core/ui/icon/icon.component";
import { ToastService } from "../../core/ui/toast.service";

interface SaleItemOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sellingPrice: number | string;
  stockBalance?: { quantity: number | string } | null;
}

interface CartLine {
  item: SaleItemOption;
  quantity: number;
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
    return Number(item.stockBalance?.quantity ?? 0);
  }

  price(value: number | string): number {
    return Number(value);
  }

  cartQuantity(itemId: string): number {
    return this.cart().find((line) => line.item.id === itemId)?.quantity ?? 0;
  }

  addItem(item: SaleItemOption): void {
    if (this.stockQuantity(item) <= this.cartQuantity(item.id)) {
      this.toast.warning("Số lượng bán vượt quá tồn kho.");
      return;
    }

    const existing = this.cartQuantity(item.id);
    if (existing > 0) {
      this.setQuantity(item.id, existing + 1);
      return;
    }

    this.cart.update((lines) => [...lines, { item, quantity: 1 }]);
  }

  setQuantity(itemId: string, quantity: number): void {
    const line = this.cart().find((entry) => entry.item.id === itemId);
    if (!line) return;

    const nextQuantity = Math.max(
      1,
      Math.min(quantity, this.stockQuantity(line.item)),
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
