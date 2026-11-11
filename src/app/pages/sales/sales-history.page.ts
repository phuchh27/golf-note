import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { IconComponent } from "../../core/ui/icon/icon.component";
import { ToastService } from "../../core/ui/toast.service";
import { LanguageService } from "../../core/i18n/language.service";

interface SaleLine {
  id: string;
  quantity: number | string;
  unitPrice: number | string;
  totalPrice: number | string;
  item: { name: string; sku: string; unit: string };
}

interface SaleRecord {
  id: string;
  customerType: "ROOM" | "EXTERNAL";
  roomNumber?: string | null;
  customerName?: string | null;
  totalAmount: number | string;
  soldAt: string;
  items: SaleLine[];
}

interface SaleResponse {
  success: boolean;
  data: {
    items: SaleRecord[];
    summary: { totalSales: number; totalAmount: number | string };
    pagination: { total: number; totalPages: number };
  };
  statusMessage?: string;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: "./sales-history.page.html",
})
export default class SalesHistoryPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  readonly languageService = inject(LanguageService);

  readonly sales = signal<SaleRecord[]>([]);
  readonly totalSales = signal(0);
  readonly totalAmount = signal<number | string>(0);
  readonly dateFrom = signal("");
  readonly dateTo = signal("");
  readonly customerType = signal("");
  readonly roomNumber = signal("");
  readonly isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadSales();
  }

  async loadSales(): Promise<void> {
    this.isLoading.set(true);
    const params = new URLSearchParams({ page: "1", limit: "100" });
    if (this.dateFrom()) params.set("dateFrom", this.dateFrom());
    if (this.dateTo()) params.set("dateTo", this.dateTo());
    if (this.customerType()) params.set("customerType", this.customerType());
    if (this.roomNumber().trim())
      params.set("roomNumber", this.roomNumber().trim());

    try {
      const response = await firstValueFrom(
        this.http.get<SaleResponse>(`/api/v1/sales?${params.toString()}`, {
          withCredentials: true,
        }),
      );
      this.sales.set(response.data.items);
      this.totalSales.set(response.data.summary.totalSales);
      this.totalAmount.set(response.data.summary.totalAmount);
    } catch (error: any) {
      this.toast.error(
        error?.error?.statusMessage ?? "Không thể tải lịch sử bán hàng.",
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  clearFilters(): void {
    this.dateFrom.set("");
    this.dateTo.set("");
    this.customerType.set("");
    this.roomNumber.set("");
    void this.loadSales();
  }

  customerLabel(sale: SaleRecord): string {
    return sale.customerType === "ROOM"
      ? `Phòng ${sale.roomNumber ?? "-"}`
      : sale.customerName || "Khách bên ngoài";
  }

  price(value: number | string): number {
    return Number(value);
  }
}
